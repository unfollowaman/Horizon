import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthProvider, useAuth, type AuthContextType } from '../AuthContext';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock Supabase client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockRefreshSession = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      refreshSession: (...args: any[]) => mockRefreshSession(...args),
    },
    from: () => ({
      select: (...args: any[]) => {
        mockSelect(...args);
        return {
          eq: (...args2: any[]) => {
            mockEq(...args2);
            return {
              single: (...args3: any[]) => mockSingle(...args3),
            };
          },
        };
      },
    }),
  },
}));

vi.mock('../../services/auth', () => ({
  logout: (...args: any[]) => mockLogout(...args),
}));

// Helper Consumer Component
let currentContextValue: AuthContextType | null = null;

const TestConsumer: React.FC = () => {
  const auth = useAuth();
  currentContextValue = auth;
  return (
    <div>
      <span data-testid="loading">{auth.loading ? 'true' : 'false'}</span>
      <span data-testid="is-admin">{auth.isAdmin ? 'true' : 'false'}</span>
      <span data-testid="user-email">{auth.user?.email || 'none'}</span>
    </div>
  );
};

describe('AuthContext', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentContextValue = null;
    authStateCallback = null;

    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockImplementation((cb) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockRefreshSession.mockResolvedValue({ data: { session: null, user: null }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockLogout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('1. isAdmin is false when user is null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.user).toBeNull();
    expect(currentContextValue?.isAdmin).toBe(false);
  });

  it('2. isAdmin is false when app_metadata is missing', async () => {
    const mockUserNoMetadata = {
      id: 'user-1',
      email: 'student@example.com',
    };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUserNoMetadata, access_token: 'token-1' } },
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.user?.email).toBe('student@example.com');
    expect(currentContextValue?.isAdmin).toBe(false);
  });

  it('3. isAdmin is false when app_metadata.role is missing or "student"', async () => {
    const mockStudentUser = {
      id: 'user-student',
      email: 'student@example.com',
      app_metadata: { role: 'student', provider: 'email' },
    };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockStudentUser, access_token: 'token-1' } },
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.isAdmin).toBe(false);
  });

  it('4. isAdmin is true only when app_metadata.role === "admin"', async () => {
    const mockAdminUser = {
      id: 'user-admin',
      email: 'admin@example.com',
      app_metadata: { role: 'admin', provider: 'email' },
    };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockAdminUser, access_token: 'token-1' } },
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.user?.email).toBe('admin@example.com');
    expect(currentContextValue?.isAdmin).toBe(true);
  });

  it('5. student role in user_metadata or profile data never grants admin status', async () => {
    const mockSneakyUser = {
      id: 'user-sneaky',
      email: 'sneaky@example.com',
      app_metadata: { role: 'student' },
      user_metadata: { role: 'admin', is_admin: true },
    };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockSneakyUser, access_token: 'token-1' } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { id: 'user-sneaky', name: 'Sneaky User', role: 'admin' },
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.isAdmin).toBe(false);
  });

  it('6. auth state changes (sign-in and sign-out) update isAdmin correctly', async () => {
    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.isAdmin).toBe(false);

    // Simulate sign-in as admin
    const mockAdminSession = {
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        app_metadata: { role: 'admin' },
      },
      access_token: 'admin-token',
    };

    await act(async () => {
      authStateCallback?.('SIGNED_IN', mockAdminSession);
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.isAdmin).toBe(true);

    // Simulate sign-out
    await act(async () => {
      await currentContextValue?.signOut();
    });

    expect(currentContextValue?.user).toBeNull();
    expect(currentContextValue?.isAdmin).toBe(false);
  });

  it('7. token/session refresh reflects updated trusted role metadata', async () => {
    const initialStudentSession = {
      user: { id: 'user-1', email: 'user@example.com', app_metadata: { role: 'student' } },
      access_token: 'token-student',
    };
    mockGetSession.mockResolvedValue({ data: { session: initialStudentSession }, error: null });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.isAdmin).toBe(false);

    // Mock refreshSession returning updated admin claims
    const refreshedAdminSession = {
      user: { id: 'user-1', email: 'user@example.com', app_metadata: { role: 'admin' } },
      access_token: 'token-admin-refreshed',
    };
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: refreshedAdminSession, user: refreshedAdminSession.user },
      error: null,
    });

    await act(async () => {
      await currentContextValue?.refreshSession();
    });

    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.isAdmin).toBe(true);
  });

  it('8. failed session refresh is handled safely without crashing or incorrectly granting admin access', async () => {
    const studentSession = {
      user: { id: 'user-1', email: 'student@example.com', app_metadata: { role: 'student' } },
    };
    mockGetSession.mockResolvedValue({ data: { session: studentSession }, error: null });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    mockRefreshSession.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Invalid refresh token' },
    });

    await act(async () => {
      await currentContextValue?.refreshSession();
    });

    expect(currentContextValue?.isAdmin).toBe(false);
  });

  it('9. thrown refresh exception is handled safely without crashing', async () => {
    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    mockRefreshSession.mockRejectedValueOnce(new Error('Network connection failed'));

    await act(async () => {
      await currentContextValue?.refreshSession();
    });

    expect(currentContextValue?.isAdmin).toBe(false);
  });

  it('10. older asynchronous refresh result cannot overwrite newer authentication state', async () => {
    let resolveSlowRefresh: (val: any) => void = () => {};
    const slowRefreshPromise = new Promise((resolve) => {
      resolveSlowRefresh = resolve;
    });

    mockRefreshSession.mockReturnValueOnce(slowRefreshPromise);

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    // Start slow refresh
    let refreshPromise: Promise<void> | undefined;
    act(() => {
      refreshPromise = currentContextValue?.refreshSession();
    });

    // Newer event occurs: sign out
    await act(async () => {
      await currentContextValue?.signOut();
    });

    expect(currentContextValue?.user).toBeNull();

    // Now slow refresh completes with old admin session
    await act(async () => {
      resolveSlowRefresh({
        data: {
          session: { user: { id: 'old-admin', app_metadata: { role: 'admin' } } },
        },
        error: null,
      });
      await refreshPromise;
    });

    // State should still be null, not overwritten by stale slow refresh result
    expect(currentContextValue?.user).toBeNull();
    expect(currentContextValue?.isAdmin).toBe(false);
  });
});
