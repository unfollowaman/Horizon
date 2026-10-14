import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Onboarding from '../Onboarding';
import { supabase } from '../../../services/supabase';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockRefreshProfile = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    refreshProfile: mockRefreshProfile,
  }),
}));

vi.mock('../../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('Onboarding Component', () => {
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

  it('renders step 4 profile photo upload input with proper aria-label', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
      error: null,
    } as never);

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: {
          id: 'test-user-id',
          student_class: 'Class 10',
          study_medium: 'English',
          avatar_url: null,
          onboarding_completed: false,
        },
        error: null,
      }),
    } as never);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      );
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.getAttribute('aria-label')).toBe('Upload profile photo');
  });

  it('renders step progress bar with WAI-ARIA progressbar attributes', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
      error: null,
    } as never);

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: {
          id: 'test-user-id',
          student_class: null,
          study_medium: null,
          avatar_url: null,
          onboarding_completed: false,
        },
        error: null,
      }),
    } as never);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      );
    });

    const progressBar = container?.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    expect(progressBar?.getAttribute('aria-label')).toBe('Onboarding progress');
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('1');
    expect(progressBar?.getAttribute('aria-valuemin')).toBe('1');
    expect(progressBar?.getAttribute('aria-valuemax')).toBe('5');
    expect(progressBar?.getAttribute('aria-valuetext')).toBe('Step 1 of 5');
  });

  it('renders circular back button on step 2 and advances immediately on class selection without continue button', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
      error: null,
    } as never);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-user-id',
              student_class: null,
              study_medium: null,
              avatar_url: null,
              onboarding_completed: false,
            },
            error: null,
          }),
          update: mockUpdate,
        } as never;
      }
      return {} as never;
    });

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      );
    });

    // Step 1: Confirm no back button on Step 1
    const backBtnStep1 = container?.querySelector('button[aria-label="Go Back"]');
    expect(backBtnStep1).toBeNull();

    // Click Continue on step 1 to advance to step 2
    const continueBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Continue'
    );
    expect(continueBtn).not.toBeUndefined();

    await act(async () => {
      continueBtn?.click();
    });

    // Step 2: Confirm circular back button exists
    const backBtnStep2 = container?.querySelector('button[aria-label="Go Back"]') as HTMLButtonElement;
    expect(backBtnStep2).not.toBeNull();
    expect(backBtnStep2.getAttribute('title')).toBe('Go Back');
    expect(backBtnStep2.className).toContain('rounded-full');
    expect(backBtnStep2.className).toContain('w-11');
    expect(backBtnStep2.className).toContain('focus-visible:ring-[#E91E8C]');

    // Confirm no separate "Continue" button on step 2
    const continueBtnStep2 = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Continue' || btn.textContent === 'Saving...'
    );
    expect(continueBtnStep2).toBeUndefined();

    const classButtons = Array.from(container?.querySelectorAll('button') || []).filter(
      (btn) => btn.textContent?.includes('Class ')
    );
    expect(classButtons.length).toBe(5);

    const class10Btn = classButtons.find((btn) => btn.textContent === 'Class 10');
    expect(class10Btn?.getAttribute('aria-pressed')).toBe('false');
    expect(class10Btn?.getAttribute('type')).toBe('button');

    // Click Class 10 option - should update profile and advance to Step 3 (Study Medium) immediately
    await act(async () => {
      class10Btn?.click();
    });

    expect(mockUpdate).toHaveBeenCalledWith({ student_class: 'Class 10' });

    // Step 3 (Study Medium) should now be displayed
    const mediumHeader = container?.querySelector('h2');
    expect(mediumHeader?.textContent).toBe('Study Medium');
  });

  it('advances immediately on medium selection and handles back button navigation', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'test-user-id' },
        },
      },
      error: null,
    } as never);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-user-id',
              student_class: 'Class 10',
              study_medium: null,
              avatar_url: null,
              onboarding_completed: false,
            },
            error: null,
          }),
          update: mockUpdate,
        } as never;
      }
      return {} as never;
    });

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      );
    });

    // Directly starts on Step 3 because student_class is already set
    const mediumHeader = container?.querySelector('h2');
    expect(mediumHeader?.textContent).toBe('Study Medium');

    // Confirm circular back button is present
    const backBtn = container?.querySelector('button[aria-label="Go Back"]') as HTMLButtonElement;
    expect(backBtn).not.toBeNull();

    // Click circular back button to go back to Step 2 (Class selection)
    await act(async () => {
      backBtn.click();
    });

    const classHeader = container?.querySelector('h2');
    expect(classHeader?.textContent).toBe('Select your Class');

    // Select Class 11 on Step 2
    const class11Btn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Class 11'
    );
    expect(class11Btn).not.toBeUndefined();

    await act(async () => {
      class11Btn?.click();
    });

    expect(mockUpdate).toHaveBeenCalledWith({ student_class: 'Class 11' });

    // Advances to Step 3
    expect(container?.querySelector('h2')?.textContent).toBe('Study Medium');

    // Select English on Step 3
    const englishBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'English'
    );
    expect(englishBtn).not.toBeUndefined();

    await act(async () => {
      englishBtn?.click();
    });

    expect(mockUpdate).toHaveBeenCalledWith({ study_medium: 'English' });

    // Advances to Step 4 (Profile Photo)
    expect(container?.querySelector('h2')?.textContent).toBe('Profile Photo');
  });
});
