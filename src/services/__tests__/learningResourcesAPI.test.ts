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

    it('uses chapter title format when chapters data exists', () => {
      const input: LearningResourceRow = {
        ...baseRow,
        chapters: {
          chapter_number: 3,
          chapter_name: 'Polynomials',
        },
      };

      const result = mapLearningResource(input);
      expect(result.title).toBe('Chapter 3: Polynomials');
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
        'id, title, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path'
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
        'id, title, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapters(id, chapter_number, chapter_name)'
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

    it('returns error when query fails', async () => {
      const mockError = { message: 'Database error', code: '500' };

      const mockSelect = vi.fn().mockResolvedValue({ data: null, error: mockError });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as unknown as ReturnType<typeof supabase.from>);

      const response = await fetchLearningResources();

      expect(response.data).toBeNull();
      expect(response.error).toEqual(mockError);
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
        'id, title, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapters(id, chapter_number, chapter_name)'
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
});
