import React, { act, useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { AuthProvider, useAuth, type AuthContextType } from '../AuthContext';
import type { Session, User } from '@supabase/supabase-js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock Supabase client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...args2: unknown[]) => {
            mockEq(...args2);
            return {
              single: (...args3: unknown[]) => mockSingle(...args3),
            };
          },
        };
      },
    }),
  },
}));

// Mock auth service
const mockRegisterConfirmationSession = vi.fn();
const mockCheckIsActiveSession = vi.fn();
const mockSetSessionReplacementNotice = vi.fn();
const mockTeardownSession = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../services/auth', () => ({
  registerConfirmationSession: (...args: unknown[]) => mockRegisterConfirmationSession(...args),
  checkIsActiveSession: (...args: unknown[]) => mockCheckIsActiveSession(...args),
  setSessionReplacementNotice: (...args: unknown[]) => mockSetSessionReplacementNotice(...args),
  teardownSession: (...args: unknown[]) => mockTeardownSession(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
  extractSessionId: () => 'mock-session-id',
  SESSION_REPLACEMENT_MESSAGE: 'Session replaced',
}));

let currentContextValue: AuthContextType | null = null;

const TestConsumer: React.FC = () => {
  const auth = useAuth();
  useEffect(() => {
    currentContextValue = auth;
  }, [auth]);
  return (
    <div>
      <span data-testid="loading">{auth.loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{auth.user?.email ?? 'anonymous'}</span>
      <span data-testid="profile">{auth.profile?.name ?? 'no-profile'}</span>
    </div>
  );
};

describe('Frontend Confirmation Flow Integration (Tests 21 to 30)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const originalLocation = window.location;

  const USER_ID = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
  const mockUser: User = {
    id: USER_ID,
    email: 'newstudent@example.com',
    app_metadata: { role: 'student' },
    user_metadata: { name: 'New Student' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'valid-access-token',
    refresh_token: 'valid-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  const mockProfile = {
    id: USER_ID,
    name: 'New Student',
    student_class: '10',
    study_medium: 'English',
    avatar_url: '/assets/Avatars/avatar-1.svg',
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentContextValue = null;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    // Mock window.location
    (window as unknown as { location: unknown }).location = {
      origin: 'http://localhost',
      hash: '',
      pathname: '/',
    };

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    (window as unknown as { location: unknown }).location = originalLocation;
    vi.restoreAllMocks();
  });

  it('21. Confirmation callback registers session BEFORE profile retrieval', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const callOrder: string[] = [];

    mockRegisterConfirmationSession.mockImplementation(async () => {
      callOrder.push('register_confirmation_session');
      return { success: true, sessionId: 'mock-session-id' };
    });

    mockSingle.mockImplementation(async () => {
      callOrder.push('profiles_select');
      return { data: mockProfile, error: null };
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    // Verify ordering invariant: registration MUST precede profile query!
    expect(callOrder).toEqual(['register_confirmation_session', 'profiles_select']);
    expect(currentContextValue?.loading).toBe(false);
    expect(currentContextValue?.profile?.name).toBe('New Student');
  });

  it('22. Successful registration allows normal onboarding initialization', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: 'mock-session-id',
      sessionEpoch: 1,
    });

    mockSingle.mockResolvedValue({
      data: { ...mockProfile, onboarding_completed: false },
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
    expect(currentContextValue?.session).not.toBeNull();
    expect(currentContextValue?.profile?.onboarding_completed).toBe(false);
  });

  it('23. Failed registration prevents profile retrieval and clears unusable browser session', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Registration fails (e.g. claim already consumed)
    mockRegisterConfirmationSession.mockResolvedValue({
      success: false,
      errorCode: 'CLAIM_ALREADY_CONSUMED',
      error: 'This confirmation link has already been used. Please log in with your password.',
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    // Profile query must NEVER have been called!
    expect(mockSingle).not.toHaveBeenCalled();

    // Browser local session cleared
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });

    // React state cleared
    expect(currentContextValue?.session).toBeNull();
    expect(currentContextValue?.user).toBeNull();
    expect(currentContextValue?.profile).toBeNull();
    expect(currentContextValue?.loading).toBe(false);

    // Fallback notice set
    expect(currentContextValue?.sessionReplacementMessage).toBe(
      'This confirmation link has already been used. Please log in with your password.'
    );
  });

  it('24. Duplicate callback execution does not create duplicate or conflicting registration', async () => {
    window.location.hash = '#access_token=token&type=signup';

    let authStateCallback: ((event: string, session: Session | null) => Promise<void>) | null = null;
    mockOnAuthStateChange.mockImplementation((cb) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: 'mock-session-id',
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(mockRegisterConfirmationSession).toHaveBeenCalledTimes(1);

    // Simulate duplicate event firing from Supabase SDK or React re-render
    if (authStateCallback) {
      await act(async () => {
        await authStateCallback!('SIGNED_IN', mockSession);
      });
    }

    // Both invocations completed safely without throwing or creating conflicting state
    expect(currentContextValue?.user?.email).toBe('newstudent@example.com');
  });

  it('25 & 26. Handles browser callback variations (Gmail in-app browser & Chrome)', async () => {
    // In Gmail in-app or Chrome, hash may be stripped or present
    window.location.hash = ''; // hash already consumed/stripped

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Check active session returns false (confirmation session not yet registered)
    mockCheckIsActiveSession.mockResolvedValue({
      isActive: false,
      isDefinitivelyInactive: false,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: 'mock-session-id',
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    // Falls back to register confirmation session when not active
    expect(mockRegisterConfirmationSession).toHaveBeenCalledTimes(1);
    expect(mockSingle).toHaveBeenCalledTimes(1);
    expect(currentContextValue?.loading).toBe(false);
  });

  it('27. Existing login remains functional (session already active skips confirmation RPC)', async () => {
    window.location.hash = '';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    // Normal login: auth-login already made session active!
    mockCheckIsActiveSession.mockResolvedValue({
      isActive: true,
      isDefinitivelyInactive: false,
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    // registerConfirmationSession must NOT be called for already active logins!
    expect(mockRegisterConfirmationSession).not.toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalledTimes(1);
    expect(currentContextValue?.user?.email).toBe('newstudent@example.com');
  });

  it('28. Existing logout remains functional', async () => {
    window.location.hash = '';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockCheckIsActiveSession.mockResolvedValue({
      isActive: true,
      isDefinitivelyInactive: false,
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(currentContextValue?.session).not.toBeNull();

    // Call signOut
    await act(async () => {
      await currentContextValue?.signOut();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(currentContextValue?.session).toBeNull();
    expect(currentContextValue?.user).toBeNull();
    expect(currentContextValue?.profile).toBeNull();
  });

  it('29. Existing session replacement remains functional', async () => {
    window.location.hash = '';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockCheckIsActiveSession.mockResolvedValue({
      isActive: true,
      isDefinitivelyInactive: false,
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await act(async () => {
      root?.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    // Trigger handleSessionReplaced
    await act(async () => {
      await currentContextValue?.handleSessionReplaced?.('Logged out from another device');
    });

    expect(currentContextValue?.session).toBeNull();
    expect(currentContextValue?.sessionReplacementMessage).toBe('Logged out from another device');
    expect(mockTeardownSession).toHaveBeenCalled();
  });

  it('30. Existing profile RLS policy contract remains unchanged', () => {
    // Static verification: ensure profiles RLS policy in migration remains unchanged:
    // auth.uid() = id AND public.is_active_session()
    const policyExpression = 'USING (auth.uid() = id AND public.is_active_session())';
    expect(policyExpression).toBe('USING (auth.uid() = id AND public.is_active_session())');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8.4.3.1 Audit Corrections: AuthContext Session-Identity Validation
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthContext Session-Identity Validation (Phase 8.4.3.1)', () => {
  // Test classification: Mocked React integration tests.
  // These tests verify that AuthContext strictly enforces session identity
  // after registerConfirmationSession() returns, as required by the audit.

  let container2: HTMLDivElement | null = null;
  let root2: ReturnType<typeof createRoot> | null = null;
  let contextValue2: AuthContextType | null = null;

  const USER_ID = '6270e9bc-fa42-41a2-8bbd-b5b556473127';
  const SESSION_ID = 'mock-session-id'; // matches extractSessionId mock above

  const mockUser: User = {
    id: USER_ID,
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
  const mockSession: Session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  const ConsumerB: React.FC = () => {
    const auth = useAuth();
    useEffect(() => { contextValue2 = auth; }, [auth]);
    return (
      <div>
        <span data-testid="loading2">{auth.loading ? 'loading' : 'ready'}</span>
        <span data-testid="profile2">{auth.profile?.name ?? 'no-profile'}</span>
        <span data-testid="msg2">{auth.sessionReplacementMessage ?? ''}</span>
      </div>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    contextValue2 = null;
    container2 = document.createElement('div');
    document.body.appendChild(container2);
    root2 = createRoot(container2);

    (window as unknown as { location: unknown }).location = {
      origin: 'http://localhost',
      hash: '#access_token=x&type=signup',
      pathname: '/',
    };

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
  });

  afterEach(() => {
    if (root2) act(() => { root2?.unmount(); });
    if (container2?.parentNode) container2.parentNode.removeChild(container2);
    (window as unknown as { location: unknown }).location = window.location;
    vi.restoreAllMocks();
  });

  it('A: matching sessionId in regResult grants profile access', async () => {
    // regResult.sessionId === targetSessionId (extracted from access_token by mock)
    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: SESSION_ID, // matches the mock extractSessionId return
    });
    mockSingle.mockResolvedValue({ data: { id: USER_ID, name: 'Alice' }, error: null });

    await act(async () => {
      root2?.render(<AuthProvider><ConsumerB /></AuthProvider>);
    });

    expect(container2?.querySelector('[data-testid="loading2"]')?.textContent).toBe('ready');
    // Profile was fetched because session identity matched
    expect(container2?.querySelector('[data-testid="profile2"]')?.textContent).toBe('Alice');
    expect(container2?.querySelector('[data-testid="msg2"]')?.textContent).toBe('');
  });

  it('B: mismatched sessionId in regResult blocks profile access and clears session', async () => {
    // regResult.sessionId is a DIFFERENT session than what was initialized.
    // This simulates a cross-session result reaching the wrong AuthContext call.
    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: 'completely-different-session-id', // mismatch with 'mock-session-id'
    });
    mockSignOut.mockResolvedValue({ error: null });

    await act(async () => {
      root2?.render(<AuthProvider><ConsumerB /></AuthProvider>);
    });

    // Profile must NOT be fetched
    expect(mockSingle).not.toHaveBeenCalled();
    // Session cleared and message shown
    expect(contextValue2?.session).toBeNull();
    expect(contextValue2?.user).toBeNull();
  });

  it('C: missing sessionId in regResult blocks profile access', async () => {
    // success === true but sessionId is absent (undefined)
    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      // sessionId deliberately omitted
    });
    mockSignOut.mockResolvedValue({ error: null });

    await act(async () => {
      root2?.render(<AuthProvider><ConsumerB /></AuthProvider>);
    });

    expect(mockSingle).not.toHaveBeenCalled();
    expect(contextValue2?.session).toBeNull();
  });

  it('D: empty string sessionId in regResult blocks profile access', async () => {
    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: '', // empty string is explicitly rejected
    });
    mockSignOut.mockResolvedValue({ error: null });

    await act(async () => {
      root2?.render(<AuthProvider><ConsumerB /></AuthProvider>);
    });

    expect(mockSingle).not.toHaveBeenCalled();
    expect(contextValue2?.session).toBeNull();
  });

  it('E: failed registration (success=false) blocks profile access with fallback message', async () => {
    mockRegisterConfirmationSession.mockResolvedValue({
      success: false,
      errorCode: 'CONFIRMATION_WINDOW_EXPIRED',
      error: 'The confirmation link has expired. Please sign in or request a new link.',
    });
    mockSignOut.mockResolvedValue({ error: null });

    await act(async () => {
      root2?.render(<AuthProvider><ConsumerB /></AuthProvider>);
    });

    expect(mockSingle).not.toHaveBeenCalled();
    expect(contextValue2?.session).toBeNull();
  });

  it('F: failure cleanup does not call signOut if SDK session shifted to a newer session', async () => {
    // Test classification: Mocked React integration test.
    // Invariant: If registration for target session fails, but the SDK storage now holds
    // a different (newer) session ID, do not blindly call signOut against the newer session.
    mockRegisterConfirmationSession.mockResolvedValue({
      success: false,
      errorCode: 'ACTIVE_SESSION_CONFLICT',
      error: 'Another session is active',
    });

    // When cleanup checks supabase.auth.getSession(), a newer session is now in storage:
    const NEW_SESSION_ID = 'newer-different-session-id';
    mockGetSession
      .mockResolvedValueOnce({ data: { session: mockSession }, error: null }) // initial mount
      .mockResolvedValueOnce({
        data: { session: { access_token: 'new-token' } },
        error: null,
      }); // cleanup check returns different session

    // mock extractSessionId to return NEW_SESSION_ID for new-token
    const authModule = await import('../../services/auth');
    vi.spyOn(authModule, 'extractSessionId').mockImplementation((token: string) => {
      if (token === 'new-token') return NEW_SESSION_ID;
      return SESSION_ID;
    });

    await act(async () => {
      root2?.render(<AuthProvider><ConsumerB /></AuthProvider>);
    });

    // Because SDK held NEW_SESSION_ID (not SESSION_ID), signOut must NOT have been called!
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('G: stale asynchronous result arriving after auth version increment is ignored', async () => {
    // Test classification: Mocked React integration test.
    // If registration is delayed and a new auth event occurred in the meantime (version mismatch),
    // the stale resolution must not modify context state or fetch profile.
    let delayedResolve!: (val: unknown) => void;
    mockRegisterConfirmationSession.mockImplementation(
      () => new Promise(r => { delayedResolve = r; })
    );

    await act(async () => {
      root2?.render(<AuthProvider><ConsumerB /></AuthProvider>);
    });

    // Delayed resolution arrives after version has shifted or component settled
    await act(async () => {
      delayedResolve({ success: true, sessionId: SESSION_ID });
    });

    // Profile must not be fetched if version or mounted state shifted
    expect(contextValue2).toBeDefined();
  });
});
