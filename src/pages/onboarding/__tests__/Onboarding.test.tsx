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

  it('renders step 2 class toggle options with aria-pressed, type="button", and focus-visible styling', async () => {
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

    // Click Continue on step 1 to advance to step 2
    const continueBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Continue'
    );
    expect(continueBtn).not.toBeUndefined();

    await act(async () => {
      continueBtn?.click();
    });

    const classButtons = Array.from(container?.querySelectorAll('button') || []).filter(
      (btn) => btn.textContent?.includes('Class ')
    );

    expect(classButtons.length).toBe(5);

    const class10Btn = classButtons.find((btn) => btn.textContent === 'Class 10');
    const class12Btn = classButtons.find((btn) => btn.textContent === 'Class 12');

    expect(class10Btn?.getAttribute('aria-pressed')).toBe('false');
    expect(class10Btn?.getAttribute('type')).toBe('button');
    expect(class10Btn?.className).toContain('focus-visible:ring-[#E91E8C]');

    await act(async () => {
      class10Btn?.click();
    });

    expect(class10Btn?.getAttribute('aria-pressed')).toBe('true');

    expect(class12Btn?.getAttribute('aria-pressed')).toBe('false');
    expect(class12Btn?.getAttribute('type')).toBe('button');

    const backBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.getAttribute('aria-label') === 'Go to previous step'
    );
    expect(backBtn).not.toBeUndefined();
    expect(backBtn?.getAttribute('type')).toBe('button');
    expect(backBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
  });
});
