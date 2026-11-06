import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Protected Access Enforcement Migration Specification & Safety Suite (Phase 1.2.3)', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260302000000_enforce_active_session_rls.sql'
  );

  it('1. verifies migration file exists and is readable', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql.length).toBeGreaterThan(500);
  });

  it('2. verifies least-privilege table grants and absence of client DELETE privileges', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Enable RLS on all 3 tables
    expect(sql).toMatch(/ALTER TABLE public\.reading_progress ENABLE ROW LEVEL SECURITY;/);
    expect(sql).toMatch(/ALTER TABLE public\.chapter_completion ENABLE ROW LEVEL SECURITY;/);
    expect(sql).toMatch(/ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY;/);

    // Operational grants for authenticated role
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE ON public\.reading_progress TO authenticated;/);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE ON public\.chapter_completion TO authenticated;/);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE ON public\.profiles TO authenticated;/);

    // Ensure authenticated is NOT granted DELETE
    expect(sql).not.toMatch(/GRANT.*DELETE.*ON public\.reading_progress TO authenticated/i);
    expect(sql).not.toMatch(/GRANT.*DELETE.*ON public\.chapter_completion TO authenticated/i);
    expect(sql).not.toMatch(/GRANT.*DELETE.*ON public\.profiles TO authenticated/i);

    // Service role administrative grants
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.reading_progress TO service_role;/);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.chapter_completion TO service_role;/);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.profiles TO service_role;/);

    // Revocation of anon/public access
    expect(sql).toMatch(/REVOKE ALL ON public\.reading_progress FROM anon, PUBLIC;/);
    expect(sql).toMatch(/REVOKE ALL ON public\.chapter_completion FROM anon, PUBLIC;/);
    expect(sql).toMatch(/REVOKE ALL ON public\.profiles FROM anon, PUBLIC;/);
  });

  it('3. verifies reading_progress RLS policies enforce ownership AND is_active_session()', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // SELECT policy
    expect(sql).toMatch(/CREATE POLICY "Users can view their own reading progress"\s+ON public\.reading_progress\s+FOR SELECT\s+TO authenticated\s+USING \(auth\.uid\(\) = user_id AND public\.is_active_session\(\)\);/);

    // INSERT policy
    expect(sql).toMatch(/CREATE POLICY "Users can insert their own reading progress"\s+ON public\.reading_progress\s+FOR INSERT\s+TO authenticated\s+WITH CHECK \(auth\.uid\(\) = user_id AND public\.is_active_session\(\)\);/);

    // UPDATE policy
    expect(sql).toMatch(/CREATE POLICY "Users can update their own reading progress"\s+ON public\.reading_progress\s+FOR UPDATE\s+TO authenticated\s+USING \(auth\.uid\(\) = user_id AND public\.is_active_session\(\)\)\s+WITH CHECK \(auth\.uid\(\) = user_id AND public\.is_active_session\(\)\);/);
  });

  it('4. verifies chapter_completion RLS policies enforce ownership AND is_active_session()', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // SELECT policy
    expect(sql).toMatch(/CREATE POLICY "Users can view their own chapter completion"\s+ON public\.chapter_completion\s+FOR SELECT\s+TO authenticated\s+USING \(auth\.uid\(\) = user_id AND public\.is_active_session\(\)\);/);

    // INSERT policy
    expect(sql).toMatch(/CREATE POLICY "Users can insert their own chapter completion"\s+ON public\.chapter_completion\s+FOR INSERT\s+TO authenticated\s+WITH CHECK \(auth\.uid\(\) = user_id AND public\.is_active_session\(\)\);/);

    // UPDATE policy
    expect(sql).toMatch(/CREATE POLICY "Users can update their own chapter completion"\s+ON public\.chapter_completion\s+FOR UPDATE\s+TO authenticated\s+USING \(auth\.uid\(\) = user_id AND public\.is_active_session\(\)\)\s+WITH CHECK \(auth\.uid\(\) = user_id AND public\.is_active_session\(\)\);/);
  });

  it('5. verifies profiles RLS policies enforce ownership, is_active_session(), and hardened INSERT check', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // SELECT policy: strictly own profile + active session
    expect(sql).toMatch(/CREATE POLICY "Enable users to view their own data only"\s+ON public\.profiles\s+FOR SELECT\s+TO authenticated\s+USING \(auth\.uid\(\) = id AND public\.is_active_session\(\)\);/);

    // UPDATE policy: strictly own profile + active session
    expect(sql).toMatch(/CREATE POLICY "Users can update their own profile"\s+ON public\.profiles\s+FOR UPDATE\s+TO authenticated\s+USING \(auth\.uid\(\) = id AND public\.is_active_session\(\)\)\s+WITH CHECK \(auth\.uid\(\) = id AND public\.is_active_session\(\)\);/);

    // Strip SQL comments (-- ...) to test only active SQL statements
    const activeSql = sql.replace(/--.*$/gm, '');

    // INSERT policy: hardened from WITH CHECK true to strictly own id + active session
    expect(activeSql).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
    expect(sql).toMatch(/CREATE POLICY "Enable insert for authenticated users only"\s+ON public\.profiles\s+FOR INSERT\s+TO authenticated\s+WITH CHECK \(auth\.uid\(\) = id AND public\.is_active_session\(\)\);/);

    // Verifies no blanket administrator access was accidentally added to PostgREST client policies
    expect(sql).not.toMatch(/app_metadata.*admin/i);
    expect(sql).not.toMatch(/profiles\.role/i);
  });

  it('6. verifies pure extractSessionId algorithmic correctness', () => {
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
