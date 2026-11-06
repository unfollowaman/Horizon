import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SESSION_REPLACEMENT_MESSAGE } from '../services/auth';

const AuthListener = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile, loading, sessionReplacementMessage } = useAuth();

  // Handle session replacement redirect
  useEffect(() => {
    if (sessionReplacementMessage) {
      if (location.pathname !== '/login') {
        navigate('/login', {
          replace: true,
          state: { message: sessionReplacementMessage },
        });
      }
    }
  }, [sessionReplacementMessage, location.pathname, navigate]);

  useEffect(() => {
    const handleReplacedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || SESSION_REPLACEMENT_MESSAGE;
      if (location.pathname !== '/login') {
        navigate('/login', {
          replace: true,
          state: { message: msg },
        });
      }
    };

    window.addEventListener('horizon:session_replaced', handleReplacedEvent);
    return () => {
      window.removeEventListener('horizon:session_replaced', handleReplacedEvent);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (loading) return;

    if (session) {
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
    }
  }, [session, profile, loading, location.pathname, navigate]);

  return null;
};

export default AuthListener;
