import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ProfileButton from '../ProfileButton';
import { useAuth } from '../../context/AuthContext';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProfileButton Component', () => {
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

  it('renders "Log in" aria-label and links to /login when unauthenticated', () => {
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
          <ProfileButton />
        </MemoryRouter>
      );
    });

    const link = container?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('aria-label')).toBe('Log in');
    expect(link?.getAttribute('href')).toBe('/login');
    expect(link?.className).toContain('focus-visible:ring-2');
    const svg = link?.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders user-specific aria-label and links to /dashboard when authenticated with profile name', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1' },
      profile: { id: 'usr-1', name: 'Aman Sharma', avatar_url: null },
      session: { access_token: 'tok' },
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfileButton />
        </MemoryRouter>
      );
    });

    const link = container?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('aria-label')).toBe("Aman Sharma's Profile");
    expect(link?.getAttribute('href')).toBe('/dashboard');
    expect(link?.textContent).toBe('AM');
  });

  it('renders "Go to Dashboard" aria-label when authenticated without profile name', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-2' },
      profile: { id: 'usr-2', name: '', avatar_url: null },
      session: { access_token: 'tok' },
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <ProfileButton />
        </MemoryRouter>
      );
    });

    const link = container?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('aria-label')).toBe('Go to Dashboard');
    expect(link?.getAttribute('href')).toBe('/dashboard');
    expect(link?.textContent).toBe('U');
  });
});
