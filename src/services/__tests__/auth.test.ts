import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, register, logout, getCurrentUser, extractSessionId, deactivateActiveSession } from '../auth';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      // login() uses setSession after Phase 1.2.2 Login Orchestrator
      setSession: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const makeJwt = (claims: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.mock-sig`;
};

describe('auth service', () => {
  const originalLocation = window.location;
  const VALID_USER_ID = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
  const VALID_SESSION_ID = '94b32b85-0d32-4d43-bb9e-3d2319c72e90';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup window.location for register tests
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete window.location;
    window.location = { origin: 'http://localhost' } as never;

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { success: true, deactivated: true },
      error: null,
    } as never);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.location = originalLocation;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // login — calls the auth-login Edge Function + supabase.auth.setSession
  // ─────────────────────────────────────────────────────────────────────────
  describe('login', () => {
    const SUPABASE_URL = 'https://test.supabase.co';
    const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/auth-login`;

    beforeEach(() => {
      // Provide VITE_SUPABASE_URL for the import.meta.env read in login()
      vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);
    });

    it('calls the auth-login Edge Function with correct method, headers, and body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          access_token: 'access-token-abc',
          refresh_token: 'refresh-token-xyz',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      vi.mocked(supabase.auth.setSession).mockResolvedValue({
        data: { session: { access_token: 'access-token-abc' }, user: { id: 'user-1' } },
        error: null,
      } as never);

      await login('student@example.com', 'correct-password');

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@example.com', password: 'correct-password' }),
      });
    });

    it('calls supabase.auth.setSession with the tokens returned by the Edge Function', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          access_token: 'access-token-abc',
          refresh_token: 'refresh-token-xyz',
        }),
      }));

      vi.mocked(supabase.auth.setSession).mockResolvedValue({
        data: { session: { access_token: 'access-token-abc' }, user: { id: 'user-1' } },
        error: null,
      } as never);

      await login('student@example.com', 'correct-password');

      expect(supabase.auth.setSession).toHaveBeenCalledWith({
        access_token: 'access-token-abc',
        refresh_token: 'refresh-token-xyz',
      });
    });

    it('resolves without returning a value (void) on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          access_token: 'tok',
          refresh_token: 'rtok',
        }),
      }));

      vi.mocked(supabase.auth.setSession).mockResolvedValue({
        data: { session: null }, error: null,
      } as never);

      const result = await login('a@b.com', 'pass');
      expect(result).toBeUndefined();
    });

    it('throws the error message from the Edge Function on 401 (invalid credentials)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Invalid email or password' }),
      }));

      await expect(login('a@b.com', 'wrongpass'))
        .rejects.toThrow('Invalid email or password');

      // setSession must NOT be called when login fails
      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });

    it('throws the error message from the Edge Function on 403 (unconfirmed email)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Please confirm your email address before signing in.',
          error_code: 'EMAIL_NOT_CONFIRMED',
        }),
      }));

      await expect(login('a@b.com', 'pass'))
        .rejects.toThrow('Please confirm your email address before signing in.');

      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });

    it('throws the error message from the Edge Function on 409 (concurrent login)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Login conflict: another sign-in is in progress. Please try again in a moment.',
          error_code: 'CONCURRENT_LOGIN',
        }),
      }));

      await expect(login('a@b.com', 'pass'))
        .rejects.toThrow('Login conflict: another sign-in is in progress. Please try again in a moment.');

      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });

    it('throws the error message from the Edge Function on 500 (service unavailable)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Service temporarily unavailable. Please try again.',
        }),
      }));

      await expect(login('a@b.com', 'pass'))
        .rejects.toThrow('Service temporarily unavailable. Please try again.');
    });

    it('throws a fallback message when Edge Function returns non-string error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false }),
      }));

      await expect(login('a@b.com', 'pass'))
        .rejects.toThrow('Failed to login');
    });

    it('throws a network error message when fetch itself fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(login('a@b.com', 'pass'))
        .rejects.toThrow('Unable to reach the login service. Please check your connection.');

      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });

    it('throws when Edge Function response body is unparseable JSON', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => { throw new SyntaxError('Unexpected token'); },
      }));

      await expect(login('a@b.com', 'pass'))
        .rejects.toThrow('Login service returned an unexpected response. Please try again.');
    });

    it('throws when supabase.auth.setSession fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          access_token: 'tok',
          refresh_token: 'rtok',
        }),
      }));

      vi.mocked(supabase.auth.setSession).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid token' },
      } as never);

      await expect(login('a@b.com', 'pass'))
        .rejects.toThrow('Failed to restore session. Please try again.');
    });

    it('does not call setSession when Edge Function returns success: false', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: 'Some server error' }),
      }));

      await expect(login('a@b.com', 'pass')).rejects.toThrow();
      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // register — unchanged
  // ─────────────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('successfully registers a user', async () => {
      const mockData = {
        data: {
          user: {
            id: 'test-id',
            identities: [{ id: 'identity-id' }],
          },
        },
        error: null,
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValue(mockData as never);

      const result = await register('test@example.com', 'password123', 'Test User');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { name: 'Test User' },
          emailRedirectTo: 'http://localhost',
        }
      });
      expect(result).toEqual(mockData.data);
    });

    it('throws error when email is already registered (identities length is 0)', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: 'test-id',
            identities: [],
          },
        },
        error: null,
      } as never);

      await expect(register('test@example.com', 'password123', 'Test User'))
        .rejects.toThrow('This email is already registered. Please sign in instead.');
    });

    it('throws error when supabase returns an error', async () => {
      const mockError = new Error('Supabase error');
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      } as never);

      await expect(register('test@example.com', 'password123', 'Test User'))
        .rejects.toThrow('Supabase error');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // extractSessionId — Phase 1.2.4 JWT claim utility
  // ─────────────────────────────────────────────────────────────────────────
  describe('extractSessionId', () => {
    it('extracts UUID session_id from valid token payload', () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      expect(extractSessionId(token)).toBe(VALID_SESSION_ID);
    });

    it('accepts uppercase UUID session_id', () => {
      const upperUuid = VALID_SESSION_ID.toUpperCase();
      const token = makeJwt({ sub: VALID_USER_ID, session_id: upperUuid });
      expect(extractSessionId(token)).toBe(upperUuid);
    });

    it('returns null when session_id claim is missing', () => {
      const token = makeJwt({ sub: VALID_USER_ID });
      expect(extractSessionId(token)).toBeNull();
    });

    it('returns null when session_id claim is not a valid UUID', () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: 'not-a-valid-uuid-string' });
      expect(extractSessionId(token)).toBeNull();
    });

    it('returns null when session_id claim is empty string', () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: '' });
      expect(extractSessionId(token)).toBeNull();
    });

    it('returns null for malformed token strings (not 3 dot-separated parts)', () => {
      expect(extractSessionId('only.two')).toBeNull();
      expect(extractSessionId('too.many.parts.here.extra')).toBeNull();
      expect(extractSessionId('singlepart')).toBeNull();
      expect(extractSessionId('')).toBeNull();
    });

    it('returns null for invalid base64 payload', () => {
      expect(extractSessionId('header.!!!invalid_base64!!!.sig')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deactivateActiveSession — Phase 1.2.4 Server-Side Session Deactivation
  // ─────────────────────────────────────────────────────────────────────────
  describe('deactivateActiveSession', () => {
    it('1. successfully deactivates active session when matching session is found', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true, deactivated: true },
        error: null,
      } as never);

      const result = await deactivateActiveSession();

      expect(supabase.rpc).toHaveBeenCalledWith('deactivate_active_session');
      expect(result).toEqual({
        serverDeactivated: true,
        status: 'SUCCESSFUL_DEACTIVATION',
        userId: VALID_USER_ID,
        sessionId: VALID_SESSION_ID,
      });
    });

    it('2. returns NO_ACTIVE_SESSION when getSession reports no local session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as never);

      const result = await deactivateActiveSession();

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({
        serverDeactivated: false,
        status: 'NO_ACTIVE_SESSION',
        userId: null,
        sessionId: null,
      });
    });

    it('3. returns NO_ACTIVE_SESSION when JWT does not contain a session_id claim', async () => {
      const tokenWithoutSession = makeJwt({ sub: VALID_USER_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: tokenWithoutSession,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await deactivateActiveSession();

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({
        serverDeactivated: false,
        status: 'NO_ACTIVE_SESSION',
        userId: VALID_USER_ID,
        sessionId: null,
      });

      warnSpy.mockRestore();
    });

    it('4. returns NO_ACTIVE_SESSION when RPC reports deactivated: false (already displaced/no active row)', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true, deactivated: false },
        error: null,
      } as never);

      const result = await deactivateActiveSession();

      expect(supabase.rpc).toHaveBeenCalledWith('deactivate_active_session');
      expect(result).toEqual({
        serverDeactivated: false,
        status: 'NO_ACTIVE_SESSION',
        userId: VALID_USER_ID,
        sessionId: VALID_SESSION_ID,
      });
    });

    it('5. handles RPC transport/PostgREST error and marks DATABASE_OR_RPC_FAILURE', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      const rpcTransportError = { message: 'Database connection failed', code: 'PGRST000' };
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: rpcTransportError,
      } as never);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await deactivateActiveSession();

      expect(result.serverDeactivated).toBe(false);
      expect(result.status).toBe('DATABASE_OR_RPC_FAILURE');
      expect(result.error).toEqual(rpcTransportError);

      errorSpy.mockRestore();
    });

    it('6. handles RPC internal error_code (e.g. DATABASE_ERROR) without treating as success', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: false, error_code: 'DATABASE_ERROR' },
        error: null,
      } as never);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await deactivateActiveSession();

      expect(result.serverDeactivated).toBe(false);
      expect(result.status).toBe('DATABASE_OR_RPC_FAILURE');
      expect(result.error).toBe('DATABASE_ERROR');

      errorSpy.mockRestore();
    });

    it('7. handles unexpected RPC response shape safely', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'unexpected-string',
        error: null,
      } as never);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await deactivateActiveSession();

      expect(result.serverDeactivated).toBe(false);
      expect(result.status).toBe('DATABASE_OR_RPC_FAILURE');
      expect(result.error).toBe('INVALID_RESPONSE_SHAPE');

      errorSpy.mockRestore();
    });

    it('8. handles unexpected exception thrown during RPC execution safely', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network offline'));

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await deactivateActiveSession();

      expect(result.serverDeactivated).toBe(false);
      expect(result.status).toBe('DATABASE_OR_RPC_FAILURE');

      errorSpy.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // logout — Phase 1.2.4 Logout Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('1. successfully logs out with server-side deactivation and auth sign out', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true, deactivated: true },
        error: null,
      } as never);

      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const result = await logout();

      expect(supabase.rpc).toHaveBeenCalledWith('deactivate_active_session');
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result).toEqual({
        serverDeactivated: true,
        status: 'SUCCESSFUL_DEACTIVATION',
        userId: VALID_USER_ID,
        sessionId: VALID_SESSION_ID,
        authSignedOut: true,
      });
    });

    it('2. successfully logs out when no active session is present', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as never);

      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const result = await logout();

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result).toEqual({
        serverDeactivated: false,
        status: 'NO_ACTIVE_SESSION',
        userId: null,
        sessionId: null,
        authSignedOut: true,
      });
    });

    it('3. strictly enforces logout operation ordering (capture -> deactivate RPC -> auth signOut)', async () => {
      const callOrder: string[] = [];

      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockImplementation(async () => {
        callOrder.push('getSession');
        return {
          data: {
            session: {
              access_token: token,
              user: { id: VALID_USER_ID },
            },
          },
          error: null,
        } as never;
      });

      vi.mocked(supabase.rpc).mockImplementation(async () => {
        callOrder.push('rpc:deactivate');
        return {
          data: { success: true, deactivated: true },
          error: null,
        } as never;
      });

      vi.mocked(supabase.auth.signOut).mockImplementation(async () => {
        callOrder.push('signOut');
        return { error: null };
      });

      await logout();

      expect(callOrder).toEqual(['getSession', 'rpc:deactivate', 'signOut']);
    });

    it('4. proceeds with Auth signOut when server-side deactivation fails with database error', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database connection lost' },
      } as never);

      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await logout();

      // Auth signOut MUST still be called!
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result.serverDeactivated).toBe(false);
      expect(result.status).toBe('DATABASE_OR_RPC_FAILURE');
      expect(result.authSignedOut).toBe(true);

      errorSpy.mockRestore();
    });

    it('5. proceeds with Auth signOut when server-side deactivation throws an exception', async () => {
      const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: token,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network offline'));
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await logout();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result.serverDeactivated).toBe(false);
      expect(result.status).toBe('DATABASE_OR_RPC_FAILURE');
      expect(result.authSignedOut).toBe(true);

      errorSpy.mockRestore();
    });

    it('6. throws error when Auth signOut fails and logs the failure', async () => {
      const mockError = new Error('Logout failed');
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError as never });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(logout()).rejects.toThrow('Logout failed');

      expect(errorSpy).toHaveBeenCalledWith('logout: Supabase Auth signOut failed:', mockError);

      errorSpy.mockRestore();
    });

    it('7. conditional deletion protects replacement session when displaced session logs out', async () => {
      // Displaced session calls logout
      const displacedSessionId = '11111111-1111-1111-1111-111111111111';
      const displacedToken = makeJwt({ sub: VALID_USER_ID, session_id: displacedSessionId });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: displacedToken,
            user: { id: VALID_USER_ID },
          },
        },
        error: null,
      } as never);

      // Database conditional deletion matched 0 rows because replacement session is active
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true, deactivated: false },
        error: null,
      } as never);

      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const result = await logout();

      expect(supabase.rpc).toHaveBeenCalledWith('deactivate_active_session');
      expect(supabase.auth.signOut).toHaveBeenCalled();
      // Server deactivation did NOT touch any row (protected the replacement session)
      expect(result.serverDeactivated).toBe(false);
      expect(result.status).toBe('NO_ACTIVE_SESSION');
      expect(result.authSignedOut).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getCurrentUser — unchanged
  // ─────────────────────────────────────────────────────────────────────────
  describe('getCurrentUser', () => {
    it('returns null if no user is authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as never);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('throws error if getting user fails', async () => {
      const mockError = new Error('Auth error');
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: mockError } as never);

      await expect(getCurrentUser()).rejects.toThrow('Auth error');
    });

    it('returns profile if user is authenticated and profile exists', async () => {
      const mockUser = { id: 'test-id' };
      const mockProfile = { id: 'test-id', name: 'Test User' };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null } as never);

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockProfile, error: null });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as never);

      const result = await getCurrentUser();

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at');
      expect(mockEq).toHaveBeenCalledWith('id', 'test-id');
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    it('returns null if fetching profile fails via chained supabase call', async () => {
      const mockUser = { id: 'test-id' };
      const mockProfileError = new Error('Profile not found');

      // @ts-expect-error mockResolvedValue expects specific AuthError type
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null });

      // Mocking chained supabase.from().select().eq().single() to return an error
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockProfileError });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      // We need to spy on console.error since the function logs it
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getCurrentUser();

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at');
      expect(mockEq).toHaveBeenCalledWith('id', 'test-id');
      expect(mockSingle).toHaveBeenCalled();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Error fetching profile");

      consoleSpy.mockRestore();
    });
  });
});
