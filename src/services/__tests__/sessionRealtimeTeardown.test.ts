import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SESSION_REPLACEMENT_MESSAGE,
  SESSION_REPLACEMENT_STORAGE_KEY,
  setSessionReplacementNotice,
  consumeSessionReplacementNotice,
  checkIsActiveSession,
  teardownSession,
  resetTeardownGuardForTesting,
} from '../auth';
import { supabase } from '../supabase';

// Mock Supabase
vi.mock('../supabase', () => ({
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

describe('Single-Active-Device Phase 1.2.5: Realtime & Teardown Unit Tests', () => {
  const sampleUserId = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
  const sampleSessionId = 'a1111111-2222-3333-4444-555555555555';
  const otherSessionId = 'b2222222-3333-4444-5555-666666666666';

  // Helper to create valid JWT containing session_id
  const createMockJwt = (sub: string, sessionId: string): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub,
        session_id: sessionId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    return `${header}.${payload}.signature`;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    resetTeardownGuardForTesting();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Notice Storage Invariants
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Replacement Notice Storage', () => {
    it('sets and consumes session replacement notice correctly', () => {
      expect(consumeSessionReplacementNotice()).toBeNull();

      setSessionReplacementNotice();
      expect(sessionStorage.getItem(SESSION_REPLACEMENT_STORAGE_KEY)).toBe(SESSION_REPLACEMENT_MESSAGE);

      const consumed = consumeSessionReplacementNotice();
      expect(consumed).toBe(SESSION_REPLACEMENT_MESSAGE);

      // Consuming removes the notice so subsequent reads are null
      expect(consumeSessionReplacementNotice()).toBeNull();
      expect(sessionStorage.getItem(SESSION_REPLACEMENT_STORAGE_KEY)).toBeNull();
    });

    it('supports custom replacement messages', () => {
      const customMsg = 'Custom replaced notice';
      setSessionReplacementNotice(customMsg);
      expect(consumeSessionReplacementNotice()).toBe(customMsg);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Authoritative checkIsActiveSession Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Authoritative checkIsActiveSession Function', () => {
    it('returns isActive: true when database RPC returns true', async () => {
      const jwt = createMockJwt(sampleUserId, sampleSessionId);
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: jwt,
            user: { id: sampleUserId },
          } as never,
        },
        error: null,
      });
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: true, error: null } as never);

      const result = await checkIsActiveSession();
      expect(result.isActive).toBe(true);
      expect(result.isDefinitivelyInactive).toBe(false);
      expect(supabase.rpc).toHaveBeenCalledWith('is_active_session');
    });

    it('returns isDefinitivelyInactive: true when database RPC returns false', async () => {
      const jwt = createMockJwt(sampleUserId, sampleSessionId);
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: jwt,
            user: { id: sampleUserId },
          } as never,
        },
        error: null,
      });
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: false, error: null } as never);

      const result = await checkIsActiveSession();
      expect(result.isActive).toBe(false);
      expect(result.isDefinitivelyInactive).toBe(true);
    });

    it('does NOT mark session as inactive when transport or RPC error occurs', async () => {
      const jwt = createMockJwt(sampleUserId, sampleSessionId);
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: jwt,
            user: { id: sampleUserId },
          } as never,
        },
        error: null,
      });
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Network offline / connection timeout' },
      } as never);

      const result = await checkIsActiveSession();
      // Must not falsely mark session inactive on transient network error!
      expect(result.isDefinitivelyInactive).toBe(false);
      expect(result.isActive).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('marks as inactive if session or access token is completely missing', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const result = await checkIsActiveSession();
      expect(result.isActive).toBe(false);
      expect(result.isDefinitivelyInactive).toBe(true);
    });

    it('marks as inactive if JWT lacks session_id claim', async () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: sampleUserId })); // Missing session_id
      const malformedJwt = `${header}.${payload}.sig`;

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: {
          session: {
            access_token: malformedJwt,
            user: { id: sampleUserId },
          } as never,
        },
        error: null,
      });

      const result = await checkIsActiveSession();
      expect(result.isDefinitivelyInactive).toBe(true);
      expect(result.error).toBe('MISSING_SESSION_ID');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Frontend teardownSession Execution
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. teardownSession Security Lifecycle', () => {
    it('persists replacement message, clears user state, dispatches event, and calls local signOut', async () => {
      sessionStorage.setItem('horizon_notif_card_dismissed', 'true');
      sessionStorage.setItem('chunk_reload_guard', 'true'); // Unrelated public state

      const eventSpy = vi.fn();
      window.addEventListener('horizon:session_replaced', eventSpy);

      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      const result = await teardownSession();

      expect(result.completed).toBe(true);
      expect(result.message).toBe(SESSION_REPLACEMENT_MESSAGE);

      // Replacement notice is saved
      expect(sessionStorage.getItem(SESSION_REPLACEMENT_STORAGE_KEY)).toBe(SESSION_REPLACEMENT_MESSAGE);

      // User state is cleared
      expect(sessionStorage.getItem('horizon_notif_card_dismissed')).toBeNull();

      // Unrelated public application state is strictly preserved
      expect(sessionStorage.getItem('chunk_reload_guard')).toBe('true');

      // Local sign-out is called
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });

      // Window event was dispatched
      expect(eventSpy).toHaveBeenCalledTimes(1);
      const dispatchedEvent = eventSpy.mock.calls[0][0] as CustomEvent<{ message: string }>;
      expect(dispatchedEvent.detail.message).toBe(SESSION_REPLACEMENT_MESSAGE);

      window.removeEventListener('horizon:session_replaced', eventSpy);
    });

    it('prevents concurrent duplicate teardown operations', async () => {
      vi.mocked(supabase.auth.signOut).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 50))
      );

      const [firstCall, secondCall] = await Promise.all([
        teardownSession(),
        teardownSession(),
      ]);

      expect(firstCall.completed).toBe(true);
      expect(secondCall.completed).toBe(false); // Second call short-circuited by mutex guard
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Realtime Broadcast Event Parsing & Stale Event Rejection
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Realtime Broadcast Event Parsing Logic', () => {
    it('accepts event with matching replaced_session_id', () => {
      const currentSessionId = sampleSessionId;
      const broadcastPayload = {
        message: SESSION_REPLACEMENT_MESSAGE,
        replaced_session_id: currentSessionId,
        session_epoch: 2,
      };

      // Validation logic mimicking AuthContext listener
      const isMatch =
        typeof broadcastPayload === 'object' &&
        broadcastPayload !== null &&
        broadcastPayload.replaced_session_id === currentSessionId;

      expect(isMatch).toBe(true);
    });

    it('rejects broadcast for a different session (ensuring stale listener cannot terminate newer session)', () => {
      const currentSessionId = sampleSessionId; // Current active browser session
      const broadcastPayload = {
        message: SESSION_REPLACEMENT_MESSAGE,
        replaced_session_id: otherSessionId, // An older or different session
        session_epoch: 2,
      };

      const isIgnored =
        typeof broadcastPayload.replaced_session_id === 'string' &&
        broadcastPayload.replaced_session_id !== currentSessionId;

      expect(isIgnored).toBe(true);
    });

    it('rejects malformed payloads without crashing', () => {
      const malformedPayloads = [null, undefined, 'string', 12345, true];

      for (const payload of malformedPayloads) {
        const isValid = payload && typeof payload === 'object';
        expect(isValid).toBeFalsy();
      }
    });
  });
});
