import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Protected Access Enforcement Migration Specification & Safety Suite (Phase 1.2.3 — Profiles Only)', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261110191500_enforce_active_session_rls.sql'
  );

  // Helper: strip SQL line comments so negative assertions are not tripped by
  // patterns that appear only inside comment blocks.
  const activeSql = () => fs.readFileSync(migrationPath, 'utf8').replace(/--.*$/gm, '');

  it('1. verifies migration file exists and is readable', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql.length).toBeGreaterThan(500);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Table-level privilege baseline
  // ──────────────────────────────────────────────────────────────────────────
  it('2. verifies RLS is enabled on profiles', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY;/);
  });

  it('3. verifies table-level REVOKE ALL from authenticated', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/REVOKE ALL ON public\.profiles FROM authenticated;/);
  });

  it('4. verifies table-level REVOKE ALL from anon and PUBLIC', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/REVOKE ALL ON public\.profiles FROM anon, PUBLIC;/);
  });

  it('5. verifies service_role retains full table-level administrative grants', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.profiles TO service_role;/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. No broad table-level UPDATE to authenticated (security-critical negative)
  // ──────────────────────────────────────────────────────────────────────────
  it('6. verifies no broad table-level UPDATE grant exists for authenticated', () => {
    // A table-level UPDATE grant (without a parenthesised column list) would
    // implicitly permit updating every column, including role and id.
    // The regex deliberately excludes a column list by requiring the grant to
    // go directly from "UPDATE" to "ON" with no intervening parenthesis.
    const broadTableUpdateToAuthenticated =
      /GRANT\b[^;]*\bUPDATE\b(?!\s*\()[^;]*ON\s+public\.profiles[^;]*TO\s+authenticated/i;
    expect(activeSql()).not.toMatch(broadTableUpdateToAuthenticated);
  });

  it('7. verifies authenticated is NOT granted INSERT on profiles', () => {
    expect(activeSql()).not.toMatch(/GRANT[^;]*INSERT[^;]*ON\s+public\.profiles[^;]*TO\s+authenticated/i);
  });

  it('8. verifies authenticated is NOT granted DELETE on profiles', () => {
    expect(activeSql()).not.toMatch(/GRANT[^;]*DELETE[^;]*ON\s+public\.profiles[^;]*TO\s+authenticated/i);
  });

  it('9. verifies authenticated is NOT granted TRUNCATE on profiles', () => {
    expect(activeSql()).not.toMatch(/GRANT[^;]*TRUNCATE[^;]*ON\s+public\.profiles[^;]*TO\s+authenticated/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 10. Column-level UPDATE revocations — sensitive columns
  // ──────────────────────────────────────────────────────────────────────────
  it('10. verifies column-level UPDATE on (id, role, created_at) is revoked from PUBLIC', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    // All three sensitive columns must appear in a REVOKE UPDATE (...) FROM PUBLIC block.
    // They may appear in one statement or separate statements; we verify each column is covered.
    const revokePublicPattern = /REVOKE UPDATE\s*\([^)]*\b(id|role|created_at)\b[^)]*\)\s*ON\s+public\.profiles\s+FROM\s+PUBLIC/i;
    // Extract all REVOKE UPDATE ... FROM PUBLIC statements and check collectively
    const allRevokesPublic = [...sql.matchAll(/REVOKE UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+FROM\s+PUBLIC[^;]*/gi)]
      .map(m => m[0]).join(' ');
    expect(allRevokesPublic).toMatch(/\bid\b/i);
    expect(allRevokesPublic).toMatch(/\brole\b/i);
    expect(allRevokesPublic).toMatch(/\bcreated_at\b/i);
    // Suppress unused variable lint warning
    void revokePublicPattern;
  });

  it('11. verifies column-level UPDATE on (id, role, created_at) is revoked from anon', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const allRevokesAnon = [...sql.matchAll(/REVOKE UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+FROM\s+anon[^;]*/gi)]
      .map(m => m[0]).join(' ');
    expect(allRevokesAnon).toMatch(/\bid\b/i);
    expect(allRevokesAnon).toMatch(/\brole\b/i);
    expect(allRevokesAnon).toMatch(/\bcreated_at\b/i);
  });

  it('12. verifies column-level UPDATE on (id, role, created_at) is revoked from authenticated', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const allRevokesAuth = [...sql.matchAll(/REVOKE UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+FROM\s+authenticated[^;]*/gi)]
      .map(m => m[0]).join(' ');
    expect(allRevokesAuth).toMatch(/\bid\b/i);
    expect(allRevokesAuth).toMatch(/\brole\b/i);
    expect(allRevokesAuth).toMatch(/\bcreated_at\b/i);
  });

  it('13. verifies all eight profiles columns are covered in column-level REVOKE UPDATE from authenticated', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    // Collect every column name that appears inside any REVOKE UPDATE (...) FROM authenticated
    const allRevokesAuth = [...sql.matchAll(/REVOKE UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+FROM\s+authenticated[^;]*/gi)]
      .map(m => m[0]).join(' ');
    const requiredColumns = [
      'id', 'role', 'created_at', 'name',
      'student_class', 'study_medium', 'avatar_url', 'onboarding_completed',
    ];
    for (const col of requiredColumns) {
      expect(allRevokesAuth).toMatch(new RegExp(`\\b${col}\\b`, 'i'));
    }
  });

  it('14. verifies name is revoked from authenticated (no client write workflow exists)', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const allRevokesAuth = [...sql.matchAll(/REVOKE UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+FROM\s+authenticated[^;]*/gi)]
      .map(m => m[0]).join(' ');
    expect(allRevokesAuth).toMatch(/\bname\b/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 15. Column-level UPDATE grants — only confirmed columns
  // ──────────────────────────────────────────────────────────────────────────
  it('15. verifies GRANT UPDATE column list covers exactly the four confirmed client-write columns', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    // Must grant UPDATE on exactly: student_class, study_medium, avatar_url, onboarding_completed
    // in a single parenthesised column list (order may vary; all four must be present).
    const grantMatch = sql.match(/GRANT UPDATE\s*\(([^)]+)\)\s*ON\s+public\.profiles\s+TO\s+authenticated/i);
    expect(grantMatch).not.toBeNull();
    const grantedCols = grantMatch![1].split(',').map(c => c.trim());
    expect(grantedCols).toContain('student_class');
    expect(grantedCols).toContain('study_medium');
    expect(grantedCols).toContain('avatar_url');
    expect(grantedCols).toContain('onboarding_completed');
    // role, id, created_at, name must NOT appear in the grant column list
    expect(grantedCols).not.toContain('role');
    expect(grantedCols).not.toContain('id');
    expect(grantedCols).not.toContain('created_at');
    expect(grantedCols).not.toContain('name');
  });

  it('16. verifies role is NOT in any GRANT UPDATE column list for authenticated', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const allGrantsAuth = [...sql.matchAll(/GRANT UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+TO\s+authenticated[^;]*/gi)]
      .map(m => m[0]).join(' ');
    expect(allGrantsAuth).not.toMatch(/\brole\b/i);
  });

  it('17. verifies id is NOT in any GRANT UPDATE column list for authenticated', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const allGrantsAuth = [...sql.matchAll(/GRANT UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+TO\s+authenticated[^;]*/gi)]
      .map(m => m[0]).join(' ');
    expect(allGrantsAuth).not.toMatch(/\bid\b/i);
  });

  it('18. verifies created_at is NOT in any GRANT UPDATE column list for authenticated', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const allGrantsAuth = [...sql.matchAll(/GRANT UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+TO\s+authenticated[^;]*/gi)]
      .map(m => m[0]).join(' ');
    expect(allGrantsAuth).not.toMatch(/\bcreated_at\b/i);
  });

  it('19. verifies name is NOT in any GRANT UPDATE column list for authenticated', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const allGrantsAuth = [...sql.matchAll(/GRANT UPDATE\s*\([^)]*\)\s*ON\s+public\.profiles\s+TO\s+authenticated[^;]*/gi)]
      .map(m => m[0]).join(' ');
    expect(allGrantsAuth).not.toMatch(/\bname\b/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 20. SELECT grant
  // ──────────────────────────────────────────────────────────────────────────
  it('20. verifies table-level SELECT is granted to authenticated', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/GRANT SELECT\s+ON\s+public\.profiles\s+TO\s+authenticated;/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 21–22. Abandoned tables
  // ──────────────────────────────────────────────────────────────────────────
  it('21. verifies abandoned tables (reading_progress and chapter_completion) are completely excluded', () => {
    const sql = activeSql();
    expect(sql).not.toMatch(/reading_progress/i);
    expect(sql).not.toMatch(/chapter_completion/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 22–23. RLS policies
  // ──────────────────────────────────────────────────────────────────────────
  it('22. verifies profiles SELECT policy enforces ownership AND is_active_session()', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Enable users to view their own data only" ON public\.profiles;/);
    expect(sql).toMatch(
      /CREATE POLICY "Enable users to view their own data only"\s+ON public\.profiles\s+FOR SELECT\s+TO authenticated\s+USING \(auth\.uid\(\) = id AND public\.is_active_session\(\)\);/
    );
  });

  it('23. verifies profiles UPDATE policy enforces ownership AND is_active_session() on both USING and WITH CHECK', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Users can update their own profile" ON public\.profiles;/);
    expect(sql).toMatch(
      /CREATE POLICY "Users can update their own profile"\s+ON public\.profiles\s+FOR UPDATE\s+TO authenticated\s+USING \(auth\.uid\(\) = id AND public\.is_active_session\(\)\)\s+WITH CHECK \(auth\.uid\(\) = id AND public\.is_active_session\(\)\);/
    );
  });

  it('24. verifies legacy insecure INSERT policy is dropped and no client INSERT policy exists', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public\.profiles;/);
    expect(activeSql()).not.toMatch(/CREATE POLICY.*FOR INSERT.*ON public\.profiles/i);
    expect(activeSql()).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 25. extractSessionId algorithm (self-contained unit test)
  // ──────────────────────────────────────────────────────────────────────────
  it('25. verifies pure extractSessionId algorithmic correctness', () => {
    function extractSessionId(accessToken: string): string | null {
      try {
        const parts = accessToken.split('.');
        if (parts.length !== 3) return null;

        const base64Payload = parts[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        const padded = base64Payload +
          '='.repeat((4 - base64Payload.length % 4) % 4);

        const decoded = Buffer.from(padded, 'base64').toString('utf8');
        const claims = JSON.parse(decoded) as Record<string, unknown>;

        if (typeof claims.session_id !== 'string' || !claims.session_id) {
          return null;
        }

        const uuidPattern =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(claims.session_id)) {
          return null;
        }

        return claims.session_id;
      } catch {
        return null;
      }
    }

    function makeJwt(claims: Record<string, unknown>): string {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
      return `${header}.${payload}.sig`;
    }

    const validUuid = '94b32b85-0d32-4d43-bb9e-3d2319c72e90';
    const validToken = makeJwt({ sub: 'user-1', session_id: validUuid });

    expect(extractSessionId(validToken)).toBe(validUuid);
    expect(extractSessionId(makeJwt({ sub: 'user-1' }))).toBeNull();
    expect(extractSessionId(makeJwt({ sub: 'user-1', session_id: 'not-a-uuid' }))).toBeNull();
    expect(extractSessionId('not.a.jwt')).toBeNull();
    expect(extractSessionId('')).toBeNull();
  });
});
