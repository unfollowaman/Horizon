import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ProfilePopover from '../ProfilePopover';
import { useAuth } from '../../context/AuthContext';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProfilePopover Component', () => {
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

  it('renders null when unauthenticated or missing profile', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      session: null,
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfilePopover />
        </MemoryRouter>
      );
    });

    expect(container?.firstElementChild).toBeNull();
  });

  it('renders Admin Panel entry visible when user is a verified administrator', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'admin-1', email: 'admin@horizon.edu', app_metadata: { role: 'admin' } },
      profile: { id: 'admin-1', name: 'Admin User', avatar_url: null },
      session: { access_token: 'tok' },
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfilePopover />
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    const adminLink = container?.querySelector('a[href="/admin/notifications"]');
    expect(adminLink).not.toBeNull();
    expect(adminLink?.textContent).toBe('Admin Panel');
    expect(adminLink?.getAttribute('aria-label')).toBe('Admin Panel');
    expect(adminLink?.className).toContain('focus-visible:ring-2');
  });

  it('hides Admin Panel entry for a regular student (isAdmin === false)', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'student-1', email: 'student@horizon.edu', app_metadata: { role: 'student' } },
      profile: { id: 'student-1', name: 'Student User', avatar_url: null },
      session: { access_token: 'tok' },
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfilePopover />
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    const adminLink = container?.querySelector('a[href="/admin/notifications"]');
    expect(adminLink).toBeNull();
  });

  it('hides Admin Panel entry when user_metadata.role === "admin" alone without app_metadata.role === "admin"', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'attacker-1',
        email: 'attacker@horizon.edu',
        user_metadata: { role: 'admin' },
        app_metadata: { role: 'student' },
      },
      profile: { id: 'attacker-1', name: 'Attacker User', avatar_url: null },
      session: { access_token: 'tok' },
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfilePopover />
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    const adminLink = container?.querySelector('a[href="/admin/notifications"]');
    expect(adminLink).toBeNull();
  });

  it('hides Admin Panel entry when profiles.role === "admin" alone without app_metadata.role === "admin"', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'student-2', email: 'student2@horizon.edu', app_metadata: {} },
      profile: { id: 'student-2', name: 'Student User', avatar_url: null, role: 'admin' },
      session: { access_token: 'tok' },
      loading: false,
      isAdmin: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfilePopover />
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    const adminLink = container?.querySelector('a[href="/admin/notifications"]');
    expect(adminLink).toBeNull();
  });

  it('closes menu when Admin Panel entry is selected', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'admin-1', email: 'admin@horizon.edu', app_metadata: { role: 'admin' } },
      profile: { id: 'admin-1', name: 'Admin User', avatar_url: null },
      session: { access_token: 'tok' },
      loading: false,
      isAdmin: true,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      refreshSession: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <ProfilePopover />
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');

    const adminLink = container?.querySelector('a[href="/admin/notifications"]') as HTMLAnchorElement;
    expect(adminLink).not.toBeNull();

    act(() => {
      adminLink.click();
    });

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders avatar trigger button with proper ARIA attributes, type="button", and focus ring', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1', email: 'test@horizon.edu' },
      profile: { id: 'usr-1', name: 'Aman Sharma', avatar_url: null },
      session: { access_token: 'tok' },
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfilePopover />
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button');
    expect(triggerBtn).not.toBeNull();
    expect(triggerBtn?.getAttribute('type')).toBe('button');
    expect(triggerBtn?.getAttribute('aria-label')).toBe("Aman Sharma's profile menu");
    expect(triggerBtn?.getAttribute('title')).toBe("Aman Sharma's profile menu");
    expect(triggerBtn?.getAttribute('aria-haspopup')).toBe('true');
    expect(triggerBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(triggerBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
  });

  it('toggles popover menu open and renders accessible controls with focus rings and ARIA labels', () => {
    const mockSignOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1', email: 'test@horizon.edu' },
      profile: { id: 'usr-1', name: 'Aman Sharma', avatar_url: null },
      session: { access_token: 'tok' },
      loading: false,
      signOut: mockSignOut,
      refreshProfile: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfilePopover />
        </MemoryRouter>
      );
    });

    const triggerBtn = container?.querySelector('button') as HTMLButtonElement;

    // Open popover menu
    act(() => {
      triggerBtn.click();
    });

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');

    const menuContainer = container?.querySelector('div[role="dialog"]');
    expect(menuContainer).not.toBeNull();
    expect(menuContainer?.getAttribute('aria-label')).toBe('User account options');

    const viewProfileLink = container?.querySelector('a[href="/dashboard"]');
    expect(viewProfileLink).not.toBeNull();
    expect(viewProfileLink?.className).toContain('focus-visible:ring-2');

    const settingsLink = container?.querySelector('a[href="/settings/notifications"]');
    expect(settingsLink).not.toBeNull();
    expect(settingsLink?.textContent).toBe('Notification Settings');
    expect(settingsLink?.getAttribute('aria-label')).toBe('Notification Settings');
    expect(settingsLink?.className).toContain('focus-visible:ring-2');

    const signOutBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Sign Out'
    );
    expect(signOutBtn).not.toBeNull();
    expect(signOutBtn?.getAttribute('type')).toBe('button');
    expect(signOutBtn?.getAttribute('aria-label')).toBe('Sign out of your account');
    expect(signOutBtn?.className).toContain('focus-visible:ring-2');
  });
});
