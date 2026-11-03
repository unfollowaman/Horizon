import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { useAuth } from '../../../context/AuthContext';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Dashboard Component Accessibility & UX', () => {
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

  it('does not render Learning Progress or Recent Activity cards', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1', email: 'student@example.com' },
      profile: {
        id: 'usr-1',
        name: 'Aman Sharma',
        student_class: 'Class 10',
        study_medium: 'English',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-15T00:00:00.000Z',
      },
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).not.toContain('Learning Progress');
    expect(container?.textContent).not.toContain('Recent Activity');
    expect(container?.textContent).toContain('Continue Learning');
  });

  it('renders interactive buttons with explicit type="button", ARIA labels, tooltips, and focus rings', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1', email: 'student@example.com' },
      profile: {
        id: 'usr-1',
        name: 'Aman Sharma',
        student_class: 'Class 10',
        study_medium: 'English',
        avatar_url: 'https://example.com/avatar.jpg',
      },
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    // Sign Out button assertions
    const signOutBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent?.trim() === 'Sign Out'
    );
    expect(signOutBtn).not.toBeUndefined();
    expect(signOutBtn?.getAttribute('type')).toBe('button');
    expect(signOutBtn?.getAttribute('aria-label')).toBe('Sign out of your account');
    expect(signOutBtn?.className).toContain('focus-visible:ring-2');

    // Disabled Edit Profile button assertions
    const editBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent?.trim() === 'Edit Profile'
    );
    expect(editBtn).not.toBeUndefined();
    expect(editBtn?.getAttribute('type')).toBe('button');
    expect(editBtn?.hasAttribute('disabled')).toBe(true);
    expect(editBtn?.getAttribute('title')).toBe('Profile editing coming soon');
    expect(editBtn?.getAttribute('aria-label')).toBe('Edit Profile (Coming Soon)');
    expect(editBtn?.className).toContain('focus-visible:ring-2');

    // Profile Avatar img alt text assertion
    const avatarImg = container?.querySelector('img[alt="Aman Sharma\'s profile photo"]');
    expect(avatarImg).not.toBeNull();
  });

  it('renders Notification Alerts preference card with navigation link to /settings/notifications', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'usr-1', email: 'student@example.com' },
      profile: {
        id: 'usr-1',
        name: 'Aman Sharma',
        student_class: 'Class 10',
        study_medium: 'English',
      },
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    const notifCard = Array.from(container?.querySelectorAll('div') || []).find(
      (el) => el.textContent?.includes('Notification Alerts')
    );
    expect(notifCard).not.toBeUndefined();

    const manageLink = container?.querySelector('a[href="/settings/notifications"]');
    expect(manageLink).not.toBeNull();
    expect(manageLink?.getAttribute('aria-label')).toBe('Manage notification settings');
    expect(manageLink?.textContent?.trim()).toBe('Manage Notifications');
    expect(manageLink?.className).toContain('focus-visible:ring-2');
  });

  describe('formatMemberSince date formatting', () => {
    const renderWithProfileCreatedAt = (createdAtValue: string | undefined | null) => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'usr-1', email: 'student@example.com' },
        profile: {
          id: 'usr-1',
          name: 'Aman Sharma',
          student_class: 'Class 10',
          study_medium: 'English',
          created_at: createdAtValue,
        },
        loading: false,
        signOut: vi.fn(),
        refreshProfile: vi.fn(),
      } as never);

      act(() => {
        root?.render(
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        );
      });
    };

    it('renders "Not set" when profile.created_at is an invalid date string', () => {
      renderWithProfileCreatedAt('invalid-date-string');
      const memberSinceLabel = Array.from(container?.querySelectorAll('span') || []).find(
        (span) => span.textContent?.trim() === 'Member Since'
      );
      expect(memberSinceLabel).not.toBeUndefined();
      const memberSinceValue = memberSinceLabel?.nextElementSibling;
      expect(memberSinceValue?.textContent?.trim()).toBe('Not set');
    });

    it('renders formatted date when profile.created_at is a valid date string', () => {
      renderWithProfileCreatedAt('2024-01-15T00:00:00.000Z');
      const memberSinceLabel = Array.from(container?.querySelectorAll('span') || []).find(
        (span) => span.textContent?.trim() === 'Member Since'
      );
      expect(memberSinceLabel).not.toBeUndefined();
      const memberSinceValue = memberSinceLabel?.nextElementSibling;
      expect(memberSinceValue?.textContent?.trim()).toBe('January 2024');
    });

    it('renders "Not set" when profile.created_at is missing or undefined', () => {
      renderWithProfileCreatedAt(undefined);
      const memberSinceLabel = Array.from(container?.querySelectorAll('span') || []).find(
        (span) => span.textContent?.trim() === 'Member Since'
      );
      expect(memberSinceLabel).not.toBeUndefined();
      const memberSinceValue = memberSinceLabel?.nextElementSibling;
      expect(memberSinceValue?.textContent?.trim()).toBe('Not set');
    });

    it('renders "Not set" when Date.prototype.toLocaleDateString throws an error', () => {
      const spy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
        throw new Error('Locale error');
      });

      renderWithProfileCreatedAt('2024-01-15T00:00:00.000Z');
      const memberSinceLabel = Array.from(container?.querySelectorAll('span') || []).find(
        (span) => span.textContent?.trim() === 'Member Since'
      );
      expect(memberSinceLabel).not.toBeUndefined();
      const memberSinceValue = memberSinceLabel?.nextElementSibling;
      expect(memberSinceValue?.textContent?.trim()).toBe('Not set');

      spy.mockRestore();
    });
  });
});
