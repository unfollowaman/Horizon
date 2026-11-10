-- Migration: Profiles Active Session RLS & Access Hardening
-- Timestamp: 20261110191500
-- Depends on: 20260301000000_single_device_session_foundation.sql
--
-- ============================================================================
-- Architecture & Security Summary:
-- ============================================================================
-- 1. Enforces single active device session validity via public.is_active_session()
--    on all authenticated client operations for public.profiles.
-- 2. Revokes all existing table-level privileges on public.profiles from PUBLIC,
--    anon, and authenticated, eliminating legacy DELETE, TRUNCATE, REFERENCES,
--    TRIGGER, and unneeded client INSERT privileges.
-- 3. Grants least-privilege operational permissions strictly to authenticated role:
--    SELECT and UPDATE only. No client INSERT, DELETE, or administrative privileges.
-- 4. Grants administrative and background worker privileges (SELECT, INSERT, UPDATE, DELETE)
--    to service_role.
-- 5. Completely removes client-side INSERT on public.profiles:
--    - The legacy insecure INSERT policy ("Enable insert for authenticated users only"
--      with WITH CHECK true) is dropped and NOT replaced.
--    - Profile creation is handled exclusively server-side by the auth.users trigger
--      calling public.handle_new_user(), which is a SECURITY DEFINER function owned
--      by postgres with rolbypassrls = true. It executes with postgres privileges
--      and completely bypasses RLS, preserving normal user signup without exposing
--      any client INSERT endpoint.
-- 6. Scope Exclusions:
--    - reading_progress and chapter_completion are intentionally excluded; both
--      features are abandoned and will be removed in a dedicated decommissioning migration.
--    - Storage policies for avatars are preserved and untouched.
--
-- ============================================================================
-- Lock & DDL Impact Assessment:
-- ============================================================================
-- - Table-level GRANT/REVOKE statements acquire SHARE UPDATE EXCLUSIVE locks on public.profiles.
-- - ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY acquires an ACCESS EXCLUSIVE lock.
-- - DROP POLICY and CREATE POLICY acquire ACCESS EXCLUSIVE locks on public.profiles.
-- - Metadata locks are brief in duration, but NOT lock-free. They will wait for
--   active concurrent transactions on public.profiles to release before acquiring the lock.
-- - No table rewrites, data mutations, or schema column modifications are performed.
--
-- ============================================================================
-- Rollback Considerations:
-- ============================================================================
-- - A rollback script drops these policies and restores the previous expressions:
--     profiles: SELECT/UPDATE (auth.uid() = id), INSERT WITH CHECK (true)
-- - WARNING: Restoring the legacy profiles INSERT policy restores the insecure
--   WITH CHECK (true) condition, permitting any authenticated user to insert arbitrary profiles.
--   Rollback must not be executed automatically and requires explicit authorization.
-- ============================================================================

-- ============================================================================
-- 1. Table-Level Grants (Least-Privilege Baseline)
-- ============================================================================
-- Ensure RLS is active on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke all existing table-level privileges from PUBLIC, anon, and authenticated
-- Guarantees a clean least-privilege baseline and eliminates any legacy
-- DELETE, TRUNCATE, REFERENCES, TRIGGER, or unneeded client INSERT privileges.
REVOKE ALL ON public.profiles FROM authenticated;
REVOKE ALL ON public.profiles FROM anon, PUBLIC;

-- Grant required operational privileges to authenticated role (Strictly SELECT, UPDATE; No client INSERT or DELETE)
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Grant administrative and background worker privileges to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- ============================================================================
-- 2. profiles RLS Policies (Session-Enforced & Ownership-Bound)
-- ============================================================================

-- A. SELECT: Users can only read their own profile during an active session
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.profiles;
CREATE POLICY "Enable users to view their own data only"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id AND public.is_active_session());

-- B. UPDATE: Users can only update their own profile during an active session
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND public.is_active_session())
  WITH CHECK (auth.uid() = id AND public.is_active_session());

-- C. INSERT: Drop legacy insecure INSERT policy ("WITH CHECK true").
-- No replacement INSERT policy is granted to client roles.
-- Profile creation is strictly performed server-side by public.handle_new_user()
-- running as SECURITY DEFINER owned by postgres (rolbypassrls = true).
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
