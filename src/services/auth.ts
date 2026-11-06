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
