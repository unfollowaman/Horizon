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

    // Student Badge assertion
    const studentBadge = Array.from(container?.querySelectorAll('span') || []).find(
      (span) => span.textContent?.trim() === 'Student'
    );
    expect(studentBadge).not.toBeUndefined();
    expect(studentBadge?.className).toContain('text-[#E11584]');
    expect(studentBadge?.className).toContain('bg-[#FFF0F6]');

    // Unified Section B: Profile Summary heading and items assertion
    const summaryHeading = Array.from(container?.querySelectorAll('h5') || []).find(
      (h5) => h5.textContent?.trim() === 'Profile Summary'
    );
    expect(summaryHeading).not.toBeUndefined();

    // Verify 3 summary items exist with labels and values
    expect(container?.textContent).toContain('Class');
    expect(container?.textContent).toContain('Class 10');
    expect(container?.textContent).toContain('Study Medium');
    expect(container?.textContent).toContain('English');
    expect(container?.textContent).toContain('Member Since');
  });

  it('renders a single unified profile section container combining header and summary', () => {
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

    const unifiedCard = container?.querySelector('section[aria-label="Student Profile"]');
    expect(unifiedCard).not.toBeNull();
    expect(unifiedCard?.textContent).toContain('Aman Sharma');
    expect(unifiedCard?.textContent).toContain('student@example.com');
    expect(unifiedCard?.textContent).toContain('Student');
    expect(unifiedCard?.textContent).toContain('Edit Profile');
    expect(unifiedCard?.textContent).toContain('Profile Summary');
    expect(unifiedCard?.textContent).toContain('Class 10');
    expect(unifiedCard?.textContent).toContain('English');
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
