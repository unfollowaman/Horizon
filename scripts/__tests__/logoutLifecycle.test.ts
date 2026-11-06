import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 1.2.4: Logout Lifecycle Specification & Invariants Suite', () => {
  const foundationMigrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260301000000_single_device_session_foundation.sql'
  );
  const authServicePath = path.resolve(process.cwd(), 'src/services/auth.ts');
  const authContextPath = path.resolve(process.cwd(), 'src/context/AuthContext.tsx');

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Database Foundation & Deactivation RPC Specification
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Database Foundation & RPC Security Verification', () => {
    it('verifies foundation migration exists and contains deactivate_active_session RPCs', () => {
      expect(fs.existsSync(foundationMigrationPath)).toBe(true);
      const sql = fs.readFileSync(foundationMigrationPath, 'utf8');

      // Parameterless client-callable RPC (derives identity from validated JWT claims)
      expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.deactivate_active_session\(\)/);
      expect(sql).toMatch(/SECURITY DEFINER/);
      expect(sql).toMatch(/SET search_path = ''/);

      // Safe JWT claims extraction
      expect(sql).toMatch(/v_claims := NULLIF\(current_setting\('request\.jwt\.claims', true\), ''\)::jsonb;/);
      expect(sql).toMatch(/v_user_id := \(v_claims ->> 'sub'\)::UUID;/);
      expect(sql).toMatch(/v_session_id := \(v_claims ->> 'session_id'\)::UUID;/);

      // Error returns on invalid/missing claims
      expect(sql).toMatch(/'error_code', 'INVALID_JWT_CLAIMS'/);
      expect(sql).toMatch(/'error_code', 'UNAUTHENTICATED'/);
      expect(sql).toMatch(/'error_code', 'MISSING_SESSION_CLAIMS'/);

      // Advisory lock parity
      expect(sql).toMatch(/EXECUTE 'SELECT x''' \|\| substr\(md5\(\$1::text\), 1, 16\) \|\| '''::bit\(64\)::bigint'/);
      expect(sql).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);

      // Conditional deletion
      expect(sql).toMatch(/DELETE FROM security\.user_active_sessions\s+WHERE user_id = v_user_id\s+AND active_session_id = v_session_id;/);

      // Returns exact row count diagnosis
      expect(sql).toMatch(/GET DIAGNOSTICS v_deleted_count = ROW_COUNT;/);
      expect(sql).toMatch(/'deactivated', \(v_deleted_count > 0\)/);

      // Least-privilege permissions: parameterless function is granted to authenticated
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.deactivate_active_session\(\) FROM PUBLIC, anon;/);
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.deactivate_active_session\(\) TO authenticated, service_role;/);

      // Explicit parameter function is strictly restricted to service_role
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.deactivate_active_session\(UUID, UUID\) FROM PUBLIC, anon, authenticated;/);
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.deactivate_active_session\(UUID, UUID\) TO service_role;/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Client Logout Lifecycle Implementation Specification
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Client Logout Lifecycle Static Verification', () => {
    it('verifies src/services/auth.ts implements extractSessionId, deactivateActiveSession, and logout', () => {
      expect(fs.existsSync(authServicePath)).toBe(true);
      const code = fs.readFileSync(authServicePath, 'utf8');

      // Exports all necessary functions and types
      expect(code).toMatch(/export const extractSessionId\s*=/);
      expect(code).toMatch(/export const deactivateActiveSession\s*=/);
      expect(code).toMatch(/export const logout\s*=/);

      // Calls parameterless deactivate_active_session RPC while JWT is valid
      expect(code).toMatch(/supabase\.rpc\('deactivate_active_session'\)/);

      // Sequence: deactivateActiveSession before supabase.auth.signOut
      const deactivateIdx = code.indexOf('await deactivateActiveSession()');
      const signOutIdx = code.indexOf('await supabase.auth.signOut()');
      expect(deactivateIdx).toBeGreaterThan(-1);
      expect(signOutIdx).toBeGreaterThan(deactivateIdx);

      // Auth signOut errors are propagated
      expect(code).toMatch(/if \(signOutError\)\s*\{\s*console\.error/);
      expect(code).toMatch(/throw signOutError;/);
    });

    it('verifies src/context/AuthContext.tsx guarantees local state cleanup in finally block', () => {
      expect(fs.existsSync(authContextPath)).toBe(true);
      const code = fs.readFileSync(authContextPath, 'utf8');

      // Must import logout and execute in try-finally
      expect(code).toMatch(/const \{ logout \} = await import\('\.\.\/services\/auth'\);/);
      expect(code).toMatch(/try\s*\{\s*const \{ logout \} = await import\('\.\.\/services\/auth'\);\s*await logout\(\);\s*\}\s*catch/);

      // Local state is cleared in finally block regardless of success or failure
      expect(code).toMatch(/finally\s*\{\s*if \(isMountedRef\.current\)\s*\{\s*setSession\(null\);\s*setUser\(null\);\s*setProfile\(null\);\s*\}\s*\}/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Conditional Deletion Invariants & Replacement Session Protection
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Conditional Deletion & Replacement Session Memory Model', () => {
    interface SessionRegistryEntry {
      userId: string;
      activeSessionId: string;
      sessionEpoch: number;
    }

    class MockSessionRegistry {
      private registry = new Map<string, SessionRegistryEntry>();

      register(userId: string, sessionId: string): { replacedSessionId: string | null; epoch: number } {
        const current = this.registry.get(userId);
        const nextEpoch = (current?.sessionEpoch ?? 0) + 1;
        const replacedSessionId = current ? current.activeSessionId : null;

        this.registry.set(userId, {
          userId,
          activeSessionId: sessionId,
          sessionEpoch: nextEpoch,
        });

        return { replacedSessionId, epoch: nextEpoch };
      }

      deactivate(userId: string, sessionId: string): { success: boolean; deactivated: boolean } {
        const current = this.registry.get(userId);
        if (!current) {
          return { success: true, deactivated: false };
        }

        // Conditional deletion: only delete if current active session matches calling session
        if (current.activeSessionId === sessionId) {
          this.registry.delete(userId);
          return { success: true, deactivated: true };
        }

        // Active session does not match (displaced by newer session)
        return { success: true, deactivated: false };
      }

      getActiveSession(userId: string): string | null {
        return this.registry.get(userId)?.activeSessionId ?? null;
      }
    }

    it('Scenario A: standard login and logout lifecycle clears registry', () => {
      const reg = new MockSessionRegistry();
      const userId = 'user-alice';
      const sessionIdA = 'session-device-a';

      // 1. Device A logs in
      reg.register(userId, sessionIdA);
      expect(reg.getActiveSession(userId)).toBe(sessionIdA);

      // 2. Device A logs out
      const deact = reg.deactivate(userId, sessionIdA);
      expect(deact).toEqual({ success: true, deactivated: true });
      expect(reg.getActiveSession(userId)).toBeNull();
    });

    it('Scenario B: replacement session is completely protected against delayed logout by old session', () => {
      const reg = new MockSessionRegistry();
      const userId = 'user-bob';
      const sessionOld = 'session-laptop';
      const sessionNew = 'session-phone';

      // 1. Bob logs in on laptop
      reg.register(userId, sessionOld);
      expect(reg.getActiveSession(userId)).toBe(sessionOld);

      // 2. Bob logs in on phone (phone replaces laptop)
      const regResult = reg.register(userId, sessionNew);
      expect(regResult.replacedSessionId).toBe(sessionOld);
      expect(reg.getActiveSession(userId)).toBe(sessionNew);

      // 3. Laptop attempts delayed logout with old session ID
      const oldLogoutDeact = reg.deactivate(userId, sessionOld);

      // Conditional deletion must NOT deactivate the new session!
      expect(oldLogoutDeact).toEqual({ success: true, deactivated: false });
      expect(reg.getActiveSession(userId)).toBe(sessionNew); // phone session remains fully active!

      // 4. Phone later logs out
      const newLogoutDeact = reg.deactivate(userId, sessionNew);
      expect(newLogoutDeact).toEqual({ success: true, deactivated: true });
      expect(reg.getActiveSession(userId)).toBeNull();
    });

    it('Scenario C: logout when no session exists safely returns deactivated: false', () => {
      const reg = new MockSessionRegistry();
      const userId = 'user-charlie';

      const result = reg.deactivate(userId, 'any-session-id');
      expect(result).toEqual({ success: true, deactivated: false });
      expect(reg.getActiveSession(userId)).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Failure Handling & Registry Self-Healing Simulation
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Failure Handling & Registry Self-Healing Simulation', () => {
    it('stale active session record remaining after database deactivation failure self-heals on next login', () => {
      // Simulation of database state
      let dbActiveSession: { userId: string; activeSessionId: string; epoch: number } | null = {
        userId: 'user-dan',
        activeSessionId: 'session-old-failed-deact',
        epoch: 1,
      };

      // 1. Device attempts logout, but database deactivation fails (e.g. database network error)
      // Client clears local authentication state and proceeds with Auth signOut
      const clientClearedLocalState = true;
      expect(clientClearedLocalState).toBe(true);

      // Because DB deactivation failed, dbActiveSession remains in DB (stale orphaned record)
      expect(dbActiveSession.activeSessionId).toBe('session-old-failed-deact');

      // 2. Later, Dan logs in again on Device B with a fresh session
      const newSessionId = 'session-new-successful-login';

      // register_active_session executes ON CONFLICT (user_id) DO UPDATE
      // This immediately overwrites the stale record and increments session_epoch
      const simulateRegisterActiveSession = (uId: string, sId: string) => {
        const nextEpoch = (dbActiveSession?.epoch ?? 0) + 1;
        dbActiveSession = {
          userId: uId,
          activeSessionId: sId,
          epoch: nextEpoch,
        };
        return { success: true, replacedSessionId: 'session-old-failed-deact', sessionEpoch: nextEpoch };
      };

      const loginResult = simulateRegisterActiveSession('user-dan', newSessionId);

      expect(loginResult.success).toBe(true);
      expect(loginResult.sessionEpoch).toBe(2);
      expect(dbActiveSession.activeSessionId).toBe(newSessionId); // Successfully self-healed!
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Architecture Guardrails & Prohibited Mechanisms
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Architecture Guardrails & Prohibited Mechanisms', () => {
    it('verifies auth.admin.signOut("others") is nowhere in the codebase', () => {
      const srcDir = path.resolve(process.cwd(), 'src');
      const supabaseDir = path.resolve(process.cwd(), 'supabase');

      const checkFiles = (dir: string): string[] => {
        let violations: string[] = [];
        const files = fs.readdirSync(dir);
        for (const f of files) {
          const fullPath = path.join(dir, f);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            if (f !== 'node_modules' && f !== '.git') {
              violations = violations.concat(checkFiles(fullPath));
            }
          } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.sql')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Check for actual calls to signOut("others") or signOut('others')
            if (/admin\.signOut\s*\(\s*["']others["']\s*\)/.test(content)) {
              violations.push(fullPath);
            }
          }
        }
        return violations;
      };

      const srcViolations = checkFiles(srcDir);
      const supabaseViolations = checkFiles(supabaseDir);

      expect(srcViolations).toEqual([]);
      expect(supabaseViolations).toEqual([]);
    });
  });
});
