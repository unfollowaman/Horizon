import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, register, logout, getCurrentUser } from '../auth';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
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
  });

  describe('login', () => {
    it('successfully logs in a user', async () => {
      const mockData = {
        data: { user: { id: 'test-id' }, session: { access_token: 'token' } },
        error: null,
      };
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue(mockData as never);

      const result = await login('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockData.data);
    });

    it('throws error when login fails', async () => {
      const mockError = new Error('Invalid credentials');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      } as never);

      await expect(login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });
  });

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

      // Mocking supabase.auth.getUser
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null } as any);

      // Mocking chained supabase.from().select().eq().single() to return an error
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockProfileError });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      // We need to spy on console.error since the function logs it
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getCurrentUser();

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at');
      expect(mockEq).toHaveBeenCalledWith('id', 'test-id');
      expect(mockSingle).toHaveBeenCalled();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Error fetching profile", mockProfileError);

      consoleSpy.mockRestore();
    });
  });
});
