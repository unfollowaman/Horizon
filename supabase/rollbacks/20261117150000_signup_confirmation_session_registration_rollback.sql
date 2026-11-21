-- Rollback Migration: Signup Confirmation Session Registration (Phase 8.4.3)
-- Target: Rollback 20261117150000_signup_confirmation_session_registration.sql
--
-- Safety and Invariants:
-- 1. Executes inside an explicit transaction (BEGIN ... COMMIT).
-- 2. Precondition verification: raises exception if expected objects are absent.
-- 3. Uses DROP ... RESTRICT exclusively (never CASCADE) to prevent accidental
--    collateral deletion of dependent objects.
-- 4. Preserves all pre-existing session and security infrastructure:
--    - security.user_active_sessions table and RLS policies are untouched.
--    - public.deactivate_active_session functions are untouched.
--    - public.is_active_session functions are untouched.
-- 5. Restores public.register_active_session to its exact Phase 1.2.1 implementation.
-- ============================================================================

BEGIN;

-- Precondition check: verify objects exist before attempting deletion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'security' AND tablename = 'signup_session_claims'
    ) THEN
        RAISE EXCEPTION 'Rollback precondition failed: security.signup_session_claims table does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'register_confirmation_session'
    ) THEN
        RAISE EXCEPTION 'Rollback precondition failed: public.register_confirmation_session function does not exist';
    END IF;
END $$;

-- 1. Drop trigger on security.signup_session_claims
DROP TRIGGER IF EXISTS trg_prevent_signup_session_claims_update ON security.signup_session_claims;

-- 2. Drop trigger function with RESTRICT (fails if any other object depends on it)
DROP FUNCTION IF EXISTS security.prevent_signup_session_claims_update() RESTRICT;

-- 3. Drop registration RPC with RESTRICT
DROP FUNCTION IF EXISTS public.register_confirmation_session(JSONB) RESTRICT;

-- 4. Drop table with RESTRICT (fails if any dependent foreign keys or views exist)
DROP TABLE IF EXISTS security.signup_session_claims RESTRICT;

-- 5. Restore public.register_active_session to its exact Phase 1.2.1 definition
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

COMMIT;
