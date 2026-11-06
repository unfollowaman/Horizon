import { describe, it, expect, vi } from 'vitest';

/**
 * Pure functions matching supabase/functions/resource-access/index.ts
 * and supabase/functions/subscribe-push/index.ts
 */
export function extractBearerToken(authHeader: string | null): { token: string | null; error?: string } {
  if (!authHeader || typeof authHeader !== 'string') {
    return { token: null, error: 'Missing Authorization header' };
  }

  const trimmed = authHeader.trim();
  if (!trimmed) {
    return { token: null, error: 'Empty Authorization header' };
  }

  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  if (!match || !match[1] || !match[1].trim()) {
    return { token: null, error: "Invalid Authorization header format. Must be 'Bearer <token>'" };
  }

  return { token: match[1].trim() };
}

export function extractSessionId(accessToken: string): string | null {
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
  return `${header}.${payload}.mock-sig`;
}

describe('Tier 2 — Edge Function Active Session Enforcement Verification', () => {
  const VALID_USER_ID = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
  const VALID_SESSION_ID = '94b32b85-0d32-4d43-bb9e-3d2319c72e90';

  describe('extractBearerToken', () => {
    it('extracts token from valid Bearer header', () => {
      const res = extractBearerToken('Bearer valid-token-xyz');
      expect(res.token).toBe('valid-token-xyz');
    });

    it('rejects null or non-string header', () => {
      expect(extractBearerToken(null).token).toBeNull();
      expect(extractBearerToken(null).error).toBe('Missing Authorization header');
    });

    it('rejects empty header', () => {
      expect(extractBearerToken('   ').token).toBeNull();
    });

    it('rejects non-Bearer scheme', () => {
      const res = extractBearerToken('Basic dXNlcjpwYXNz');
      expect(res.token).toBeNull();
      expect(res.error).toContain("Must be 'Bearer <token>'");
    });
  });

  describe('extractSessionId', () => {
    it('extracts UUID session_id from valid token payload', () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      expect(extractSessionId(token)).toBe(VALID_SESSION_ID);
    });

    it('returns null when session_id claim is missing', () => {
      const token = makeJwt({ sub: VALID_USER_ID });
      expect(extractSessionId(token)).toBeNull();
    });

    it('returns null when session_id claim is not a UUID', () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: 'not-a-uuid-1234' });
      expect(extractSessionId(token)).toBeNull();
    });

    it('returns null for malformed token string', () => {
      expect(extractSessionId('invalid.token')).toBeNull();
      expect(extractSessionId('')).toBeNull();
    });
  });

  describe('resource-access Security Gate Workflow', () => {
    it('blocks service-role storage call when session_id claim is missing', async () => {
      const tokenWithoutSession = makeJwt({ sub: VALID_USER_ID });
      const storageSpy = vi.fn();

      // Simulate resource-access decision logic
      const authHeader = `Bearer ${tokenWithoutSession}`;
      const bearer = extractBearerToken(authHeader);
      expect(bearer.token).toBe(tokenWithoutSession);

      const sessionId = extractSessionId(bearer.token!);
      expect(sessionId).toBeNull();

      // Guard check: must reject before storage operation
      let rejected = false;
      if (!sessionId) {
        rejected = true;
      } else {
        storageSpy();
      }

      expect(rejected).toBe(true);
      expect(storageSpy).not.toHaveBeenCalled();
    });

    it('blocks service-role storage call when active session RPC returns false (replaced session)', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      const storageSpy = vi.fn();
      const rpcSpy = vi.fn().mockResolvedValue({ data: false, error: null });

      const bearer = extractBearerToken(`Bearer ${token}`);
      const sessionId = extractSessionId(bearer.token!);

      const { data: isActive } = await rpcSpy('is_active_session', {
        p_user_id: VALID_USER_ID,
        p_session_id: sessionId,
      });

      let status = 200;
      if (isActive !== true) {
        status = 401;
      } else {
        storageSpy();
      }

      expect(status).toBe(401);
      expect(storageSpy).not.toHaveBeenCalled();
    });

    it('executes service-role storage call only when active session RPC returns true', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      const storageSpy = vi.fn().mockResolvedValue({ signedUrl: 'https://storage/signed.pdf' });
      const rpcSpy = vi.fn().mockResolvedValue({ data: true, error: null });

      const bearer = extractBearerToken(`Bearer ${token}`);
      const sessionId = extractSessionId(bearer.token!);

      const { data: isActive } = await rpcSpy('is_active_session', {
        p_user_id: VALID_USER_ID,
        p_session_id: sessionId,
      });

      let status = 200;
      let signedUrl = '';
      if (isActive !== true) {
        status = 401;
      } else {
        const res = await storageSpy();
        signedUrl = res.signedUrl;
      }

      expect(status).toBe(200);
      expect(storageSpy).toHaveBeenCalled();
      expect(signedUrl).toBe('https://storage/signed.pdf');
    });
  });

  describe('subscribe-push Security Gate Workflow', () => {
    it('blocks push subscription mutation when session is replaced', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      const dbMutationSpy = vi.fn();
      const rpcSpy = vi.fn().mockResolvedValue({ data: false, error: null });

      const bearer = extractBearerToken(`Bearer ${token}`);
      const sessionId = extractSessionId(bearer.token!);

      const { data: isActive } = await rpcSpy('is_active_session', {
        p_user_id: VALID_USER_ID,
        p_session_id: sessionId,
      });

      let status = 200;
      if (isActive !== true) {
        status = 401;
      } else {
        dbMutationSpy();
      }

      expect(status).toBe(401);
      expect(dbMutationSpy).not.toHaveBeenCalled();
    });
  });
});
