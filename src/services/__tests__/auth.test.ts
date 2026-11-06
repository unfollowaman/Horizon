import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, register, logout, getCurrentUser } from '../auth';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      // login() now uses setSession (not signInWithPassword) after the
      // Phase 1.2.2 Login Orchestrator implementation.
      setSession: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('auth service', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup window.location for register tests
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete window.location;
    window.location = { origin: 'http://localhost' } as never;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.location = originalLocation;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // login — now calls the auth-login Edge Function + supabase.auth.setSession
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
  // logout — unchanged
  // ─────────────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('successfully logs out', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
      await logout();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('throws error when logout fails', async () => {
      const mockError = new Error('Logout failed');
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError as never });
      await expect(logout()).rejects.toThrow('Logout failed');
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
