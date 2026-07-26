import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthListener = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile, loading } = useAuth();

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
