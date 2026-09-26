import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { PdfMobileMenu } from '../PdfMobileMenu';
import type { User } from '@supabase/supabase-js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PdfMobileMenu', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root && container) {
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

  const mockCloseMenu = vi.fn();
  const mockSignOut = vi.fn().mockResolvedValue(undefined);

  it('renders WAI-ARIA dialog attributes and focus-visible classes when menu is open', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <PdfMobileMenu
            isMobileMenuOpen={true}
            closeMenu={mockCloseMenu}
            user={null}
            signOut={mockSignOut}
          />
        </MemoryRouter>
      );
    });

    const dialogPanel = container?.querySelector('[role="dialog"]');
    expect(dialogPanel).not.toBeNull();
    expect(dialogPanel?.getAttribute('aria-modal')).toBe('true');
    expect(dialogPanel?.getAttribute('aria-label')).toBe('Mobile navigation menu');

    const closeBtn = container?.querySelector('button[aria-label="Close menu"]');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
  });

  it('triggers closeMenu when Escape key is pressed while mobile menu is open', () => {
    mockCloseMenu.mockClear();

    act(() => {
      root?.render(
        <MemoryRouter>
          <PdfMobileMenu
            isMobileMenuOpen={true}
            closeMenu={mockCloseMenu}
            user={null}
            signOut={mockSignOut}
          />
        </MemoryRouter>
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(mockCloseMenu).toHaveBeenCalledTimes(1);
  });

  it('does not trigger closeMenu on Escape when mobile menu is closed', () => {
    mockCloseMenu.mockClear();

    act(() => {
      root?.render(
        <MemoryRouter>
          <PdfMobileMenu
            isMobileMenuOpen={false}
            closeMenu={mockCloseMenu}
            user={null}
            signOut={mockSignOut}
          />
        </MemoryRouter>
      );
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(mockCloseMenu).not.toHaveBeenCalled();
  });

  it('renders accessible Log Out button when user is authenticated', () => {
    const mockUser: User = {
      id: 'test-user-id',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    act(() => {
      root?.render(
        <MemoryRouter>
          <PdfMobileMenu
            isMobileMenuOpen={true}
            closeMenu={mockCloseMenu}
            user={mockUser}
            signOut={mockSignOut}
          />
        </MemoryRouter>
      );
    });

    const signOutBtn = container?.querySelector('button[aria-label="Log out of your account"]');
    expect(signOutBtn).not.toBeNull();
    expect(signOutBtn?.getAttribute('type')).toBe('button');
    expect(signOutBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
  });

  it('renders focus-visible sign in and register action links when user is unauthenticated', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <PdfMobileMenu
            isMobileMenuOpen={true}
            closeMenu={mockCloseMenu}
            user={null}
            signOut={mockSignOut}
          />
        </MemoryRouter>
      );
    });

    const signInLink = container?.querySelector('a[href="/login"]');
    const registerLink = container?.querySelector('a[href="/register"]');

    expect(signInLink).not.toBeNull();
    expect(registerLink).not.toBeNull();
    expect(signInLink?.className).toContain('focus-visible:ring-[#E91E8C]');
    expect(registerLink?.className).toContain('focus-visible:ring-[#E91E8C]');
  });
});
