import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthListener = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkAuthAndProfile = async (session: any) => {
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single();

      if (!isMounted) return;

      const onboardingCompleted = profile?.onboarding_completed;

      if (!onboardingCompleted) {
        if (location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      } else {
        if (location.pathname === '/onboarding') {
          navigate('/', { replace: true });
        } else {
          const publicRoutes = ['/login', '/register'];
          if (publicRoutes.includes(location.pathname)) {
            navigate('/', { replace: true });
          }
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          checkAuthAndProfile(session);
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) checkAuthAndProfile(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
};

export default AuthListener;
