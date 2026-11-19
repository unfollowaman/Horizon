import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import Onboarding from '../Onboarding';
import type { Session, User } from '@supabase/supabase-js';

// Suppress React 19 test warning
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Helper to create deferred promises for controlling asynchronous ordering
export function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Router navigate mock
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();
const mockRemoveChannel = vi.fn();

let realtimeBroadcastCallback: ((event: unknown) => void) | null = null;
let realtimeChannelSubscribeCallback: ((status: string, err?: unknown) => void) | null = null;

const mockChannel = {
  on: vi.fn((_type: string, _filter: unknown, cb: (event: unknown) => void) => {
    realtimeBroadcastCallback = cb;
    return mockChannel;
  }),
  subscribe: vi.fn((cb: (status: string, err?: unknown) => void) => {
    realtimeChannelSubscribeCallback = cb;
    return mockChannel;
  }),
};

vi.mock('../../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    channel: () => mockChannel,
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    from: (table: string) => {
      if (table === 'profiles') {
        return {
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
          update: (updates: unknown) => {
            mockUpdate(updates);
            return {
              eq: (...args: unknown[]) => {
                mockUpdateEq(...args);
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }
      return {};
    },
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'avatar.png' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/avatar.png' } }),
      }),
    },
  },
}));

// Mock auth service
const mockRegisterConfirmationSession = vi.fn();
const mockCheckIsActiveSession = vi.fn();
const mockSetSessionReplacementNotice = vi.fn();
const mockTeardownSession = vi.fn();
const mockLogout = vi.fn();
const mockExtractSessionId = vi.fn();

vi.mock('../../../services/auth', () => ({
  registerConfirmationSession: (...args: unknown[]) => mockRegisterConfirmationSession(...args),
  checkIsActiveSession: (...args: unknown[]) => mockCheckIsActiveSession(...args),
  setSessionReplacementNotice: (...args: unknown[]) => mockSetSessionReplacementNotice(...args),
  consumeSessionReplacementNotice: () => null,
  teardownSession: (...args: unknown[]) => mockTeardownSession(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
  extractSessionId: (...args: unknown[]) => mockExtractSessionId(...args),
  SESSION_REPLACEMENT_MESSAGE: 'Session replaced',
}));

// Mock notifications service
vi.mock('../../../services/notifications', () => ({
  subscribeToPushNotifications: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Phase 8.4.5 — Confirmation Lifecycle Race Corrections', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const originalLocation = window.location;

  const USER_ID = '94b32b85-0d32-4d43-bb9e-3d2319c72e90';
  const SESSION_ID = 'e3b0c442-98fc-1c14-9afbf4c8996fb924';

  const mockUser: User = {
    id: USER_ID,
    email: 'student@example.com',
    app_metadata: { role: 'student' },
    user_metadata: { name: 'Student One' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'valid-confirmation-access-token',
    refresh_token: 'valid-confirmation-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  const mockProfile = {
    id: USER_ID,
    name: 'Student One',
    student_class: null,
    study_medium: null,
    avatar_url: null,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    realtimeBroadcastCallback = null;
    realtimeChannelSubscribeCallback = null;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    (window as unknown as { location: unknown }).location = {
      origin: 'http://localhost',
      hash: '',
      search: '',
      pathname: '/onboarding',
    };

    mockExtractSessionId.mockReturnValue(SESSION_ID);

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
    container = null;
    root = null;
    (window as unknown as { location: unknown }).location = originalLocation;
    vi.restoreAllMocks();
  });

  const renderWithAuth = async (initialPath = '/onboarding') => {
    await act(async () => {
      root?.render(
        <AuthProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
              <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Confirmation registration pending while /onboarding mounts
  // ───────────────────────────────────────────────────────────────────────────
  it('1. Confirmation registration pending while /onboarding mounts retains loading and renders PageLoader', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const regDeferred = createDeferred<{ success: boolean; sessionId: string }>();
    mockRegisterConfirmationSession.mockReturnValue(regDeferred.promise);

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await renderWithAuth();

    // While registration is pending:
    // Registration must have been initiated
    expect(mockRegisterConfirmationSession).toHaveBeenCalled();
    // Onboarding must be in loading state (PageLoader displayed)
    expect(container?.textContent).toContain('Loading...');
    // Step 1 content must not be visible yet
    expect(container?.textContent).not.toContain('Welcome to Horizon');
    // No profile select query should have run while registration is pending
    expect(mockSingle).not.toHaveBeenCalled();

    // Now resolve registration
    await act(async () => {
      regDeferred.resolve({ success: true, sessionId: SESSION_ID });
    });

    // Profile query now succeeds and Onboarding renders Step 1
    expect(mockSingle).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('h1')?.textContent).toBe('Welcome to Horizon');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. No profile query before registration succeeds
  // ───────────────────────────────────────────────────────────────────────────
  it('2. No profile query before registration succeeds (strict call sequence invariant)', async () => {
    window.location.hash = '#access_token=token&type=email_verification';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const executionLog: string[] = [];

    const regDeferred = createDeferred<{ success: boolean; sessionId: string }>();
    mockRegisterConfirmationSession.mockImplementation(async () => {
      executionLog.push('register_start');
      return regDeferred.promise;
    });

    mockSingle.mockImplementation(async () => {
      executionLog.push('profiles_select');
      return { data: mockProfile, error: null };
    });

    await renderWithAuth();

    expect(executionLog).toEqual(['register_start']);
    expect(executionLog).not.toContain('profiles_select');

    // Settle registration
    await act(async () => {
      regDeferred.resolve({ success: true, sessionId: SESSION_ID });
    });

    expect(executionLog).toEqual(['register_start', 'profiles_select']);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Focus event while confirmation registration is pending
  // ───────────────────────────────────────────────────────────────────────────
  it('3. Focus event while confirmation registration is pending does NOT invalidate or displace session', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const regDeferred = createDeferred<{ success: boolean; sessionId: string }>();
    mockRegisterConfirmationSession.mockReturnValue(regDeferred.promise);

    // If checkIsActiveSession were called prematurely, it would report inactive
    mockCheckIsActiveSession.mockResolvedValue({
      isActive: false,
      isDefinitivelyInactive: true,
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await renderWithAuth();

    // Dispatch focus event while registration is pending
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    // Teardown must NOT have been called; session must NOT have been signed out
    expect(mockTeardownSession).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();

    // Complete registration
    await act(async () => {
      regDeferred.resolve({ success: true, sessionId: SESSION_ID });
    });

    expect(container?.querySelector('h1')?.textContent).toBe('Welcome to Horizon');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Visibility-change event while registration is pending
  // ───────────────────────────────────────────────────────────────────────────
  it('4. Visibility-change event while registration is pending does NOT trigger premature session replacement', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const regDeferred = createDeferred<{ success: boolean; sessionId: string }>();
    mockRegisterConfirmationSession.mockReturnValue(regDeferred.promise);

    mockCheckIsActiveSession.mockResolvedValue({
      isActive: false,
      isDefinitivelyInactive: true,
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await renderWithAuth();

    // Simulate visibility change to visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Premature inactive session check must NOT tear down the session
    expect(mockTeardownSession).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();

    await act(async () => {
      regDeferred.resolve({ success: true, sessionId: SESSION_ID });
    });

    expect(container?.querySelector('h1')?.textContent).toBe('Welcome to Horizon');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Successful registration followed by profile retrieval
  // ───────────────────────────────────────────────────────────────────────────
  it('5. Successful registration followed by profile retrieval publishes state atomically and initializes steps', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: SESSION_ID,
      sessionEpoch: 1,
    });

    // Profile already has class and medium populated -> Onboarding lands directly on Step 4 (avatar)
    mockSingle.mockResolvedValue({
      data: {
        ...mockProfile,
        student_class: 'Class 10',
        study_medium: 'English',
        avatar_url: null,
      },
      error: null,
    });

    await renderWithAuth();

    // Verify Onboarding lands on Step 4
    expect(container?.textContent).toContain('Step 4 of 6');
    expect(container?.textContent).toContain('Profile Photo');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Registration failure prevents authenticated state publication
  // ───────────────────────────────────────────────────────────────────────────
  it('6. Registration failure prevents authenticated state publication and redirects unauthenticated user', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: false,
      errorCode: 'CLAIM_ALREADY_CONSUMED',
      error: 'This confirmation link has already been used. Please log in with your password.',
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await renderWithAuth();

    // Profile SELECT must never be called
    expect(mockSingle).not.toHaveBeenCalled();

    // SDK session signed out locally
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });

    // Onboarding redirects unauthenticated user to /login
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Session identity mismatch prevents publication
  // ───────────────────────────────────────────────────────────────────────────
  it('7. Session identity mismatch prevents publication and signs out locally', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: 'mismatched-session-uuid-1234',
    });

    await renderWithAuth();

    // Profile SELECT must not be called
    expect(mockSingle).not.toHaveBeenCalled();

    // Local sign out triggered
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. SDK session replacement during registration
  // ───────────────────────────────────────────────────────────────────────────
  it('8. SDK session replacement during registration aborts publication and protects newer session', async () => {
    window.location.hash = '#access_token=token&type=signup';

    // Initial getSession returns the target session
    mockGetSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const regDeferred = createDeferred<{ success: boolean; sessionId: string }>();
    mockRegisterConfirmationSession.mockReturnValue(regDeferred.promise);

    await renderWithAuth();

    // During registration, SDK session is changed to a newer session
    const newerSession: Session = {
      ...mockSession,
      access_token: 'newer-session-token',
    };
    mockGetSession.mockResolvedValue({
      data: { session: newerSession },
      error: null,
    });
    mockExtractSessionId.mockReturnValue('newer-session-uuid');

    // Registration resolves for old session
    await act(async () => {
      regDeferred.resolve({ success: true, sessionId: SESSION_ID });
    });

    // Old confirmation session must NOT be published, and newer session must NOT be signed out
    expect(mockSingle).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Realtime session replacement during registration
  // ───────────────────────────────────────────────────────────────────────────
  it('9. Realtime session replacement tears down session and clears authenticated state', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: SESSION_ID,
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await renderWithAuth();

    expect(container?.querySelector('h1')?.textContent).toBe('Welcome to Horizon');

    // Simulate realtime subscription connected
    act(() => {
      realtimeChannelSubscribeCallback?.('SUBSCRIBED');
    });

    // Simulate realtime broadcast for session replacement
    expect(realtimeBroadcastCallback).not.toBeNull();
    await act(async () => {
      realtimeBroadcastCallback?.({
        payload: {
          replaced_session_id: SESSION_ID,
          message: 'Signed in on another browser',
        },
      });
    });

    expect(mockTeardownSession).toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. Component unmount during initialization
  // ───────────────────────────────────────────────────────────────────────────
  it('10. Component unmount during initialization aborts cleanly without errors', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const regDeferred = createDeferred<{ success: boolean; sessionId: string }>();
    mockRegisterConfirmationSession.mockReturnValue(regDeferred.promise);

    await renderWithAuth();

    // Unmount before registration completes
    act(() => {
      root?.unmount();
      root = null;
    });

    // Settle promise after unmount
    await act(async () => {
      regDeferred.resolve({ success: true, sessionId: SESSION_ID });
    });

    // No error, profile fetch not called on unmounted
    expect(mockSingle).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. Direct /onboarding route with confirmation callback
  // ───────────────────────────────────────────────────────────────────────────
  it('11. Direct /onboarding route with confirmation callback initializes cleanly without duplicate queries', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: SESSION_ID,
    });

    mockSingle.mockResolvedValue({
      data: mockProfile,
      error: null,
    });

    await renderWithAuth('/onboarding');

    // Exactly 1 profile select was performed (by AuthContext, 0 by Onboarding)
    expect(mockSingle).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('h1')?.textContent).toBe('Welcome to Horizon');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 12. Refresh after successful registration
  // ───────────────────────────────────────────────────────────────────────────
  it('12. Browser refresh after successful registration skips confirmation and validates active session', async () => {
    // No hash on standard refresh
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

    await renderWithAuth('/onboarding');

    // Confirmation registration is NOT called
    expect(mockRegisterConfirmationSession).not.toHaveBeenCalled();
    // Profile is loaded
    expect(mockSingle).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('h1')?.textContent).toBe('Welcome to Horizon');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 13. Normal password login regression
  // ───────────────────────────────────────────────────────────────────────────
  it('13. Normal password login regression: active session loads profile and publishes state', async () => {
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
      data: {
        ...mockProfile,
        student_class: 'Class 9',
        study_medium: 'Hindi',
        avatar_url: '/assets/Avatars/avatar-2.svg',
        onboarding_completed: true,
      },
      error: null,
    });

    await renderWithAuth('/onboarding');

    expect(mockRegisterConfirmationSession).not.toHaveBeenCalled();
    // User with completed onboarding is redirected to '/'
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 14. Existing onboarding form behaviour
  // ───────────────────────────────────────────────────────────────────────────
  it('14. Existing onboarding form behaviour: step transitions and selections work correctly', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: SESSION_ID,
    });

    mockSingle.mockResolvedValue({
      data: mockProfile, // empty profile
      error: null,
    });

    await renderWithAuth('/onboarding');

    // On Step 1: Click "Continue" button to move to Step 2
    expect(container?.textContent).toContain('Step 1 of 6');
    const continueBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Continue')
    );
    expect(continueBtn).not.toBeUndefined();

    await act(async () => {
      continueBtn?.click();
    });

    // On Step 2: Click "Class 10" button
    expect(container?.textContent).toContain('Step 2 of 6');
    const classBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Class 10')
    );
    expect(classBtn).not.toBeUndefined();

    await act(async () => {
      classBtn?.click();
    });

    // Profile update was called for student_class
    expect(mockUpdate).toHaveBeenCalledWith({ student_class: 'Class 10' });

    // Advances to Step 3 (Medium selection)
    expect(container?.textContent).toContain('Step 3 of 6');
    expect(container?.textContent).toContain('Study Medium');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 15. Profile-fetch error and retry behaviour
  // ───────────────────────────────────────────────────────────────────────────
  it('15. Profile-fetch error displays initialization error screen and permits successful retry via refreshProfile', async () => {
    window.location.hash = '#access_token=token&type=signup';

    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockRegisterConfirmationSession.mockResolvedValue({
      success: true,
      sessionId: SESSION_ID,
    });

    // Initial profile fetch fails
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('Temporary database error'),
    });

    await renderWithAuth('/onboarding');

    // Initialization error banner is visible
    expect(container?.textContent).toContain('Failed to load your profile. Please refresh or try again.');

    const retryBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (b) => b.textContent === 'Retry Loading Profile'
    );
    expect(retryBtn).not.toBeUndefined();

    // Set up successful profile fetch on retry
    mockSingle.mockResolvedValueOnce({
      data: mockProfile,
      error: null,
    });

    await act(async () => {
      retryBtn?.click();
    });

    // Onboarding recovers and renders Step 1
    expect(container?.querySelector('h1')?.textContent).toBe('Welcome to Horizon');
  });
});
