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
  const lastActiveCheckTimeRef = useRef(0);
  const activeSubscriptionKeyRef = useRef<string | null>(null);
  const activeChannelRef = useRef<RealtimeChannel | null>(null);

  const fetchProfile = useCallback(async (sessionUser: User, currentVersion: number) => {
    try {
      const { supabase } = await import('../services/supabase');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at')
        .eq('id', sessionUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile in AuthContext:', error.message || error);
      }

      if (isMountedRef.current && currentVersion === authVersionRef.current) {
        setProfile(data ?? null);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile in AuthContext:', err);
    }
  }, []);

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

    const initializeAuth = async () => {
      const currentVersion = ++authVersionRef.current;
      try {
        const { supabase } = await import('../services/supabase');

        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (isMountedRef.current && currentVersion === authVersionRef.current) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await fetchProfile(initialSession.user, currentVersion);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            const version = ++authVersionRef.current;
            if (!isMountedRef.current) return;

            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
              await fetchProfile(newSession.user, version);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }
        );
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
