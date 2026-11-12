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
-- 3. Explicitly revokes any pre-existing column-level UPDATE privileges on every
--    column of public.profiles from PUBLIC, anon, and authenticated.
--    RATIONALE: PostgreSQL column-level grants are stored independently of
--    table-level grants. REVOKE ALL ON TABLE removes only table-level entries;
--    column-level entries in pg_attribute / information_schema.column_privileges
--    survive and must be cleared separately. This step guarantees a clean
--    privilege baseline regardless of prior migration history.
-- 4. Grants least-privilege operational permissions strictly to authenticated:
--      SELECT  — table-level (all columns are readable)
--      UPDATE  — column-level, restricted to exactly the four columns that
--                confirmed client workflows require:
--                  student_class, study_medium, avatar_url, onboarding_completed
--
--    Column grant justification (full application audit, all update call sites):
--      student_class        Onboarding.tsx:129  handleSelectClass()
--      study_medium         Onboarding.tsx:142  handleSelectMedium()
--      avatar_url           Onboarding.tsx:155  handleSelectAvatar()
--      onboarding_completed Onboarding.tsx:245  handleFinish()
--
--    Columns NOT granted (intentionally excluded from client UPDATE):
--      id          — primary key / RLS ownership anchor; must be immutable
--      role        — no authorization path in this application consumes
--                    profiles.role for elevation decisions (isAdmin derives
--                    exclusively from user.app_metadata.role in AuthContext);
--                    however, allowing client writes to this column would
--                    constitute unauthorized data manipulation and must be
--                    blocked regardless
--      created_at  — audit / membership timestamp; must be tamper-resistant
--      name        — read by Dashboard and ProfilePopover; NO update call site
--                    was identified anywhere in the codebase (client or Edge
--                    Functions); UPDATE grant is withheld until a legitimate
--                    workflow is implemented and documented
--
-- 5. Grants full administrative and background worker privileges to service_role
--    (SELECT, INSERT, UPDATE, DELETE). service_role bypasses RLS by default in
--    Supabase; no column restriction is applied.
-- 6. Completely removes client-side INSERT on public.profiles:
--    - The legacy insecure INSERT policy ("Enable insert for authenticated users only"
--      with WITH CHECK true) is dropped and NOT replaced.
--    - Profile creation is handled exclusively server-side by the auth.users trigger
--      calling public.handle_new_user(), which is a SECURITY DEFINER function owned
--      by postgres with rolbypassrls = true. It executes with postgres privileges
--      and completely bypasses RLS, preserving normal user signup without exposing
--      any client INSERT endpoint.
-- 7. Scope Exclusions:
--    - reading_progress and chapter_completion are intentionally excluded; both
--      features are abandoned and will be removed in a dedicated decommissioning migration.
--    - Storage policies for avatars are preserved and untouched.
--
-- ============================================================================
-- Lock & DDL Impact Assessment:
-- ============================================================================
-- - Table-level GRANT/REVOKE statements acquire SHARE UPDATE EXCLUSIVE locks on public.profiles.
-- - Column-level GRANT/REVOKE statements acquire SHARE UPDATE EXCLUSIVE locks on public.profiles.
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
-- 1. Enable Row Level Security
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Table-Level Privilege Revocation (Least-Privilege Baseline)
-- ============================================================================
-- Revoke all table-level privileges from client roles.
-- This eliminates legacy DELETE, TRUNCATE, REFERENCES, TRIGGER, and any
-- broad UPDATE or INSERT that may have been granted at the table level.
REVOKE ALL ON public.profiles FROM authenticated;
REVOKE ALL ON public.profiles FROM anon, PUBLIC;

-- ============================================================================
-- 3. Column-Level UPDATE Privilege Revocation (All Columns)
-- ============================================================================
-- PostgreSQL stores column-level grants separately from table-level grants.
-- REVOKE ALL ON TABLE does NOT remove them. Every column is explicitly named
-- here to guarantee no residual column-level UPDATE privilege remains for any
-- client-visible role, regardless of prior migration history.
--
-- Columns: id, role, created_at, name, student_class, study_medium,
--          avatar_url, onboarding_completed
--
-- Revoke from PUBLIC (the default-privilege holder):
REVOKE UPDATE (id, role, created_at, name, student_class, study_medium, avatar_url, onboarding_completed)
  ON public.profiles FROM PUBLIC;

-- Revoke from anon:
REVOKE UPDATE (id, role, created_at, name, student_class, study_medium, avatar_url, onboarding_completed)
  ON public.profiles FROM anon;

-- Revoke from authenticated:
REVOKE UPDATE (id, role, created_at, name, student_class, study_medium, avatar_url, onboarding_completed)
  ON public.profiles FROM authenticated;

-- ============================================================================
-- 4. Targeted Privilege Grants
-- ============================================================================

-- A. SELECT: table-level grant to authenticated (all columns are readable by
--    own-row RLS; no column restriction needed for reads)
GRANT SELECT ON public.profiles TO authenticated;

-- B. UPDATE: column-level grant to authenticated, restricted to the four columns
--    confirmed as required by the application audit. No other column may be
--    updated by any authenticated client request.
GRANT UPDATE (student_class, study_medium, avatar_url, onboarding_completed)
  ON public.profiles TO authenticated;

-- C. Full administrative access for service_role (bypasses RLS by default)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

-- ============================================================================
-- 5. Profiles RLS Policies (Session-Enforced & Ownership-Bound)
-- ============================================================================

-- A. SELECT: Users can only read their own profile during an active session
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.profiles;
CREATE POLICY "Enable users to view their own data only"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id AND public.is_active_session());

-- B. UPDATE: Users can only update their own profile during an active session.
--    Column-level grants (section 4-B) restrict WHICH columns may be written.
--    This policy restricts WHICH ROWS may be targeted (own row, active session).
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND public.is_active_session())
  WITH CHECK (auth.uid() = id AND public.is_active_session());

-- C. INSERT: Drop legacy insecure INSERT policy ("WITH CHECK true").
--    No replacement INSERT policy is granted to client roles.
--    Profile creation is strictly performed server-side by public.handle_new_user()
--    running as SECURITY DEFINER owned by postgres (rolbypassrls = true).
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
