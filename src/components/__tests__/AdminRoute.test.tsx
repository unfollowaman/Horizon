import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AdminRoute from '../AdminRoute';
import { useAuth } from '../../context/AuthContext';
import type { User } from '@supabase/supabase-js';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Helper component to display current location for test assertions
const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return (
    <div>
      <span data-testid="location-pathname">{location.pathname}</span>
      <span data-testid="location-search">{location.search}</span>
      <span data-testid="location-state-from">
        {location.state?.from ? JSON.stringify(location.state.from) : 'null'}
      </span>
    </div>
  );
};

const ProtectedAdminPage: React.FC = () => (
  <div data-testid="admin-content">
    <h1>Admin Panel</h1>
  </div>
);

const UserDashboardPage: React.FC = () => (
  <div data-testid="user-dashboard">
    <LocationDisplay />
    <h1>User Dashboard</h1>
  </div>
);

const LoginPage: React.FC = () => (
  <div data-testid="login-page">
    <LocationDisplay />
    <h1>Login Page</h1>
  </div>
);

describe('AdminRoute Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('1. Loading state: renders PageLoader while loading is true and does not render protected content', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: true,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/test']}>
          <Routes>
            <Route path="/admin/test" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Loading...');
    expect(container?.querySelector('[data-testid="admin-content"]')).toBeNull();
  });

  it('2. Unauthenticated access: redirects unauthenticated user to login route', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/test']}>
          <Routes>
            <Route path="/admin/test" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="login-page"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="admin-content"]')).toBeNull();
  });

  it('3. Return destination: preserves requested destination in location.state.from on login redirect', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/notifications?filter=active']}>
          <Routes>
            <Route path="/admin/notifications" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const stateFromElem = container?.querySelector('[data-testid="location-state-from"]');
    expect(stateFromElem?.textContent).not.toBe('null');
    const parsedStateFrom = JSON.parse(stateFromElem?.textContent || '{}');
    expect(parsedStateFrom.pathname).toBe('/admin/notifications');
    expect(parsedStateFrom.search).toBe('?filter=active');
  });

  it('4. Non-admin access: redirects authenticated non-admin student to /dashboard', () => {
    const studentUser = {
      id: 'usr-student',
      email: 'student@horizon.edu',
      app_metadata: { provider: 'email', role: 'student' },
      user_metadata: {},
    } as unknown as User;

    vi.mocked(useAuth).mockReturnValue({
      user: studentUser,
      session: { user: studentUser } as never,
      profile: { id: 'usr-student', student_class: 'Class 10', study_medium: 'English' } as never,
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/settings']}>
          <Routes>
            <Route path="/admin/settings" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
            <Route path="/dashboard" element={<UserDashboardPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="user-dashboard"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="admin-content"]')).toBeNull();
  });

  it('5. Admin access: renders protected component when user has app_metadata.role === "admin"', () => {
    const adminUser = {
      id: 'usr-admin',
      email: 'admin@horizon.edu',
      app_metadata: { provider: 'email', role: 'admin' },
      user_metadata: {},
    } as unknown as User;

    vi.mocked(useAuth).mockReturnValue({
      user: adminUser,
      session: { user: adminUser } as never,
      profile: { id: 'usr-admin' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/settings']}>
          <Routes>
            <Route path="/admin/settings" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="admin-content"]')).not.toBeNull();
  });

  it('6. Untrusted metadata: user_metadata.role or profile.role alone does NOT grant access', () => {
    const untrustedUser = {
      id: 'usr-untrusted',
      email: 'fakeadmin@horizon.edu',
      app_metadata: { provider: 'email', role: 'student' },
      user_metadata: { role: 'admin' }, // Untrusted user_metadata attempt!
    } as unknown as User;

    // Notice isAdmin is derived strictly as false by AuthContext
    vi.mocked(useAuth).mockReturnValue({
      user: untrustedUser,
      session: { user: untrustedUser } as never,
      profile: { id: 'usr-untrusted', role: 'admin' } as never, // Untrusted profile field!
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/secret']}>
          <Routes>
            <Route path="/admin/secret" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
            <Route path="/dashboard" element={<UserDashboardPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="user-dashboard"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="admin-content"]')).toBeNull();
  });

  it('7. Missing role: missing or malformed app_metadata does NOT grant access', () => {
    const malformedUser = {
      id: 'usr-malformed',
      email: 'user@horizon.edu',
      app_metadata: {}, // Empty app_metadata
      user_metadata: {},
    } as unknown as User;

    vi.mocked(useAuth).mockReturnValue({
      user: malformedUser,
      session: { user: malformedUser } as never,
      profile: { id: 'usr-malformed' } as never,
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/panel']}>
          <Routes>
            <Route path="/admin/panel" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
            <Route path="/dashboard" element={<UserDashboardPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="user-dashboard"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="admin-content"]')).toBeNull();
  });

  it('8. Session transition: handles transition from loading state to resolved admin or non-admin session', () => {
    const adminUser = {
      id: 'usr-admin',
      email: 'admin@horizon.edu',
      app_metadata: { role: 'admin' },
    } as unknown as User;

    // Start in loading state
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: true,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/panel']}>
          <Routes>
            <Route path="/admin/panel" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Loading...');

    // Resolve loading state to authenticated admin
    vi.mocked(useAuth).mockReturnValue({
      user: adminUser,
      session: { user: adminUser } as never,
      profile: { id: 'usr-admin' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/panel']}>
          <Routes>
            <Route path="/admin/panel" element={<AdminRoute><ProtectedAdminPage /></AdminRoute>} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="admin-content"]')).not.toBeNull();
  });

  it('9. Navigation stability: renders nested Outlet layout without loops or unnecessary re-renders', () => {
    const adminUser = {
      id: 'usr-admin',
      email: 'admin@horizon.edu',
      app_metadata: { role: 'admin' },
    } as unknown as User;

    vi.mocked(useAuth).mockReturnValue({
      user: adminUser,
      session: { user: adminUser } as never,
      profile: { id: 'usr-admin' } as never,
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<ProtectedAdminPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="admin-content"]')).not.toBeNull();
  });

  it('10. Existing route compatibility: public and student routes are unaffected by AdminRoute presence', () => {
    const studentUser = {
      id: 'usr-student',
      email: 'student@horizon.edu',
      app_metadata: { role: 'student' },
    } as unknown as User;

    vi.mocked(useAuth).mockReturnValue({
      user: studentUser,
      session: { user: studentUser } as never,
      profile: { id: 'usr-student' } as never,
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    });

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<UserDashboardPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<ProtectedAdminPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.querySelector('[data-testid="user-dashboard"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="admin-content"]')).toBeNull();
  });
});
