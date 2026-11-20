-- Migration: Implement Signup Confirmation Session Registration (Phase 8.4.3)
-- Timestamp: 20261117150000 (UTC: 2026-11-17 15:00:00)
-- Authored:  2026-11-17 15:03 UTC (20:33 IST). Timestamp uses UTC wall-clock
--            to ensure correct migration ordering in CI environments.
-- Depends on:
--   20260301000000_single_device_session_foundation.sql
--   20261108094059_fix_deactivate_active_session_lock_key.sql
--   20261110191500_enforce_active_session_rls.sql
--
-- ============================================================================
-- Architecture & Security Summary:
-- ============================================================================
-- 1. Creates durable authorization ledger security.signup_session_claims.
--    - Enforces write-once registration per user (user_id is PRIMARY KEY).
--    - Foreign key to auth.users(id) with ON DELETE CASCADE.
--    - Inaccessible to all client roles (anon, authenticated, PUBLIC) and service_role.
--    - Claim survives logout and session replacement.
-- 2. Installs UPDATE-prevention trigger on security.signup_session_claims.
--    - Blocks all UPDATE mutations while allowing ON DELETE CASCADE from auth.users.
-- 3. Implements public.register_confirmation_session(p_device_info JSONB).
--    - SECURITY DEFINER with SET search_path = ''.
--    - Derives user_id and session_id strictly from trusted request.jwt.claims.
--    - Serializes registration using deterministic signed 64-bit advisory lock.
--    - Enforces 300s confirmation eligibility window and 60s session alignment tolerance.
--    - Implements approved permissive policy: allows confirmation after intermediate login/logout
--      if claim unconsumed and session eligible.
--    - Idempotent for repeated invocations from same currently active session.
--    - Rejects inactive or displaced sessions from reclaiming authorization.
--    - Atomically records claim and upserts active session.
--    - Permissions granted strictly to authenticated; revoked from PUBLIC, anon, service_role.
-- 4. Replaces public.register_active_session(UUID, UUID, JSONB, INT).
--    - Evaluates clock_timestamp() strictly after acquiring advisory lock to prevent
--      stale timestamp evaluation during lock contention.
--    - Preserves service_role only execution and existing single-session semantics.
-- ============================================================================

-- ============================================================================
-- 1. Durable Authorization Ledger: security.signup_session_claims
-- ============================================================================

CREATE TABLE IF NOT EXISTS security.signup_session_claims (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    authorized_session_id UUID NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    device_info JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE security.signup_session_claims IS 'Durable write-once ledger for initial signup confirmation session authorization.';
COMMENT ON COLUMN security.signup_session_claims.user_id IS 'Auth user ID referencing auth.users(id) with ON DELETE CASCADE.';
COMMENT ON COLUMN security.signup_session_claims.authorized_session_id IS 'UUID of the Supabase Auth session authorized upon initial confirmation.';
COMMENT ON COLUMN security.signup_session_claims.consumed_at IS 'Timestamp when the signup confirmation session authorization was consumed.';
COMMENT ON COLUMN security.signup_session_claims.device_info IS 'Optional client metadata recorded during confirmation registration.';

CREATE INDEX IF NOT EXISTS idx_signup_session_claims_session_id
    ON security.signup_session_claims (authorized_session_id);

-- Enforce Row Level Security (RLS)
ALTER TABLE security.signup_session_claims ENABLE ROW LEVEL SECURITY;

-- Least-Privilege Grants: deny all direct access to client roles AND service_role.
-- Table operations are performed exclusively by SECURITY DEFINER routines owned by postgres.
REVOKE ALL ON security.signup_session_claims FROM PUBLIC, anon, authenticated, service_role;

-- ============================================================================
-- 2. UPDATE-Prevention Trigger on security.signup_session_claims
-- ============================================================================

CREATE OR REPLACE FUNCTION security.prevent_signup_session_claims_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- SQLSTATE 42501 (insufficient_privilege) is a standard PostgreSQL condition name
    -- (Appendix A of the PostgreSQL documentation). It is valid in RAISE ... USING ERRCODE.
    -- Using an explicit code makes the error class identifiable to callers without relying
    -- on the default SQLSTATE P0001 (raise_exception).
    RAISE EXCEPTION 'Updates to security.signup_session_claims are strictly prohibited'
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION security.prevent_signup_session_claims_update() IS 'Trigger function preventing all UPDATE mutations on security.signup_session_claims.';

REVOKE ALL ON FUNCTION security.prevent_signup_session_claims_update() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_prevent_signup_session_claims_update ON security.signup_session_claims;

CREATE TRIGGER trg_prevent_signup_session_claims_update
BEFORE UPDATE ON security.signup_session_claims
FOR EACH ROW
EXECUTE FUNCTION security.prevent_signup_session_claims_update();

-- ============================================================================
-- 3. Registration RPC: public.register_confirmation_session
-- Purpose: Atomically authorizes and registers the initial email confirmation
--          session in security.user_active_sessions and records a durable claim
--          in security.signup_session_claims.
-- Trust Boundary: Client-callable (authenticated role only). Identity derived
--                 strictly from trusted JWT claims (request.jwt.claims).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_confirmation_session(
    p_device_info JSONB DEFAULT '{}'::jsonb
)
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
    v_now TIMESTAMPTZ;
    v_claim RECORD;
    v_active RECORD;
    v_user RECORD;
    v_session RECORD;
    v_new_epoch BIGINT;
    v_conf_diff_seconds NUMERIC;
    v_sess_conf_diff_seconds NUMERIC;
BEGIN
    -- 1. Extract and validate JWT claims from transaction context
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

    -- 2. Acquire deterministic per-user advisory transaction lock
    -- Identical lock key derivation as register_active_session and deactivate_active_session.
    EXECUTE 'SELECT x''' || substr(md5(v_user_id::text), 1, 16) || '''::bit(64)::bigint'
    INTO v_lock_key;

    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Capture authoritative timestamp AFTER acquiring lock to prevent stale timestamp evaluation
    v_now := clock_timestamp();

    -- 3. Check durable authorization ledger (security.signup_session_claims)
    SELECT authorized_session_id, consumed_at
    INTO v_claim
    FROM security.signup_session_claims
    WHERE user_id = v_user_id;

    IF FOUND THEN
        -- Claim has already been consumed.
        -- Check if calling session is the same session that consumed the claim:
        IF v_claim.authorized_session_id = v_session_id THEN
            -- Check if this session is currently active in security.user_active_sessions:
            SELECT active_session_id, session_epoch
            INTO v_active
            FROM security.user_active_sessions
            WHERE user_id = v_user_id;

            IF FOUND AND v_active.active_session_id = v_session_id THEN
                -- Idempotent re-registration by the currently active confirmation session
                RETURN jsonb_build_object(
                    'success', true,
                    'is_idempotent', true,
                    'session_id', v_session_id,
                    'session_epoch', v_active.session_epoch
                );
            ELSE
                -- The session previously consumed the claim, but is no longer active
                -- (displaced by a newer session, or logged out). Inactive sessions cannot reclaim authorization.
                RETURN jsonb_build_object(
                    'success', false,
                    'error_code', 'CLAIM_ALREADY_CONSUMED_INACTIVE_SESSION'
                );
            END IF;
        ELSE
            -- Attempt by a different session after claim has already been consumed
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'CLAIM_ALREADY_CONSUMED'
            );
        END IF;
    END IF;

    -- 4. Check for existing conflicting active session
    SELECT active_session_id, session_epoch
    INTO v_active
    FROM security.user_active_sessions
    WHERE user_id = v_user_id;

    IF FOUND AND v_active.active_session_id IS NOT NULL THEN
        IF v_active.active_session_id <> v_session_id THEN
            -- Another session is currently active: reject to prevent simultaneous collision
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'ACTIVE_SESSION_CONFLICT',
                'active_session_id', v_active.active_session_id
            );
        END IF;
    END IF;

    -- 5. Confirmation eligibility verification
    -- Retrieve confirmation timestamp from auth.users
    SELECT id, COALESCE(email_confirmed_at, confirmed_at) AS confirmed_at
    INTO v_user
    FROM auth.users
    WHERE id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'USER_NOT_FOUND');
    END IF;

    IF v_user.confirmed_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'EMAIL_NOT_CONFIRMED');
    END IF;

    -- 5a. Confirmation timestamp eligibility window (300 seconds)
    -- Allow minor clock drift (-10 seconds)
    v_conf_diff_seconds := EXTRACT(EPOCH FROM (v_now - v_user.confirmed_at));
    IF v_conf_diff_seconds > 300 OR v_conf_diff_seconds < -10 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONFIRMATION_WINDOW_EXPIRED',
            'elapsed_seconds', v_conf_diff_seconds
        );
    END IF;

    -- 5b. Matching auth.sessions verification
    SELECT id, user_id, created_at
    INTO v_session
    FROM auth.sessions
    WHERE id = v_session_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'SESSION_NOT_FOUND');
    END IF;

    -- 5c. Session creation alignment tolerance (60 seconds with confirmed_at)
    v_sess_conf_diff_seconds := ABS(EXTRACT(EPOCH FROM (v_session.created_at - v_user.confirmed_at)));
    IF v_sess_conf_diff_seconds > 60 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SESSION_CONFIRMATION_MISALIGNED',
            'alignment_diff_seconds', v_sess_conf_diff_seconds
        );
    END IF;

    -- 6. Atomic registration: insert claim and upsert active session
    INSERT INTO security.signup_session_claims (
        user_id,
        authorized_session_id,
        consumed_at,
        device_info
    )
    VALUES (
        v_user_id,
        v_session_id,
        v_now,
        COALESCE(p_device_info, '{}'::jsonb)
    );

    v_new_epoch := COALESCE(v_active.session_epoch, 0) + 1;

    INSERT INTO security.user_active_sessions (
        user_id,
        active_session_id,
        session_epoch,
        device_info,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        v_session_id,
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
        'session_id', v_session_id,
        'session_epoch', v_new_epoch
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CONCURRENT_CLAIM_CONFLICT'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DATABASE_ERROR'
        );
END;
$$;

COMMENT ON FUNCTION public.register_confirmation_session(JSONB) IS 'Authoritatively registers the initial signup confirmation session under durable ledger authorization.';

-- Permissions: Restrict execution strictly to authenticated role.
-- Client anon, PUBLIC, and service_role are explicitly revoked.
REVOKE ALL ON FUNCTION public.register_confirmation_session(JSONB) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.register_confirmation_session(JSONB) TO authenticated;

-- ============================================================================
-- 4. Harden public.register_active_session Lock Timestamp Evaluation
-- Purpose: Evaluate clock_timestamp() strictly AFTER acquiring the advisory lock
--          to prevent lock wait duration from triggering false-positive collisions.
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
    v_now TIMESTAMPTZ;
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
    EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint'
    INTO v_lock_key
    USING p_user_id;

    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Capture timestamp strictly AFTER acquiring lock
    v_now := clock_timestamp();

    -- 2. Query current active session record
    SELECT active_session_id, updated_at, session_epoch
    INTO v_current
    FROM security.user_active_sessions
    WHERE user_id = p_user_id;

    -- 3. Bounded-window collision detection for overlapping simultaneous logins
    IF FOUND AND v_current.active_session_id IS NOT NULL THEN
        -- Check if current active session is already this session (idempotent re-registration)
        IF v_current.active_session_id = p_session_id THEN
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

COMMENT ON FUNCTION public.register_active_session(UUID, UUID, JSONB, INT) IS 'Atomically registers a verified single-device active session under advisory lock with bounded collision detection.';

REVOKE ALL ON FUNCTION public.register_active_session(UUID, UUID, JSONB, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_active_session(UUID, UUID, JSONB, INT) TO service_role;
