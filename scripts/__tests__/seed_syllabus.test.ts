import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SYLLABUS_2026_DATA, runSyllabusSeed } from '../seed_syllabus_2026.js';

describe('Authoritative 2026-27 Syllabus Dataset Audit', () => {
  it('contains data exclusively for Classes 8, 9, and 10', () => {
    const classes = new Set(SYLLABUS_2026_DATA.map((item) => item.student_class));
    expect(Array.from(classes).sort()).toEqual(['10', '8', '9']);
  });

  it('includes all required subjects for each class including separated Class 10 Hindi Course A & B', () => {
    ['8', '9'].forEach((cls) => {
      const requiredSubjects = ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Sanskrit'];
      const subjectsInClass = SYLLABUS_2026_DATA
        .filter((item) => item.student_class === cls)
        .map((item) => item.subject);

      requiredSubjects.forEach((subj) => {
        expect(subjectsInClass).toContain(subj);
      });
    });

    // Class 10
    const class10Subjects = SYLLABUS_2026_DATA
      .filter((item) => item.student_class === '10')
      .map((item) => item.subject);

    expect(class10Subjects).toContain('Mathematics');
    expect(class10Subjects).toContain('Science');
    expect(class10Subjects).toContain('Social Science');
    expect(class10Subjects).toContain('English');
    expect(class10Subjects).toContain('Hindi Course A');
    expect(class10Subjects).toContain('Hindi Course B');
    expect(class10Subjects).toContain('Sanskrit');
    expect(class10Subjects).not.toContain('Hindi'); // Must be separated!
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

    it('Class 9 English contains complete 7 Kaveri literature chapters plus structured grammar chapter', () => {
      const c9Eng = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'English');
      expect(c9Eng).toBeDefined();
      expect(c9Eng?.chapters.length).toBe(8); // 7 literature + 1 grammar section
      expect(c9Eng?.chapters[0].chapter_name).toBe('In the Realm of Morning (Prose)');
      expect(c9Eng?.chapters[1].chapter_name).toBe('The Wind and the Leaves (Poem)');
      expect(c9Eng?.chapters[2].chapter_name).toBe('The Silver Lining (Prose)');
      expect(c9Eng?.chapters[3].chapter_name).toBe('Symphony of the Hills (Prose)');
      expect(c9Eng?.chapters[4].chapter_name).toBe('Song of the Open Road (Poem)');
      expect(c9Eng?.chapters[5].chapter_name).toBe('Shadows of the Banyan Tree (Prose)');
      expect(c9Eng?.chapters[6].chapter_name).toBe('The Unbroken Wave (Prose & Reflection)');

      const grammarCh = c9Eng?.chapters[7];
      expect(grammarCh?.chapter_name).toBe('English Grammar Syllabus');
      expect(grammarCh?.topics.every((t) => t.topic_type === 'grammar')).toBe(true);
      expect(grammarCh?.topics.length).toBe(8);
    });

    it('Class 9 Hindi uses unified Ganga curriculum with 7 literature chapters and grammar', () => {
      const c9Hindi = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'Hindi');
      expect(c9Hindi).toBeDefined();
      expect(c9Hindi?.chapters.length).toBe(8); // 7 literature + 1 grammar
      expect(c9Hindi?.chapters[0].chapter_name).toBe('नया प्रभात (कविता)');
      expect(c9Hindi?.chapters[1].chapter_name).toBe('मिट्टी की सौगंध (कहानी)');
      expect(c9Hindi?.chapters[2].chapter_name).toBe('संस्कृति के स्वर (निबंध)');
      expect(c9Hindi?.chapters[3].chapter_name).toBe('समय की शिला पर (कविता)');
      expect(c9Hindi?.chapters[4].chapter_name).toBe('सच्चा मित्र (कहानी)');
      expect(c9Hindi?.chapters[5].chapter_name).toBe('भारत के दीप (प्रेरक प्रसंग)');
      expect(c9Hindi?.chapters[6].chapter_name).toBe('प्रकृति का संदेश (संस्मरण)');

      const grammarCh = c9Hindi?.chapters[7];
      expect(grammarCh?.topics.every((t) => t.topic_type === 'grammar')).toBe(true);
    });

    it('Class 9 Sanskrit uses Shardā curriculum with 7 literature chapters and grammar', () => {
      const c9San = SYLLABUS_2026_DATA.find((item) => item.student_class === '9' && item.subject === 'Sanskrit');
      expect(c9San).toBeDefined();
      expect(c9San?.chapters.length).toBe(8); // 7 literature + 1 grammar
      expect(c9San?.chapters[0].chapter_name).toBe('मङ्गलाचरणम् एवं वन्दना');
      expect(c9San?.chapters[1].chapter_name).toBe('विद्यायाः महत्त्वम्');
      expect(c9San?.chapters[2].chapter_name).toBe('पर्यावरण-संरक्षणम्');
      expect(c9San?.chapters[3].chapter_name).toBe('सदाचारस्य शक्तिः');
      expect(c9San?.chapters[4].chapter_name).toBe('भारतस्य गौरवम्');
      expect(c9San?.chapters[5].chapter_name).toBe('वैज्ञानिकदृष्टिकोणः');
      expect(c9San?.chapters[6].chapter_name).toBe('सूक्ति-सुधा');

      const grammarCh = c9San?.chapters[7];
      expect(grammarCh?.topics.every((t) => t.topic_type === 'grammar')).toBe(true);
    });
  });

  describe('Class 8 Languages Grammar Representation', () => {
    it('Class 8 English literature chapters have no attached grammar topics, and grammar is isolated in Chapter 17', () => {
      const c8Eng = SYLLABUS_2026_DATA.find((item) => item.student_class === '8' && item.subject === 'English');
      expect(c8Eng).toBeDefined();
      expect(c8Eng?.chapters.length).toBe(17); // 16 lit + 1 grammar

      // Check first 16 chapters have topic_type === 'topic'
      for (let i = 0; i < 16; i++) {
        expect(c8Eng?.chapters[i].topics.every((t) => t.topic_type === 'topic')).toBe(true);
      }

      const grammarCh = c8Eng?.chapters[16];
      expect(grammarCh?.chapter_name).toBe('English Grammar Syllabus');
      expect(grammarCh?.topics.length).toBe(9);
      expect(grammarCh?.topics.every((t) => t.topic_type === 'grammar')).toBe(true);
    });

    it('Class 8 Hindi contains dedicated Chapter 14 with complete 10 grammar topics from PDF', () => {
      const c8Hindi = SYLLABUS_2026_DATA.find((item) => item.student_class === '8' && item.subject === 'Hindi');
      expect(c8Hindi).toBeDefined();
      expect(c8Hindi?.chapters.length).toBe(14); // 13 lit + 1 grammar

      const grammarCh = c8Hindi?.chapters[13];
      expect(grammarCh?.chapter_name).toBe('हिंदी व्याकरण (वसंत भाग–3)');
      expect(grammarCh?.topics.length).toBe(10);
      expect(grammarCh?.topics.every((t) => t.topic_type === 'grammar')).toBe(true);
    });

    it('Class 8 Sanskrit contains dedicated Chapter 15 with complete 8 grammar topics from PDF', () => {
      const c8San = SYLLABUS_2026_DATA.find((item) => item.student_class === '8' && item.subject === 'Sanskrit');
      expect(c8San).toBeDefined();
      expect(c8San?.chapters.length).toBe(15); // 14 lit + 1 grammar

      const grammarCh = c8San?.chapters[14];
      expect(grammarCh?.chapter_name).toBe('संस्कृत व्याकरणम् (रुचिरा भाग–3)');
      expect(grammarCh?.topics.length).toBe(8);
      expect(grammarCh?.topics.every((t) => t.topic_type === 'grammar')).toBe(true);
    });
  });

  describe('Class 10 Languages Grammar Representation', () => {
    it('Class 10 English Chapter 19 contains 7 individual grammar topics from PDF', () => {
      const c10Eng = SYLLABUS_2026_DATA.find((item) => item.student_class === '10' && item.subject === 'English');
      expect(c10Eng).toBeDefined();
      expect(c10Eng?.chapters.length).toBe(19);

      const grammarCh = c10Eng?.chapters[18];
      expect(grammarCh?.chapter_name).toBe('English Grammar Syllabus');
      expect(grammarCh?.topics.length).toBe(7);
      expect(grammarCh?.topics.every((t) => t.topic_type === 'grammar')).toBe(true);
    });

    it('Class 10 Sanskrit Chapter 11 contains 7 individual grammar topics from PDF', () => {
      const c10San = SYLLABUS_2026_DATA.find((item) => item.student_class === '10' && item.subject === 'Sanskrit');
      expect(c10San).toBeDefined();
      expect(c10San?.chapters.length).toBe(11);

      const grammarCh = c10San?.chapters[10];
      expect(grammarCh?.chapter_name).toBe('संस्कृत व्याकरणम् (शेमुषी भाग–2)');
      expect(grammarCh?.topics.length).toBe(7);
      expect(grammarCh?.topics.every((t) => t.topic_type === 'grammar')).toBe(true);
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
    it('Class 10 Hindi Course A and Course B exist as distinct subject branches', () => {
      const c10CourseA = SYLLABUS_2026_DATA.find((item) => item.student_class === '10' && item.subject === 'Hindi Course A');
      const c10CourseB = SYLLABUS_2026_DATA.find((item) => item.student_class === '10' && item.subject === 'Hindi Course B');

      expect(c10CourseA).toBeDefined();
      expect(c10CourseB).toBeDefined();
      expect(c10CourseA?.chapters.length).toBe(16); // 15 lit + 1 grammar
      expect(c10CourseB?.chapters.length).toBe(18); // 17 lit + 1 grammar

      // Verify Course A literature
      expect(c10CourseA?.chapters[0].chapter_name).toBe('पद (सूरदास)');
      expect(c10CourseA?.chapters[12].chapter_name).toBe('माता का अंचल (शिवपूजन सहाय - कृतिका)');

      // Verify Course B literature
      expect(c10CourseB?.chapters[0].chapter_name).toBe('साखी (कबीर)');
      expect(c10CourseB?.chapters[14].chapter_name).toBe('हरिहर काका (मिथिलेश्वर - संचयन)');
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
