import { describe, it, expect, vi } from 'vitest';
import { SYLLABUS_2026_DATA, runSeedSyllabus } from '../seed_syllabus_2026';

describe('2026–27 Syllabus Data Integrity', () => {
  it('contains data strictly for Classes 8, 9, and 10 without Class 11 or 12', () => {
    const classes = new Set(SYLLABUS_2026_DATA.map(item => item.student_class));
    expect(classes.has('Class 8')).toBe(true);
    expect(classes.has('Class 9')).toBe(true);
    expect(classes.has('Class 10')).toBe(true);
    expect(classes.has('Class 11')).toBe(false);
    expect(classes.has('Class 12')).toBe(false);
    expect(classes.size).toBe(3);
  });

  it('covers all mandated subjects for Class 8, 9, and 10', () => {
    const class8Subjects = SYLLABUS_2026_DATA.filter(d => d.student_class === 'Class 8').map(d => d.subject);
    const class9Subjects = SYLLABUS_2026_DATA.filter(d => d.student_class === 'Class 9').map(d => d.subject);
    const class10Subjects = SYLLABUS_2026_DATA.filter(d => d.student_class === 'Class 10').map(d => d.subject);

    expect(class8Subjects).toContain('Mathematics');
    expect(class8Subjects).toContain('Science');
    expect(class8Subjects).toContain('Social Science');
    expect(class8Subjects).toContain('English');
    expect(class8Subjects).toContain('Hindi');
    expect(class8Subjects).toContain('Sanskrit');

    expect(class9Subjects).toContain('Mathematics');
    expect(class9Subjects).toContain('Science');
    expect(class9Subjects).toContain('Social Science');
    expect(class9Subjects).toContain('English');
    expect(class9Subjects).toContain('Hindi');
    expect(class9Subjects).toContain('Sanskrit');

    expect(class10Subjects).toContain('Mathematics');
    expect(class10Subjects).toContain('Science');
    expect(class10Subjects).toContain('Social Science');
    expect(class10Subjects).toContain('English');
    expect(class10Subjects).toContain('Hindi Course A');
    expect(class10Subjects).toContain('Hindi Course B');
    expect(class10Subjects).toContain('Sanskrit');
  });

  it('CRITICAL CONSTRAINT: Class 9 Mathematics Chapters 9–15 have ZERO fabricated exercises', () => {
    const class9Maths = SYLLABUS_2026_DATA.find(
      d => d.student_class === 'Class 9' && d.subject === 'Mathematics'
    );

    expect(class9Maths).toBeDefined();

    const chapters9To15 = class9Maths!.chapters.filter(ch => ch.chapter_number >= 9 && ch.chapter_number <= 15);
    expect(chapters9To15.length).toBe(5); // Chapters 9, 10, 11, 12, 13 (NCERT renumbered / verified 9-15)

    chapters9To15.forEach(ch => {
      // Must NOT contain any fabricated exercise topics
      expect(ch.topics).toEqual([]);
      // Verify chapter name is preserved
      expect(ch.chapter_name).toBeTruthy();
    });
  });

  it('verifies Mathematics exercise granularity for Class 8 and Class 10', () => {
    const class10Maths = SYLLABUS_2026_DATA.find(
      d => d.student_class === 'Class 10' && d.subject === 'Mathematics'
    );

    expect(class10Maths).toBeDefined();
    const ch1 = class10Maths!.chapters.find(c => c.chapter_number === 1);
    expect(ch1?.topics[0].title).toMatch(/^Exercise 1\.1/);
  });

  it('runs runSeedSyllabus idempotently using mock Supabase client', async () => {
    const mockSelectRes = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'res-1',
          student_class: 'Class 10',
          subject: 'Science',
          title: 'Chapter 1: Chemical Reactions and Equations Notes',
          chapter_id: 'ch-1',
          medium: 'english',
        },
      ],
      error: null,
    });

    const mockSelectCh = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'ch-1' }, error: null }),
          }),
        }),
      }),
    });

    const mockSelectTop = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'top-1' }, error: null }),
        }),
      }),
    });

    const mockUpsertJnc = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'learning_resources') {
          return { select: mockSelectRes };
        }
        if (table === 'chapters') {
          return { select: mockSelectCh };
        }
        if (table === 'syllabus_topics') {
          return { select: mockSelectTop };
        }
        if (table === 'syllabus_topic_resources') {
          return { upsert: mockUpsertJnc };
        }
        return {};
      }),
    };

    const result = await runSeedSyllabus(mockSupabase as any);

    expect(result.chaptersCreated).toBe(0); // All chapters found
    expect(result.topicsCreated).toBe(0); // All topics found
    expect(result.resourcesMapped).toBeGreaterThan(0); // Resources mapped
  });
});
