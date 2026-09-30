import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapLearningResource,
  fetchLearningResources,
  fetchLearningResourceById,
  fetchSyllabusChapters,
} from '../learningResourcesAPI';
import { supabase } from '../supabase';
import type { LearningResourceRow } from '../../types';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.pdf' } }),
      }),
    },
  },
}));

describe('learningResourcesAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapLearningResource', () => {
    const baseRow: LearningResourceRow = {
      id: 'res-1',
      title: 'Sample Resource',
      resource_type: 'notes',
      medium: 'english',
      file_path: 'notes/sample.pdf',
      storage_bucket: 'resources',
    };

    it('formats numeric string class correctly', () => {
      const input: LearningResourceRow = { ...baseRow, student_class: '10' };
      const result = mapLearningResource(input);
      expect(result.student_class).toBe('Class 10');
    });

    it('formats pure number class correctly', () => {
      const input: LearningResourceRow = { ...baseRow, student_class: 10 };
      const result = mapLearningResource(input);
      expect(result.student_class).toBe('Class 10');
    });

    it('formats case-insensitive "class X" string correctly', () => {
      const input1: LearningResourceRow = { ...baseRow, student_class: 'class 9' };
      const input2: LearningResourceRow = { ...baseRow, student_class: 'CLASS 12' };

      expect(mapLearningResource(input1).student_class).toBe('Class 9');
      expect(mapLearningResource(input2).student_class).toBe('Class 12');
    });

    it('preserves non-matching custom class strings', () => {
      const input: LearningResourceRow = { ...baseRow, student_class: 'Class 10-A' };
      const result = mapLearningResource(input);
      expect(result.student_class).toBe('Class 10-A');
    });

    it('handles null and undefined student_class correctly', () => {
      const nullInput: LearningResourceRow = { ...baseRow, student_class: null };
      const undefinedInput: LearningResourceRow = { ...baseRow, student_class: undefined };

      expect(mapLearningResource(nullInput).student_class).toBeNull();
      expect(mapLearningResource(undefinedInput).student_class).toBeUndefined();
    });

    it('CASE 1: notes + Hindi resource title + chapter', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        title: 'संसाधन और विकास',
        resource_type: 'notes',
        medium: 'hindi',
        chapters: {
          chapter_number: 1,
          chapter_name: 'संसाधन और विकास',
        },
      };

      const result = mapLearningResource(input);
      expect(result.title).toBe('Chapter 1: संसाधन और विकास');
    });

    it('CASE 2: notes + English resource title + chapter', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        title: 'Resources and Development',
        resource_type: 'notes',
        medium: 'english',
        chapters: {
          chapter_number: 1,
          chapter_name: 'संसाधन और विकास',
        },
      };

      const result = mapLearningResource(input);
      expect(result.title).toBe('Chapter 1: Resources and Development');
    });

    it('CASE 3: notes + missing/null resource title + chapter fallback', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        title: null,
        resource_type: 'notes',
        medium: 'english',
        chapters: {
          chapter_number: 1,
          chapter_name: 'संसाधन और विकास',
        },
      };

      const result = mapLearningResource(input);
      expect(result.title).toBe('Chapter 1: संसाधन और विकास');
    });

    it('CASE 4: notes + title already starts with Chapter 1:', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        title: 'Chapter 1: Resources and Development',
        resource_type: 'notes',
        medium: 'english',
        chapters: {
          chapter_number: 1,
          chapter_name: 'संसाधन और विकास',
        },
      };

      const result = mapLearningResource(input);
      expect(result.title).toBe('Chapter 1: Resources and Development');
    });

    it('CASE 5: non-notes resource preserves existing title', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        title: 'Class 10 History Board Paper 2024',
        resource_type: 'pyq',
        medium: 'english',
        chapters: {
          chapter_number: 1,
          chapter_name: 'The Rise of Nationalism in Europe',
        },
      };

      const result = mapLearningResource(input);
      expect(result.title).toBe('Class 10 History Board Paper 2024');
    });

    it('uses default title when chapters data is missing', () => {
      const input: LearningResourceRow = { ...baseRow, chapters: null };
      const result = mapLearningResource(input);
      expect(result.title).toBe('Sample Resource');
    });

    it('converts year number to string or returns undefined', () => {
      const inputWithYear: LearningResourceRow = { ...baseRow, year: 2024 };
      const inputWithoutYear: LearningResourceRow = { ...baseRow, year: null };

      expect(mapLearningResource(inputWithYear).year).toBe('2024');
      expect(mapLearningResource(inputWithoutYear).year).toBeUndefined();
    });

    it('falls back to ISO timestamp if created_at is missing', () => {
      const input: LearningResourceRow = { ...baseRow, created_at: undefined };
      const result = mapLearningResource(input);
      expect(result.uploadDate).toBeDefined();
      expect(new Date(result.uploadDate).getTime()).not.toBeNaN();
    });

    it('maps optional allow_download, storage_bucket, and file_path fields', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        allow_download: true,
        storage_bucket: 'custom-bucket',
        file_path: 'path/to/doc.pdf',
      };

      const result = mapLearningResource(input);
      expect(result.allow_download).toBe(true);
      expect(result.storage_bucket).toBe('custom-bucket');
      expect(result.file_path).toBe('path/to/doc.pdf');
    });

    it('maps chapter content fields from resource or joined chapters', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        chapter_summary: 'Detailed chapter overview text.',
        topics: ['Topic 1', 'Topic 2'],
        study_guidance: [{ title: 'Tip 1', description: 'Do practice questions.' }],
      };

      const result = mapLearningResource(input);
      expect(result.chapter_summary).toBe('Detailed chapter overview text.');
      expect(result.topics).toEqual(['Topic 1', 'Topic 2']);
      expect(result.study_guidance).toEqual([{ title: 'Tip 1', description: 'Do practice questions.' }]);
    });

    it('prefers resource-level chapter_summary and topics over linked chapter fallback', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        id: '87',
        title: 'Resource and Development',
        medium: 'english',
        chapter_summary: 'English resource summary text.',
        topics: ['English Topic 1', 'English Topic 2'],
        chapters: {
          chapter_number: 1,
          chapter_name: 'संसाधन और विकास',
          chapter_summary: 'हिंदी अध्याय सारांश पाठ',
          topics: ['हिंदी विषय 1', 'हिंदी विषय 2'],
        },
      };

      const result = mapLearningResource(input);
      expect(result.chapter_summary).toBe('English resource summary text.');
      expect(result.topics).toEqual(['English Topic 1', 'English Topic 2']);
    });

    it('maps description field correctly when present or null', () => {
      const inputWithDesc: LearningResourceRow = {
        ...baseRow,
        description: 'यह एक हिंदी माध्यम का अध्याय विवरण है।',
      };
      const inputWithNullDesc: LearningResourceRow = {
        ...baseRow,
        description: null,
      };

      expect(mapLearningResource(inputWithDesc).description).toBe('यह एक हिंदी माध्यम का अध्याय विवरण है।');
      expect(mapLearningResource(inputWithNullDesc).description).toBe('');
    });
  });

  describe('fetchLearningResources', () => {
    it('fetches learning resources without filters', async () => {
      const mockRows: LearningResourceRow[] = [
        {
          id: '1',
          title: 'Math Notes',
          resource_type: 'notes',
          medium: 'english',
          student_class: '10',
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      const mockQueryChain = {
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (resolve: (arg: { data: LearningResourceRow[]; error: null }) => void) =>
          resolve({ data: mockRows, error: null }),
      };

      const mockSelect = vi.fn().mockReturnValue(mockQueryChain);

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const response = await fetchLearningResources();

      expect(supabase.from).toHaveBeenCalledWith('learning_resources');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance'
      );
      expect(response.error).toBeNull();
      expect(response.data).toHaveLength(1);
      expect(response.data?.[0].title).toBe('Math Notes');
      expect(response.data?.[0].student_class).toBe('Class 10');
    });

    it('applies all provided filters including chapters', async () => {
      const mockLimit = vi.fn();
      const mockNeq = vi.fn();
      const mockEq = vi.fn();

      const queryChain = {
        eq: mockEq,
        neq: mockNeq,
        limit: mockLimit,
      };

      mockEq.mockReturnValue(queryChain);
      mockNeq.mockReturnValue(queryChain);
      mockLimit.mockResolvedValue({ data: [], error: null });

      const mockSelect = vi.fn().mockReturnValue(queryChain);

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const response = await fetchLearningResources({
        resource_type: 'notes',
        student_class: 'Class 10',
        subject: 'Mathematics',
        medium: 'english',
        includeChapters: true,
        neqId: 'res-99',
        limit: 5,
      });

      expect(mockSelect).toHaveBeenCalledWith(
        'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance, chapters(id, chapter_number, chapter_name, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance)'
      );
      expect(mockEq).toHaveBeenCalledWith('resource_type', 'notes');
      expect(mockEq).toHaveBeenCalledWith('student_class', 'Class 10');
      expect(mockEq).toHaveBeenCalledWith('subject', 'Mathematics');
      expect(mockEq).toHaveBeenCalledWith('medium', 'english');
      expect(mockNeq).toHaveBeenCalledWith('id', 'res-99');
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(response.data).toEqual([]);
      expect(response.error).toBeNull();
    });

    it('returns error when query fails with non-missing-column error', async () => {
      const mockError = { message: 'Database error', code: '500' };

      const mockSelect = vi.fn().mockResolvedValue({ data: null, error: mockError });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const response = await fetchLearningResources();

      expect(response.data).toBeNull();
      expect(response.error).toEqual(mockError);
    });

    it('retries with legacy query on 42703 missing column error and returns mapped resources', async () => {
      const missingColumnError = { message: 'column chapter_summary does not exist', code: '42703' };
      const legacyRows: LearningResourceRow[] = [
        {
          id: 'res-legacy-1',
          title: 'Legacy Resource',
          resource_type: 'notes',
          medium: 'english',
          student_class: '10',
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      const selectCalls: string[] = [];

      vi.mocked(supabase.from).mockImplementation(() => {
        return {
          select: (selectStr: string) => {
            selectCalls.push(selectStr);
            if (selectCalls.length === 1) {
              return Promise.resolve({ data: null, error: missingColumnError });
            } else {
              return Promise.resolve({ data: legacyRows, error: null });
            }
          },
        } as unknown as ReturnType<typeof supabase.from>;
      });

      const response = await fetchLearningResources();

      expect(selectCalls).toHaveLength(2);
      expect(selectCalls[0]).toContain('chapter_summary');
      expect(selectCalls[1]).not.toContain('chapter_summary');
      expect(response.error).toBeNull();
      expect(response.data).toHaveLength(1);
      expect(response.data?.[0].id).toBe('res-legacy-1');
      expect(response.data?.[0].title).toBe('Legacy Resource');
    });

    it('re-applies filters on legacy fallback query when 42703 error occurs', async () => {
      const missingColumnError = { message: 'column chapter_summary does not exist', code: '42703' };
      const legacyRows: LearningResourceRow[] = [
        {
          id: 'res-legacy-filtered',
          title: 'Filtered Legacy Resource',
          resource_type: 'notes',
          medium: 'english',
          student_class: '10',
        },
      ];

      let callCount = 0;
      const primaryMockEq = vi.fn();
      const legacyMockEq = vi.fn();

      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const chain = {
            eq: primaryMockEq.mockImplementation(() => chain),
            then: (resolve: (arg: { data: null; error: typeof missingColumnError }) => void) =>
              resolve({ data: null, error: missingColumnError }),
          };
          return { select: vi.fn().mockReturnValue(chain) } as unknown as ReturnType<typeof supabase.from>;
        } else {
          const chain = {
            eq: legacyMockEq.mockImplementation(() => chain),
            then: (resolve: (arg: { data: LearningResourceRow[]; error: null }) => void) =>
              resolve({ data: legacyRows, error: null }),
          };
          return { select: vi.fn().mockReturnValue(chain) } as unknown as ReturnType<typeof supabase.from>;
        }
      });

      const response = await fetchLearningResources({ resource_type: 'notes', medium: 'english' });

      expect(callCount).toBe(2);
      expect(primaryMockEq).toHaveBeenCalledWith('resource_type', 'notes');
      expect(primaryMockEq).toHaveBeenCalledWith('medium', 'english');
      expect(legacyMockEq).toHaveBeenCalledWith('resource_type', 'notes');
      expect(legacyMockEq).toHaveBeenCalledWith('medium', 'english');
      expect(response.error).toBeNull();
      expect(response.data).toHaveLength(1);
      expect(response.data?.[0].id).toBe('res-legacy-filtered');
    });

    it('does not trigger legacy query retry for unrelated errors (e.g. 500 or auth error)', async () => {
      const genericError = { message: 'Internal server error', code: '500' };
      const selectCalls: string[] = [];

      vi.mocked(supabase.from).mockImplementation(() => {
        return {
          select: (selectStr: string) => {
            selectCalls.push(selectStr);
            return Promise.resolve({ data: null, error: genericError });
          },
        } as unknown as ReturnType<typeof supabase.from>;
      });

      const response = await fetchLearningResources();

      expect(selectCalls).toHaveLength(1);
      expect(response.data).toBeNull();
      expect(response.error).toEqual(genericError);
    });
  });

  describe('fetchLearningResourceById', () => {
    it('fetches single learning resource by ID successfully', async () => {
      const mockRow: LearningResourceRow = {
        id: 'res-1',
        title: 'Physics Chapter 1',
        resource_type: 'notes',
        medium: 'english',
        student_class: '12',
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const response = await fetchLearningResourceById('res-1', true);

      expect(supabase.from).toHaveBeenCalledWith('learning_resources');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance, chapters(id, chapter_number, chapter_name, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance)'
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'res-1');
      expect(mockSingle).toHaveBeenCalled();
      expect(response.error).toBeNull();
      expect(response.data?.id).toBe('res-1');
      expect(response.data?.student_class).toBe('Class 12');
      expect(response.rawData).toEqual(mockRow);
    });

    it('returns null data when error occurs', async () => {
      const mockError = { message: 'Not found', code: 'PGRST116' };

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const response = await fetchLearningResourceById('invalid-id');

      expect(response.data).toBeNull();
      expect(response.error).toEqual(mockError);
    });
  });

  describe('fetchSyllabusChapters', () => {
    it('queries chapters with specified class and medium', async () => {
      const mockData = [{ chapter_id: 'chap-1', subject: 'Science' }];

      const mockNot = vi.fn().mockResolvedValue({ data: mockData, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ not: mockNot });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const response = await fetchSyllabusChapters('Class 10', 'english');

      expect(supabase.from).toHaveBeenCalledWith('learning_resources');
      expect(mockSelect).toHaveBeenCalledWith('chapter_id, subject');
      expect(mockEq1).toHaveBeenCalledWith('resource_type', 'notes');
      expect(mockEq2).toHaveBeenCalledWith('student_class', 'Class 10');
      expect(mockEq3).toHaveBeenCalledWith('medium', 'english');
      expect(mockNot).toHaveBeenCalledWith('chapter_id', 'is', null);
      expect(response.data).toEqual(mockData);
      expect(response.error).toBeNull();
    });
  });

  describe('fetchSyllabusChapterCounts', () => {
    it('correctly aggregates counts for classes 8, 9, 10 and handles edge cases', async () => {
      const mockRows = [
        { student_class: '8' },
        { student_class: 'Class 8' },
        { student_class: '9' },
        { student_class: 'Class 10' },
        { student_class: '10' },
        { student_class: 'Class 10' },
        { student_class: null },
        { student_class: '11' }, // not in target counts object
      ];

      const mockEq = vi.fn().mockResolvedValue({ data: mockRows, error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const { fetchSyllabusChapterCounts } = await import('../learningResourcesAPI');
      const response = await fetchSyllabusChapterCounts();

      expect(supabase.from).toHaveBeenCalledWith('chapters');
      expect(mockSelect).toHaveBeenCalledWith('student_class');
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
      expect(response.error).toBeNull();
      expect(response.data).toEqual({
        '8': 2,
        '9': 1,
        '10': 3,
      });
    });

    it('returns error when database query fails', async () => {
      const mockDbError = { message: 'Database connection failed' };
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: mockDbError });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const { fetchSyllabusChapterCounts } = await import('../learningResourcesAPI');
      const response = await fetchSyllabusChapterCounts();

      expect(response.data).toBeNull();
      expect(response.error).toEqual(mockDbError);
    });

    it('demonstrates reduce implementation correctness and benchmark', () => {
      const sampleData = Array.from({ length: 50000 }, (_, i) => ({
        student_class: i % 4 === 0 ? 'Class 8' : i % 4 === 1 ? '9' : i % 4 === 2 ? '10' : '11',
      }));

      // Baseline loop implementation
      const loopCounts: Record<string, number> = { '8': 0, '9': 0, '10': 0 };
      const startLoop = performance.now();
      for (let i = 0; i < 10; i++) {
        for (const row of sampleData) {
          if (!row.student_class) continue;
          const strClass = String(row.student_class);
          const match = strClass.match(/\d+/);
          if (match) {
            const classId = match[0];
            if (loopCounts[classId] !== undefined) {
              loopCounts[classId] = (loopCounts[classId] || 0) + 1;
            }
          }
        }
      }
      const endLoop = performance.now();

      // Reduce implementation
      const startReduce = performance.now();
      let reduceCounts: Record<string, number> = { '8': 0, '9': 0, '10': 0 };
      for (let i = 0; i < 10; i++) {
        reduceCounts = sampleData.reduce((acc, row) => {
          if (!row.student_class) return acc;
          const strClass = String(row.student_class);
          const match = strClass.match(/\d+/);
          if (match) {
            const classId = match[0];
            if (acc[classId] !== undefined) {
              acc[classId] = (acc[classId] || 0) + 1;
            }
          }
          return acc;
        }, { '8': 0, '9': 0, '10': 0 });
      }
      const endReduce = performance.now();

      // Divide counts by 10 since loop ran 10 iterations
      const normalizedLoopCounts = {
        '8': loopCounts['8'] / 10,
        '9': loopCounts['9'] / 10,
        '10': loopCounts['10'] / 10,
      };

      expect(reduceCounts).toEqual(normalizedLoopCounts);
      console.log(`[fetchSyllabusChapterCounts Benchmark] Loop duration: ${(endLoop - startLoop).toFixed(2)}ms`);
      console.log(`[fetchSyllabusChapterCounts Benchmark] Reduce duration: ${(endReduce - startReduce).toFixed(2)}ms`);
    });
  });
});
