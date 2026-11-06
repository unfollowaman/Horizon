-- Migration: Protected Access Enforcement RLS Policies (Phase 1.2.3)
-- Timestamp: 20260302000000
-- Depends on: 20260301000000_single_device_session_foundation.sql
--
-- ============================================================================
-- Architecture & Security Summary:
-- ============================================================================
-- 1. Enforces single active device session validity via public.is_active_session()
--    on all authenticated client operations for reading_progress, chapter_completion,
--    and profiles.
-- 2. Revokes all existing table-level privileges from PUBLIC, anon, and authenticated,
--    then grants least-privilege operational permissions (SELECT, INSERT, UPDATE)
--    strictly to authenticated and full CRUD to service_role. Eliminates any legacy
--    DELETE, TRUNCATE, REFERENCES, or TRIGGER privileges for authenticated clients.
-- 3. Narrows the insecure legacy profiles INSERT policy (previously WITH CHECK true)
--    strictly to the authenticated user's own identity: (auth.uid() = id) AND is_active_session().
-- 4. Preserves normal user signup flow: auth.users trigger on_auth_user_created calls
--    public.handle_new_user(), which is a SECURITY DEFINER function owned by postgres
--    with rolbypassrls = true, completely immune to RLS restrictions.
-- 5. Preserves existing ownership semantics without adding blanket administrator
--    access over client PostgREST endpoints.
--
-- ============================================================================
-- Lock & DDL Impact Assessment:
-- ============================================================================
-- - Table-level GRANT statements acquire SHARE UPDATE EXCLUSIVE locks on each table.
-- - ALTER TABLE ... ENABLE ROW LEVEL SECURITY acquires an ACCESS EXCLUSIVE lock.
-- - DROP POLICY and CREATE POLICY acquire ACCESS EXCLUSIVE locks on each target table.
-- - These metadata locks are brief in duration, but NOT lock-free. They will wait for
--   active concurrent transactions on reading_progress, chapter_completion, and profiles
--   to release before acquiring the lock.
-- - No table rewrites, data mutations, or schema column modifications are performed.
--
-- ============================================================================
-- Rollback Considerations:
-- ============================================================================
-- - A rollback script drops these policies and restores the previous expressions:
--     reading_progress: (auth.uid() = user_id)
--     chapter_completion: (auth.uid() = user_id)
--     profiles: SELECT/UPDATE (auth.uid() = id), INSERT WITH CHECK (true)
-- - WARNING: Restoring the legacy profiles INSERT policy restores the insecure
--   WITH CHECK (true) condition, permitting any authenticated user to insert arbitrary profiles.
--   Rollback must not be executed automatically and requires explicit authorization.
-- ============================================================================

-- ============================================================================
-- 1. Table-Level Grants (Least-Privilege Enforcement)
-- ============================================================================
-- Ensure RLS is active on all target tables
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke all existing table-level privileges from PUBLIC, anon, and authenticated
-- This guarantees a clean least-privilege baseline and eliminates any legacy
-- DELETE, TRUNCATE, REFERENCES, or TRIGGER privileges (e.g. on public.profiles).
REVOKE ALL ON public.reading_progress FROM authenticated;
REVOKE ALL ON public.chapter_completion FROM authenticated;
REVOKE ALL ON public.profiles FROM authenticated;

REVOKE ALL ON public.reading_progress FROM anon, PUBLIC;
REVOKE ALL ON public.chapter_completion FROM anon, PUBLIC;
REVOKE ALL ON public.profiles FROM anon, PUBLIC;

-- Grant required operational privileges to authenticated role (Strictly SELECT, INSERT, UPDATE; No client DELETE)
GRANT SELECT, INSERT, UPDATE ON public.reading_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chapter_completion TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Grant administrative and background worker privileges to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_completion TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- ============================================================================
-- 2. reading_progress RLS Policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own reading progress" ON public.reading_progress;
CREATE POLICY "Users can view their own reading progress"
  ON public.reading_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.is_active_session());

DROP POLICY IF EXISTS "Users can insert their own reading progress" ON public.reading_progress;
CREATE POLICY "Users can insert their own reading progress"
  ON public.reading_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_session());

DROP POLICY IF EXISTS "Users can update their own reading progress" ON public.reading_progress;
CREATE POLICY "Users can update their own reading progress"
  ON public.reading_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_active_session())
  WITH CHECK (auth.uid() = user_id AND public.is_active_session());

-- ============================================================================
-- 3. chapter_completion RLS Policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own chapter completion" ON public.chapter_completion;
CREATE POLICY "Users can view their own chapter completion"
  ON public.chapter_completion
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.is_active_session());

DROP POLICY IF EXISTS "Users can insert their own chapter completion" ON public.chapter_completion;
CREATE POLICY "Users can insert their own chapter completion"
  ON public.chapter_completion
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_session());

DROP POLICY IF EXISTS "Users can update their own chapter completion" ON public.chapter_completion;
CREATE POLICY "Users can update their own chapter completion"
  ON public.chapter_completion
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.is_active_session())
  WITH CHECK (auth.uid() = user_id AND public.is_active_session());

-- ============================================================================
-- 4. profiles RLS Policies
-- ============================================================================
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.profiles;
CREATE POLICY "Enable users to view their own data only"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id AND public.is_active_session());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND public.is_active_session())
  WITH CHECK (auth.uid() = id AND public.is_active_session());

-- Hardened INSERT policy: restricted strictly to own identity and active session.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users only"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND public.is_active_session());
