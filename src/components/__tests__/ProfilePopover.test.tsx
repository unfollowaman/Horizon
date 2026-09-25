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

    expect(container?.firstElementChild).toBeNull();
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
    expect(triggerBtn?.getAttribute('aria-haspopup')).toBe('true');
    expect(triggerBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(triggerBtn?.className).toContain('focus-visible:ring-2');
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

    const viewProfileLink = container?.querySelector('a[href="/dashboard"]');
    expect(viewProfileLink).not.toBeNull();
    expect(viewProfileLink?.className).toContain('focus-visible:ring-2');

    const signOutBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Sign Out'
    );
    expect(signOutBtn).not.toBeNull();
    expect(signOutBtn?.getAttribute('type')).toBe('button');
    expect(signOutBtn?.getAttribute('aria-label')).toBe('Sign out of your account');
    expect(signOutBtn?.className).toContain('focus-visible:ring-2');
  });
});
