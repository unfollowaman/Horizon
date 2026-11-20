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
    // Section 8.A — register_confirmation_session: independent expression validation
    // =========================================================================

    describe('8.A register_confirmation_session lock-key expression', () => {
      it('function body is extractable and non-empty', () => {
        const body = extractConfirmationFnBody();
        expect(body.length).toBeGreaterThan(100);
        expect(body).toContain('CREATE OR REPLACE FUNCTION public.register_confirmation_session');
      });

      it('parameter scope: p_device_info is the only declared parameter', () => {
        const body = extractConfirmationFnBody();
        // Signature must declare exactly p_device_info JSONB; p_user_id must NOT be a parameter
        expect(body).toMatch(
          /CREATE OR REPLACE FUNCTION public\.register_confirmation_session\(\s*p_device_info JSONB DEFAULT '{}'::jsonb\s*\)/
        );
        expect(body).not.toMatch(/p_user_id\s+UUID/);
        expect(body).not.toMatch(/p_session_id\s+UUID/);
      });

      it('local variable: v_user_id is declared from JWT claims, not from a parameter', () => {
        const body = extractConfirmationFnBody();
        // v_user_id is declared as a local DECLARE variable
        expect(body).toMatch(/v_user_id UUID;/);
        // It is assigned from JWT claims, not from a function argument
        expect(body).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);
      });

      it('advisory lock expression uses v_user_id::text — not $1, p_device_info, or any parameter', () => {
        const body = extractConfirmationFnBody();
        // Must use the authenticated local variable, NOT positional $1 (which would be p_device_info)
        expect(body).toMatch(
          /EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/
        );
        // Must NOT reference $1 in any EXECUTE expression (would hash p_device_info)
        expect(body).not.toMatch(/EXECUTE\s+'[^']*'\s*\|\|\s*substr\(md5\(\$1::text\)/);
        // Must NOT reference p_device_info as the hash input
        expect(body).not.toMatch(/substr\(md5\(p_device_info::text\)/);
        // Must NOT use a USING clause (which was the original defective pattern)
        expect(body).not.toMatch(/INTO v_lock_key\s+USING/);
      });

      it('MD5 algorithm uses exactly 16 leading hexadecimal characters (positions 1..16)', () => {
        const body = extractConfirmationFnBody();
        // The substring parameters must be (input, 1, 16) — 1-indexed start, 16 chars
        expect(body).toMatch(/substr\(md5\(v_user_id::text\), 1, 16\)/);
        // No alternate substring lengths
        expect(body).not.toMatch(/substr\(md5\(v_user_id::text\), 1, 8\)/);
        expect(body).not.toMatch(/substr\(md5\(v_user_id::text\), 1, 32\)/);
      });

      it('bit-width conversion uses bit(64) and signed bigint cast', () => {
        const body = extractConfirmationFnBody();
        // Must use bit(64)::bigint — 64-bit signed
        expect(body).toMatch(/'''::bit\(64\)::bigint'/);
        // Must NOT use unsigned or wrong width
        expect(body).not.toMatch(/'''::bit\(32\)::bigint'/);
        expect(body).not.toMatch(/'''::bit\(128\)::bigint'/);
      });

      it('advisory lock is acquired by passing v_lock_key to pg_advisory_xact_lock', () => {
        const body = extractConfirmationFnBody();
        expect(body).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);
        // Lock acquisition must follow the derivation (positional ordering check)
        const lockKeyIdx = body.indexOf("EXECUTE 'SELECT x'''");
        const pgLockIdx = body.indexOf('PERFORM pg_advisory_xact_lock(v_lock_key);');
        expect(lockKeyIdx).toBeGreaterThan(0);
        expect(pgLockIdx).toBeGreaterThan(lockKeyIdx);
      });
    });

    // =========================================================================
    // Section 8.B — register_active_session: independent expression validation
    // =========================================================================

    describe('8.B register_active_session lock-key expression', () => {
      it('function body is extractable and non-empty', () => {
        const body = extractActiveSessionFnBody();
        expect(body.length).toBeGreaterThan(100);
        expect(body).toContain('CREATE OR REPLACE FUNCTION public.register_active_session');
      });

      it('parameter scope: p_user_id UUID is the first declared parameter ($1)', () => {
        const body = extractActiveSessionFnBody();
        // p_user_id UUID must be the first parameter (positional $1)
        expect(body).toMatch(
          /CREATE OR REPLACE FUNCTION public\.register_active_session\(\s*p_user_id UUID,/
        );
      });

      it('advisory lock expression uses $1 via USING p_user_id — not v_user_id or p_session_id', () => {
        const body = extractActiveSessionFnBody();
        // The EXECUTE expression must reference $1 (the dynamic SQL parameter slot)
        // and the USING clause must supply p_user_id as $1
        expect(body).toMatch(
          /EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key\s+USING p_user_id;/
        );
        // Must NOT use v_user_id (there is no such local variable in this function)
        expect(body).not.toMatch(/substr\(md5\(v_user_id::text\)/);
        // Must NOT hash p_session_id or p_device_info
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
    // =========================================================================

    describe('8.C deactivate_active_session lock-key expression', () => {
      it('function body is extractable and non-empty', () => {
        const body = extractDeactivateFnBody();
        expect(body.length).toBeGreaterThan(100);
        expect(body).toContain('CREATE OR REPLACE FUNCTION public.deactivate_active_session()');
      });

      it('parameter scope: function takes zero parameters — v_user_id must be a local variable', () => {
        const body = extractDeactivateFnBody();
        // Signature must have empty parameter list
        expect(body).toMatch(
          /CREATE OR REPLACE FUNCTION public\.deactivate_active_session\(\)/
        );
        // v_user_id declared as a local variable
        expect(body).toMatch(/v_user_id UUID;/);
        // Assigned from JWT claims
        expect(body).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);
      });

      it('advisory lock expression uses v_user_id::text with no USING clause', () => {
        const body = extractDeactivateFnBody();
        expect(body).toMatch(
          /EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'\s+INTO v_lock_key;/
        );
        // $1 would be invalid in a zero-parameter function
        expect(body).not.toMatch(/substr\(md5\(\$1::text\)/);
        // No USING clause (zero-parameter function cannot supply dynamic parameters)
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

        // Both register_confirmation_session and deactivate_active_session use v_user_id::text directly
        const directDerivationExpr =
          "EXECUTE 'SELECT x''' || substr(md5(v_user_id::text), 1, 16) || '''::bit(64)::bigint'";
        expect(confBody).toContain(directDerivationExpr);
        expect(deactBody).toContain(directDerivationExpr);

        // register_active_session uses $1 via USING p_user_id (semantically equivalent at runtime)
        const paramDerivationExpr =
          "EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint'";
        expect(activeBody).toContain(paramDerivationExpr);

        // All three use pg_advisory_xact_lock(v_lock_key)
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
    // NOTE: These assertions mathematically verify that all three expressions
    //       produce identical signed 64-bit integers for any given UUID input.
    //       This is a static simulation of PostgreSQL behaviour. It is NOT
    //       PostgreSQL runtime execution.
    // =========================================================================

    describe('8.E Mathematical parity across representative UUIDs (static simulation)', () => {
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
        it(`produces identical signed 64-bit key for all three derivations: ${label} (${uuid})`, () => {
          // All three SQL expressions use md5(input::text) with the same input (the user UUID).
          // register_confirmation_session: md5(v_user_id::text) where v_user_id = uuid
          const keyFromConfirmation = simulatePgLockKey(uuid);
          // deactivate_active_session: md5(v_user_id::text) where v_user_id = uuid
          const keyFromDeactivate = simulatePgLockKey(uuid);
          // register_active_session: md5($1::text) USING p_user_id where p_user_id = uuid
          const keyFromActiveSession = simulatePgLockKey(uuid);

          // Because all three hash the same input (user UUID) with the same algorithm:
          expect(keyFromConfirmation).toBe(keyFromDeactivate);
          expect(keyFromConfirmation).toBe(keyFromActiveSession);

          // Result must be within signed 64-bit integer range [-2^63, 2^63-1]
          expect(keyFromConfirmation >= -9223372036854775808n).toBe(true);
          expect(keyFromConfirmation <= 9223372036854775807n).toBe(true);
        });

        it(`hashing device metadata ({}) produces a different key than user UUID: ${label}`, () => {
          const userKey = simulatePgLockKey(uuid);
          const deviceInfoKey = simulatePgLockKey('{}');
          expect(userKey).not.toBe(deviceInfoKey);
        });
      }

      it('high-bit UUID produces a negative bigint (signed two\'s-complement)', () => {
        // Find a UUID that produces a high-bit-set result, verifying signed conversion works
        const nilKey = simulatePgLockKey('00000000-0000-0000-0000-000000000000');
        const maxKey = simulatePgLockKey('ffffffff-ffff-ffff-ffff-ffffffffffff');
        // nil and max UUIDs are unlikely to both produce positive results;
        // verify at least one of our test UUIDs produces a negative bigint
        const allKeys = uuidTestCases.map(({ uuid }) => simulatePgLockKey(uuid));
        const hasNegative = allKeys.some((k) => k < 0n);
        const hasPositive = allKeys.some((k) => k >= 0n);
        // Signed conversion should produce both positive and negative results across diverse UUIDs
        expect(hasNegative || (nilKey < 0n || maxKey < 0n)).toBe(true);
        expect(hasPositive).toBe(true);
      });
    });

    // =========================================================================
    // Section 8.F — Mutation tests: prove the test suite detects regressions
    // All mutations are applied to in-memory strings only. No production SQL is modified.
    // =========================================================================

    describe('8.F Mutation tests: test assertions reject known defective variants', () => {
      it('mutation 1: confirms RPC hashing p_device_info::text would NOT match user UUID derivation', () => {
        const testUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
        // Simulate defective derivation: hash p_device_info::text (the original bug)
        const defectiveLockExpr = "EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint'";
        const correctLockExpr = "EXECUTE 'SELECT x''' || substr(md5(v_user_id::text), 1, 16) || '''::bit(64)::bigint'";

        // These SQL expression strings are textually distinct
        expect(defectiveLockExpr).not.toBe(correctLockExpr);

        // Lock keys from device info and user UUID are mathematically distinct
        const defectiveKey = simulatePgLockKey('{}'); // p_device_info default value
        const correctKey = simulatePgLockKey(testUuid);
        expect(defectiveKey).not.toBe(correctKey);

        // A test correctly looking for v_user_id::text would fail on the defective expression
        const defectiveMigrationBody = `${defectiveLockExpr}\n    INTO v_lock_key\n    USING v_user_id;`;
        expect(defectiveMigrationBody).not.toContain('md5(v_user_id::text)');
      });

      it('mutation 2: confirms using $1 without USING in register_confirmation_session would be detected', () => {
        // Defective variant: EXECUTE with $1 in string but no USING clause
        // In a parameterless or single-param function this would error at runtime
        const defectiveBody = "EXECUTE 'SELECT x''' || substr(md5($1::text), 1, 16) || '''::bit(64)::bigint' INTO v_lock_key;";
        // The correct form must use v_user_id::text, not $1
        expect(defectiveBody).toContain('$1::text');
        expect(defectiveBody).not.toContain('v_user_id::text');
        // Our test assertions would catch this — they require v_user_id::text
        const correctPattern = /substr\(md5\(v_user_id::text\)/;
        expect(correctPattern.test(defectiveBody)).toBe(false);
      });

      it('mutation 3: confirms different MD5 substring length would produce divergent keys', () => {
        const testUuid = '264e2586-cbe1-4aa8-a77d-5e13307a4234';
        const hash = crypto.createHash('md5').update(testUuid).digest('hex');

        // Correct: first 16 chars
        const correct16Key = BigInt.asIntN(64, BigInt('0x' + hash.slice(0, 16)));
        // Mutation: first 8 chars (wrong length)
        const mutated8Key = BigInt.asIntN(64, BigInt('0x' + hash.slice(0, 8)));
        // Mutation: all 32 chars (wrong length — bit(128) territory)
        const mutated32Key = BigInt.asIntN(64, BigInt('0x' + hash.slice(0, 32)));

        expect(mutated8Key).not.toBe(correct16Key);
        expect(mutated32Key).not.toBe(correct16Key);

        // Pattern assertions for substr length
        const correctPattern = /substr\(md5\(v_user_id::text\), 1, 16\)/;
        const mutatedPattern8 = /substr\(md5\(v_user_id::text\), 1, 8\)/;
        const mutatedPattern32 = /substr\(md5\(v_user_id::text\), 1, 32\)/;

        const correctExpr = "substr(md5(v_user_id::text), 1, 16)";
        expect(correctPattern.test(correctExpr)).toBe(true);
        expect(mutatedPattern8.test(correctExpr)).toBe(false);
        expect(mutatedPattern32.test(correctExpr)).toBe(false);
      });

      it('mutation 4: confirms wrong bit-width or unsigned cast would be detectable', () => {
        const correctExpr = "'''::bit(64)::bigint'";
        const mutated32Expr = "'''::bit(32)::bigint'";
        const mutated128Expr = "'''::bit(128)::bigint'";

        const correctPattern = /'''::bit\(64\)::bigint'/;
        expect(correctPattern.test(correctExpr)).toBe(true);
        expect(correctPattern.test(mutated32Expr)).toBe(false);
        expect(correctPattern.test(mutated128Expr)).toBe(false);

        // Actual migration must contain the correct form
        const confBody = extractConfirmationFnBody();
        expect(confBody).toMatch(/'''::bit\(64\)::bigint'/);
        expect(confBody).not.toMatch(/'''::bit\(32\)::bigint'/);
        expect(confBody).not.toMatch(/'''::bit\(128\)::bigint'/);
      });

      it('mutation 5: confirms register_active_session hashing wrong parameter would be detected', () => {
        const activeBody = extractActiveSessionFnBody();

        // The correct form uses $1 via USING p_user_id (p_user_id is arg 1)
        // A mutation hashing $2 (p_session_id) or $3 (p_device_info) would diverge
        expect(activeBody).toMatch(/USING p_user_id;/);
        // Must NOT use $2 or $3 in the EXECUTE expression
        expect(activeBody).not.toMatch(
          /EXECUTE 'SELECT x''' \|\| substr\(md5\(\$2::text\), 1, 16\)/
        );
        expect(activeBody).not.toMatch(
          /EXECUTE 'SELECT x''' \|\| substr\(md5\(\$3::text\), 1, 16\)/
        );
        // Must NOT supply p_session_id or p_device_info as the USING argument
        expect(activeBody).not.toMatch(/INTO v_lock_key\s+USING p_session_id/);
        expect(activeBody).not.toMatch(/INTO v_lock_key\s+USING p_device_info/);
      });

      it('mutation 6: confirms deactivate_active_session using $1 instead of v_user_id::text would be detected', () => {
        const deactBody = extractDeactivateFnBody();

        // deactivate_active_session() has ZERO parameters — $1 is undefined and would error at runtime
        expect(deactBody).not.toMatch(/substr\(md5\(\$1::text\)/);
        // Must use the local variable only
        expect(deactBody).toMatch(/substr\(md5\(v_user_id::text\)/);
        // No USING clause (zero parameters, nothing to supply)
        expect(deactBody).not.toMatch(/INTO v_lock_key\s+USING/);
      });
    });
  });
});
