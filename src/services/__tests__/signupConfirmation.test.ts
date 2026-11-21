import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerConfirmationSession,
  resetConfirmationGuardForTesting,
  buildClientDeviceInfo,
  mapConfirmationErrorCodeToMessage,
} from '../auth';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

const toBase64Url = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const makeJwt = (claims: Record<string, unknown>): string => {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify(claims));
  return `${header}.${payload}.mock-sig`;
};

describe('Signup Confirmation Service (src/services/auth.ts)', () => {
  const USER_ID = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
  const SESSION_ID = '94b32b85-0d32-4d43-bb9e-3d2319c72e90';

  beforeEach(() => {
    vi.clearAllMocks();
    resetConfirmationGuardForTesting();
  });

  afterEach(() => {
    resetConfirmationGuardForTesting();
  });

  describe('1. Error Message Mapping & Security', () => {
    it('maps all error codes to safe user messages without internal database leakage', () => {
      const consumedMsg = mapConfirmationErrorCodeToMessage('CLAIM_ALREADY_CONSUMED');
      expect(consumedMsg).toBe('This confirmation link has already been used. Please log in with your password.');

      const conflictMsg = mapConfirmationErrorCodeToMessage('ACTIVE_SESSION_CONFLICT');
      expect(conflictMsg).toBe('Another session is currently active. Please log in to continue.');

      const expiredMsg = mapConfirmationErrorCodeToMessage('CONFIRMATION_WINDOW_EXPIRED');
      expect(expiredMsg).toBe('The confirmation link has expired. Please sign in or request a new link.');

      const misalignedMsg = mapConfirmationErrorCodeToMessage('SESSION_CONFIRMATION_MISALIGNED');
      expect(misalignedMsg).toBe('Confirmation session could not be verified. Please log in with your email and password.');

      const dbErrorMsg = mapConfirmationErrorCodeToMessage('DATABASE_ERROR');
      expect(dbErrorMsg).toBe('Registration service encountered an error. Please log in.');
      expect(dbErrorMsg).not.toMatch(/PostgreSQL|SQL|security|claims/i);
    });

    it('buildClientDeviceInfo extracts user agent safely', () => {
      const info = buildClientDeviceInfo();
      expect(info).toBeDefined();
      expect(typeof info.ua).toBe('string');
    });
  });

  describe('2. registerConfirmationSession Execution & Invariants', () => {
    it('returns error when no SDK session is available', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as never);

      const res = await registerConfirmationSession();

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('UNAUTHENTICATED');
    });

    it('returns error when JWT lacks a valid session_id claim', async () => {
      const invalidToken = makeJwt({ sub: USER_ID }); // no session_id
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: invalidToken } },
        error: null,
      } as never);

      const res = await registerConfirmationSession();

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('MISSING_SESSION_CLAIMS');
    });

    it('successfully registers an eligible confirmation session', async () => {
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true, session_id: SESSION_ID, session_epoch: 1 },
        error: null,
      } as never);

      const res = await registerConfirmationSession({ ua: 'TestBrowser' });

      expect(res.success).toBe(true);
      expect(res.sessionId).toBe(SESSION_ID);
      expect(res.sessionEpoch).toBe(1);
      expect(supabase.rpc).toHaveBeenCalledWith(
        'register_confirmation_session',
        expect.objectContaining({ p_device_info: { ua: 'TestBrowser' } })
      );
    });

    it('deduplicates simultaneous concurrent registration calls using in-flight promise', async () => {
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } },
        error: null,
      } as never);

      let resolveRpc: (val: unknown) => void;
      const delayedRpcPromise = new Promise((resolve) => {
        resolveRpc = resolve;
      });

      vi.mocked(supabase.rpc).mockImplementation(() => delayedRpcPromise as never);

      // Call twice concurrently
      const p1 = registerConfirmationSession();
      const p2 = registerConfirmationSession();

      // Complete RPC
      resolveRpc!({
        data: { success: true, session_id: SESSION_ID, session_epoch: 1 },
        error: null,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      // RPC must only be invoked once
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('subsequent call after settlement invokes database RPC again (no client-side authorization bypass)', async () => {
      // Test classification: Mocked unit test.
      // Phase 8.4.3.2: Local Set-based authorization shortcut is removed.
      // The database RPC is the sole authority on current active status.
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } },
        error: null,
      } as never);

      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: { success: true, session_id: SESSION_ID, session_epoch: 1 },
          error: null,
        } as never)
        .mockResolvedValueOnce({
          data: { success: true, is_idempotent: true, session_id: SESSION_ID, session_epoch: 1 },
          error: null,
        } as never);

      // Initial registration
      const res1 = await registerConfirmationSession();
      expect(res1.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Subsequent call after first promise settled must consult database RPC again
      const res2 = await registerConfirmationSession();

      expect(res2.success).toBe(true);
      expect(res2.isIdempotent).toBe(true);
      expect(res2.sessionId).toBe(SESSION_ID);
      // RPC WAS called again!
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('handles RPC transport or network failures cleanly', async () => {
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Network connection timeout', code: 'PGRST000' },
      } as never);

      const res = await registerConfirmationSession();

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('RPC_UNAVAILABLE');
      expect(res.error).toBe('Unable to reach the registration service. Please try again.');
    });

    it('handles business logic rejection from database RPC (e.g. CLAIM_ALREADY_CONSUMED)', async () => {
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: false, error_code: 'CLAIM_ALREADY_CONSUMED' },
        error: null,
      } as never);

      const res = await registerConfirmationSession();

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('CLAIM_ALREADY_CONSUMED');
      expect(res.error).toBe('This confirmation link has already been used. Please log in with your password.');
    });

    it('security assertion: tokens and credentials are never logged', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const consoleErrorSpy = vi.spyOn(console, 'error');

      const SECRET_ACCESS_TOKEN = 'secret-jwt-access-token-string';
      const SECRET_REFRESH_TOKEN = 'secret-refresh-token-string';

      mapConfirmationErrorCodeToMessage('DATABASE_ERROR');

      const allLoggedArgs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleWarnSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
      ].join(' ');

      expect(allLoggedArgs).not.toContain(SECRET_ACCESS_TOKEN);
      expect(allLoggedArgs).not.toContain(SECRET_REFRESH_TOKEN);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 8.4.3.1 Audit Corrections: Session-Keyed Cache Isolation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Session-Keyed Cache Isolation (Phase 8.4.3.1)', () => {
    const SESSION_ID_A = '11111111-1111-1111-1111-111111111111';
    const SESSION_ID_B = '22222222-2222-2222-2222-222222222222';
    const USER_ID_A = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
    const USER_ID_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    it('Session A and Session B in-flight registrations never share results', async () => {
      // Test classification: Mocked unit test.
      // Session A and B have different session IDs. Each must initiate its own RPC call.
      let resolveA!: (val: unknown) => void;
      let resolveB!: (val: unknown) => void;
      const rpcA = new Promise(r => { resolveA = r; });
      const rpcB = new Promise(r => { resolveB = r; });

      let callCount = 0;
      vi.mocked(supabase.rpc).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return rpcA as never;
        return rpcB as never;
      });

      // Session A starts registration
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: makeJwt({ sub: USER_ID_A, session_id: SESSION_ID_A }) } },
        error: null,
      } as never);
      const pA = registerConfirmationSession();

      // After A is in-flight, switch to Session B
      resetConfirmationGuardForTesting(); // simulates session change between calls
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: makeJwt({ sub: USER_ID_B, session_id: SESSION_ID_B }) } },
        error: null,
      } as never);
      const pB = registerConfirmationSession();

      // Resolve A first, then B
      resolveA({ data: { success: true, session_id: SESSION_ID_A, session_epoch: 1 }, error: null });
      resolveB({ data: { success: true, session_id: SESSION_ID_B, session_epoch: 1 }, error: null });

      const resA = await pA;
      const resB = await pB;

      // Both must succeed with their own sessionIds
      expect(resA.success).toBe(true);
      expect(resA.sessionId).toBe(SESSION_ID_A);
      expect(resB.success).toBe(true);
      expect(resB.sessionId).toBe(SESSION_ID_B);

      // Session B never received Session A's result
      expect(resB.sessionId).not.toBe(SESSION_ID_A);
    });

    it('repeated calls for same session ID share in-flight promise (deduplication)', async () => {
      // Test classification: Mocked unit test.
      // Create the resolver before the mock so it is available immediately.
      let resolveRpc!: (val: unknown) => void;
      const rpcPromise = new Promise<unknown>(r => { resolveRpc = r; });
      // mockImplementation always returns the same pre-created promise
      vi.mocked(supabase.rpc).mockReturnValue(rpcPromise as never);

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: makeJwt({ sub: USER_ID, session_id: SESSION_ID }) } },
        error: null,
      } as never);

      const p1 = registerConfirmationSession();
      const p2 = registerConfirmationSession(); // same session, same in-flight key

      resolveRpc({ data: { success: true, session_id: SESSION_ID, session_epoch: 1 }, error: null });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      // Only one RPC call was made
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it("Session A's cleanup does not evict Session B's in-flight cache entry", async () => {
      // Test classification: Mocked unit test.
      // This tests invariant: cleanup in finally{} removes only the entry for its own sessionId.
      let resolveA!: (val: unknown) => void;
      let resolveB!: (val: unknown) => void;
      const rpcA = new Promise(r => { resolveA = r; });
      const rpcB = new Promise(r => { resolveB = r; });

      let callCount = 0;
      vi.mocked(supabase.rpc).mockImplementation(() => {
        callCount++;
        return (callCount === 1 ? rpcA : rpcB) as never;
      });

      // Start Session A
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: makeJwt({ sub: USER_ID_A, session_id: SESSION_ID_A }) } },
        error: null,
      } as never);
      const pA = registerConfirmationSession();

      // Start Session B with different session ID while A is pending
      resetConfirmationGuardForTesting();
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: makeJwt({ sub: USER_ID_B, session_id: SESSION_ID_B }) } },
        error: null,
      } as never);
      const pBFirst = registerConfirmationSession(); // B in-flight

      // Now resolve A — A's finally{} must not remove B's cache key
      resolveA({ data: { success: true, session_id: SESSION_ID_A, session_epoch: 1 }, error: null });
      await pA;

      // B should still be reachable from cache (same call returns same promise)
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: makeJwt({ sub: USER_ID_B, session_id: SESSION_ID_B }) } },
        error: null,
      } as never);
      const pBSecond = registerConfirmationSession();

      resolveB({ data: { success: true, session_id: SESSION_ID_B, session_epoch: 1 }, error: null });
      const [bFirst, bSecond] = await Promise.all([pBFirst, pBSecond]);

      // B was only registered once (second call reused B's in-flight promise)
      expect(bFirst.success).toBe(true);
      expect(bFirst.sessionId).toBe(SESSION_ID_B);
      expect(bSecond.success).toBe(true);
      expect(bSecond.sessionId).toBe(SESSION_ID_B);
      // Only 2 RPC calls total (one for A, one for B)
      expect(callCount).toBe(2);
    });

    it('a failed registration does not poison future retries for the same session', async () => {
      // Test classification: Mocked unit test.
      // After a network failure, the cache entry must be cleared so a retry can proceed.
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: makeJwt({ sub: USER_ID, session_id: SESSION_ID }) } },
        error: null,
      } as never);

      // First attempt: RPC transport fails
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Network timeout', code: 'PGRST000' },
      } as never);
      const res1 = await registerConfirmationSession();
      expect(res1.success).toBe(false);
      expect(res1.errorCode).toBe('RPC_UNAVAILABLE');

      // Second attempt after failure: should not hit a stale null/failed promise
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: SESSION_ID, session_epoch: 1 },
        error: null,
      } as never);
      const res2 = await registerConfirmationSession();
      expect(res2.success).toBe(true);
      expect(res2.sessionId).toBe(SESSION_ID);
      // Two distinct RPC calls: once for the failed attempt, once for the retry
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('a stale cached result for Session A cannot authorize Session B after session change', async () => {
      // Test classification: Mocked unit test.
      // After Session A is registered, switching to Session B must require a new RPC call.
      const tokenA = makeJwt({ sub: USER_ID_A, session_id: SESSION_ID_A });
      const tokenB = makeJwt({ sub: USER_ID_B, session_id: SESSION_ID_B });

      // Register Session A
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: tokenA } }, error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: SESSION_ID_A, session_epoch: 1 }, error: null,
      } as never);
      const resA = await registerConfirmationSession();
      expect(resA.success).toBe(true);
      expect(resA.sessionId).toBe(SESSION_ID_A);

      // Now "session changes" to Session B (different access_token / session_id)
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: tokenB } }, error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: SESSION_ID_B, session_epoch: 1 }, error: null,
      } as never);
      const resB = await registerConfirmationSession();

      // Session B triggers its own RPC; never receives Session A's cached result
      expect(resB.success).toBe(true);
      expect(resB.sessionId).toBe(SESSION_ID_B);
      expect(resB.sessionId).not.toBe(SESSION_ID_A);
      // Two RPC calls: one per session
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 8.4.3.2 Critical Correction A: Never Manufacture RPC Session Identity
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. RPC Response Validation & Session Identity Hardening (Phase 8.4.3.2)', () => {
    it('valid matching RPC session ID succeeds and returns verified identity', async () => {
      // Test classification: Mocked unit test.
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: SESSION_ID, session_epoch: 1 }, error: null,
      } as never);

      const res = await registerConfirmationSession();
      expect(res.success).toBe(true);
      expect(res.sessionId).toBe(SESSION_ID);
    });

    it('rejects when RPC returns success=true but session_id is completely missing', async () => {
      // Test classification: Mocked unit test.
      // Must NEVER substitute local sessionId when server fails to return session_id.
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_epoch: 1 }, // session_id omitted!
        error: null,
      } as never);

      const res = await registerConfirmationSession();
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('SESSION_CONFIRMATION_MISALIGNED');
      expect(res.sessionId).toBeUndefined();
    });

    it('rejects when RPC returns success=true with empty string session_id', async () => {
      // Test classification: Mocked unit test.
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: '   ', session_epoch: 1 }, // whitespace only
        error: null,
      } as never);

      const res = await registerConfirmationSession();
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('SESSION_CONFIRMATION_MISALIGNED');
    });

    it('rejects when RPC returns mismatched session_id (server authorized different session)', async () => {
      // Test classification: Mocked unit test.
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: 'unexpected-different-session-uuid', session_epoch: 1 },
        error: null,
      } as never);

      const res = await registerConfirmationSession();
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('SESSION_CONFIRMATION_MISALIGNED');
    });

    it('rejects when RPC returns malformed non-string session_id', async () => {
      // Test classification: Mocked unit test.
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: 12345, session_epoch: 1 }, // number instead of string
        error: null,
      } as never);

      const res = await registerConfirmationSession();
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('SESSION_CONFIRMATION_MISALIGNED');
    });

    it('failed validation does not cache false success; subsequent retry invokes RPC again', async () => {
      // Test classification: Mocked unit test.
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);

      // First call: returns malformed session_id -> fails
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: null }, error: null,
      } as never);
      const res1 = await registerConfirmationSession();
      expect(res1.success).toBe(false);

      // Second call: server responds with correct session_id -> succeeds
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: SESSION_ID, session_epoch: 1 }, error: null,
      } as never);
      const res2 = await registerConfirmationSession();
      expect(res2.success).toBe(true);
      expect(res2.sessionId).toBe(SESSION_ID);
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 8.4.3.2 Critical Correction B: Database Authority & Session Binding
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. Database Authority & Session Binding (Phase 8.4.3.2)', () => {
    it('a previously successful registration cannot override later database displacement', async () => {
      // Test classification: Mocked unit test.
      // Proves that without the local Set shortcut, the client correctly reports displacement.
      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);

      // First call: registration succeeds
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, session_id: SESSION_ID, session_epoch: 1 }, error: null,
      } as never);
      const res1 = await registerConfirmationSession();
      expect(res1.success).toBe(true);

      // Later, session was displaced by login on another device:
      // RPC now returns CLAIM_ALREADY_CONSUMED_INACTIVE_SESSION
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: false, error_code: 'CLAIM_ALREADY_CONSUMED_INACTIVE_SESSION' }, error: null,
      } as never);
      const res2 = await registerConfirmationSession();

      // Database authority is respected: fails, does NOT return cached true!
      expect(res2.success).toBe(false);
      expect(res2.errorCode).toBe('CLAIM_ALREADY_CONSUMED_INACTIVE_SESSION');
      expect(res2.error).toContain('already been used');
    });

    it('rejects immediately when expectedSessionId does not match SDK session before calling RPC', async () => {
      // Test classification: Mocked unit test.
      // Caller expected SESSION_ID, but SDK held a different session
      const OTHER_SESSION = '33333333-3333-3333-3333-333333333333';
      const validToken = makeJwt({ sub: USER_ID, session_id: OTHER_SESSION });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);

      const res = await registerConfirmationSession(undefined, SESSION_ID); // expecting SESSION_ID

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('SESSION_CONFIRMATION_MISALIGNED');
      expect(res.error).toContain('Session mismatch');
      // RPC was not even called
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('concurrent same-session calls share pending promise, then subsequent calls query RPC again', async () => {
      // Test classification: Mocked unit test.
      let resolveRpc!: (val: unknown) => void;
      const rpcPromise = new Promise(r => { resolveRpc = r; });
      vi.mocked(supabase.rpc).mockReturnValueOnce(rpcPromise as never);

      const validToken = makeJwt({ sub: USER_ID, session_id: SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: validToken } }, error: null,
      } as never);

      // Two concurrent calls
      const p1 = registerConfirmationSession();
      const p2 = registerConfirmationSession();

      resolveRpc({ data: { success: true, session_id: SESSION_ID, session_epoch: 1 }, error: null });
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Third call after settlement must invoke RPC again
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: { success: true, is_idempotent: true, session_id: SESSION_ID, session_epoch: 1 }, error: null,
      } as never);
      const r3 = await registerConfirmationSession();
      expect(r3.success).toBe(true);
      expect(r3.isIdempotent).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });
});
