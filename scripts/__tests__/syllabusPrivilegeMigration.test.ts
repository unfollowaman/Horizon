import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Syllabus Migration Specification & Privilege Hardening Safety Suite', () => {
  const historicalMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260101000000_create_syllabus_tables.sql'
  );

  const hardeningMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261113153000_harden_syllabus_table_privileges.sql'
  );

  const stripComments = (filePath: string) =>
    fs.readFileSync(filePath, 'utf8').replace(/--.*$/gm, '');

  describe('Historical Migration (20260101000000_create_syllabus_tables.sql)', () => {
    it('1. verifies migration file exists and is readable', () => {
      expect(fs.existsSync(historicalMigrationPath)).toBe(true);
      const sql = fs.readFileSync(historicalMigrationPath, 'utf8');
      expect(sql.length).toBeGreaterThan(500);
    });

    it('2. verifies resource_id is typed as BIGINT matching production learning_resources.id', () => {
      const sql = stripComments(historicalMigrationPath);
      expect(sql).toMatch(/resource_id\s+BIGINT\s+NOT\s+NULL\s+REFERENCES\s+public\.learning_resources\(id\)\s+ON\s+DELETE\s+CASCADE/i);
      expect(sql).not.toMatch(/resource_id\s+UUID/i);
    });

    it('3. verifies table structures match production specifications', () => {
      const sql = stripComments(historicalMigrationPath);
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.syllabus_topics/i);
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.syllabus_topic_resources/i);
      expect(sql).toMatch(/topic_type\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'topic'/i);
      expect(sql).toMatch(/CONSTRAINT\s+syllabus_topic_resources_topic_resource_key\s+UNIQUE\s*\(topic_id,\s*resource_id\)/i);
    });

    it('4. verifies policy creation is safe and idempotent with DROP POLICY IF EXISTS', () => {
      const sql = stripComments(historicalMigrationPath);
      expect(sql).toMatch(/DROP POLICY IF EXISTS\s+"Allow public read access on syllabus_topics"\s+ON\s+public\.syllabus_topics;/i);
      expect(sql).toMatch(/CREATE POLICY\s+"Allow public read access on syllabus_topics"\s+ON\s+public\.syllabus_topics/i);
      expect(sql).toMatch(/DROP POLICY IF EXISTS\s+"Allow public read access on syllabus_topic_resources"\s+ON\s+public\.syllabus_topic_resources;/i);
      expect(sql).toMatch(/CREATE POLICY\s+"Allow public read access on syllabus_topic_resources"\s+ON\s+public\.syllabus_topic_resources/i);
    });

    it('5. verifies negative invariants: does not introduce unwanted columns', () => {
      const sql = stripComments(historicalMigrationPath);
      expect(sql).not.toMatch(/updated_at/i);
      expect(sql).not.toMatch(/syllabus_topic_resources\s*\([^)]*display_order/i);
    });
  });

  describe('Privilege Hardening Forward Migration (20261113153000_harden_syllabus_table_privileges.sql)', () => {
    it('1. verifies hardening migration file exists and is readable', () => {
      expect(fs.existsSync(hardeningMigrationPath)).toBe(true);
      const sql = fs.readFileSync(hardeningMigrationPath, 'utf8');
      expect(sql.length).toBeGreaterThan(500);
    });

    it('2. verifies RLS remains enabled on both tables', () => {
      const sql = stripComments(hardeningMigrationPath);
      expect(sql).toMatch(/ALTER TABLE public\.syllabus_topics ENABLE ROW LEVEL SECURITY;/i);
      expect(sql).toMatch(/ALTER TABLE public\.syllabus_topic_resources ENABLE ROW LEVEL SECURITY;/i);
    });

    it('3. verifies table-level REVOKE ALL includes service_role, authenticated, anon, and PUBLIC', () => {
      const sql = stripComments(hardeningMigrationPath);
      expect(sql).toMatch(/REVOKE ALL ON public\.syllabus_topics FROM service_role;/i);
      expect(sql).toMatch(/REVOKE ALL ON public\.syllabus_topics FROM authenticated;/i);
      expect(sql).toMatch(/REVOKE ALL ON public\.syllabus_topics FROM anon,\s*PUBLIC;/i);
      expect(sql).toMatch(/REVOKE ALL ON public\.syllabus_topic_resources FROM service_role;/i);
      expect(sql).toMatch(/REVOKE ALL ON public\.syllabus_topic_resources FROM authenticated;/i);
      expect(sql).toMatch(/REVOKE ALL ON public\.syllabus_topic_resources FROM anon,\s*PUBLIC;/i);
    });

    it('4. verifies defensive column-level INSERT, UPDATE, and REFERENCES revocation', () => {
      const sql = stripComments(hardeningMigrationPath);
      // syllabus_topics
      expect(sql).toMatch(/REVOKE INSERT\s*\([^)]*\)\s*ON public\.syllabus_topics FROM PUBLIC,\s*anon,\s*authenticated;/i);
      expect(sql).toMatch(/REVOKE UPDATE\s*\([^)]*\)\s*ON public\.syllabus_topics FROM PUBLIC,\s*anon,\s*authenticated;/i);
      expect(sql).toMatch(/REVOKE REFERENCES\s*\([^)]*\)\s*ON public\.syllabus_topics FROM PUBLIC,\s*anon,\s*authenticated;/i);

      // syllabus_topic_resources
      expect(sql).toMatch(/REVOKE INSERT\s*\([^)]*\)\s*ON public\.syllabus_topic_resources FROM PUBLIC,\s*anon,\s*authenticated;/i);
      expect(sql).toMatch(/REVOKE UPDATE\s*\([^)]*\)\s*ON public\.syllabus_topic_resources FROM PUBLIC,\s*anon,\s*authenticated;/i);
      expect(sql).toMatch(/REVOKE REFERENCES\s*\([^)]*\)\s*ON public\.syllabus_topic_resources FROM PUBLIC,\s*anon,\s*authenticated;/i);
    });

    it('5. verifies explicit SELECT grant for client roles', () => {
      const sql = stripComments(hardeningMigrationPath);
      expect(sql).toMatch(/GRANT SELECT ON public\.syllabus_topics TO anon,\s*authenticated;/i);
      expect(sql).toMatch(/GRANT SELECT ON public\.syllabus_topic_resources TO anon,\s*authenticated;/i);
    });

    it('6. verifies strictly operational access (SELECT, INSERT, UPDATE, DELETE) for service_role', () => {
      const sql = stripComments(hardeningMigrationPath);
      expect(sql).toMatch(/GRANT SELECT,\s*INSERT,\s*UPDATE,\s*DELETE ON public\.syllabus_topics TO service_role;/i);
      expect(sql).toMatch(/GRANT SELECT,\s*INSERT,\s*UPDATE,\s*DELETE ON public\.syllabus_topic_resources TO service_role;/i);
    });

    it('7. verifies security-critical negative assertions for client roles', () => {
      const sql = stripComments(hardeningMigrationPath);
      // No client INSERT
      expect(sql).not.toMatch(/GRANT[^;]*INSERT[^;]*ON public\.syllabus_topics TO (?!service_role)[^;]*/i);
      expect(sql).not.toMatch(/GRANT[^;]*INSERT[^;]*ON public\.syllabus_topic_resources TO (?!service_role)[^;]*/i);
      // No client UPDATE
      expect(sql).not.toMatch(/GRANT[^;]*UPDATE[^;]*ON public\.syllabus_topics TO (?!service_role)[^;]*/i);
      expect(sql).not.toMatch(/GRANT[^;]*UPDATE[^;]*ON public\.syllabus_topic_resources TO (?!service_role)[^;]*/i);
      // No client DELETE
      expect(sql).not.toMatch(/GRANT[^;]*DELETE[^;]*ON public\.syllabus_topics TO (?!service_role)[^;]*/i);
      expect(sql).not.toMatch(/GRANT[^;]*DELETE[^;]*ON public\.syllabus_topic_resources TO (?!service_role)[^;]*/i);
      // No TRUNCATE granted to ANY role (including service_role)
      expect(sql).not.toMatch(/GRANT[^;]*TRUNCATE[^;]*ON public\.syllabus_topics/i);
      expect(sql).not.toMatch(/GRANT[^;]*TRUNCATE[^;]*ON public\.syllabus_topic_resources/i);
    });
  });
});
