-- Migration: Revoke handle_new_user Public EXECUTE Privileges
-- Timestamp: 20261114210000
-- Target function: public.handle_new_user()
--
-- ============================================================================
-- Architecture & Security Summary:
-- ============================================================================
-- 1. Cleanses excessive EXECUTE privileges inherited from default PostgreSQL ACLs
--    on public.handle_new_user() from client-facing roles (PUBLIC, anon,
--    authenticated).
-- 2. Explicitly grants EXECUTE to postgres (the function owner), ensuring the
--    system owner retains explicit execution privileges.
-- 3. Trigger Function Runtime Mechanics:
--    - In PostgreSQL, EXECUTE privileges on trigger functions are evaluated at
--      trigger definition time (CREATE TRIGGER), not re-checked per row execution
--      at runtime.
--    - The auth.users trigger 'on_auth_user_created' fires internally upon user
--      creation under trigger manager context.
--    - Revoking client-facing EXECUTE permissions prevents unauthorized direct RPC
--      or SQL invocations from external clients while preserving user signup
--      and profile creation functionality completely intact.
-- 4. Scope:
--    - Narrowly scoped to EXECUTE privileges on public.handle_new_user().
--    - Zero modifications to function definition, trigger definitions, function
--      ownership, search_path, tables, or RLS policies.
-- ============================================================================

-- 1. Revoke EXECUTE from PUBLIC and client-accessible roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- 2. Explicitly grant EXECUTE to postgres
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
