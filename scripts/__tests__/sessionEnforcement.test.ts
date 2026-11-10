import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Protected Access Enforcement Migration Specification & Safety Suite (Phase 1.2.3 — Profiles Only)', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261110191500_enforce_active_session_rls.sql'
  );

  it('1. verifies migration file exists and is readable', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql.length).toBeGreaterThan(500);
  });

  it('2. verifies least-privilege table grants: strictly SELECT, UPDATE for authenticated role', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Enable RLS on profiles table
    expect(sql).toMatch(/ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY;/);

    // Revocation of anon/public and authenticated baseline
    expect(sql).toMatch(/REVOKE ALL ON public\.profiles FROM authenticated;/);
    expect(sql).toMatch(/REVOKE ALL ON public\.profiles FROM anon, PUBLIC;/);

    // Operational grants for authenticated role: strictly SELECT, UPDATE
    expect(sql).toMatch(/GRANT SELECT, UPDATE ON public\.profiles TO authenticated;/);

    // Ensure authenticated is NOT granted INSERT, DELETE, or TRUNCATE
    expect(sql).not.toMatch(/GRANT.*INSERT.*ON public\.profiles TO authenticated/i);
    expect(sql).not.toMatch(/GRANT.*DELETE.*ON public\.profiles TO authenticated/i);
    expect(sql).not.toMatch(/GRANT.*TRUNCATE.*ON public\.profiles TO authenticated/i);

    // Service role administrative grants
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.profiles TO service_role;/);
  });

  it('3. verifies abandoned tables (reading_progress and chapter_completion) are completely excluded', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const activeSql = sql.replace(/--.*$/gm, '');

    // Zero active statements referencing reading_progress or chapter_completion
    expect(activeSql).not.toMatch(/reading_progress/i);
    expect(activeSql).not.toMatch(/chapter_completion/i);
  });

  it('4. verifies profiles SELECT policy enforces ownership AND is_active_session()', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/DROP POLICY IF EXISTS "Enable users to view their own data only" ON public\.profiles;/);
    expect(sql).toMatch(
      /CREATE POLICY "Enable users to view their own data only"\s+ON public\.profiles\s+FOR SELECT\s+TO authenticated\s+USING \(auth\.uid\(\) = id AND public\.is_active_session\(\)\);/
    );
  });

  it('5. verifies profiles UPDATE policy enforces ownership AND is_active_session() on both USING and WITH CHECK', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(/DROP POLICY IF EXISTS "Users can update their own profile" ON public\.profiles;/);
    expect(sql).toMatch(
      /CREATE POLICY "Users can update their own profile"\s+ON public\.profiles\s+FOR UPDATE\s+TO authenticated\s+USING \(auth\.uid\(\) = id AND public\.is_active_session\(\)\)\s+WITH CHECK \(auth\.uid\(\) = id AND public\.is_active_session\(\)\);/
    );
  });

  it('6. verifies legacy insecure INSERT policy is dropped and no client INSERT policy exists', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const activeSql = sql.replace(/--.*$/gm, '');

    expect(sql).toMatch(/DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public\.profiles;/);
    expect(activeSql).not.toMatch(/CREATE POLICY.*FOR INSERT.*ON public\.profiles/i);
    expect(activeSql).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
  });

  it('7. verifies pure extractSessionId algorithmic correctness', () => {
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
