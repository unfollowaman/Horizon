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

  it('allows valid image file upload and cleans file extension', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: { user: { id: 'test-user-id' } },
      },
      error: null,
    } as never);

    vi.mocked(supabase.from).mockReturnValue({
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
      update: vi.fn().mockReturnThis(),
    } as never);

    const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'test-user-id/avatar.png' }, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.png' } });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    } as never);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      );
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['dummy content'], 'avatar.PNG', { type: 'image/png' });

    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: true,
    });

    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockUpload).toBeCalledWith('test-user-id/avatar.png', validFile, { upsert: true });
  });

  it('rejects upload of unallowed extensions or MIME types', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: { user: { id: 'test-user-id' } },
      },
      error: null,
    } as never);

    vi.mocked(supabase.from).mockReturnValue({
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

    const mockUpload = vi.fn();
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
    } as never);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      );
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    const maliciousFile = new File(['<script>alert(1)</script>'], 'payload.html', { type: 'text/html' });

    Object.defineProperty(fileInput, 'files', {
      value: [maliciousFile],
      writable: true,
    });

    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('rejects upload of files exceeding maximum size (5MB)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: { user: { id: 'test-user-id' } },
      },
      error: null,
    } as never);

    vi.mocked(supabase.from).mockReturnValue({
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

    const mockUpload = vi.fn();
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
    } as never);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      );
    });

    const fileInput = container?.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(['a'], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: true,
    });

    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockUpload).not.toHaveBeenCalled();
  });
});
