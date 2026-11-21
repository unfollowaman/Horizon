import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { RealtimeChannel, Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
  sessionReplacementMessage?: string | null;
  handleSessionReplaced?: (customMessage?: string) => Promise<void>;
  validateSession?: (force?: boolean) => Promise<boolean>;
  clearSessionReplacementMessage?: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshSession: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionReplacementMessage, setSessionReplacementMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const authVersionRef = useRef(0);
  const teardownInProgressRef = useRef(false);
  const isConfirmationPendingRef = useRef(false);
  const lastActiveCheckTimeRef = useRef(0);
  const activeSubscriptionKeyRef = useRef<string | null>(null);
  const activeChannelRef = useRef<RealtimeChannel | null>(null);

  const getProfileData = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { supabase } = await import('../services/supabase');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile in AuthContext:', error.message || error);
      }
      return data ?? null;
    } catch (err) {
      console.error('Unexpected error fetching profile in AuthContext:', err);
      return null;
    }
  }, []);

  const fetchProfile = useCallback(async (sessionUser: User, currentVersion: number) => {
    const data = await getProfileData(sessionUser.id);
    if (isMountedRef.current && currentVersion === authVersionRef.current) {
      setProfile(data);
    }
    return data;
  }, [getProfileData]);

  const clearSessionReplacementMessage = useCallback(() => {
    setSessionReplacementMessage(null);
  }, []);

  const handleSessionReplaced = useCallback(async (customMessage?: string) => {
    if (teardownInProgressRef.current) return;
    teardownInProgressRef.current = true;

    try {
      const authModule = await import('../services/auth');
      const message = customMessage || authModule.SESSION_REPLACEMENT_MESSAGE;

      // 1. Immediately increment version to invalidate any pending in-flight async operations
      authVersionRef.current++;
      isConfirmationPendingRef.current = false;

      // 2. Immediately clear authenticated React state and set replacement notice
      if (isMountedRef.current) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setSessionReplacementMessage(message);
      }

      // 3. Clean up active Realtime channel if subscribed
      if (activeChannelRef.current) {
        try {
          const { supabase } = await import('../services/supabase');
          supabase.removeChannel(activeChannelRef.current);
        } catch (e) {
          console.warn('Error removing channel during teardown:', e);
        }
        activeChannelRef.current = null;
        activeSubscriptionKeyRef.current = null;
      }

      // 4. Perform local SDK sign-out and sessionStorage persistence if available
      if (typeof authModule.teardownSession === 'function') {
        await authModule.teardownSession({ message });
      }
    } catch (err) {
      console.error('Error during handleSessionReplaced in AuthContext:', err);
    } finally {
      setTimeout(() => {
        teardownInProgressRef.current = false;
      }, 500);
    }
  }, []);

  const validateSession = useCallback(async (force = false): Promise<boolean> => {
    if (!session || !user) {
      return true;
    }
    if (isConfirmationPendingRef.current) {
      return true;
    }
    const now = Date.now();
    if (!force && now - lastActiveCheckTimeRef.current < 5000) {
      return true; // Throttled rapid check
    }
    lastActiveCheckTimeRef.current = now;

    const currentVersion = authVersionRef.current;
    try {
      const authModule = await import('../services/auth');
      if (typeof authModule.checkIsActiveSession !== 'function') {
        return true;
      }
      const result = await authModule.checkIsActiveSession();

      // Guard against stale async resolution
      if (!isMountedRef.current || currentVersion !== authVersionRef.current) {
        return true;
      }

      if (result.isDefinitivelyInactive) {
        await handleSessionReplaced();
        return false;
      }

      return result.isActive;
    } catch (err) {
      console.error('Unexpected error validating session:', err);
      return true;
    }
  }, [handleSessionReplaced]);

  useEffect(() => {
    isMountedRef.current = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const initializeSessionAndProfile = async (
      targetSession: Session | null,
      version: number
    ) => {
      if (!targetSession || !targetSession.user) {
        if (isMountedRef.current && version === authVersionRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      // Defect B Fix: Do NOT call setSession or setUser here!
      // The confirmation session must NOT be published as authenticated application state
      // until confirmation registration succeeds and profile is retrieved.
      // This prevents premature focus, visibility, or Realtime checks from treating
      // the pending registration as an inactive session.

      try {
        const authModule = await import('../services/auth');

        // Check for explicit confirmation callback in URL
        const locationHash = typeof window !== 'undefined' && typeof window.location?.hash === 'string' ? window.location.hash : '';
        const locationSearch = typeof window !== 'undefined' && typeof window.location?.search === 'string' ? window.location.search : '';
        const isConfirmationUrl =
          locationHash.includes('type=signup') ||
          locationHash.includes('type=email_verification') ||
          locationSearch.includes('type=signup') ||
          locationSearch.includes('type=email_verification');

        let isSessionActive = false;

        // Extract the target session ID for identity verification after RPC returns.
        // This is compared against regResult.sessionId to prevent a stale or
        // cross-session promise from authorizing a different session.
        const targetSessionId =
          typeof authModule.extractSessionId === 'function'
            ? authModule.extractSessionId(targetSession.access_token)
            : null;

        if (isConfirmationUrl) {
          isConfirmationPendingRef.current = true;
          // Direct confirmation link path: register session before any profile access
          if (typeof authModule.registerConfirmationSession === 'function') {
            const regResult = await authModule.registerConfirmationSession(
              undefined,
              targetSessionId ?? undefined
            );

            if (!isMountedRef.current || version !== authVersionRef.current) {
              isConfirmationPendingRef.current = false;
              return;
            }

            // Strict session identity check: success alone is insufficient.
            // regResult.sessionId must exist, be a non-empty string, and match the target session ID.
            // This prevents a stale, missing, or cross-session result from granting access.
            const registeredSessionId = regResult.success ? regResult.sessionId : undefined;
            const sessionIdentityMatches =
              regResult.success === true &&
              typeof registeredSessionId === 'string' &&
              registeredSessionId.length > 0 &&
              registeredSessionId === targetSessionId;

            if (sessionIdentityMatches) {
              // 6. The current SDK session is checked again
              const { supabase } = await import('../services/supabase');
              const { data: sdkCheck } = await supabase.auth.getSession();
              const latestSdkSession = sdkCheck?.session;
              const latestSdkSessionId = latestSdkSession
                ? authModule.extractSessionId?.(latestSdkSession.access_token)
                : null;

              if (!isMountedRef.current || version !== authVersionRef.current) {
                isConfirmationPendingRef.current = false;
                return;
              }

              if (!latestSdkSession || latestSdkSessionId !== targetSessionId) {
                isConfirmationPendingRef.current = false;
                return;
              }

              isSessionActive = true;
            } else if (regResult.success) {
              isConfirmationPendingRef.current = false;
              // RPC reported success but session identity is missing or mismatched.
              // Treat as a registration failure to prevent cross-session authorization.
              console.warn(
                'Confirmation session registration: session identity mismatch.',
                'Expected:', targetSessionId,
                'Got:', registeredSessionId
              );
              const message = 'Confirmation session mismatch. Please log in.';

              try {
                const { supabase } = await import('../services/supabase');
                // Only sign out if the SDK's storage still holds the failed target session
                const { data: currentCheck } = await supabase.auth.getSession();
                const currentSdkSessionId = currentCheck?.session
                  ? authModule.extractSessionId?.(currentCheck.session.access_token)
                  : null;
                if (!currentSdkSessionId || currentSdkSessionId === targetSessionId) {
                  await supabase.auth.signOut({ scope: 'local' });
                }
              } catch {
                // Ignore
              }

              if (isMountedRef.current && version === authVersionRef.current) {
                setSession(null);
                setUser(null);
                setProfile(null);
                setSessionReplacementMessage(message);
                setLoading(false);
              }
              if (typeof authModule.setSessionReplacementNotice === 'function') {
                authModule.setSessionReplacementNotice(message);
              }
              return;
            } else {
              isConfirmationPendingRef.current = false;
              console.warn(
                'Confirmation session registration failed on callback:',
                regResult.errorCode,
                regResult.error
              );
              const message =
                regResult.error ||
                'Confirmation session registration failed. Please log in.';

              try {
                const { supabase } = await import('../services/supabase');
                // Only sign out if the SDK's storage still holds the failed target session
                const { data: currentCheck } = await supabase.auth.getSession();
                const currentSdkSessionId = currentCheck?.session
                  ? authModule.extractSessionId?.(currentCheck.session.access_token)
                  : null;
                if (!currentSdkSessionId || currentSdkSessionId === targetSessionId) {
                  await supabase.auth.signOut({ scope: 'local' });
                }
              } catch {
                // Ignore
              }

              if (isMountedRef.current && version === authVersionRef.current) {
                setSession(null);
                setUser(null);
                setProfile(null);
                setSessionReplacementMessage(message);
                setLoading(false);
              }
              if (typeof authModule.setSessionReplacementNotice === 'function') {
                authModule.setSessionReplacementNotice(message);
              }
              return;
            }
          } else {
            isSessionActive = true;
          }
        } else if (typeof authModule.checkIsActiveSession === 'function') {
          // Standard flow: check if session is already active (e.g. from auth-login)
          const activeCheck = await authModule.checkIsActiveSession();

          if (!isMountedRef.current || version !== authVersionRef.current) return;

          if (activeCheck.isActive) {
            isSessionActive = true;
          } else if (typeof authModule.registerConfirmationSession === 'function') {
            // Session is authenticated in SDK but not currently active.
            // Attempt confirmation registration fallback (e.g. hash was stripped on redirect)
            isConfirmationPendingRef.current = true;
            const regResult = await authModule.registerConfirmationSession(
              undefined,
              targetSessionId ?? undefined
            );

            if (!isMountedRef.current || version !== authVersionRef.current) {
              isConfirmationPendingRef.current = false;
              return;
            }

            // Strict session identity check: success alone is insufficient.
            // regResult.sessionId must exist, be a non-empty string, and match the target session ID.
            const fbRegisteredSessionId = regResult.success ? regResult.sessionId : undefined;
            const fbSessionIdentityMatches =
              regResult.success === true &&
              typeof fbRegisteredSessionId === 'string' &&
              fbRegisteredSessionId.length > 0 &&
              fbRegisteredSessionId === targetSessionId;

            if (fbSessionIdentityMatches) {
              // 6. The current SDK session is checked again
              const { supabase } = await import('../services/supabase');
              const { data: sdkCheck } = await supabase.auth.getSession();
              const latestSdkSession = sdkCheck?.session;
              const latestSdkSessionId = latestSdkSession
                ? authModule.extractSessionId?.(latestSdkSession.access_token)
                : null;

              if (!isMountedRef.current || version !== authVersionRef.current) {
                isConfirmationPendingRef.current = false;
                return;
              }

              if (!latestSdkSession || latestSdkSessionId !== targetSessionId) {
                isConfirmationPendingRef.current = false;
                return;
              }

              isSessionActive = true;
            } else {
              isConfirmationPendingRef.current = false;
              // Not an eligible confirmation session and not active: invalid/replaced session,
              // or session identity mismatch.
              const message =
                (regResult.success ? 'Confirmation session mismatch. Please log in.' : regResult.error) ||
                'Session is no longer active. Please log in again.';

              try {
                const { supabase } = await import('../services/supabase');
                // Only sign out if the SDK's storage still holds the failed target session
                const { data: currentCheck } = await supabase.auth.getSession();
                const currentSdkSessionId = currentCheck?.session
                  ? authModule.extractSessionId?.(currentCheck.session.access_token)
                  : null;
                if (!currentSdkSessionId || currentSdkSessionId === targetSessionId) {
                  await supabase.auth.signOut({ scope: 'local' });
                }
              } catch {
                // Ignore
              }

              if (isMountedRef.current && version === authVersionRef.current) {
                setSession(null);
                setUser(null);
                setProfile(null);
                setSessionReplacementMessage(message);
                setLoading(false);
              }
              if (typeof authModule.setSessionReplacementNotice === 'function') {
                authModule.setSessionReplacementNotice(message);
              }
              return;
            }
          } else {
            isSessionActive = true;
          }
        } else {
          isSessionActive = true;
        }

        isConfirmationPendingRef.current = false;

        if (isSessionActive && isMountedRef.current && version === authVersionRef.current) {
          // 7. Profile is fetched using the authenticated Supabase client
          const profileData = await getProfileData(targetSession.user.id);

          if (!isMountedRef.current || version !== authVersionRef.current) return;

          // 8. Session, user, and profile are published consistently
          setSession(targetSession);
          setUser(targetSession.user);
          setProfile(profileData);

          // 9. Loading becomes false
          setLoading(false);
        }
      } catch (err) {
        isConfirmationPendingRef.current = false;
        console.error('Error during session registration & profile init:', err);
        if (isMountedRef.current && version === authVersionRef.current) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      const currentVersion = ++authVersionRef.current;
      try {
        const { supabase } = await import('../services/supabase');

        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (isMountedRef.current && currentVersion === authVersionRef.current) {
          await initializeSessionAndProfile(initialSession, currentVersion);
        }

        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          const version = ++authVersionRef.current;
          if (!isMountedRef.current) return;

          await initializeSessionAndProfile(newSession, version);
        });
        subscription = sub;
      } catch (err) {
        console.error('Failed to initialize auth dynamically:', err);
        if (isMountedRef.current && currentVersion === authVersionRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMountedRef.current = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchProfile]);

  // ─────────────────────────────────────────────────────────────────────────
  // Realtime Session Replacement Listener & Fallback Security Checks (Phase 1.2.5)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session || !user || !session.access_token) {
      // Clean up previous channel if user logged out
      if (activeChannelRef.current) {
        const channelToClean = activeChannelRef.current;
        activeChannelRef.current = null;
        activeSubscriptionKeyRef.current = null;
        import('../services/supabase').then(({ supabase }) => {
          try {
            supabase.removeChannel(channelToClean);
          } catch (e) {
            console.warn('Failed to remove Realtime channel:', e);
          }
        });
      }
      return;
    }

    let isCancelled = false;

    const setupRealtimeSubscription = async () => {
      try {
        const authModule = await import('../services/auth');
        const extractFn = authModule.extractSessionId;
        if (!extractFn || isCancelled || !session.access_token) return;

        const currentSessionId = extractFn(session.access_token);
        if (!currentSessionId) return;

        const subscriptionKey = `${user.id}:${currentSessionId}`;

        // Prevent duplicate subscriptions during renders and token refreshes
        if (activeSubscriptionKeyRef.current === subscriptionKey) {
          return;
        }

        // Clean up any stale subscription for a previous session
        if (activeChannelRef.current) {
          const oldChannel = activeChannelRef.current;
          activeChannelRef.current = null;
          const { supabase } = await import('../services/supabase');
          try {
            supabase.removeChannel(oldChannel);
          } catch {
            // Ignore
          }
        }

        activeSubscriptionKeyRef.current = subscriptionKey;

        const { supabase } = await import('../services/supabase');
        if (isCancelled || !supabase || typeof supabase.channel !== 'function') return;

        const topic = `user:${user.id}`;
        const channel = supabase.channel(topic, {
          config: {
            private: true,
          },
        });

        channel.on(
          'broadcast',
          { event: 'session_replaced' },
          (event: unknown) => {
            if (isCancelled) return;

            // Extract payload safely
            const payload =
              event && typeof event === 'object' && 'payload' in event
                ? (event as { payload: unknown }).payload
                : event;

            if (!payload || typeof payload !== 'object') {
              return; // Ignore malformed event
            }

            const typedPayload = payload as {
              message?: unknown;
              replaced_session_id?: unknown;
              session_epoch?: unknown;
            };

            // If replaced_session_id is provided, verify it targets this session.
            // A newer active session must ignore broadcasts for older sessions.
            if (
              typeof typedPayload.replaced_session_id === 'string' &&
              typedPayload.replaced_session_id !== currentSessionId
            ) {
              return;
            }

            const msg =
              typeof typedPayload.message === 'string' && typedPayload.message.trim()
                ? typedPayload.message
                : undefined;

            void handleSessionReplaced(msg);
          }
        );

        channel.subscribe((status: string, err?: unknown) => {
          if (err) {
            console.warn('Realtime channel error on topic', topic, err);
          }
          if (status === 'SUBSCRIBED' && !isCancelled) {
            // Reconnect / initial subscribe check: verify authoritative active status
            void validateSession(false);
          }
        });

        activeChannelRef.current = channel;
      } catch (err) {
        console.error('Failed to set up Realtime subscription:', err);
      }
    };

    void setupRealtimeSubscription();

    // Fallback checks on window focus and document visibility
    const onFocus = () => {
      void validateSession(false);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void validateSession(false);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isCancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [session, user, validateSession, handleSessionReplaced]);

  // Clean up channel on unmount of AuthProvider
  useEffect(() => {
    return () => {
      if (activeChannelRef.current) {
        const ch = activeChannelRef.current;
        activeChannelRef.current = null;
        activeSubscriptionKeyRef.current = null;
        import('../services/supabase').then(({ supabase }) => {
          try {
            supabase.removeChannel(ch);
          } catch {
            // Ignore
          }
        });
      }
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const currentVersion = authVersionRef.current;
      await fetchProfile(user, currentVersion);
    }
  }, [user, fetchProfile]);

  const refreshSession = useCallback(async () => {
    const currentVersion = ++authVersionRef.current;
    try {
      const { supabase } = await import('../services/supabase');
      const { data, error } = await supabase.auth.refreshSession();

      if (!isMountedRef.current || currentVersion !== authVersionRef.current) {
        return;
      }

      if (error) {
        console.error('Error refreshing session in AuthContext:', error.message || error);
        return;
      }

      const refreshedSession = data?.session ?? null;
      const refreshedUser = refreshedSession?.user ?? null;

      setSession(refreshedSession);
      setUser(refreshedUser);

      if (refreshedUser) {
        await fetchProfile(refreshedUser, currentVersion);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Unexpected error refreshing session in AuthContext:', err);
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    authVersionRef.current++;
    isConfirmationPendingRef.current = false;
    if (activeChannelRef.current) {
      const ch = activeChannelRef.current;
      activeChannelRef.current = null;
      activeSubscriptionKeyRef.current = null;
      try {
        const { supabase } = await import('../services/supabase');
        supabase.removeChannel(ch);
      } catch {
        // Ignore
      }
    }
    try {
      const { logout } = await import('../services/auth');
      await logout();
    } catch (err) {
      console.error('Error during signOut in AuthContext:', err);
    } finally {
      if (isMountedRef.current) {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    }
  }, []);

  const isAdmin = useMemo(() => {
    return Boolean(user && user.app_metadata && user.app_metadata.role === 'admin');
  }, [user]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      isAdmin,
      signOut,
      refreshProfile,
      refreshSession,
      sessionReplacementMessage,
      handleSessionReplaced,
      validateSession,
      clearSessionReplacementMessage,
    }),
    [
      session,
      user,
      profile,
      loading,
      isAdmin,
      signOut,
      refreshProfile,
      refreshSession,
      sessionReplacementMessage,
      handleSessionReplaced,
      validateSession,
      clearSessionReplacementMessage,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
