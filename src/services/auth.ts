import type { Json } from '../types';
import { supabase } from './supabase';

/**
 * Authenticates the user via the auth-login Edge Function (Phase 1.2.2).
 *
 * The Edge Function performs server-side authentication, registers the session
 * in the authoritative single-device session registry, and only returns
 * credentials after registration succeeds. This function then restores the
 * session into the Supabase JS SDK via setSession(), which triggers
 * onAuthStateChange and updates AuthContext normally.
 *
 * Credentials and tokens are never logged here or in the Edge Function.
 */
export const login = async (email: string, password: string): Promise<void> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  // ── 1. Submit credentials to the Login Orchestrator ──────────────────────
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/auth-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // Network-level failure (offline, DNS failure, etc.)
    throw new Error('Unable to reach the login service. Please check your connection.');
  }

  // ── 2. Parse response ─────────────────────────────────────────────────────
  let responseData: Record<string, unknown>;
  try {
    responseData = await response.json() as Record<string, unknown>;
  } catch {
    throw new Error('Login service returned an unexpected response. Please try again.');
  }

  // ── 3. Propagate Edge Function errors to the UI ───────────────────────────
  if (!response.ok || responseData.success !== true) {
    throw new Error(
      typeof responseData.error === 'string' ? responseData.error : 'Failed to login'
    );
  }

  // ── 4. Restore Auth session into the Supabase JS SDK ─────────────────────
  // setSession() writes the session to the SDK's storage and fires
  // onAuthStateChange, which AuthContext listens to. The UI update
  // (setSession / setUser / fetchProfile) happens through that existing path.
  // Tokens are intentionally not logged.
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: responseData.access_token as string,
    refresh_token: responseData.refresh_token as string,
  });

  if (sessionError) {
    throw new Error('Failed to restore session. Please try again.');
  }
};

export const register = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;

  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('This email is already registered. Please sign in instead.');
  }

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Single-Device Session Deactivation & Logout Lifecycle (Phase 1.2.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the `session_id` UUID from a Supabase Auth JWT access token payload.
 *
 * Safe for browser and server environments.
 * Returns null if the token is malformed, the session_id claim is missing,
 * or the value is not a valid UUID string.
 */
export const extractSessionId = (accessToken: string): string | null => {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;

    // Base64url → base64 conversion: replace URL-safe chars, add padding
    const base64Payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = base64Payload +
      '='.repeat((4 - (base64Payload.length % 4)) % 4);

    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);

    const claims = JSON.parse(decoded) as Record<string, unknown>;

    if (typeof claims.session_id !== 'string' || !claims.session_id) {
      return null;
    }

    // Validate UUID format (8-4-4-4-12 hex)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(claims.session_id)) {
      return null;
    }

    return claims.session_id;
  } catch {
    return null;
  }
};

export type DeactivationStatus =
  | 'SUCCESSFUL_DEACTIVATION'
  | 'NO_ACTIVE_SESSION'
  | 'DATABASE_OR_RPC_FAILURE';

export interface DeactivationResult {
  serverDeactivated: boolean;
  status: DeactivationStatus;
  userId?: string | null;
  sessionId?: string | null;
  error?: unknown;
}

export interface LogoutResult extends DeactivationResult {
  authSignedOut: boolean;
}

/**
 * Attempts server-side active session deactivation using the existing database
 * RPC `public.deactivate_active_session()`.
 *
 * Security & Lifecycle Invariants:
 * 1. Must be executed while the user's JWT remains valid before calling auth.signOut().
 * 2. Uses PostgreSQL advisory transaction locking derived from the authenticated user's UUID.
 * 3. Uses conditional deletion: only deletes the session row if active_session_id still matches
 *    the calling session's ID. Newer replacement sessions are never deactivated.
 * 4. Distinguishes between successful deactivation, no active session, and database/RPC failures.
 * 5. Genuine database failures are NEVER reported as successful deactivations.
 */
export const deactivateActiveSession = async (): Promise<DeactivationResult> => {
  try {
    // 1. Capture current authenticated session info
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('deactivateActiveSession: Failed to obtain session:', sessionError);
      return {
        serverDeactivated: false,
        status: 'DATABASE_OR_RPC_FAILURE',
        error: sessionError,
      };
    }

    const session = sessionData?.session;
    if (!session || !session.access_token) {
      return {
        serverDeactivated: false,
        status: 'NO_ACTIVE_SESSION',
        userId: null,
        sessionId: null,
      };
    }

    const userId = session.user?.id ?? null;
    const sessionId = extractSessionId(session.access_token);

    if (!sessionId) {
      console.warn('deactivateActiveSession: JWT does not contain a valid session_id claim');
      return {
        serverDeactivated: false,
        status: 'NO_ACTIVE_SESSION',
        userId,
        sessionId: null,
      };
    }

    // 2. Call existing parameterless session-deactivation RPC while JWT is valid.
    // The database function derives user_id (sub) and session_id from request.jwt.claims,
    // acquires the advisory transaction lock, and performs conditional deletion.
    const { data, error: rpcError } = await supabase.rpc('deactivate_active_session');

    if (rpcError) {
      console.error('deactivateActiveSession: RPC transport error:', rpcError);
      return {
        serverDeactivated: false,
        status: 'DATABASE_OR_RPC_FAILURE',
        userId,
        sessionId,
        error: rpcError,
      };
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.error('deactivateActiveSession: Unexpected RPC response shape:', typeof data);
      return {
        serverDeactivated: false,
        status: 'DATABASE_OR_RPC_FAILURE',
        userId,
        sessionId,
        error: 'INVALID_RESPONSE_SHAPE',
      };
    }

    const rpcResult = data as { success?: boolean; deactivated?: boolean; error_code?: string };

    if (rpcResult.success !== true) {
      console.error('deactivateActiveSession: RPC returned failure:', rpcResult.error_code);
      return {
        serverDeactivated: false,
        status: 'DATABASE_OR_RPC_FAILURE',
        userId,
        sessionId,
        error: rpcResult.error_code ?? 'UNKNOWN_RPC_ERROR',
      };
    }

    if (rpcResult.deactivated === true) {
      return {
        serverDeactivated: true,
        status: 'SUCCESSFUL_DEACTIVATION',
        userId,
        sessionId,
      };
    }

    // Deactivated is false: either no active session was present or a newer replacement session
    // is already active (conditional deletion protected the newer session).
    return {
      serverDeactivated: false,
      status: 'NO_ACTIVE_SESSION',
      userId,
      sessionId,
    };
  } catch (err) {
    console.error('deactivateActiveSession: Unexpected exception:', err);
    return {
      serverDeactivated: false,
      status: 'DATABASE_OR_RPC_FAILURE',
      error: err,
    };
  }
};

/**
 * Executes the complete logout lifecycle:
 *
 * Sequence:
 * 1. Capture current authenticated session information.
 * 2. Attempt server-side active session deactivation while JWT remains valid.
 * 3. Perform Supabase Auth sign-out regardless of server-side deactivation failure.
 * 4. Propagates Auth sign-out error if encountered (AuthContext.finally guarantees local UI cleanup).
 *
 * Stale session records left by failed deactivation self-heal automatically on the
 * next successful login via register_active_session upsert.
 */
export const logout = async (): Promise<LogoutResult> => {
  // ── 1. Capture session & attempt server-side deactivation while JWT is valid ──
  const deactivationResult = await deactivateActiveSession();

  // ── 2. Perform Supabase Auth sign-out regardless of deactivation outcome ──
  let signOutError: unknown = null;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      signOutError = error;
    }
  } catch (err) {
    signOutError = err;
  }

  // ── 3. Propagate Auth sign-out failure if encountered ───────────────────
  // Note: AuthContext.finally still guarantees local UI authentication state is cleared.
  if (signOutError) {
    console.error('logout: Supabase Auth signOut failed:', signOutError);
    throw signOutError;
  }

  return {
    ...deactivationResult,
    authSignedOut: true,
  };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;

  if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at')
        .eq('id', user.id)
        .single();

      if (profileError) {
          console.error("Error fetching profile");
          return null;
      }
      return profile;
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Realtime Session Replacement & Frontend Teardown (Phase 1.2.5)
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_REPLACEMENT_MESSAGE =
  "You've been logged out because your account was signed in on another device or browser.";

export const SESSION_REPLACEMENT_STORAGE_KEY = 'horizon_session_replacement_message';

/**
 * Stores the session replacement message notice in sessionStorage for reliable
 * retrieval across unmounting components and route redirects.
 */
export const setSessionReplacementNotice = (
  message: string = SESSION_REPLACEMENT_MESSAGE
): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_REPLACEMENT_STORAGE_KEY, message);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
};

/**
 * Retrieves and clears the session replacement message notice from sessionStorage.
 * Returns null if no notice was stored.
 */
export const consumeSessionReplacementNotice = (): string | null => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const msg = window.sessionStorage.getItem(SESSION_REPLACEMENT_STORAGE_KEY);
      if (msg) {
        window.sessionStorage.removeItem(SESSION_REPLACEMENT_STORAGE_KEY);
        return msg;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
};

export interface ActiveSessionCheckResult {
  isActive: boolean;
  isDefinitivelyInactive: boolean;
  error?: unknown;
}

/**
 * Authoritatively verifies whether the calling browser session is still active
 * in the database registry using the public.is_active_session() parameterless RPC.
 *
 * Invariants:
 * 1. Derives identity directly from current JWT claims on the server.
 * 2. Returns isDefinitivelyInactive = true ONLY when the database RPC explicitly returns false.
 * 3. Network or transport errors do NOT mark the session as inactive (prevents accidental logouts on transient offline).
 */
export const checkIsActiveSession = async (): Promise<ActiveSessionCheckResult> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn('checkIsActiveSession: Failed to obtain session:', sessionError);
      return { isActive: false, isDefinitivelyInactive: false, error: sessionError };
    }

    const session = sessionData?.session;
    if (!session || !session.access_token) {
      return { isActive: false, isDefinitivelyInactive: true };
    }

    const sessionId = extractSessionId(session.access_token);
    if (!sessionId) {
      return { isActive: false, isDefinitivelyInactive: true, error: 'MISSING_SESSION_ID' };
    }

    const { data, error: rpcError } = await supabase.rpc('is_active_session');

    if (rpcError) {
      console.warn('checkIsActiveSession: RPC evaluation error:', rpcError);
      return { isActive: true, isDefinitivelyInactive: false, error: rpcError };
    }

    if (data === false) {
      // Authoritatively inactive (another device took over or session was deleted)
      return { isActive: false, isDefinitivelyInactive: true };
    }

    return { isActive: data === true, isDefinitivelyInactive: false };
  } catch (err) {
    console.warn('checkIsActiveSession: Unexpected error:', err);
    return { isActive: true, isDefinitivelyInactive: false, error: err };
  }
};

let isTeardownInProgress = false;

export interface TeardownResult {
  completed: boolean;
  message: string;
}

/**
 * Performs local frontend session teardown when a session has been replaced.
 *
 * Steps:
 * 1. Guard against duplicate or reentrant execution.
 * 2. Save the replacement notice to sessionStorage.
 * 3. Clear user-specific storage keys (while preserving unrelated application state).
 * 4. Perform Supabase Auth local sign-out without attempting server deactivation
 *    (the session in the registry already belongs to the replacement device).
 * 5. Dispatch a custom window event for decoupled listeners.
 */
export const teardownSession = async (
  options: { message?: string } = {}
): Promise<TeardownResult> => {
  const message = options.message || SESSION_REPLACEMENT_MESSAGE;

  if (isTeardownInProgress) {
    return { completed: false, message };
  }

  isTeardownInProgress = true;

  try {
    // 1. Persist message for retrieval after redirect/unmount
    setSessionReplacementNotice(message);

    // 2. Clear user-specific session storage keys (do not erase public app state like reload guards)
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem('horizon_notif_card_dismissed');
      }
    } catch {
      // Ignore storage errors
    }

    // 3. Clear local Supabase SDK auth session
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Fallback: regular signOut
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('teardownSession: Error clearing SDK auth session:', err);
      }
    }

    // 4. Dispatch browser event
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('horizon:session_replaced', {
          detail: { message },
        })
      );
    }

    return { completed: true, message };
  } finally {
    isTeardownInProgress = false;
  }
};

export const resetTeardownGuardForTesting = (): void => {
  isTeardownInProgress = false;
};

// ─────────────────────────────────────────────────────────────────────────────
// Signup Confirmation Session Registration (Phase 8.4.3)
// ─────────────────────────────────────────────────────────────────────────────

export type ConfirmationRegistrationErrorCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_JWT_CLAIMS'
  | 'MALFORMED_SESSION_CLAIMS'
  | 'MISSING_SESSION_CLAIMS'
  | 'CLAIM_ALREADY_CONSUMED'
  | 'CLAIM_ALREADY_CONSUMED_INACTIVE_SESSION'
  | 'ACTIVE_SESSION_CONFLICT'
  | 'USER_NOT_FOUND'
  | 'EMAIL_NOT_CONFIRMED'
  | 'CONFIRMATION_WINDOW_EXPIRED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_CONFIRMATION_MISALIGNED'
  | 'CONCURRENT_CLAIM_CONFLICT'
  | 'DATABASE_ERROR'
  | 'RPC_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface ConfirmationRegistrationResult {
  success: boolean;
  isIdempotent?: boolean;
  sessionId?: string;
  sessionEpoch?: number;
  errorCode?: ConfirmationRegistrationErrorCode;
  error?: string;
}

/**
 * Builds minimal client device info for confirmation session audit.
 */
export const buildClientDeviceInfo = (): Record<string, Json> => {
  if (typeof navigator === 'undefined') return {};
  return {
    ua: (navigator.userAgent || '').slice(0, 512),
  };
};

/**
 * Maps registration error codes to safe, user-friendly messages.
 * Prevents internal database details from leaking to users.
 */
export const mapConfirmationErrorCodeToMessage = (
  code?: string
): string => {
  switch (code) {
    case 'CLAIM_ALREADY_CONSUMED':
    case 'CLAIM_ALREADY_CONSUMED_INACTIVE_SESSION':
      return 'This confirmation link has already been used. Please log in with your password.';
    case 'ACTIVE_SESSION_CONFLICT':
      return 'Another session is currently active. Please log in to continue.';
    case 'CONFIRMATION_WINDOW_EXPIRED':
      return 'The confirmation link has expired. Please sign in or request a new link.';
    case 'SESSION_CONFIRMATION_MISALIGNED':
      return 'Confirmation session could not be verified. Please log in with your email and password.';
    case 'EMAIL_NOT_CONFIRMED':
      return 'Please confirm your email address before continuing.';
    case 'UNAUTHENTICATED':
    case 'INVALID_JWT_CLAIMS':
    case 'MALFORMED_SESSION_CLAIMS':
    case 'MISSING_SESSION_CLAIMS':
      return 'Authentication error. Please log in again.';
    case 'CONCURRENT_CLAIM_CONFLICT':
      return 'A conflict occurred while registering your session. Please try again in a moment.';
    case 'RPC_UNAVAILABLE':
    case 'NETWORK_ERROR':
      return 'Unable to reach the server. Please check your connection and try again.';
    default:
      return 'Registration service encountered an error. Please log in.';
  }
};

// Session-keyed in-flight cache: keyed by exact session ID string.
// A different session's callers must never share another session's in-flight registration.
// Cleanup removes only the entry for the specific session that placed it once settled.
// NOTE: We deliberately do NOT cache successful registrations in a local Set or Map.
// The database RPC remains the sole authority on current active status, displacement, and eligibility.
const confirmationRegistrationCache = new Map<string, Promise<ConfirmationRegistrationResult>>();

/**
 * Registers an eligible initial signup confirmation session via public.register_confirmation_session.
 *
 * Requirements & Invariants:
 * 1. Must be executed while the confirmation session JWT is valid in the browser SDK.
 * 2. Identity and session UUID are derived strictly from JWT claims on the server.
 * 3. Re-renders and concurrent caller deduplication via session-keyed in-flight cache.
 *    Each key is the exact session ID, so Session B never receives Session A's result.
 * 4. Cache cleanup removes only the entry keyed to the completing session once settled.
 *    Subsequent calls after settlement always consult the database RPC.
 * 5. Strict response validation: result.session_id must be a non-empty string matching
 *    the local session ID. The local session ID is NEVER substituted for a missing server ID.
 * 6. Optional expectedSessionId enforces caller session-binding to prevent session drift.
 * 7. Tokens are never logged.
 */
export const registerConfirmationSession = async (
  deviceInfo?: Record<string, Json>,
  expectedSessionId?: string
): Promise<ConfirmationRegistrationResult> => {
  try {
    // 1. Capture current session from SDK
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session || !sessionData.session.access_token) {
      return {
        success: false,
        errorCode: 'UNAUTHENTICATED',
        error: 'No active session found to register.',
      };
    }

    const session = sessionData.session;
    const sessionId = extractSessionId(session.access_token);
    if (!sessionId) {
      return {
        success: false,
        errorCode: 'MISSING_SESSION_CLAIMS',
        error: 'JWT does not contain a valid session_id claim.',
      };
    }

    // Verify session binding if caller provided expectedSessionId
    if (expectedSessionId && sessionId !== expectedSessionId) {
      return {
        success: false,
        errorCode: 'SESSION_CONFIRMATION_MISALIGNED',
        error: 'Session mismatch: active session changed before registration.',
      };
    }

    // 2. Session-keyed deduplication: return existing in-flight promise for the same session.
    // Different sessions (different keys) always get independent promises.
    // Once settled, subsequent calls consult the database RPC again.
    const existing = confirmationRegistrationCache.get(sessionId);
    if (existing) {
      return await existing;
    }

    // 3. Launch new registration for this specific session.
    // Capture sessionId in the closure so cleanup targets the correct key.
    const registrationPromise = (async (): Promise<ConfirmationRegistrationResult> => {
      try {
        const payloadDeviceInfo = deviceInfo || buildClientDeviceInfo();

        const { data, error: rpcError } = await supabase.rpc('register_confirmation_session', {
          p_device_info: payloadDeviceInfo,
        });

        if (rpcError) {
          console.warn('registerConfirmationSession: RPC evaluation error:', rpcError);
          return {
            success: false,
            errorCode: 'RPC_UNAVAILABLE',
            error: 'Unable to reach the registration service. Please try again.',
          };
        }

        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          return {
            success: false,
            errorCode: 'DATABASE_ERROR',
            error: 'Unexpected response from registration service.',
          };
        }

        const result = data as {
          success?: boolean;
          is_idempotent?: boolean;
          session_id?: string;
          session_epoch?: number;
          error_code?: ConfirmationRegistrationErrorCode;
        };

        if (result.success === true) {
          // Strict RPC response validation:
          // 1. Require result.session_id to be a non-empty string.
          // 2. Require result.session_id === sessionId (the local session ID used for RPC).
          // 3. Never substitute the locally extracted ID for a missing or mismatched server ID.
          if (
            typeof result.session_id !== 'string' ||
            result.session_id.trim() === '' ||
            result.session_id !== sessionId
          ) {
            console.warn(
              'registerConfirmationSession: RPC returned invalid or mismatched session_id.',
              'Expected:', sessionId,
              'Got:', result.session_id
            );
            return {
              success: false,
              errorCode: 'SESSION_CONFIRMATION_MISALIGNED',
              error: 'Confirmation session could not be verified. Please log in with your email and password.',
            };
          }

          if (expectedSessionId && result.session_id !== expectedSessionId) {
            return {
              success: false,
              errorCode: 'SESSION_CONFIRMATION_MISALIGNED',
              error: 'Session mismatch: registration resolved for unexpected session.',
            };
          }

          return {
            success: true,
            isIdempotent: result.is_idempotent,
            sessionId: result.session_id,
            sessionEpoch: result.session_epoch,
          };
        }

        return {
          success: false,
          errorCode: result.error_code || 'UNKNOWN_ERROR',
          error: mapConfirmationErrorCodeToMessage(result.error_code),
        };
      } catch (err) {
        console.warn('registerConfirmationSession: Unexpected network error:', err);
        return {
          success: false,
          errorCode: 'NETWORK_ERROR',
          error: 'Unable to complete registration due to a network error. Please try again.',
        };
      } finally {
        // Remove the cache entry for this specific session ID once settled.
        // A settled promise is never retained to shortcut future active status checks.
        confirmationRegistrationCache.delete(sessionId);
      }
    })();

    confirmationRegistrationCache.set(sessionId, registrationPromise);
    return await registrationPromise;
  } catch (err) {
    console.error('registerConfirmationSession: Unexpected exception:', err);
    return {
      success: false,
      errorCode: 'UNKNOWN_ERROR',
      error: 'An unexpected error occurred during confirmation registration.',
    };
  }
};

export const resetConfirmationGuardForTesting = (): void => {
  confirmationRegistrationCache.clear();
};
