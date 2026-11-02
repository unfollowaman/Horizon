-- Migration: Single Active Device Session Foundation (Phase 1.2.1)
-- Timestamp: 20260301000000

-- ============================================================================
-- 1. Dedicated Private Schema: security
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS security;

-- Revoke all default and public access to ensure total isolation from PostgREST
REVOKE ALL ON SCHEMA security FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA security TO service_role;

-- ============================================================================
-- 2. Authoritative Session Registry: security.user_active_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS security.user_active_sessions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    active_session_id UUID NOT NULL,
    session_epoch BIGINT NOT NULL DEFAULT 1,
    device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Comments on table and columns for maintainability and auditability
COMMENT ON SCHEMA security IS 'Private schema for authoritative security and session management; inaccessible to client roles.';
COMMENT ON TABLE security.user_active_sessions IS 'Authoritative registry of currently active single-device sessions per user.';
COMMENT ON COLUMN security.user_active_sessions.user_id IS 'Identifies the Auth user (Primary Key referencing auth.users).';
COMMENT ON COLUMN security.user_active_sessions.active_session_id IS 'Currently active Supabase Auth session UUID.';
COMMENT ON COLUMN security.user_active_sessions.session_epoch IS 'Monotonically increasing version counter incremented on every session registration.';
COMMENT ON COLUMN security.user_active_sessions.device_info IS 'Optional structured device/client metadata recorded during registration.';
COMMENT ON COLUMN security.user_active_sessions.created_at IS 'Timestamp of the initial session registration for this user.';
COMMENT ON COLUMN security.user_active_sessions.updated_at IS 'Timestamp of the most recent session registration or update.';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_session_id
    ON security.user_active_sessions (active_session_id);

-- Enforce Row Level Security (RLS) on the private table
ALTER TABLE security.user_active_sessions ENABLE ROW LEVEL SECURITY;

-- Least-Privilege Grants: deny all direct client access; grant full access to service_role
REVOKE ALL ON security.user_active_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON security.user_active_sessions TO service_role;

-- ============================================================================
-- 3. Registration Function: public.register_active_session
-- Purpose: Atomically register a verified session as the user's active session.
-- Trust Boundary: Server-only (service_role only). Invoked exclusively by the
--                 Edge Login Orchestrator after verifying credentials and identity.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.register_active_session(
    p_user_id UUID,
    p_session_id UUID,
    p_device_info JSONB DEFAULT '{}'::jsonb,
    p_collision_threshold_ms INT DEFAULT 750
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_lock_key BIGINT;
    v_current RECORD;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_time_since_last_reg NUMERIC;
    v_new_epoch BIGINT;
BEGIN
    -- Input validation
    IF p_user_id IS NULL OR p_session_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_ARGUMENTS'
        );
    END IF;

    -- 1. Derive deterministic 64-bit signed integer advisory lock key from user UUID
    -- Hash algorithm: dynamic execution parses hex bit string literal into signed 64-bit bigint
    EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint'
    INTO v_lock_key
    USING p_user_id;

    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 2. Query current active session record
    SELECT active_session_id, updated_at, session_epoch
    INTO v_current
    FROM security.user_active_sessions
    WHERE user_id = p_user_id;

    -- 3. Bounded-window collision detection for overlapping simultaneous logins
    IF FOUND AND v_current.active_session_id IS NOT NULL THEN
        -- Check if current active session is already this session (idempotent re-registration)
        IF v_current.active_session_id = p_session_id THEN
            -- Safe duplicate registration by same session: update timestamp and return success
            UPDATE security.user_active_sessions
            SET device_info = COALESCE(p_device_info, device_info),
                updated_at = v_now
            WHERE user_id = p_user_id;

            RETURN jsonb_build_object(
                'success', true,
                'replaced_session_id', NULL,
                'session_epoch', v_current.session_epoch,
                'is_idempotent', true
            );
        END IF;

        -- Calculate milliseconds elapsed since the existing session was committed
        v_time_since_last_reg := EXTRACT(EPOCH FROM (v_now - v_current.updated_at)) * 1000;

        -- If a distinct session registered within the accepted collision threshold window
        IF v_time_since_last_reg < p_collision_threshold_ms THEN
            -- Losing concurrent attempt: fail closed without mutating registry
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'CONCURRENT_LOGIN_LOST',
                'active_session_id', v_current.active_session_id,
                'session_epoch', v_current.session_epoch
            );
        END IF;
    END IF;

    -- 4. Calculate next monotonic session epoch
    v_new_epoch := COALESCE(v_current.session_epoch, 0) + 1;

    -- 5. Upsert active session atomically under the advisory lock
    INSERT INTO security.user_active_sessions (
        user_id,
        active_session_id,
        session_epoch,
        device_info,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_session_id,
        v_new_epoch,
        COALESCE(p_device_info, '{}'::jsonb),
        v_now,
        v_now
    )
    ON CONFLICT (user_id) DO UPDATE
    SET active_session_id = EXCLUDED.active_session_id,
        session_epoch = security.user_active_sessions.session_epoch + 1,
        device_info = EXCLUDED.device_info,
        updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object(
        'success', true,
        'replaced_session_id', v_current.active_session_id,
        'session_epoch', v_new_epoch
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DATABASE_ERROR'
        );
END;
$$;

-- Security Hardening: Revoke execution from client roles; restrict strictly to service_role
REVOKE ALL ON FUNCTION public.register_active_session(UUID, UUID, JSONB, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_active_session(UUID, UUID, JSONB, INT) TO service_role;

-- ============================================================================
-- 4. Deactivation Functions: public.deactivate_active_session
-- Purpose: Safely delete active session during logout with conditional check.
-- ============================================================================

-- A. Client-callable deactivation (derives identity from validated JWT claims)
CREATE OR REPLACE FUNCTION public.deactivate_active_session()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_claims JSONB;
    v_user_id UUID;
    v_session_id UUID;
    v_lock_key BIGINT;
    v_deleted_count INT := 0;
BEGIN
    -- Safe JWT claims extraction from transaction context
    BEGIN
        v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_JWT_CLAIMS');
    END;

    IF v_claims IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'UNAUTHENTICATED');
    END IF;

    BEGIN
        v_user_id := (v_claims ->> 'sub')::UUID;
        v_session_id := (v_claims ->> 'session_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'MALFORMED_SESSION_CLAIMS');
    END;

    IF v_user_id IS NULL OR v_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'MISSING_SESSION_CLAIMS');
    END IF;

    -- Acquire identical per-user advisory lock
    EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint'
    INTO v_lock_key
    USING v_user_id;

    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Conditional deletion: ONLY delete if active_session_id still matches calling session
    DELETE FROM security.user_active_sessions
    WHERE user_id = v_user_id
      AND active_session_id = v_session_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deactivated', (v_deleted_count > 0)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'DATABASE_ERROR');
END;
$$;

-- Permissions for JWT-derived deactivation
REVOKE ALL ON FUNCTION public.deactivate_active_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_active_session() TO authenticated, service_role;

-- B. Server-side deactivation (explicit parameters; service_role only)
CREATE OR REPLACE FUNCTION public.deactivate_active_session(
    p_user_id UUID,
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_lock_key BIGINT;
    v_deleted_count INT := 0;
BEGIN
    IF p_user_id IS NULL OR p_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_ARGUMENTS');
    END IF;

    -- Acquire identical per-user advisory lock
    EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint'
    INTO v_lock_key
    USING p_user_id;

    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Conditional deletion: ONLY delete if active_session_id still matches supplied session
    DELETE FROM security.user_active_sessions
    WHERE user_id = p_user_id
      AND active_session_id = p_session_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deactivated', (v_deleted_count > 0)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'DATABASE_ERROR');
END;
$$;

-- Permissions for explicit server-side deactivation
REVOKE ALL ON FUNCTION public.deactivate_active_session(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_active_session(UUID, UUID) TO service_role;

-- ============================================================================
-- 5. Active Session Validation: public.is_active_session
-- Purpose: Authoritatively verify whether a session is currently active.
-- ============================================================================

-- A. Client / RLS validation (derives identity from validated JWT claims)
CREATE OR REPLACE FUNCTION public.is_active_session()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_claims JSONB;
    v_user_id UUID;
    v_session_id UUID;
    v_is_active BOOLEAN;
BEGIN
    BEGIN
        v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    IF v_claims IS NULL THEN
        RETURN FALSE;
    END IF;

    BEGIN
        v_user_id := (v_claims ->> 'sub')::UUID;
        v_session_id := (v_claims ->> 'session_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    IF v_user_id IS NULL OR v_session_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT (active_session_id = v_session_id)
    INTO v_is_active
    FROM security.user_active_sessions
    WHERE user_id = v_user_id;

    RETURN COALESCE(v_is_active, FALSE);
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Permissions for JWT-derived active check
REVOKE ALL ON FUNCTION public.is_active_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_session() TO authenticated, service_role;

-- B. Server-side validation (explicit parameters; service_role only)
CREATE OR REPLACE FUNCTION public.is_active_session(
    p_user_id UUID,
    p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_active BOOLEAN;
BEGIN
    IF p_user_id IS NULL OR p_session_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT (active_session_id = p_session_id)
    INTO v_is_active
    FROM security.user_active_sessions
    WHERE user_id = p_user_id;

    RETURN COALESCE(v_is_active, FALSE);
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Permissions for explicit server-side active check
REVOKE ALL ON FUNCTION public.is_active_session(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_session(UUID, UUID) TO service_role;

-- ============================================================================
-- 6. Supabase Realtime Broadcast Authorization RLS Policy
-- Purpose: Restrict Realtime client subscriptions strictly to private broadcast
--          messages on the authenticated student's own topic ('user:<user_id>').
-- ============================================================================
DO $$
BEGIN
    -- Verify realtime schema and messages table exist
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'realtime'
          AND table_name = 'messages'
    ) THEN
        -- Enable RLS on realtime.messages
        EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

        -- Drop existing policy if present to allow idempotent re-application
        EXECUTE 'DROP POLICY IF EXISTS "Allow users to subscribe to own broadcast topic" ON realtime.messages';

        -- Create restrictive private channel broadcast policy
        EXECUTE 'CREATE POLICY "Allow users to subscribe to own broadcast topic"
            ON realtime.messages
            FOR SELECT
            TO authenticated
            USING (
                realtime.messages.extension = ''broadcast''
                AND realtime.messages.topic = (''user:'' || (auth.uid())::text)
            )';
    END IF;
END $$;
