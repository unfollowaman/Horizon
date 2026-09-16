import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { PdfMobileMenu } from '../PdfMobileMenu';

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

  const defaultProps = {
    isMobileMenuOpen: true,
    closeMenu: vi.fn(),
    user: null,
    signOut: vi.fn(),
  };

  it('renders close button, navigation links, and sign in/register buttons for unauthenticated users with focus-visible styling', () => {
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/']}>
          <PdfMobileMenu {...defaultProps} />
        </MemoryRouter>
      );
    });

    const closeBtn = container?.querySelector('button[aria-label="Close menu"]');
    const navElement = container?.querySelector('nav[aria-label="Mobile navigation"]');
    const signInLink = container?.querySelector('a[href="/login"]');
    const registerLink = container?.querySelector('a[href="/register"]');

    expect(closeBtn).not.toBeNull();
    expect(navElement).not.toBeNull();
    expect(signInLink).not.toBeNull();
    expect(registerLink).not.toBeNull();

    expect(closeBtn?.className).toContain('focus-visible:ring-2');
    expect(signInLink?.className).toContain('focus-visible:ring-2');
    expect(registerLink?.className).toContain('focus-visible:ring-2');
  });

  it('renders profile link and sign out button with explicit type="button" and focus-visible styling for authenticated users', () => {
    const mockUser = {
      id: 'test-user-123',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as import('@supabase/supabase-js').User;

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/']}>
          <PdfMobileMenu {...defaultProps} user={mockUser} />
        </MemoryRouter>
      );
    });

    const profileLink = container?.querySelector('a[href="/dashboard"]');
    const signOutBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Log Out'
    );

    expect(profileLink).not.toBeNull();
    expect(signOutBtn).not.toBeNull();
    expect(signOutBtn?.getAttribute('type')).toBe('button');
    expect(signOutBtn?.className).toContain('focus-visible:ring-2');
    expect(profileLink?.className).toContain('focus-visible:ring-2');
  });
});
