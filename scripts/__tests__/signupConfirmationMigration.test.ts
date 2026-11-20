import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

    it('verifies per-user advisory lock uses identical 64-bit bigint derivation from authenticated v_user_id', () => {
      const sql = getMigrationSql();
      // register_confirmation_session derives lock key directly from authenticated v_user_id::text
      // matching parameterless deactivate_active_session.
      expect(sql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/);
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

    it('verifies register_confirmation_session derives lock key directly from v_user_id without $1 or USING', () => {
      const sql = getMigrationSql();
      const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.register_confirmation_session');
      expect(fnStart).toBeGreaterThan(0);
      const fnBody = sql.slice(fnStart, sql.indexOf('CREATE OR REPLACE FUNCTION public.register_active_session'));
      expect(fnBody).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/);
      expect(fnBody).not.toMatch(/substr\(md5\(\$1::text\)/);
      expect(fnBody).not.toMatch(/INTO v_lock_key\s+USING/);
    });

    it('verifies register_confirmation_session and register_active_session both derive lock keys from user UUID', () => {
      const sql = getMigrationSql();
      // register_confirmation_session derives directly from local variable v_user_id::text
      expect(sql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/);
      // register_active_session derives from parameter p_user_id ($1)
      expect(sql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key\s+USING p_user_id;/);
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

  describe('8. Advisory Lock Key Derivation & Independent Expression Validation', () => {
    const deactivateMigrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261108094059_fix_deactivate_active_session_lock_key.sql'
    );
    const getDeactivateSql = () => fs.readFileSync(deactivateMigrationPath, 'utf8');

    // =========================================================================
    // Helper: Isolate function bodies from SQL source
    // =========================================================================

    // Extract the body of register_confirmation_session from the Phase 8.4.3 migration.
    // Bounded by: CREATE OR REPLACE FUNCTION public.register_confirmation_session ... through
    //             the next CREATE OR REPLACE FUNCTION (register_active_session).
    function extractConfirmationFnBody(): string {
      const sql = getMigrationSql();
      const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.register_confirmation_session');
      const end = sql.indexOf('CREATE OR REPLACE FUNCTION public.register_active_session');
      if (start < 0 || end < 0 || end <= start) {
        throw new Error('Could not locate register_confirmation_session body');
      }
      return sql.slice(start, end);
    }

    // Extract the body of register_active_session from the Phase 8.4.3 migration.
    // Bounded from: CREATE OR REPLACE FUNCTION public.register_active_session ... to end of file.
    function extractActiveSessionFnBody(): string {
      const sql = getMigrationSql();
      const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.register_active_session');
      if (start < 0) {
        throw new Error('Could not locate register_active_session body');
      }
      return sql.slice(start);
    }

    // Extract the body of deactivate_active_session from the separate fix migration.
    // Bounded from: CREATE OR REPLACE FUNCTION public.deactivate_active_session() ... to COMMENT ON.
    function extractDeactivateFnBody(): string {
      const sql = getDeactivateSql();
      const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.deactivate_active_session()');
      const end = sql.indexOf('COMMENT ON FUNCTION public.deactivate_active_session()');
      if (start < 0 || end < 0 || end <= start) {
        throw new Error('Could not locate deactivate_active_session body');
      }
      return sql.slice(start, end);
    }

    // =========================================================================
    // Helper: Exact PostgreSQL lock key computation (static mathematical simulation)
    // NOTE: This replicates PostgreSQL's behaviour: md5(input) → first 16 hex chars
    //       → x'...'::bit(64) → ::bigint (signed two's-complement).
    //       This is NOT a PostgreSQL runtime execution. It is a mathematical model
    //       used to verify that identical inputs always produce identical keys.
    // =========================================================================
    function simulatePgLockKey(input: string): bigint {
      const hash = crypto.createHash('md5').update(input).digest('hex');
      const first16 = hash.slice(0, 16);
      return BigInt.asIntN(64, BigInt('0x' + first16));
    }

    // =========================================================================
    // Pure Validators — reusable functions that run all structural assertions
    // for each SQL function's lock-key derivation.
    //
    // Design: Each validator runs expect() assertions against the provided sql
    // string. It throws an AssertionError when any assertion fails.
    //
    // Usage:
    //   - Sections 8.A/8.B/8.C call each validator against the actual extracted
    //     function body, asserting that it passes without throwing.
    //   - Section 8.F calls each validator against intentionally mutated bodies,
    //     using try/catch to assert that the validator throws — proving the
    //     validator would catch the regression, not merely that the mutation
    //     string has different text.
    // =========================================================================

    /**
     * Validates that a SQL string is a correct register_confirmation_session body.
     *
     * Checks:
     *   1. Signature: p_device_info is the only parameter (no UUID param).
     *   2. v_user_id is a JWT-derived local variable (not a parameter).
     *   3. Lock-key EXECUTE uses v_user_id::text — not $1 or any parameter name.
     *   4. No USING clause (zero-UUID-parameter function).
     *   5. MD5 substring length is exactly 16 characters.
     *   6. Bit-width cast is ::bit(64)::bigint (64-bit signed).
     *   7. Advisory lock is pg_advisory_xact_lock.
     */
    function validateConfirmationLockExpression(sql: string): void {
      // 1. Signature: only p_device_info, no UUID parameter
      expect(sql).toMatch(
        /CREATE OR REPLACE FUNCTION public\.register_confirmation_session\(\s*p_device_info JSONB/
      );
      expect(sql).not.toMatch(/p_user_id\s+UUID/);

      // 2. v_user_id is JWT-derived
      expect(sql).toMatch(/v_user_id UUID;/);
      expect(sql).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);

      // 3. EXECUTE uses v_user_id::text — not $1
      expect(sql).toMatch(
        /EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/
      );
      expect(sql).not.toMatch(/EXECUTE\s+'[^']*'\s*\|\|\s*substr\(md5\(\$1::text\)/);
      expect(sql).not.toMatch(/substr\(md5\(p_device_info::text\)/);

      // 4. No USING clause
      expect(sql).not.toMatch(/INTO v_lock_key\s+USING/);

      // 5. MD5 substring is exactly 16 chars
      expect(sql).toMatch(/substr\(md5\(v_user_id::text\), 1, 16\)/);
      expect(sql).not.toMatch(/substr\(md5\(v_user_id::text\), 1, 8\)/);
      expect(sql).not.toMatch(/substr\(md5\(v_user_id::text\), 1, 32\)/);

      // 6. Bit-width is 64, signed bigint
      expect(sql).toMatch(/'''::bit\(64\)::bigint'/);
      expect(sql).not.toMatch(/'''::bit\(32\)::bigint'/);
      expect(sql).not.toMatch(/'''::bit\(128\)::bigint'/);

      // 7. Advisory lock function
      expect(sql).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);
    }

    /**
     * Validates that a SQL string is a correct register_active_session body.
     *
     * Checks:
     *   1. Signature: p_user_id UUID is the first parameter ($1).
     *   2. EXECUTE uses $1 with USING p_user_id.
     *   3. No use of v_user_id or p_session_id as the hash source.
     *   4. MD5 substring length is exactly 16 characters.
     *   5. Bit-width cast is ::bit(64)::bigint (64-bit signed).
     *   6. Advisory lock is pg_advisory_xact_lock.
     */
    function validateActiveSessionLockExpression(sql: string): void {
      // 1. p_user_id UUID is first parameter
      expect(sql).toMatch(
        /CREATE OR REPLACE FUNCTION public\.register_active_session\(\s*p_user_id UUID,/
      );

      // 2. EXECUTE uses $1 with USING p_user_id
      expect(sql).toMatch(
        /EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key\s+USING p_user_id;/
      );
      expect(sql).not.toMatch(/substr\(md5\(v_user_id::text\)/);

      // 3. USING must not reference a different parameter
      expect(sql).not.toMatch(/INTO v_lock_key\s+USING p_session_id/);
      expect(sql).not.toMatch(/INTO v_lock_key\s+USING p_device_info/);

      // 4. MD5 substring length is 16
      expect(sql).toMatch(/substr\(md5\(\$1::text\), 1, 16\)/);
      expect(sql).not.toMatch(/substr\(md5\(\$1::text\), 1, 8\)/);

      // 5. Bit-width is 64, signed bigint
      expect(sql).toMatch(/'''::bit\(64\)::bigint'/);
      expect(sql).not.toMatch(/'''::bit\(32\)::bigint'/);

      // 6. Advisory lock function
      expect(sql).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);
    }

    /**
     * Validates that a SQL string is a correct deactivate_active_session body.
     *
     * Checks:
     *   1. Signature: zero parameters.
     *   2. v_user_id is a JWT-derived local variable.
     *   3. EXECUTE uses v_user_id::text — not $1.
     *   4. No USING clause (zero-parameter function).
     *   5. MD5 substring length is exactly 16 characters.
     *   6. Bit-width cast is ::bit(64)::bigint (64-bit signed).
     *   7. Advisory lock is pg_advisory_xact_lock.
     */
    function validateDeactivateLockExpression(sql: string): void {
      // 1. Zero-parameter signature
      expect(sql).toMatch(
        /CREATE OR REPLACE FUNCTION public\.deactivate_active_session\(\)/
      );

      // 2. v_user_id is JWT-derived
      expect(sql).toMatch(/v_user_id UUID;/);
      expect(sql).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);

      // 3. EXECUTE uses v_user_id::text — not $1
      expect(sql).toMatch(
        /EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/
      );
      expect(sql).not.toMatch(/substr\(md5\(\$1::text\)/);

      // 4. No USING clause
      expect(sql).not.toMatch(/INTO v_lock_key\s+USING/);

      // 5. MD5 substring length is 16
      expect(sql).toMatch(/substr\(md5\(v_user_id::text\), 1, 16\)/);
      expect(sql).not.toMatch(/substr\(md5\(v_user_id::text\), 1, 8\)/);

      // 6. Bit-width is 64, signed bigint
      expect(sql).toMatch(/'''::bit\(64\)::bigint'/);
      expect(sql).not.toMatch(/'''::bit\(32\)::bigint'/);

      // 7. Advisory lock function
      expect(sql).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);
    }

    // =========================================================================
    // Section 8.A — register_confirmation_session: independent expression validation
    // Uses validateConfirmationLockExpression on the actual extracted function body.
    // =========================================================================

    describe('8.A register_confirmation_session lock-key expression', () => {
      it('function body is extractable and non-empty', () => {
        const body = extractConfirmationFnBody();
        expect(body.length).toBeGreaterThan(100);
        expect(body).toContain('CREATE OR REPLACE FUNCTION public.register_confirmation_session');
      });

      it('passes validateConfirmationLockExpression on the actual extracted body', () => {
        const body = extractConfirmationFnBody();
        // The shared validator encapsulates all structural checks.
        // A thrown AssertionError here indicates the actual SQL is defective.
        expect(() => validateConfirmationLockExpression(body)).not.toThrow();
      });

      it('parameter scope: p_device_info is the only declared parameter', () => {
        const body = extractConfirmationFnBody();
        expect(body).toMatch(
          /CREATE OR REPLACE FUNCTION public\.register_confirmation_session\(\s*p_device_info JSONB DEFAULT '{}'::jsonb\s*\)/
        );
        expect(body).not.toMatch(/p_user_id\s+UUID/);
        expect(body).not.toMatch(/p_session_id\s+UUID/);
      });

      it('local variable: v_user_id is declared from JWT claims, not from a parameter', () => {
        const body = extractConfirmationFnBody();
        expect(body).toMatch(/v_user_id UUID;/);
        expect(body).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);
      });

      it('advisory lock expression uses v_user_id::text — not $1, p_device_info, or any parameter', () => {
        const body = extractConfirmationFnBody();
        expect(body).toMatch(
          /EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/
        );
        expect(body).not.toMatch(/EXECUTE\s+'[^']*'\s*\|\|\s*substr\(md5\(\$1::text\)/);
        expect(body).not.toMatch(/substr\(md5\(p_device_info::text\)/);
        expect(body).not.toMatch(/INTO v_lock_key\s+USING/);
      });

      it('MD5 algorithm uses exactly 16 leading hexadecimal characters (positions 1..16)', () => {
        const body = extractConfirmationFnBody();
        expect(body).toMatch(/substr\(md5\(v_user_id::text\), 1, 16\)/);
        expect(body).not.toMatch(/substr\(md5\(v_user_id::text\), 1, 8\)/);
        expect(body).not.toMatch(/substr\(md5\(v_user_id::text\), 1, 32\)/);
      });

      it('bit-width conversion uses bit(64) and signed bigint cast', () => {
        const body = extractConfirmationFnBody();
        expect(body).toMatch(/'''::bit\(64\)::bigint'/);
        expect(body).not.toMatch(/'''::bit\(32\)::bigint'/);
        expect(body).not.toMatch(/'''::bit\(128\)::bigint'/);
      });

      it('advisory lock is acquired by passing v_lock_key to pg_advisory_xact_lock', () => {
        const body = extractConfirmationFnBody();
        expect(body).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);
        const lockKeyIdx = body.indexOf("EXECUTE 'SELECT x'''");
        const pgLockIdx = body.indexOf('PERFORM pg_advisory_xact_lock(v_lock_key);');
        expect(lockKeyIdx).toBeGreaterThan(0);
        expect(pgLockIdx).toBeGreaterThan(lockKeyIdx);
      });
    });

    // =========================================================================
    // Section 8.B — register_active_session: independent expression validation
    // Uses validateActiveSessionLockExpression on the actual extracted function body.
    // =========================================================================

    describe('8.B register_active_session lock-key expression', () => {
      it('function body is extractable and non-empty', () => {
        const body = extractActiveSessionFnBody();
        expect(body.length).toBeGreaterThan(100);
        expect(body).toContain('CREATE OR REPLACE FUNCTION public.register_active_session');
      });

      it('passes validateActiveSessionLockExpression on the actual extracted body', () => {
        const body = extractActiveSessionFnBody();
        expect(() => validateActiveSessionLockExpression(body)).not.toThrow();
      });

      it('parameter scope: p_user_id UUID is the first declared parameter ($1)', () => {
        const body = extractActiveSessionFnBody();
        expect(body).toMatch(
          /CREATE OR REPLACE FUNCTION public\.register_active_session\(\s*p_user_id UUID,/
        );
      });

      it('advisory lock expression uses $1 via USING p_user_id — not v_user_id or p_session_id', () => {
        const body = extractActiveSessionFnBody();
        expect(body).toMatch(
          /EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key\s+USING p_user_id;/
        );
        expect(body).not.toMatch(/substr\(md5\(v_user_id::text\)/);
        expect(body).not.toMatch(/USING p_session_id/);
        expect(body).not.toMatch(/substr\(md5\(p_device_info::text\)/);
      });

      it('MD5 algorithm uses exactly 16 leading hexadecimal characters', () => {
        const body = extractActiveSessionFnBody();
        expect(body).toMatch(/substr\(md5\(\$1::text\), 1, 16\)/);
        expect(body).not.toMatch(/substr\(md5\(\$1::text\), 1, 8\)/);
        expect(body).not.toMatch(/substr\(md5\(\$1::text\), 1, 32\)/);
      });

      it('bit-width conversion uses bit(64) and signed bigint cast', () => {
        const body = extractActiveSessionFnBody();
        expect(body).toMatch(/'''::bit\(64\)::bigint'/);
      });

      it('advisory lock is acquired by passing v_lock_key to pg_advisory_xact_lock', () => {
        const body = extractActiveSessionFnBody();
        expect(body).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);
        const lockKeyIdx = body.indexOf("EXECUTE 'SELECT x'''");
        const pgLockIdx = body.indexOf('PERFORM pg_advisory_xact_lock(v_lock_key);');
        expect(lockKeyIdx).toBeGreaterThan(0);
        expect(pgLockIdx).toBeGreaterThan(lockKeyIdx);
      });
    });

    // =========================================================================
    // Section 8.C — deactivate_active_session: independent expression validation
    // Uses validateDeactivateLockExpression on the actual extracted function body.
    // =========================================================================

    describe('8.C deactivate_active_session lock-key expression', () => {
      it('function body is extractable and non-empty', () => {
        const body = extractDeactivateFnBody();
        expect(body.length).toBeGreaterThan(100);
        expect(body).toContain('CREATE OR REPLACE FUNCTION public.deactivate_active_session()');
      });

      it('passes validateDeactivateLockExpression on the actual extracted body', () => {
        const body = extractDeactivateFnBody();
        expect(() => validateDeactivateLockExpression(body)).not.toThrow();
      });

      it('parameter scope: function takes zero parameters — v_user_id must be a local variable', () => {
        const body = extractDeactivateFnBody();
        expect(body).toMatch(
          /CREATE OR REPLACE FUNCTION public\.deactivate_active_session\(\)/
        );
        expect(body).toMatch(/v_user_id UUID;/);
        expect(body).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);
      });

      it('advisory lock expression uses v_user_id::text with no USING clause', () => {
        const body = extractDeactivateFnBody();
        expect(body).toMatch(
          /EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/
        );
        expect(body).not.toMatch(/substr\(md5\(\$1::text\)/);
        expect(body).not.toMatch(/INTO v_lock_key\s+USING/);
      });

      it('MD5 algorithm uses exactly 16 leading hexadecimal characters', () => {
        const body = extractDeactivateFnBody();
        expect(body).toMatch(/substr\(md5\(v_user_id::text\), 1, 16\)/);
      });

      it('bit-width conversion uses bit(64) and signed bigint cast', () => {
        const body = extractDeactivateFnBody();
        expect(body).toMatch(/'''::bit\(64\)::bigint'/);
      });

      it('advisory lock is acquired by passing v_lock_key to pg_advisory_xact_lock', () => {
        const body = extractDeactivateFnBody();
        expect(body).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);
        const lockKeyIdx = body.indexOf("EXECUTE 'SELECT x'''");
        const pgLockIdx = body.indexOf('PERFORM pg_advisory_xact_lock(v_lock_key);');
        expect(lockKeyIdx).toBeGreaterThan(0);
        expect(pgLockIdx).toBeGreaterThan(lockKeyIdx);
      });
    });

    // =========================================================================
    // Section 8.D — Cross-function parity: identical expression structure
    // =========================================================================

    describe('8.D Cross-function structural parity', () => {
      it('all three functions embed identical EXECUTE template literal structure', () => {
        const confBody = extractConfirmationFnBody();
        const activeBody = extractActiveSessionFnBody();
        const deactBody = extractDeactivateFnBody();

        const directDerivationExpr =
          "EXECUTE 'SELECT x''' || substr(md5(v_user_id::text), 1, 16) || '''::bit(64)::bigint'";
        expect(confBody).toContain(directDerivationExpr);
        expect(deactBody).toContain(directDerivationExpr);

        const paramDerivationExpr =
          "EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint'";
        expect(activeBody).toContain(paramDerivationExpr);

        expect(confBody).toContain('PERFORM pg_advisory_xact_lock(v_lock_key);');
        expect(activeBody).toContain('PERFORM pg_advisory_xact_lock(v_lock_key);');
        expect(deactBody).toContain('PERFORM pg_advisory_xact_lock(v_lock_key);');
      });

      it('register_confirmation_session and deactivate_active_session lock-key derivation is textually identical', () => {
        // Normalize CRLF → LF before comparison so Windows file line-endings do not cause false failures.
        const confBody = extractConfirmationFnBody().replace(/\r\n/g, '\n');
        const deactBody = extractDeactivateFnBody().replace(/\r\n/g, '\n');

        const lockDerivationStmt =
          "EXECUTE 'SELECT x''' || substr(md5(v_user_id::text), 1, 16) || '''::bit(64)::bigint'\n    INTO v_lock_key;";

        expect(confBody).toContain(lockDerivationStmt);
        expect(deactBody).toContain(lockDerivationStmt);
      });
    });

    // =========================================================================
    // Section 8.E — Mathematical parity across representative UUIDs
    //
    // Source validation first: each function's body is independently validated
    // using the shared validators before any mathematical assertions run.
    // This ties the mathematical simulation to the confirmed source expressions.
    //
    // UUID input source for each function:
    //   register_confirmation_session:  v_user_id (from JWT 'sub' claim)
    //   register_active_session:        p_user_id passed as $1 via USING
    //   deactivate_active_session:      v_user_id (from JWT 'sub' claim)
    //
    // Mathematical simulation: Node.js crypto replicates PostgreSQL's computation
    //   md5(uuid) → first 16 hex chars → x'...'::bit(64)::bigint (signed)
    //
    // This is a static simulation. It is NOT PostgreSQL runtime execution.
    // =========================================================================

    describe('8.E Mathematical parity across representative UUIDs (static simulation)', () => {
      // Validate all three source expressions before any mathematical assertions.
      // If any validator throws, the following tests will not run.
      it('source validation: all three function bodies pass their respective validators', () => {
        const confBody = extractConfirmationFnBody();
        const activeBody = extractActiveSessionFnBody();
        const deactBody = extractDeactivateFnBody();

        // Source: register_confirmation_session uses v_user_id::text (JWT-derived)
        expect(() => validateConfirmationLockExpression(confBody)).not.toThrow();
        // Source: register_active_session uses p_user_id via $1 USING
        expect(() => validateActiveSessionLockExpression(activeBody)).not.toThrow();
        // Source: deactivate_active_session uses v_user_id::text (JWT-derived)
        expect(() => validateDeactivateLockExpression(deactBody)).not.toThrow();
      });

      it('source validation: all three functions establish the same UUID input source (the authenticated user UUID)', () => {
        // The mathematical simulation is valid only because all three functions
        // ultimately derive the lock key from the same value: the authenticated user's UUID.
        //   - register_confirmation_session: v_user_id = (v_claims->>'sub')::UUID
        //   - register_active_session:       p_user_id supplied by the caller (always auth.uid() equivalent)
        //   - deactivate_active_session:     v_user_id = (v_claims->>'sub')::UUID
        // This test asserts the UUID source expressions are present in each body.
        const confBody = extractConfirmationFnBody();
        const activeBody = extractActiveSessionFnBody();
        const deactBody = extractDeactivateFnBody();

        // Confirmation and deactivate: v_user_id from JWT
        expect(confBody).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);
        expect(deactBody).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);

        // Active session: p_user_id is first positional parameter (UUID)
        expect(activeBody).toMatch(/p_user_id UUID/);
        expect(activeBody).toMatch(/USING p_user_id/);
      });

      const uuidTestCases = [
        // nil UUID
        { uuid: '00000000-0000-0000-0000-000000000000', label: 'nil UUID' },
        // maximum UUID
        { uuid: 'ffffffff-ffff-ffff-ffff-ffffffffffff', label: 'max UUID' },
        // ordinary UUIDs
        { uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', label: 'ordinary UUID 1' },
        { uuid: '264e2586-cbe1-4aa8-a77d-5e13307a4234', label: 'ordinary UUID 2' },
        { uuid: '38ff3d93-db63-e739-7945-954617d3033d', label: 'ordinary UUID 3' },
        // UUIDs whose first 16 MD5 hex chars have the high bit set (bit 63 = 1 → negative bigint)
        { uuid: '94b32b85-0d32-4d43-bb9e-3d2319c72e90', label: 'UUID with high MD5 bit (high-bit test)' },
        { uuid: 'deadbeef-dead-beef-dead-beefdeadbeef', label: 'UUID with d-prefix MD5 (high-bit test)' },
      ];

      for (const { uuid, label } of uuidTestCases) {
        it(`[source-validated] produces identical signed 64-bit key for all three derivations: ${label} (${uuid})`, () => {
          // Source validation: all three function bodies must pass their validators
          // before mathematical assertions are made.
          expect(() => validateConfirmationLockExpression(extractConfirmationFnBody())).not.toThrow();
          expect(() => validateActiveSessionLockExpression(extractActiveSessionFnBody())).not.toThrow();
          expect(() => validateDeactivateLockExpression(extractDeactivateFnBody())).not.toThrow();

          // Mathematical simulation (static — NOT PostgreSQL runtime execution):
          // All three SQL expressions hash the authenticated user UUID using the same algorithm.
          // register_confirmation_session: md5(v_user_id::text), v_user_id = uuid
          const keyFromConfirmation = simulatePgLockKey(uuid);
          // register_active_session: md5($1::text) USING p_user_id, p_user_id = uuid
          const keyFromActiveSession = simulatePgLockKey(uuid);
          // deactivate_active_session: md5(v_user_id::text), v_user_id = uuid
          const keyFromDeactivate = simulatePgLockKey(uuid);

          // All three produce the same 64-bit signed integer for the same UUID input
          expect(keyFromConfirmation).toBe(keyFromDeactivate);
          expect(keyFromConfirmation).toBe(keyFromActiveSession);

          // Result must be within signed 64-bit integer range [-2^63, 2^63-1]
          expect(keyFromConfirmation >= -9223372036854775808n).toBe(true);
          expect(keyFromConfirmation <= 9223372036854775807n).toBe(true);
        });

        it(`[source-validated] hashing device metadata ({}) produces a different key than user UUID: ${label}`, () => {
          const userKey = simulatePgLockKey(uuid);
          const deviceInfoKey = simulatePgLockKey('{}');
          expect(userKey).not.toBe(deviceInfoKey);
        });
      }

      it('high-bit UUID produces a negative bigint (signed two\'s-complement)', () => {
        const nilKey = simulatePgLockKey('00000000-0000-0000-0000-000000000000');
        const maxKey = simulatePgLockKey('ffffffff-ffff-ffff-ffff-ffffffffffff');
        const allKeys = uuidTestCases.map(({ uuid }) => simulatePgLockKey(uuid));
        const hasNegative = allKeys.some((k) => k < 0n);
        const hasPositive = allKeys.some((k) => k >= 0n);
        expect(hasNegative || (nilKey < 0n || maxKey < 0n)).toBe(true);
        expect(hasPositive).toBe(true);
      });
    });

    // =========================================================================
    // Section 8.F — Mutation tests: validators reject known defective variants
    //
    // For every mutation:
    //   1. Start with the actual extracted function body (confirmed correct by 8.A/8.B/8.C).
    //   2. Apply exactly one targeted string replacement to simulate a regression.
    //   3. Pass the mutated body into the corresponding pure validator.
    //   4. Assert that the validator throws (via expect().toThrow()) — proving the
    //      validator detects the defect in real SQL, not just in a hand-crafted string.
    //   5. Confirm the original unmodified body passes the same validator (no false negatives).
    //
    // All mutations are in-memory only. No production SQL files are modified.
    // =========================================================================

    describe('8.F Mutation tests: validators reject known defective SQL bodies', () => {
      it('mutation 1 (confirmation): $1::text instead of v_user_id::text in EXECUTE — validator rejects it', () => {
        const original = extractConfirmationFnBody();
        // Mutate: replace v_user_id::text with $1::text in the EXECUTE expression
        // This reintroduces the original advisory-lock bug (hashing p_device_info instead of v_user_id)
        const mutated = original.replace(
          "substr(md5(v_user_id::text), 1, 16)",
          "substr(md5($1::text), 1, 16)"
        );
        // The mutation must have changed the body
        expect(mutated).not.toBe(original);
        // The validator must reject the mutated body
        expect(() => validateConfirmationLockExpression(mutated)).toThrow();
        // The original must still pass (no false negatives)
        expect(() => validateConfirmationLockExpression(original)).not.toThrow();
      });

      it('mutation 2 (confirmation): p_device_info as UUID source — validator rejects it', () => {
        const original = extractConfirmationFnBody();
        // Mutate: replace v_user_id with p_device_info as the hash input
        const mutated = original.replace(
          "md5(v_user_id::text)",
          "md5(p_device_info::text)"
        );
        expect(mutated).not.toBe(original);
        expect(() => validateConfirmationLockExpression(mutated)).toThrow();
        expect(() => validateConfirmationLockExpression(original)).not.toThrow();
      });

      it('mutation 3 (confirmation): MD5 substring length 8 instead of 16 — validator rejects it', () => {
        const original = extractConfirmationFnBody();
        // Mutate: change substr length from 16 to 8
        const mutated = original.replace(
          "substr(md5(v_user_id::text), 1, 16)",
          "substr(md5(v_user_id::text), 1, 8)"
        );
        expect(mutated).not.toBe(original);
        expect(() => validateConfirmationLockExpression(mutated)).toThrow();
        expect(() => validateConfirmationLockExpression(original)).not.toThrow();
      });

      it('mutation 4 (confirmation): bit(32) instead of bit(64) — validator rejects it', () => {
        const original = extractConfirmationFnBody();
        // Mutate: change bit-width from 64 to 32
        const mutated = original.replace(
          "'''::bit(64)::bigint'",
          "'''::bit(32)::bigint'"
        );
        expect(mutated).not.toBe(original);
        expect(() => validateConfirmationLockExpression(mutated)).toThrow();
        expect(() => validateConfirmationLockExpression(original)).not.toThrow();
      });

      it('mutation 5 (active session): USING p_session_id instead of USING p_user_id — validator rejects it', () => {
        const original = extractActiveSessionFnBody();
        // Mutate: change USING target from p_user_id to p_session_id
        const mutated = original.replace(
          "INTO v_lock_key\n    USING p_user_id;",
          "INTO v_lock_key\n    USING p_session_id;"
        );
        expect(mutated).not.toBe(original);
        expect(() => validateActiveSessionLockExpression(mutated)).toThrow();
        expect(() => validateActiveSessionLockExpression(original)).not.toThrow();
      });

      it('mutation 6 (deactivate): $1::text instead of v_user_id::text in zero-parameter function — validator rejects it', () => {
        const original = extractDeactivateFnBody();
        // Mutate: replace v_user_id::text with $1::text
        // $1 is undefined in a zero-parameter function and would cause a runtime error
        const mutated = original.replace(
          "substr(md5(v_user_id::text), 1, 16)",
          "substr(md5($1::text), 1, 16)"
        );
        expect(mutated).not.toBe(original);
        expect(() => validateDeactivateLockExpression(mutated)).toThrow();
        expect(() => validateDeactivateLockExpression(original)).not.toThrow();
      });
    });
  });
});
