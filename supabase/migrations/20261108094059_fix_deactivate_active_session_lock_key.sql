-- Migration: Fix Parameterless deactivate_active_session Lock Key Derivation
-- Timestamp: 20260303000000
-- Depends on: 20260301000000_single_device_session_foundation.sql
--
-- ============================================================================
-- Architecture & Defect Summary:
-- ============================================================================
-- In 20260301000000_single_device_session_foundation.sql, the parameterless
-- function public.deactivate_active_session() contained a copy-paste defect:
--
--     EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint'
--     INTO v_lock_key
--     USING v_user_id;
--
-- Because public.deactivate_active_session() has zero declared arguments,
-- evaluating the positional parameter $1 in PL/pgSQL expression context
-- raises an "undefined parameter $1" error at runtime. The exception handler
-- caught this error and returned {"success": false, "error_code": "DATABASE_ERROR"},
-- preventing clean active session record deletion in PostgreSQL on client logout.
--
-- This migration safely replaces public.deactivate_active_session() using
-- CREATE OR REPLACE FUNCTION with the exact same signature, return type,
-- search_path, permissions, and security properties. It updates the advisory
-- lock derivation to reference the local variable v_user_id::text, producing
-- an identical signed 64-bit integer lock key as register_active_session().
--
-- ============================================================================
-- Safety Assessment:
-- ============================================================================
-- - Zero schema modifications, table rewrites, column additions, or data changes.
-- - Replaces only the parameterless function public.deactivate_active_session().
-- - Overloaded function public.deactivate_active_session(UUID, UUID) is untouched.
-- - Permissions are preserved: revoked from PUBLIC and anon; granted to authenticated
--   and service_role.
-- ============================================================================

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
    -- 1. Safe JWT claims extraction from transaction context
    BEGIN
        v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_JWT_CLAIMS');
    END;

    IF v_claims IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'UNAUTHENTICATED');
    END IF;

    -- 2. Extract and validate user_id and session_id from claims
    BEGIN
        v_user_id := (v_claims ->> 'sub')::UUID;
        v_session_id := (v_claims ->> 'session_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'MALFORMED_SESSION_CLAIMS');
    END;

    IF v_user_id IS NULL OR v_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'MISSING_SESSION_CLAIMS');
    END IF;

    -- 3. Acquire identical per-user advisory lock using local variable v_user_id
    -- Hash algorithm: dynamic execution parses hex bit string literal into signed 64-bit bigint
    -- Exactly matches register_active_session() advisory key derivation
    EXECUTE 'SELECT x''' || substr(md5(v_user_id::text), 1, 16) || '''::bit(64)::bigint'
    INTO v_lock_key;

    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 4. Conditional deletion: ONLY delete if active_session_id still matches calling session
    -- Replacement sessions are never deactivated by stale logouts
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

-- Preserve comments and least-privilege permissions
COMMENT ON FUNCTION public.deactivate_active_session() IS 'Safely deactivates calling session from security.user_active_sessions using JWT claims and per-user advisory locking.';

REVOKE ALL ON FUNCTION public.deactivate_active_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_active_session() TO authenticated, service_role;
