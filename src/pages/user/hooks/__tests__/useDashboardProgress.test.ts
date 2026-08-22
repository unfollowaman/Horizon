import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useDashboardProgress, type ProgressData } from '../useDashboardProgress';
import * as learningResourcesAPI from '../../../../services/learningResourcesAPI';
import { supabase } from '../../../../services/supabase';
import type { User } from '@supabase/supabase-js';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock dependencies
vi.mock('../../../../services/learningResourcesAPI', () => ({
  fetchSyllabusChapters: vi.fn(),
}));

vi.mock('../../../../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

interface TestComponentProps {
  user: User | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any | null;
  onUpdate: (data: { progressData: ProgressData | null; isLoadingProgress: boolean }) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ user, profile, onUpdate }) => {
  const result = useDashboardProgress({ user, profile });
  React.useEffect(() => {
    onUpdate(result);
  }, [result, onUpdate]);
  return null;
};

describe('useDashboardProgress', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' } as User;
  const mockProfile = { student_class: 'Class 10', study_medium: 'English' };

  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
    consoleErrorSpy.mockRestore();
  });

  it('returns initial loading state and null progress when user/profile are null', async () => {
    let latestResult: { progressData: ProgressData | null; isLoadingProgress: boolean } = {
      progressData: null,
      isLoadingProgress: true,
    };

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          user: null,
          profile: null,
          onUpdate: (data) => {
            latestResult = data;
          },
        })
      );
    });

    expect(latestResult.isLoadingProgress).toBe(false);
    expect(latestResult.progressData).toBeNull();
  });

  it('calculates progress correctly when syllabus and completion data exist', async () => {
    const mockSyllabusData = [
      { id: '1', chapter_id: 'ch-1', subject: 'Maths' },
      { id: '2', chapter_id: 'ch-2', subject: 'Maths' },
      { id: '3', chapter_id: 'ch-3', subject: 'Science' },
    ];

    const mockCompletionsData = [
      { chapter_id: 'ch-1' },
      { chapter_id: 'ch-3' },
      { chapter_id: 'ch-999' }, // Extra completion outside syllabus
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(learningResourcesAPI.fetchSyllabusChapters).mockResolvedValue({
      data: mockSyllabusData,
      error: null,
    } as any);

    const mockEq = vi.fn().mockResolvedValue({
      data: mockCompletionsData,
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(supabase.from).mockImplementation(mockFrom);

    let latestResult: { progressData: ProgressData | null; isLoadingProgress: boolean } = {
      progressData: null,
      isLoadingProgress: true,
    };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          user: mockUser,
          profile: mockProfile,
          onUpdate: (data) => {
            latestResult = data;
          },
        })
      );
    });

    expect(learningResourcesAPI.fetchSyllabusChapters).toHaveBeenCalledWith('10', 'english');
    expect(supabase.from).toHaveBeenCalledWith('chapter_completion');
    expect(mockSelect).toHaveBeenCalledWith('chapter_id');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');

    expect(latestResult.isLoadingProgress).toBe(false);
    expect(latestResult.progressData).toEqual({
      allTimeCompletedChapters: 3,
      syllabusTotalChapters: 3,
      syllabusCompletedChapters: 2,
      percentageComplete: 67, // 2/3 = 66.66% -> 67%
      subjectProgress: {
        Maths: { total: 2, completed: 1, percentage: 50 },
        Science: { total: 1, completed: 1, percentage: 100 },
      },
    });
  });

  it('handles empty syllabus data gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(learningResourcesAPI.fetchSyllabusChapters).mockResolvedValue({
      data: [],
      error: null,
    } as any);

    const mockEq = vi.fn().mockResolvedValue({
      data: [{ chapter_id: 'ch-1' }],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    let latestResult: { progressData: ProgressData | null; isLoadingProgress: boolean } = {
      progressData: null,
      isLoadingProgress: true,
    };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          user: mockUser,
          profile: mockProfile,
          onUpdate: (data) => {
            latestResult = data;
          },
        })
      );
    });

    expect(latestResult.isLoadingProgress).toBe(false);
    expect(latestResult.progressData).toEqual({
      allTimeCompletedChapters: 1,
      syllabusTotalChapters: 0,
      syllabusCompletedChapters: 0,
      percentageComplete: 0,
      subjectProgress: {},
    });
  });

  it('handles fetch errors without crashing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(learningResourcesAPI.fetchSyllabusChapters).mockResolvedValue({
      data: null,
      error: new Error('Network error') as any,
    });

    let latestResult: { progressData: ProgressData | null; isLoadingProgress: boolean } = {
      progressData: null,
      isLoadingProgress: true,
    };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          user: mockUser,
          profile: mockProfile,
          onUpdate: (data) => {
            latestResult = data;
          },
        })
      );
    });

    expect(latestResult.isLoadingProgress).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching progress:',
      expect.any(Error)
    );
    expect(latestResult.progressData).toBeNull();
  });
});
