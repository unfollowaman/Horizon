import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSyllabusHierarchy } from '../learningResourcesAPI';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/mock.pdf' },
        }),
      }),
    },
  },
}));

describe('fetchSyllabusHierarchy API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches complete chapter -> topic -> multi-medium resource hierarchy correctly', async () => {
    const mockChapters = [
      {
        id: 'ch-1',
        student_class: 'Class 10',
        subject: 'Science',
        chapter_number: 1,
        chapter_name: 'Chemical Reactions and Equations',
        display_order: 1,
        is_active: true,
      },
    ];

    const mockTopics = [
      {
        id: 'top-1',
        chapter_id: 'ch-1',
        title: 'Chemical Equations and Balancing',
        description: 'Writing skeleton and balanced equations.',
        display_order: 1,
        is_active: true,
      },
      {
        id: 'top-2',
        chapter_id: 'ch-1',
        title: 'Combination Reactions',
        description: 'Exothermic reactions and quicklime slaking.',
        display_order: 2,
        is_active: true,
      },
    ];

    const mockJunctions = [
      {
        topic_id: 'top-1',
        learning_resources: {
          id: 'res-eng-1',
          title: 'Chemical Equations Notes (English)',
          resource_type: 'notes',
          medium: 'english',
          file_path: 'class-10/science/ch1-eng.pdf',
          student_class: 'Class 10',
          subject: 'Science',
        },
      },
      {
        topic_id: 'top-1',
        learning_resources: {
          id: 'res-hin-1',
          title: 'Chemical Equations Notes (Hindi)',
          resource_type: 'notes',
          medium: 'hindi',
          file_path: 'class-10/science/ch1-hin.pdf',
          student_class: 'Class 10',
          subject: 'Science',
        },
      },
    ];

    const mockSelectChapters = vi.fn().mockReturnThis();
    const mockEqClass = vi.fn().mockReturnThis();
    const mockEqSub = vi.fn().mockReturnThis();
    const mockEqActive = vi.fn().mockReturnThis();
    const mockOrderCh = vi.fn().mockResolvedValue({ data: mockChapters, error: null });

    const mockSelectTopics = vi.fn().mockReturnThis();
    const mockInCh = vi.fn().mockReturnThis();
    const mockEqActiveTop = vi.fn().mockReturnThis();
    const mockOrderTop = vi.fn().mockResolvedValue({ data: mockTopics, error: null });

    const mockSelectJnc = vi.fn().mockReturnThis();
    const mockInTop = vi.fn().mockReturnThis();
    const mockOrderJnc = vi.fn().mockResolvedValue({ data: mockJunctions, error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'chapters') {
        return {
          select: mockSelectChapters,
          eq: mockEqClass,
          order: mockOrderCh,
        } as ReturnType<typeof supabase.from>;
      }
      if (table === 'syllabus_topics') {
        return {
          select: mockSelectTopics,
          in: mockInCh,
          eq: mockEqActiveTop,
          order: mockOrderTop,
        } as ReturnType<typeof supabase.from>;
      }
      if (table === 'syllabus_topic_resources') {
        return {
          select: mockSelectJnc,
          in: mockInTop,
          order: mockOrderJnc,
        } as ReturnType<typeof supabase.from>;
      }
      return {} as ReturnType<typeof supabase.from>;
    });

    mockEqClass.mockImplementation((col: string) => {
      if (col === 'student_class') return { eq: mockEqSub };
      return mockEqClass;
    });
    mockEqSub.mockImplementation((col: string) => {
      if (col === 'subject') return { eq: mockEqActive };
      return mockEqSub;
    });
    mockEqActive.mockImplementation((col: string) => {
      if (col === 'is_active') return { order: mockOrderCh };
      return mockEqActive;
    });

    mockInCh.mockReturnValue({ eq: mockEqActiveTop });
    mockEqActiveTop.mockReturnValue({ order: mockOrderTop });
    mockInTop.mockReturnValue({ order: mockOrderJnc });

    const result = await fetchSyllabusHierarchy('Class 10', 'Science');

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data?.length).toBe(1);

    const chapter = result.data![0];
    expect(chapter.chapter_name).toBe('Chemical Reactions and Equations');
    expect(chapter.topics.length).toBe(2);

    // Verify Topic 1 has BOTH English and Hindi PDF resources attached
    const topic1 = chapter.topics[0];
    expect(topic1.title).toBe('Chemical Equations and Balancing');
    expect(topic1.resources.length).toBe(2);
    expect(topic1.resources[0].medium).toBe('english');
    expect(topic1.resources[1].medium).toBe('hindi');

    // Verify Topic 2 has no resources attached without failing
    const topic2 = chapter.topics[1];
    expect(topic2.title).toBe('Combination Reactions');
    expect(topic2.resources.length).toBe(0);
  });

  it('returns empty hierarchy array when no chapters match', async () => {
    const mockOrderCh = vi.fn().mockResolvedValue({ data: [], error: null });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: mockOrderCh,
    } as unknown as ReturnType<typeof supabase.from>);

    const result = await fetchSyllabusHierarchy('Class 10', 'NonExistentSubject');
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});
