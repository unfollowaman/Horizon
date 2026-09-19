import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { useAuth } from '../../../context/AuthContext';
import { useDashboardProgress } from '../hooks/useDashboardProgress';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useDashboardProgress', () => ({
  useDashboardProgress: vi.fn(),
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

  it('renders progress bars with role="progressbar" and ARIA attributes', () => {
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

    vi.mocked(useDashboardProgress).mockReturnValue({
      isLoadingProgress: false,
      progressData: {
        allTimeCompletedChapters: 5,
        syllabusTotalChapters: 10,
        syllabusCompletedChapters: 5,
        percentageComplete: 50,
        subjectProgress: {
          Science: { total: 5, completed: 3, percentage: 60 },
          Mathematics: { total: 5, completed: 2, percentage: 40 },
        },
      },
    });

    act(() => {
      root?.render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      );
    });

    const progressBars = container?.querySelectorAll('[role="progressbar"]');
    expect(progressBars).not.toBeNull();
    expect(progressBars?.length).toBe(3); // Overall + Science + Mathematics

    // Overall Progress Bar assertions
    const overallBar = progressBars?.[0];
    expect(overallBar?.getAttribute('aria-label')).toBe('Overall Syllabus Progress');
    expect(overallBar?.getAttribute('aria-valuenow')).toBe('50');
    expect(overallBar?.getAttribute('aria-valuemin')).toBe('0');
    expect(overallBar?.getAttribute('aria-valuemax')).toBe('100');
    expect(overallBar?.getAttribute('aria-valuetext')).toBe('50% complete');

    // Science Progress Bar assertions
    const scienceBar = progressBars?.[1];
    expect(scienceBar?.getAttribute('aria-label')).toBe('Science Progress');
    expect(scienceBar?.getAttribute('aria-valuenow')).toBe('60');

    // Mathematics Progress Bar assertions
    const mathBar = progressBars?.[2];
    expect(mathBar?.getAttribute('aria-label')).toBe('Mathematics Progress');
    expect(mathBar?.getAttribute('aria-valuenow')).toBe('40');
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

    vi.mocked(useDashboardProgress).mockReturnValue({
      isLoadingProgress: false,
      progressData: null,
    });

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
});
