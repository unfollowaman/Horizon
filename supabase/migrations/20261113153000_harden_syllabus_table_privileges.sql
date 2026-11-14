-- Migration: Harden Syllabus Table Privileges
-- Timestamp: 20261113153000
-- Target tables: public.syllabus_topics, public.syllabus_topic_resources
--
-- ============================================================================
-- Architecture & Security Summary:
-- ============================================================================
-- 1. Cleanses excessive table-level privileges (TRUNCATE, REFERENCES, TRIGGER,
--    MAINTAIN) inherited from default ACLs on public.syllabus_topics and
--    public.syllabus_topic_resources from all client roles (PUBLIC, anon,
--    authenticated) AND service_role.
-- 2. Explicitly revokes column-level write and reference privileges (INSERT,
--    UPDATE, REFERENCES) on all columns of both tables from PUBLIC, anon,
--    and authenticated, establishing a clean defensive least-privilege baseline.
-- 3. Grants explicit table-level SELECT permissions to anon and authenticated
--    to preserve public read access governed by Row Level Security (RLS).
-- 4. Grants strictly operational table-level permissions (SELECT, INSERT, UPDATE,
--    DELETE) to service_role, removing its legacy TRUNCATE/TRIGGER/REFERENCES/
--    MAINTAIN privileges while enabling trusted administrative operations and
--    server-side seeding scripts.
-- 5. Preserves existing RLS enablement and existing public SELECT policies unchanged.
-- ============================================================================

-- ============================================================================
-- 1. Ensure Row Level Security Remains Enabled
-- ============================================================================
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topic_resources ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Table-Level Privilege Revocation (Least-Privilege Baseline)
-- ============================================================================
-- Revoke all existing table-level privileges from client roles and service_role.
-- Eliminates legacy TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, and any broad
-- table-level mutation privileges across all non-owner roles.
REVOKE ALL ON public.syllabus_topics FROM service_role;
REVOKE ALL ON public.syllabus_topics FROM authenticated;
REVOKE ALL ON public.syllabus_topics FROM anon, PUBLIC;

REVOKE ALL ON public.syllabus_topic_resources FROM service_role;
REVOKE ALL ON public.syllabus_topic_resources FROM authenticated;
REVOKE ALL ON public.syllabus_topic_resources FROM anon, PUBLIC;

-- ============================================================================
-- 3. Column-Level Privilege Revocation (Defensive Baseline)
-- ============================================================================
-- PostgreSQL stores column-level privileges independently of table-level privileges.
-- Explicitly revoke column-level INSERT, UPDATE, and REFERENCES on all columns
-- from client roles to ensure no residual grants exist.
--
-- Columns in public.syllabus_topics:
--   id, chapter_id, title, description, topic_type, display_order, is_active, created_at
REVOKE INSERT (id, chapter_id, title, description, topic_type, display_order, is_active, created_at)
  ON public.syllabus_topics FROM PUBLIC, anon, authenticated;

REVOKE UPDATE (id, chapter_id, title, description, topic_type, display_order, is_active, created_at)
  ON public.syllabus_topics FROM PUBLIC, anon, authenticated;

REVOKE REFERENCES (id, chapter_id, title, description, topic_type, display_order, is_active, created_at)
  ON public.syllabus_topics FROM PUBLIC, anon, authenticated;

-- Columns in public.syllabus_topic_resources:
--   id, topic_id, resource_id, created_at
REVOKE INSERT (id, topic_id, resource_id, created_at)
  ON public.syllabus_topic_resources FROM PUBLIC, anon, authenticated;

REVOKE UPDATE (id, topic_id, resource_id, created_at)
  ON public.syllabus_topic_resources FROM PUBLIC, anon, authenticated;

REVOKE REFERENCES (id, topic_id, resource_id, created_at)
  ON public.syllabus_topic_resources FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 4. Targeted Client Role Grants (Public Read Access)
-- ============================================================================
-- Grant SELECT to client roles (filtered by existing RLS policies)
GRANT SELECT ON public.syllabus_topics TO anon, authenticated;
GRANT SELECT ON public.syllabus_topic_resources TO anon, authenticated;

-- ============================================================================
-- 5. Targeted Administrative Grants for service_role
-- ============================================================================
-- Grant strictly operational access to service_role (SELECT, INSERT, UPDATE, DELETE).
-- Excessive TRUNCATE, TRIGGER, REFERENCES, and MAINTAIN privileges remain revoked.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_topics TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_topic_resources TO service_role;
