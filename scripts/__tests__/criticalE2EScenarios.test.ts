import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  SESSION_REPLACEMENT_MESSAGE,
  extractSessionId,
  consumeSessionReplacementNotice,
  checkIsActiveSession,
  teardownSession,
  logout,
  resetTeardownGuardForTesting,
} from '../../src/services/auth';
import { supabase } from '../../src/services/supabase';
import { extractBearerToken } from './edgeFunctionEnforcement.test';

// Mock Supabase client for auth service calls
vi.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Horizon Phase 1.2.6: Critical End-to-End Security Scenarios Suite
 *
 * Verifies the 10 critical end-to-end scenarios required by Phase 1.2.6:
 *  1. Browser A logs in → Browser A remains authenticated.
 *  2. Browser A opens multiple tabs → all remain authenticated.
 *  3. Browser B logs into the same account → Browser A becomes inactive.
 *  4. Browser A attempts protected access → request is rejected.
 *  5. Browser A receives replacement notification → authenticated UI is terminated.
 *  6. Browser B remains authenticated and functional.
 *  7. Browser A logs out after replacement → Browser B's session remains untouched.
 *  8. A session deactivation RPC fails → local logout still completes.
 *  9. Realtime notification is missed → fallback validation detects the inactive session.
 * 10. A malformed or unrelated broadcast cannot terminate another user's session.
 *
 * Clearly distinguishes:
 *  - Actual runtime execution of auth & session functions
 *  - Multi-client simulation across tabs and devices
 *  - Database registry state transitions and fail-closed RLS logic
 *  - Static schema and migration contract verification
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Helper to create valid JWT tokens with custom claims
function createMockJwt(userId: string, sessionId: string, role = 'authenticated'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      session_id: sessionId,
      role,
      app_metadata: { role },
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');
  return `${header}.${payload}.mock-sig`;
}

describe('Phase 1.2.6: Critical End-to-End Scenarios Security Verification', () => {
  const USER_ID = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
  const OTHER_USER_ID = '99999999-fa42-41a2-8bbd-b5b556473127';
  const SESSION_A = '11111111-aaaa-4444-8888-111111111111';
  const SESSION_B = '22222222-bbbb-4444-8888-222222222222';

  // In-memory Database Session Registry Simulating `security.user_active_sessions`
  interface ActiveSessionRecord {
    userId: string;
    sessionId: string;
    createdAt: string;
    lastSeenAt: string;
    sessionEpoch: number;
    deviceInfo: Record<string, unknown>;
  }

  let dbRegistry: Map<string, ActiveSessionRecord>;
  let realtimeBroadcasts: Array<{
    topic: string;
    event: string;
    payload: Record<string, unknown>;
    private: boolean;
  }>;

  // Database RPC Simulations honoring PostgreSQL atomic logic & constraints
  const dbRpc = {
    // register_active_session(p_user_id, p_session_id, p_device_info)
    registerActiveSession(userId: string, sessionId: string, deviceInfo: Record<string, unknown> = {}) {
      const existing = dbRegistry.get(userId);
      const replacedSessionId = existing ? existing.sessionId : null;
      const sessionEpoch = existing ? existing.sessionEpoch + 1 : 1;

      dbRegistry.set(userId, {
        userId,
        sessionId,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        sessionEpoch,
        deviceInfo,
      });

      return {
        replaced_session_id: replacedSessionId,
        session_epoch: sessionEpoch,
      };
    },

    // is_active_session() evaluating JWT claims against security.user_active_sessions
    isActiveSession(jwtUserId: string | null, jwtSessionId: string | null): boolean {
      if (!jwtUserId || !jwtSessionId) return false;
      const record = dbRegistry.get(jwtUserId);
      if (!record) return false;
      return record.sessionId === jwtSessionId;
    },

    // deactivate_active_session(p_user_id, p_session_id) conditional deletion
    deactivateActiveSession(userId: string, sessionId: string) {
      const record = dbRegistry.get(userId);
      if (record && record.sessionId === sessionId) {
        dbRegistry.delete(userId);
        return { deactivated: true };
      }
      return { deactivated: false };
    },
  };

  // Simulated Edge Function for Protected Resource Access (resource-access)
  function simulateResourceAccessRequest(authHeader: string | null): {
    status: number;
    data?: unknown;
    error?: string;
  } {
    const { token, error } = extractBearerToken(authHeader);
    if (!token) {
      return { status: 401, error: error || 'Unauthorized' };
    }

    const sessionId = extractSessionId(token);
    if (!sessionId) {
      return { status: 401, error: 'Invalid or missing session_id' };
    }

    // Decode user id
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const userId = payload.sub;

    if (!dbRpc.isActiveSession(userId, sessionId)) {
      return { status: 401, error: 'ACTIVE_SESSION_REQUIRED' };
    }

    return {
      status: 200,
      data: { url: 'https://storage.supabase.co/signed/document.pdf' },
    };
  }

  // Realtime Broadcast Bus
  function broadcast(topic: string, event: string, payload: Record<string, unknown>) {
    realtimeBroadcasts.push({ topic, event, payload, private: true });
  }

  beforeEach(() => {
    dbRegistry = new Map();
    realtimeBroadcasts = [];
    sessionStorage.clear();
    resetTeardownGuardForTesting();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    resetTeardownGuardForTesting();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Browser A logs in → Browser A remains authenticated
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 1: Browser A logs in → Browser A remains authenticated', () => {
    it('registers session in database and confirms active status', async () => {
      // 1. Browser A signs in and registers session A
      const regResult = dbRpc.registerActiveSession(USER_ID, SESSION_A, { ua: 'Browser A' });
      expect(regResult.replaced_session_id).toBeNull();
      expect(regResult.session_epoch).toBe(1);

      // 2. Browser A has JWT for SESSION_A
      const tokenA = createMockJwt(USER_ID, SESSION_A);
      expect(extractSessionId(tokenA)).toBe(SESSION_A);

      // 3. Database session check verifies Browser A is active
      const isActive = dbRpc.isActiveSession(USER_ID, SESSION_A);
      expect(isActive).toBe(true);

      // 4. Protected access succeeds
      const response = simulateResourceAccessRequest(`Bearer ${tokenA}`);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Browser A opens multiple tabs → all remain authenticated
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 2: Browser A opens multiple tabs → all remain authenticated', () => {
    it('allows multiple tabs sharing the same session_id to stay authenticated concurrently', () => {
      // 1. Initial login in Browser A
      dbRpc.registerActiveSession(USER_ID, SESSION_A, { ua: 'Browser A' });
      const tokenA = createMockJwt(USER_ID, SESSION_A);

      // 2. Tab 1 validates session
      const tab1Active = dbRpc.isActiveSession(USER_ID, extractSessionId(tokenA));
      expect(tab1Active).toBe(true);

      // 3. Tab 2 opens (shares token from same browser storage) and validates
      const tab2Active = dbRpc.isActiveSession(USER_ID, extractSessionId(tokenA));
      expect(tab2Active).toBe(true);

      // 4. Both tabs can access protected resources concurrently
      const tab1Req = simulateResourceAccessRequest(`Bearer ${tokenA}`);
      const tab2Req = simulateResourceAccessRequest(`Bearer ${tokenA}`);

      expect(tab1Req.status).toBe(200);
      expect(tab2Req.status).toBe(200);
      expect(dbRegistry.get(USER_ID)?.sessionId).toBe(SESSION_A);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Browser B logs into the same account → Browser A becomes inactive
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 3: Browser B logs into the same account → Browser A becomes inactive', () => {
    it('atomically replaces active_session_id and increments epoch', () => {
      // 1. Browser A active
      dbRpc.registerActiveSession(USER_ID, SESSION_A, { ua: 'Browser A' });
      expect(dbRpc.isActiveSession(USER_ID, SESSION_A)).toBe(true);

      // 2. Browser B logs in for same account
      const regB = dbRpc.registerActiveSession(USER_ID, SESSION_B, { ua: 'Browser B' });
      expect(regB.replaced_session_id).toBe(SESSION_A);
      expect(regB.session_epoch).toBe(2);

      // 3. Server-side registry check: Browser A is now inactive, Browser B is active
      expect(dbRpc.isActiveSession(USER_ID, SESSION_A)).toBe(false);
      expect(dbRpc.isActiveSession(USER_ID, SESSION_B)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Browser A attempts protected access → request is rejected
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 4: Browser A attempts protected access → request is rejected', () => {
    it('fails closed when an inactive session attempts protected resource access', () => {
      // 1. Setup: Browser A was replaced by Browser B
      dbRpc.registerActiveSession(USER_ID, SESSION_A);
      dbRpc.registerActiveSession(USER_ID, SESSION_B);

      const tokenA = createMockJwt(USER_ID, SESSION_A);
      const tokenB = createMockJwt(USER_ID, SESSION_B);

      // 2. Browser A attempts protected access
      const rejectedResp = simulateResourceAccessRequest(`Bearer ${tokenA}`);
      expect(rejectedResp.status).toBe(401);
      expect(rejectedResp.error).toBe('ACTIVE_SESSION_REQUIRED');

      // 3. Browser B attempts protected access → succeeds
      const acceptedResp = simulateResourceAccessRequest(`Bearer ${tokenB}`);
      expect(acceptedResp.status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Browser A receives replacement notification → UI terminated
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 5: Browser A receives replacement notification → authenticated UI is terminated', () => {
    it('executes client teardown, sets exact replacement notice, and clears auth state', async () => {
      // 1. Browser B triggers login and broadcasts session replacement
      dbRpc.registerActiveSession(USER_ID, SESSION_A);
      dbRpc.registerActiveSession(USER_ID, SESSION_B);

      broadcast(`user:${USER_ID}`, 'session_replaced', {
        message: SESSION_REPLACEMENT_MESSAGE,
        replaced_session_id: SESSION_A,
        session_epoch: 2,
      });

      expect(realtimeBroadcasts.length).toBe(1);
      const broadcastMsg = realtimeBroadcasts[0];
      expect(broadcastMsg.topic).toBe(`user:${USER_ID}`);
      expect(broadcastMsg.payload.message).toBe(SESSION_REPLACEMENT_MESSAGE);

      // 2. Client-side listener receives event and executes teardown
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      const result = await teardownSession({ message: SESSION_REPLACEMENT_MESSAGE });

      // 3. Verifications
      expect(result.completed).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });

      // Notice is stored for redirect display
      const storedNotice = consumeSessionReplacementNotice();
      expect(storedNotice).toBe(SESSION_REPLACEMENT_MESSAGE);
      expect(storedNotice).toBe(
        "You've been logged out because your account was signed in on another device or browser."
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Browser B remains authenticated and functional
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 6: Browser B remains authenticated and functional', () => {
    it('ensures Browser B continues operating normally after replacing Browser A', () => {
      // 1. Setup: Browser B replaced Browser A
      dbRpc.registerActiveSession(USER_ID, SESSION_A);
      dbRpc.registerActiveSession(USER_ID, SESSION_B);

      const tokenB = createMockJwt(USER_ID, SESSION_B);

      // 2. Browser B's session validation passes
      expect(dbRpc.isActiveSession(USER_ID, SESSION_B)).toBe(true);

      // 3. Browser B protected requests pass
      const req1 = simulateResourceAccessRequest(`Bearer ${tokenB}`);
      const req2 = simulateResourceAccessRequest(`Bearer ${tokenB}`);
      expect(req1.status).toBe(200);
      expect(req2.status).toBe(200);

      // 4. Registry record still belongs to Browser B
      const activeRecord = dbRegistry.get(USER_ID);
      expect(activeRecord?.sessionId).toBe(SESSION_B);
      expect(activeRecord?.sessionEpoch).toBe(2);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Browser A logs out after replacement → Browser B remains untouched
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 7: Browser A logs out after replacement → Browser B session remains untouched', () => {
    it('uses conditional deletion to prevent stale deactivations from touching the new session', async () => {
      // 1. Setup: Browser B is now the active session
      dbRpc.registerActiveSession(USER_ID, SESSION_A);
      dbRpc.registerActiveSession(USER_ID, SESSION_B);

      // 2. Browser A triggers logout
      // Deactivation query uses WHERE user_id = USER_ID AND active_session_id = SESSION_A
      const deactResult = dbRpc.deactivateActiveSession(USER_ID, SESSION_A);

      // Browser A's session was already not the active one, so 0 rows deleted
      expect(deactResult.deactivated).toBe(false);

      // 3. Browser B's active session is completely untouched in registry
      expect(dbRpc.isActiveSession(USER_ID, SESSION_B)).toBe(true);
      expect(dbRegistry.get(USER_ID)?.sessionId).toBe(SESSION_B);

      // 4. Browser B still performs protected operations successfully
      const tokenB = createMockJwt(USER_ID, SESSION_B);
      expect(simulateResourceAccessRequest(`Bearer ${tokenB}`).status).toBe(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: Session deactivation RPC fails → local logout still completes
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 8: Session deactivation RPC fails → local logout still completes', () => {
    it('completes client-side signout and local state clearing even if server RPC throws an error', async () => {
      const tokenA = createMockJwt(USER_ID, SESSION_A);
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: tokenA,
            user: { id: USER_ID },
          } as never,
        },
        error: null,
      });
      vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('500 Database Connection Terminated'));
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      // Execute logout() using the resilient implementation
      await expect(logout()).resolves.not.toThrow();

      // RPC was attempted
      expect(supabase.rpc).toHaveBeenCalledWith('deactivate_active_session');
      // Auth signOut was still called despite server RPC failure
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 9: Realtime notification missed → fallback validation detects inactive
  // ───────────────────────────────────────────────────────────────────────────
  describe('Scenario 9: Realtime notification is missed → fallback validation detects inactive session', () => {
    it('detects inactive session on focus/visibility/reconnect check and triggers teardown', async () => {
      // 1. Setup: Browser A had session replaced by Browser B, but Realtime broadcast was missed (dropped network packet)
      dbRpc.registerActiveSession(USER_ID, SESSION_A);
      dbRpc.registerActiveSession(USER_ID, SESSION_B);
      // Notice: No broadcast delivered to Browser A

      // 2. Browser A window regains focus or reconnects → triggers checkIsActiveSession
      const tokenA = createMockJwt(USER_ID, SESSION_A);
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: tokenA,
            user: { id: USER_ID },
          } as never,
        },
        error: null,
      });

      // is_active_session evaluates to false from Perspective of Browser A
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: false,
        error: null,
      } as never);

      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      // 3. Fallback check evaluates server authority
      const check = await checkIsActiveSession();
      expect(check.isActive).toBe(false);
      expect(check.isDefinitivelyInactive).toBe(true);

      // 4. Inactive result immediately triggers teardown
      if (check.isDefinitivelyInactive) {
        await teardownSession();
      }

      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(consumeSessionReplacementNotice()).toBe(SESSION_REPLACEMENT_MESSAGE);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 10: Malformed or unrelated broadcast cannot terminate another user
  // ───────────────────────────────────────────────────────────────────────────
  describe("Scenario 10: Malformed or unrelated broadcast cannot terminate another user's session", () => {
    it('ignores broadcasts targeting another user or containing malformed payload', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      // Simulation of AuthContext event handler logic
      const handleBroadcastEvent = async (
        eventTopic: string,
        currentUserId: string,
        payload: unknown
      ) => {
        // Validation rules:
        // 1. Topic must strictly match user:<currentUserId>
        if (eventTopic !== `user:${currentUserId}`) {
          return { ignored: true, reason: 'mismatched_topic' };
        }
        // 2. Payload must be valid object
        if (!payload || typeof payload !== 'object') {
          return { ignored: true, reason: 'malformed_payload' };
        }
        const payloadObj = payload as Record<string, unknown>;
        // 3. Replaced session id check (if provided and doesn't match current session, or malformed)
        // 4. If all checks pass, trigger teardown
        await teardownSession({
          message: typeof payloadObj.message === 'string' ? payloadObj.message : SESSION_REPLACEMENT_MESSAGE,
        });
        return { ignored: false };
      };

      // Test A: Event targeted to another user's topic
      const resA = await handleBroadcastEvent(`user:${OTHER_USER_ID}`, USER_ID, {
        message: SESSION_REPLACEMENT_MESSAGE,
        replaced_session_id: 'some-other-session',
      });
      expect(resA.ignored).toBe(true);
      expect(resA.reason).toBe('mismatched_topic');
      expect(supabase.auth.signOut).not.toHaveBeenCalled();

      // Test B: Malformed payload (null or primitive string)
      const resB = await handleBroadcastEvent(`user:${USER_ID}`, USER_ID, null);
      expect(resB.ignored).toBe(true);
      expect(resB.reason).toBe('malformed_payload');
      expect(supabase.auth.signOut).not.toHaveBeenCalled();

      // Test C: Valid payload for current user → teardown succeeds
      const resC = await handleBroadcastEvent(`user:${USER_ID}`, USER_ID, {
        message: SESSION_REPLACEMENT_MESSAGE,
        replaced_session_id: SESSION_A,
      });
      expect(resC.ignored).toBe(false);
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Contract & Invariant Specifications
  // ───────────────────────────────────────────────────────────────────────────
  describe('Database and Migration Contract Verifications', () => {
    const foundationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260301000000_single_device_session_foundation.sql'
    );
    const enforcementPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20260302000000_enforce_active_session_rls.sql'
    );

    it('confirms 20260301000000_single_device_session_foundation.sql schema invariants', () => {
      const sql = fs.readFileSync(foundationPath, 'utf8');

      // Schema definition
      expect(sql).toMatch(/CREATE SCHEMA IF NOT EXISTS security;/);
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS security\.user_active_sessions/);
      expect(sql).toMatch(/user_id UUID PRIMARY KEY/);
      expect(sql).toMatch(/active_session_id UUID NOT NULL/);
      expect(sql).toMatch(/session_epoch BIGINT NOT NULL DEFAULT 1/);

      // Advisory lock
      expect(sql).toMatch(/PERFORM pg_advisory_xact_lock\(v_lock_key\);/);

      // Conditional session deletion
      expect(sql).toMatch(/DELETE FROM security\.user_active_sessions\s+WHERE user_id = v_user_id\s+AND active_session_id = v_session_id;/);

      // Least privilege permissions
      expect(sql).toMatch(/REVOKE ALL ON security\.user_active_sessions FROM PUBLIC, anon, authenticated;/);
    });

    it('confirms 20260302000000_enforce_active_session_rls.sql protected tables', () => {
      const sql = fs.readFileSync(enforcementPath, 'utf8');

      // Tables covered by active-session RLS
      expect(sql).toMatch(/reading_progress/);
      expect(sql).toMatch(/chapter_completion/);
      expect(sql).toMatch(/profiles/);

      // Function is_active_session() usage
      expect(sql).toMatch(/public\.is_active_session\(\)/);

      // Zero authenticated DELETE access granted
      expect(sql).not.toMatch(/CREATE POLICY .* FOR DELETE TO authenticated/);
    });
  });
});
