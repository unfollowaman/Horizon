import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SYLLABUS_2026_DATA, runSyllabusSeed } from '../seed_syllabus_2026.js';

describe('Authoritative 2026-27 Syllabus Dataset Audit', () => {
  it('contains data exclusively for Classes 8, 9, and 10', () => {
    const classes = new Set(SYLLABUS_2026_DATA.map((item) => item.student_class));
    expect(Array.from(classes).sort()).toEqual(['10', '8', '9']);
  });

  it('includes all 6 required subjects for each class', () => {
    const requiredSubjects = ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Sanskrit'];
    ['8', '9', '10'].forEach((cls) => {
      const subjectsInClass = SYLLABUS_2026_DATA
        .filter((item) => item.student_class === cls)
        .map((item) => item.subject);

      requiredSubjects.forEach((subj) => {
        expect(subjectsInClass).toContain(subj);
      });
    });
  });

  describe('Class 9 Mathematics Strict Requirements', () => {
    const c9Math = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'Mathematics');

    it('contains exactly 15 chapters', () => {
      expect(c9Math).toBeDefined();
      expect(c9Math?.chapters.length).toBe(15);
      const chNums = c9Math?.chapters.map((c) => c.chapter_number);
      expect(chNums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    });

    it('Chapters 1 to 8 have exercise topic nodes', () => {
      for (let i = 1; i <= 8; i++) {
        const ch = c9Math?.chapters.find((c) => c.chapter_number === i);
        expect(ch).toBeDefined();
        expect(ch?.topics.length).toBeGreaterThan(0);
      }
    });

    it('CRITICAL: Chapters 9 to 15 contain NO fabricated exercise nodes', () => {
      for (let i = 9; i <= 15; i++) {
        const ch = c9Math?.chapters.find((c) => c.chapter_number === i);
        expect(ch).toBeDefined();
        expect(ch?.topics).toEqual([]); // Must be empty!
      }
    });
  });

  describe('Class 9 NCF-SE 2023 Prescribed Books & Structure', () => {
    it('Class 9 Science has 13 complete chapters under Exploration', () => {
      const c9Sci = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'Science');
      expect(c9Sci?.chapters.length).toBe(13);
      expect(c9Sci?.chapters[0].chapter_name).toContain('Exploration: Entering the World of Secondary Science');
    });

    it('Class 9 Social Science has 20 chapters under Understanding Society', () => {
      const c9Sst = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'Social Science');
      expect(c9Sst?.chapters.length).toBe(20);
    });

    it('Class 9 English uses Kaveri curriculum (not legacy Beehive/Moments)', () => {
      const c9Eng = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'English');
      expect(c9Eng).toBeDefined();
      expect(c9Eng?.chapters[0].chapter_name).toContain('In the Realm of Morning');
    });

    it('Class 9 Hindi uses unified Ganga curriculum (not legacy Kshitij/Sparsh)', () => {
      const c9Hindi = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'Hindi');
      expect(c9Hindi).toBeDefined();
      expect(c9Hindi?.chapters[0].chapter_name).toContain('नया प्रभात');
    });

    it('Class 9 Sanskrit uses Shardā curriculum (not legacy Shemushi)', () => {
      const c9San = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'Sanskrit');
      expect(c9San).toBeDefined();
      expect(c9San?.chapters[0].chapter_name).toContain('मङ्गलाचरणम्');
    });
  });

  describe('Class 8 Social Science Structure', () => {
    it('Class 8 Social Science contains 21 chapters covering History, Geography, and Civics', () => {
      const c8Sst = SYLLABUS_2026_DATA.find((item) => item.student_class === '8' && item.subject === 'Social Science');
      expect(c8Sst?.chapters.length).toBe(21);
      // History: Chapters 1-8
      expect(c8Sst?.chapters[0].chapter_name).toBe('Introduction: How, When and Where');
      // Geography: Chapters 9-13
      expect(c8Sst?.chapters[8].chapter_name).toBe('Resources');
      // Civics: Chapters 14-21
      expect(c8Sst?.chapters[13].chapter_name).toBe('The Indian Constitution');
    });
  });

  describe('Class 10 Course A / Course B & Board Exclusions', () => {
    it('Class 10 Hindi includes Course A and Course B chapters', () => {
      const c10Hindi = SYLLABUS_2026_DATA.find((item) => item.student_class === '10' && item.subject === 'Hindi');
      expect(c10Hindi?.chapters.some((c) => c.chapter_name.includes('Course A'))).toBe(true);
      expect(c10Hindi?.chapters.some((c) => c.chapter_name.includes('Course B'))).toBe(true);
    });

    it('Class 10 Social Science explicitly marks Project Work & Map Work distinctions', () => {
      const c10Sst = SYLLABUS_2026_DATA.find((item) => item.student_class === '10' && item.subject === 'Social Science');
      const lifelinesCh = c10Sst?.chapters.find((c) => c.chapter_name === 'Lifelines of National Economy');
      expect(lifelinesCh?.topics[0].title).toContain('Map Work');

      const consumerCh = c10Sst?.chapters.find((c) => c.chapter_name === 'Consumer Rights');
      expect(consumerCh?.topics[0].title).toContain('Project Work');
    });
  });

  describe('Syllabus Seed Script Idempotency & Resource Junction Mechanics', () => {
    let mockSupabase: any;

    beforeEach(() => {
      const upsertSpy = vi.fn().mockReturnValue({ then: (res: any) => res({ data: null, error: null }) });
      const builder: any = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.or = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.not = vi.fn().mockReturnValue(builder);
      builder.update = vi.fn().mockReturnValue(builder);
      builder.insert = vi.fn().mockReturnValue(builder);
      builder.upsert = upsertSpy;
      builder.single = vi.fn().mockResolvedValue({ data: { id: 'inserted-1' }, error: null });
      builder.then = (resolve: any) => resolve({ data: [], error: null });

      mockSupabase = {
        from: vi.fn().mockReturnValue(builder),
        _builder: builder,
        upsertSpy,
      };
    });

    it('executes idempotently without duplicating existing chapters or topics', async () => {
      mockSupabase._builder.select.mockReturnValue(mockSupabase._builder);
      mockSupabase._builder.then = (resolve: any) => resolve({
        data: [{ id: 'ch-123', chapter_number: 1, chapter_name: 'Rational Numbers' }],
        error: null,
      });

      await runSyllabusSeed(mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith('chapters');
      expect(mockSupabase.from).toHaveBeenCalledWith('syllabus_topics');
    });

    it('never attaches generic chapter-level PDFs to all topics automatically', async () => {
      let fromCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        fromCallCount++;
        const b = { ...mockSupabase._builder };
        if (table === 'chapters') {
          b.then = (resolve: any) => resolve({ data: [{ id: 'ch-1', chapter_number: 1, chapter_name: 'Rational Numbers' }], error: null });
        } else if (table === 'syllabus_topics') {
          b.then = (resolve: any) => resolve({ data: [{ id: 'top-1', title: 'Exercise 1.1' }], error: null });
        } else if (table === 'learning_resources') {
          b.then = (resolve: any) => resolve({
            data: [{ id: 'res-1', title: 'Chapter 1 Notes', chapter_id: 'ch-1', student_class: '8', subject: 'Mathematics' }],
            error: null
          });
        }
        return b;
      });

      await runSyllabusSeed(mockSupabase);

      // 'Chapter 1 Notes' does NOT explicitly contain 'Exercise 1.1', so upsert junction should NOT be called
      expect(mockSupabase.upsertSpy).not.toHaveBeenCalled();
    });

    it('attaches resources ONLY when confident topic match occurs', async () => {
      const createBuilder = (table: string) => {
        const b: any = {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          upsert: mockSupabase.upsertSpy,
          single: vi.fn().mockResolvedValue({ data: { id: 'inserted-1' }, error: null }),
        };
        if (table === 'chapters') {
          b.then = (resolve: any) => resolve({ data: [{ id: 'ch-1', chapter_number: 1, chapter_name: 'Rational Numbers' }], error: null });
        } else if (table === 'syllabus_topics') {
          b.then = (resolve: any) => resolve({ data: [{ id: 'top-1', title: 'Exercise 1.1' }], error: null });
        } else if (table === 'learning_resources') {
          b.then = (resolve: any) => resolve({
            data: [{ id: 'res-2', title: 'Class 8 Maths Exercise 1.1 Solutions', chapter_id: 'ch-1', student_class: '8', subject: 'Mathematics' }],
            error: null
          });
        } else {
          b.then = (resolve: any) => resolve({ data: [], error: null });
        }
        return b;
      };

      mockSupabase.from.mockImplementation((table: string) => createBuilder(table));

      await runSyllabusSeed(mockSupabase);

      // Confident match for Exercise 1.1
      expect(mockSupabase.upsertSpy).toHaveBeenCalledWith(
        { topic_id: 'top-1', resource_id: 'res-2' },
        { onConflict: 'topic_id,resource_id' }
      );
    });
  });
});
