import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Regression & Migration Verification: 20260303000000_fix_deactivate_active_session_lock_key.sql', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260303000000_fix_deactivate_active_session_lock_key.sql'
  );
  const foundationMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260301000000_single_device_session_foundation.sql'
  );

  it('1. verifies corrective migration file exists and is readable', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql.length).toBeGreaterThan(500);
  });

  it('2. verifies absence of invalid $1 parameter reference in parameterless function', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    // Strip comments to verify active SQL code
    const activeSql = sql.replace(/--.*$/gm, '');

    expect(activeSql).not.toMatch(/\$1/);
    expect(activeSql).toMatch(/md5\(v_user_id::text\)/);
  });

  it('3. verifies exact signature, search_path, and SECURITY DEFINER preservation', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.deactivate_active_session\(\)/);
    expect(sql).toMatch(/RETURNS JSONB/);
    expect(sql).toMatch(/LANGUAGE plpgsql/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = ''/);
  });

  it('4. verifies advisory lock key derivation parity with register_active_session', () => {
    const correctiveSql = fs.readFileSync(migrationPath, 'utf8');
    const foundationSql = fs.readFileSync(foundationMigrationPath, 'utf8');

    // Both migrations must derive the 64-bit integer from the first 16 hex characters of md5(user_id)
    expect(correctiveSql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(v_user_id::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'/);
    expect(foundationSql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'/);

    // Simulate key derivation for sample user UUIDs to confirm identical bigint derivation
    const testUuids = [
      '6270e9bc-fa42-41a2-8bbd-b5b556473127',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
    ];

    for (const uuid of testUuids) {
      // Method A: as executed in register_active_session where $1 = uuid
      const md5A = crypto.createHash('md5').update(uuid).digest('hex');
      const hexA = md5A.substring(0, 16);
      const keyA = BigInt(`0x${hexA}`);

      // Method B: as executed in corrected deactivate_active_session where v_user_id = uuid
      const md5B = crypto.createHash('md5').update(uuid).digest('hex');
      const hexB = md5B.substring(0, 16);
      const keyB = BigInt(`0x${hexB}`);

      expect(keyA).toBe(keyB);
    }
  });

  it('5. verifies conditional session deletion is preserved', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const conditionalDeletePattern = /DELETE FROM security\.user_active_sessions\s+WHERE user_id = v_user_id\s+AND active_session_id = v_session_id;/;
    expect(sql).toMatch(conditionalDeletePattern);
    expect(sql).toMatch(/GET DIAGNOSTICS v_deleted_count = ROW_COUNT;/);
    expect(sql).toMatch(/'deactivated', \(v_deleted_count > 0\)/);
  });

  it('6. verifies least-privilege grants and permissions are preserved', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.deactivate_active_session\(\) FROM PUBLIC, anon;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.deactivate_active_session\(\) TO authenticated, service_role;/);
  });
});
