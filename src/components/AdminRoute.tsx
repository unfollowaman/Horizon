import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from './loading/PageLoader';

interface AdminRouteProps {
  children?: React.ReactNode;
}

/**
 * Reusable route guard protecting administrator-only frontend routes.
 *
 * Checks `isAdmin` derived strictly from `user.app_metadata.role === 'admin'`.
 * Unauthenticated users are redirected to `/login` with location state preserved.
 * Authenticated non-admin users are redirected to `/dashboard`.
 * Renders `PageLoader` while auth state is resolving.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AdminRoute;
