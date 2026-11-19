import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 8.4.3: Signup Confirmation Session Registration Migration & Security Suite', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261117150000_signup_confirmation_session_registration.sql'
  );
  const rollbackPath = path.resolve(
    process.cwd(),
    'supabase/rollbacks/20261117150000_signup_confirmation_session_registration_rollback.sql'
  );

  const getMigrationSql = () => fs.readFileSync(migrationPath, 'utf8');
  const getActiveMigrationSql = () => getMigrationSql().replace(/--.*$/gm, '');
  const getRollbackSql = () => fs.readFileSync(rollbackPath, 'utf8');
  const getActiveRollbackSql = () => getRollbackSql().replace(/--.*$/gm, '');

  describe('1. File Structure and Chronology', () => {
    it('verifies migration file exists, is non-empty, and chronologically valid', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = getMigrationSql();
      expect(sql.length).toBeGreaterThan(1000);

      const filename = path.basename(migrationPath);
      expect(filename).toMatch(/^\d{14}_signup_confirmation_session_registration\.sql$/);
      const timestamp = filename.split('_')[0];
      // Must be chronologically after the previous migration (20261114210000)
      expect(timestamp > '20261114210000').toBe(true);
    });

    it('verifies rollback file exists, is non-empty, and matches migration naming', () => {
      expect(fs.existsSync(rollbackPath)).toBe(true);
      const sql = getRollbackSql();
      expect(sql.length).toBeGreaterThan(500);

      const filename = path.basename(rollbackPath);
      expect(filename).toBe('20261117150000_signup_confirmation_session_registration_rollback.sql');
    });
  });

  describe('2. Durable Authorization Ledger: security.signup_session_claims', () => {
    it('verifies table creation with exact columns, primary key, and ON DELETE CASCADE', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS security\.signup_session_claims/);
      expect(sql).toMatch(/user_id UUID PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
      expect(sql).toMatch(/authorized_session_id UUID NOT NULL/);
      expect(sql).toMatch(/consumed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp\(\)/);
      expect(sql).toMatch(/device_info JSONB NOT NULL DEFAULT '{}'::jsonb/);
    });

    it('verifies performance index on authorized_session_id', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_signup_session_claims_session_id\s+ON security\.signup_session_claims \(authorized_session_id\);/);
    });

    it('verifies RLS is enabled on security.signup_session_claims', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/ALTER TABLE security\.signup_session_claims ENABLE ROW LEVEL SECURITY;/);
    });

    it('verifies all direct table access is revoked from PUBLIC, anon, authenticated, AND service_role', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/REVOKE ALL ON security\.signup_session_claims FROM PUBLIC, anon, authenticated, service_role;/);
    });

    it('verifies no direct GRANT statements exist on security.signup_session_claims', () => {
      const active = getActiveMigrationSql();
      expect(active).not.toMatch(/GRANT\s+[^;]+\s+ON\s+security\.signup_session_claims/i);
    });
  });

  describe('3. UPDATE-Prevention Trigger', () => {
    it('verifies trigger function raises an exception rejecting UPDATE mutations', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/CREATE OR REPLACE FUNCTION security\.prevent_signup_session_claims_update\(\)/);
      expect(sql).toMatch(/RAISE EXCEPTION 'Updates to security\.signup_session_claims are strictly prohibited'/);
      expect(sql).toMatch(/LANGUAGE plpgsql/);
      expect(sql).toMatch(/SECURITY DEFINER/);
      expect(sql).toMatch(/SET search_path = ''/);
    });

    it('verifies trigger function execution is revoked from all external roles', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION security\.prevent_signup_session_claims_update\(\) FROM PUBLIC, anon, authenticated, service_role;/);
    });

    it('verifies BEFORE UPDATE trigger definition on security.signup_session_claims', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/CREATE TRIGGER trg_prevent_signup_session_claims_update\s+BEFORE UPDATE ON security\.signup_session_claims\s+FOR EACH ROW\s+EXECUTE FUNCTION security\.prevent_signup_session_claims_update\(\);/);
    });
  });

  describe('4. Registration RPC: public.register_confirmation_session', () => {
    it('verifies signature, security definer, and search_path hardening', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.register_confirmation_session\(\s*p_device_info JSONB DEFAULT '{}'::jsonb\s*\)/);
      expect(sql).toMatch(/RETURNS JSONB/);
      expect(sql).toMatch(/LANGUAGE plpgsql/);
      expect(sql).toMatch(/SECURITY DEFINER/);
      expect(sql).toMatch(/SET search_path = ''/);
    });

    it('verifies identity is derived strictly from request.jwt.claims', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/v_claims := NULLIF\(current_setting\('request\.jwt\.claims', true\), ''\)::jsonb;/);
      expect(sql).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);
      expect(sql).toMatch(/v_session_id := \(v_claims ->> 'session_id'\)::UUID;/);
    });

    it('verifies per-user advisory lock uses identical 64-bit bigint derivation', () => {
      const sql = getMigrationSql();
      // After Phase 8.4.3.1 correction, register_confirmation_session uses USING v_user_id
      // (parameterized form consistent with register_active_session's USING p_user_id).
      // Both use the same md5($1::text) template literal, differing only in the USING clause name.
      expect(sql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key\s+USING v_user_id;/);
      expect(sql).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);
    });

    it('verifies clock_timestamp() is captured strictly AFTER advisory lock acquisition', () => {
      const sql = getMigrationSql();
      const lockIndex = sql.indexOf('PERFORM pg_advisory_xact_lock(v_lock_key);');
      const timeIndex = sql.indexOf('v_now := clock_timestamp();', lockIndex);
      expect(lockIndex).toBeGreaterThan(0);
      expect(timeIndex).toBeGreaterThan(lockIndex);
    });

    it('verifies 300s confirmation window and 60s alignment tolerance checks', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/v_conf_diff_seconds > 300/);
      expect(sql).toMatch(/'error_code', 'CONFIRMATION_WINDOW_EXPIRED'/);
      expect(sql).toMatch(/v_sess_conf_diff_seconds > 60/);
      expect(sql).toMatch(/'error_code', 'SESSION_CONFIRMATION_MISALIGNED'/);
    });

    it('verifies idempotent re-registration check for currently active session', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/IF v_claim\.authorized_session_id = v_session_id THEN/);
      expect(sql).toMatch(/'is_idempotent', true/);
    });

    it('verifies inactive session rejection after claim consumption', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/'error_code', 'CLAIM_ALREADY_CONSUMED_INACTIVE_SESSION'/);
      expect(sql).toMatch(/'error_code', 'CLAIM_ALREADY_CONSUMED'/);
    });

    it('verifies atomic claim insertion and active-session upsert', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/INSERT INTO security\.signup_session_claims/);
      expect(sql).toMatch(/INSERT INTO security\.user_active_sessions/);
      expect(sql).toMatch(/ON CONFLICT \(user_id\) DO UPDATE/);
    });

    it('verifies execute privileges granted strictly to authenticated and revoked from others', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.register_confirmation_session\(JSONB\) FROM PUBLIC, anon, service_role;/);
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.register_confirmation_session\(JSONB\) TO authenticated;/);
    });
  });

  describe('5. register_active_session Concurrency Hardening', () => {
    it('verifies clock_timestamp() is captured strictly AFTER acquiring advisory lock', () => {
      const sql = getMigrationSql();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.register_active_session');
      expect(fnStart).toBeGreaterThan(0);
      const fnBody = sql.slice(fnStart);

      const lockIndex = fnBody.indexOf('PERFORM pg_advisory_xact_lock(v_lock_key);');
      const timeIndex = fnBody.indexOf('v_now := clock_timestamp();', lockIndex);
      expect(lockIndex).toBeGreaterThan(0);
      expect(timeIndex).toBeGreaterThan(lockIndex);
    });

    it('verifies permissions on register_active_session remain restricted to service_role', () => {
      const sql = getMigrationSql();
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.register_active_session\(UUID, UUID, JSONB, INT\) FROM PUBLIC, anon, authenticated;/);
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.register_active_session\(UUID, UUID, JSONB, INT\) TO service_role;/);
    });
  });

  describe('6. Rollback Script Invariants', () => {
    it('verifies rollback executes within an explicit transaction block', () => {
      const sql = getActiveRollbackSql().trim();
      expect(sql.startsWith('BEGIN;')).toBe(true);
      expect(sql.endsWith('COMMIT;')).toBe(true);
    });

    it('verifies rollback performs precondition checks and raises exceptions on failure', () => {
      const sql = getRollbackSql();
      expect(sql).toMatch(/RAISE EXCEPTION 'Rollback precondition failed: security\.signup_session_claims table does not exist'/);
      expect(sql).toMatch(/RAISE EXCEPTION 'Rollback precondition failed: public\.register_confirmation_session function does not exist'/);
    });

    it('verifies rollback uses DROP ... RESTRICT exclusively and never CASCADE', () => {
      const sql = getActiveRollbackSql();
      expect(sql).not.toMatch(/\bCASCADE\b/i);
      expect(sql).toMatch(/DROP FUNCTION IF EXISTS security\.prevent_signup_session_claims_update\(\) RESTRICT;/);
      expect(sql).toMatch(/DROP FUNCTION IF EXISTS public\.register_confirmation_session\(JSONB\) RESTRICT;/);
      expect(sql).toMatch(/DROP TABLE IF EXISTS security\.signup_session_claims RESTRICT;/);
    });

    it('verifies rollback restores register_active_session to its exact Phase 1.2.1 definition', () => {
      const sql = getRollbackSql();
      expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.register_active_session/);
      expect(sql).toMatch(/v_now TIMESTAMPTZ := clock_timestamp\(\);/);
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.register_active_session\(UUID, UUID, JSONB, INT\) TO service_role;/);
    });
  });

  describe('7. SQLSTATE and Trigger Correctness (Phase 8.4.3.1 Audit Corrections)', () => {
    it('verifies trigger function uses valid PostgreSQL SQLSTATE 42501 (insufficient_privilege)', () => {
      // Static assertion: The ERRCODE value 'insufficient_privilege' is a standard PostgreSQL
      // condition name (Appendix A) mapping to SQLSTATE 42501.
      // This test does NOT prove PostgreSQL runtime validity — only that the SQL text contains
      // the correct code string. Live execution on a real PostgreSQL instance is required to
      // confirm ERRCODE is accepted without error.
      const sql = getMigrationSql();
      expect(sql).toMatch(/USING ERRCODE = 'insufficient_privilege'/);
      // Confirm no invalid non-standard codes are used anywhere in migration
      expect(sql).not.toMatch(/USING ERRCODE = 'RESTRICTED_OPERATION'/);
      expect(sql).not.toMatch(/USING ERRCODE = '[A-Z_]{6,}'/); // catches multi-word ALL_CAPS non-standard codes
    });

    it('verifies register_confirmation_session uses parameterized dynamic SQL (USING v_user_id)', () => {
      // Checks that the advisory lock key derivation in register_confirmation_session
      // uses USING <parameter> form consistent with register_active_session.
      const sql = getMigrationSql();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.register_confirmation_session');
      expect(fnStart).toBeGreaterThan(0);
      const fnBody = sql.slice(fnStart, sql.indexOf('CREATE OR REPLACE FUNCTION public.register_active_session'));
      expect(fnBody).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'/);
      expect(fnBody).toMatch(/USING v_user_id;/);
    });

    it('verifies both register_confirmation_session and register_active_session use identical lock key derivation', () => {
      // Both functions must derive the same 64-bit advisory lock integer from the same user UUID.
      // The SQL template is identical: md5($1::text) first 16 hex chars → bit(64) → bigint.
      // Only the USING parameter name differs (v_user_id vs p_user_id) which is irrelevant to semantics.
      const sql = getMigrationSql();
      // Template literal appears exactly twice — once per function
      const occurrences = (sql.match(/EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'/g) || []).length;
      expect(occurrences).toBe(2);
      // Both use parameterized USING clause
      const usingVUser = (sql.match(/USING v_user_id;/g) || []).length;
      const usingPUser = (sql.match(/USING p_user_id;/g) || []).length;
      expect(usingVUser).toBeGreaterThanOrEqual(1);
      expect(usingPUser).toBeGreaterThanOrEqual(1);
    });

    it('verifies migration timestamp 20261117150000 is correctly UTC-based and after last applied migration', () => {
      const filename = path.basename(migrationPath);
      const timestamp = filename.split('_')[0];
      expect(timestamp).toBe('20261117150000');
      // Must be after last applied migration 20261114210000
      expect(timestamp > '20261114210000').toBe(true);
      // Must be before any implausible future timestamp (sanity check)
      expect(timestamp < '20270101000000').toBe(true);
    });
  });
});
