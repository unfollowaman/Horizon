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

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
