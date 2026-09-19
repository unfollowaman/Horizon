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
  const mockSignOut = vi.fn().mockResolvedValue(undefined);

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

  it('renders null when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      session: null,
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

    expect(container?.firstElementChild).toBeNull();
  });

  it('renders trigger button with type="button" and toggles popover menu', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1', email: 'student@example.com' },
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

    const triggerBtn = container?.querySelector('button');
    expect(triggerBtn).not.toBeNull();
    expect(triggerBtn?.getAttribute('type')).toBe('button');
    expect(triggerBtn?.getAttribute('aria-label')).toBe("Aman Sharma's profile menu");
    expect(triggerBtn?.getAttribute('aria-expanded')).toBe('false');

    // Click trigger button to open popover
    act(() => {
      triggerBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(triggerBtn?.getAttribute('aria-expanded')).toBe('true');
    expect(container?.textContent).toContain('Aman Sharma');
    expect(container?.textContent).toContain('student@example.com');

    // Sign Out button should have type="button" and explicit aria-label
    const signOutBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Sign Out'
    );
    expect(signOutBtn).not.toBeUndefined();
    expect(signOutBtn?.getAttribute('type')).toBe('button');
    expect(signOutBtn?.getAttribute('aria-label')).toBe('Sign out of your account');
  });

  it('closes popover on Escape key press', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1', email: 'student@example.com' },
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

    const triggerBtn = container?.querySelector('button');

    act(() => {
      triggerBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(triggerBtn?.getAttribute('aria-expanded')).toBe('true');

    // Press Escape key
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(triggerBtn?.getAttribute('aria-expanded')).toBe('false');
  });
});
