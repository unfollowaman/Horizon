import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthListener = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // If the user signed in (e.g. via email link callback or regular login),
          // check if they are on a public/auth page, and redirect to dashboard.
          // This avoids interrupting them if they are on another authenticated page,
          // though typically after a fresh login they'd be on root, /login, or /register.
          const publicRoutes = ['/', '/login', '/register'];
          if (publicRoutes.includes(location.pathname)) {
            navigate('/dashboard', { replace: true });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  return null;
};

export default AuthListener;
