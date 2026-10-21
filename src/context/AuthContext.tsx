import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
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

  const isMountedRef = useRef(true);
  const authVersionRef = useRef(0);

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
    () => ({ session, user, profile, loading, isAdmin, signOut, refreshProfile, refreshSession }),
    [session, user, profile, loading, isAdmin, signOut, refreshProfile, refreshSession]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
