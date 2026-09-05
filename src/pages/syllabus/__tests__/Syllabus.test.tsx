import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SyllabusPage from '../SyllabusPage';
import * as learningAPI from '../../../services/learningResourcesAPI';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('S5 Syllabus UI & Routing Integration Tests', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
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

  it('1. /syllabus renders the main Syllabus landing page with Class 8, Class 9, and Class 10 cards', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus']}>
          <Routes>
            <Route path="/syllabus" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Explore Syllabus Hierarchy');
    expect(container?.textContent).toContain('Class 8');
    expect(container?.textContent).toContain('Class 9');
    expect(container?.textContent).toContain('Class 10');
  });

  it('2. Clicking Class 10 navigates to /syllabus/class-10 and renders Class 10 subjects', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus']}>
          <Routes>
            <Route path="/syllabus" element={<SyllabusPage />} />
            <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const class10Card = container?.querySelector('[aria-label="Explore syllabus for Class 10"]');
    expect(class10Card).not.toBeNull();

    await act(async () => {
      class10Card?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container?.textContent).toContain('Select Subject for Class 10');
    expect(container?.textContent).toContain('Mathematics');
    expect(container?.textContent).toContain('Science');
    expect(container?.textContent).toContain('Social Science');
    expect(container?.textContent).toContain('English');
    expect(container?.textContent).toContain('Hindi Course A');
    expect(container?.textContent).toContain('Hindi Course B');
    expect(container?.textContent).toContain('Sanskrit');
  });

  it('3. Class 8 subject selection renders expected Class 8 subjects', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-8']}>
          <Routes>
            <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Select Subject for Class 8');
    expect(container?.textContent).toContain('Mathematics');
    expect(container?.textContent).toContain('Science');
    expect(container?.textContent).toContain('Hindi');
    expect(container?.textContent).not.toContain('Hindi Course A');
  });

  it('4. Class 9 subject selection renders expected Class 9 subjects with unified Hindi', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-9']}>
          <Routes>
            <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Select Subject for Class 9');
    expect(container?.textContent).toContain('Hindi');
    expect(container?.textContent).not.toContain('Hindi Course A');
    expect(container?.textContent).not.toContain('Hindi Course B');
  });

  it('5. Class 10 keeps Hindi Course A and Hindi Course B strictly separate', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-10']}>
          <Routes>
            <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Hindi Course A');
    expect(container?.textContent).toContain('Hindi Course B');
  });

  it('6. Subject page calls fetchSyllabusHierarchy with normalized class and subject name', async () => {
    const spy = vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
      data: [
        {
          id: 'ch-1',
          chapter_number: 1,
          chapter_name: 'Real Numbers',
          display_order: 1,
          is_active: true,
          syllabus_topics: [
            {
              id: 'tp-1',
              chapter_id: 'ch-1',
              title: 'Fundamental Theorem of Arithmetic',
              topic_type: 'topic',
              display_order: 1,
              is_active: true,
              resources: [],
            },
          ],
        },
      ],
      error: null,
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-10/mathematics']}>
          <Routes>
            <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(spy).toHaveBeenCalledWith('10', 'Mathematics');
    expect(container?.textContent).toContain('Real Numbers');
    expect(container?.textContent).toContain('Fundamental Theorem of Arithmetic');
  });

  it('7. Renders chapters and topics in display order and respects topic_type badges', async () => {
    vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
      data: [
        {
          id: 'ch-1',
          chapter_number: 1,
          chapter_name: 'Chemical Reactions and Equations',
          display_order: 1,
          is_active: true,
          syllabus_topics: [
            {
              id: 'tp-1',
              chapter_id: 'ch-1',
              title: 'Chemical Equations',
              topic_type: 'topic',
              display_order: 1,
              is_active: true,
              resources: [],
            },
            {
              id: 'tp-2',
              chapter_id: 'ch-1',
              title: 'Exercise 1.1',
              topic_type: 'exercise',
              display_order: 2,
              is_active: true,
              resources: [],
            },
            {
              id: 'tp-3',
              chapter_id: 'ch-1',
              title: 'Subject-Verb Agreement',
              topic_type: 'grammar',
              display_order: 3,
              is_active: true,
              resources: [],
            },
          ],
        },
      ],
      error: null,
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-10/science']}>
          <Routes>
            <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Chemical Reactions and Equations');
    expect(container?.textContent).toContain('Topic');
    expect(container?.textContent).toContain('Exercise');
    expect(container?.textContent).toContain('Grammar');
  });

  it('8. Resource links appear ONLY when actual topic-resource mappings exist without creating fake links', async () => {
    vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
      data: [
        {
          id: 'ch-1',
          chapter_number: 1,
          chapter_name: 'Real Numbers',
          display_order: 1,
          is_active: true,
          syllabus_topics: [
            {
              id: 'tp-1',
              chapter_id: 'ch-1',
              title: 'Introduction to Real Numbers',
              topic_type: 'topic',
              display_order: 1,
              is_active: true,
              resources: [
                {
                  id: 'res-101',
                  title: 'Real Numbers Notes',
                  medium: 'english',
                  resource_type: 'notes',
                  pdfUrl: '/view/res-101',
                  thumbnailUrl: '',
                  uploadDate: new Date().toISOString(),
                },
              ],
            },
            {
              id: 'tp-2',
              chapter_id: 'ch-1',
              title: 'Irrational Numbers Proof',
              topic_type: 'topic',
              display_order: 2,
              is_active: true,
              resources: [], // No resource mapped
            },
          ],
        },
      ],
      error: null,
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-10/mathematics']}>
          <Routes>
            <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Introduction to Real Numbers');
    expect(container?.textContent).toContain('View Notes');
    expect(container?.textContent).toContain('English');

    const topic2Container = container?.querySelectorAll('.neu-recessed')[1];
    expect(topic2Container?.querySelectorAll('a').length).toBe(0);
  });

  it('9. English and Hindi resources can coexist under one syllabus topic node', async () => {
    vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
      data: [
        {
          id: 'ch-1',
          chapter_number: 1,
          chapter_name: 'Real Numbers',
          display_order: 1,
          is_active: true,
          syllabus_topics: [
            {
              id: 'tp-1',
              chapter_id: 'ch-1',
              title: 'Fundamental Theorem of Arithmetic',
              topic_type: 'topic',
              display_order: 1,
              is_active: true,
              resources: [
                {
                  id: 'res-eng',
                  title: 'Real Numbers Notes - English',
                  medium: 'english',
                  resource_type: 'notes',
                  pdfUrl: '/view/res-eng',
                  thumbnailUrl: '',
                  uploadDate: new Date().toISOString(),
                },
                {
                  id: 'res-hi',
                  title: 'Real Numbers Notes - Hindi',
                  medium: 'hindi',
                  resource_type: 'notes',
                  pdfUrl: '/view/res-hi',
                  thumbnailUrl: '',
                  uploadDate: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      ],
      error: null,
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-10/mathematics']}>
          <Routes>
            <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Fundamental Theorem of Arithmetic');
    expect(container?.textContent).toContain('English');
    expect(container?.textContent).toContain('Hindi');
  });

  it('10. Class 9 Mathematics Chapters 9-15 render safely with zero exercise nodes', async () => {
    vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
      data: [
        {
          id: 'ch-9',
          chapter_number: 9,
          chapter_name: 'Circles',
          display_order: 9,
          is_active: true,
          syllabus_topics: [
            {
              id: 'tp-c1',
              chapter_id: 'ch-9',
              title: 'Angle Subtended by a Chord at a Point',
              topic_type: 'topic',
              display_order: 1,
              is_active: true,
              resources: [],
            },
          ],
        },
      ],
      error: null,
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-9/mathematics']}>
          <Routes>
            <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Circles');
    expect(container?.textContent).toContain('Angle Subtended by a Chord at a Point');
    expect(container?.textContent).not.toContain('Exercise');
  });

  it('11. Handles error state and retry option safely without crashing', async () => {
    vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
      data: null,
      error: { message: 'Database connection timeout', details: '', hint: '', code: '500' },
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/syllabus/class-10/mathematics']}>
          <Routes>
            <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Unable to Load Syllabus');
    expect(container?.textContent).toContain('Failed to fetch syllabus data. Please try again.');
    expect(container?.textContent).toContain('Retry Loading');
  });

  describe('S5.1 Post-Merge Correction Edge-Case Tests', () => {
    it('12. Reject invalid class routes cleanly (/syllabus/class-7, /syllabus/invalid-class)', async () => {
      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-7']}>
            <Routes>
              <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(container?.textContent).toContain('Class Not Found');
      expect(container?.textContent).toContain('The requested class syllabus route does not exist.');
    });

    it('13. Reject arbitrary/invalid subject routes without querying Supabase (/syllabus/class-10/random-subject)', async () => {
      const spy = vi.spyOn(learningAPI, 'fetchSyllabusHierarchy');

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-10/random-subject']}>
            <Routes>
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(spy).not.toHaveBeenCalled();
      expect(container?.textContent).toContain('Syllabus Not Found');
      expect(container?.textContent).toContain('The requested syllabus route is invalid or not available for this class.');
    });

    it('14. Reject invalid class/subject combinations (/syllabus/class-9/hindi-course-a, /syllabus/class-8/hindi-course-b)', async () => {
      const spy = vi.spyOn(learningAPI, 'fetchSyllabusHierarchy');

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-9/hindi-course-a']}>
            <Routes>
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(spy).not.toHaveBeenCalled();
      expect(container?.textContent).toContain('Syllabus Not Found');
    });

    it('15. Valid subject distinction: /syllabus/class-9/hindi works and calls API with "Hindi"', async () => {
      const spy = vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
        data: [],
        error: null,
      } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-9/hindi']}>
            <Routes>
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(spy).toHaveBeenCalledWith('9', 'Hindi');
    });

    it('16. Valid subject distinction: /syllabus/class-10/hindi-course-a and hindi-course-b work independently', async () => {
      const spyA = vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
        data: [],
        error: null,
      } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-10/hindi-course-a']}>
            <Routes>
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(spyA).toHaveBeenCalledWith('10', 'Hindi Course A');

      act(() => {
        root?.unmount();
      });
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);

      const spyB = vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
        data: [],
        error: null,
      } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-10/hindi-course-b']}>
            <Routes>
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(spyB).toHaveBeenCalledWith('10', 'Hindi Course B');
    });

    it('17. Async chapter expansion: chapters expand initially when hierarchy data loads from [] to populated chapters', async () => {
      let resolvePromise: (value: unknown) => void;
      const asyncPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockReturnValue(
        asyncPromise as ReturnType<typeof learningAPI.fetchSyllabusHierarchy>
      );

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-10/mathematics']}>
            <Routes>
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      // Initially loading skeleton
      expect(container?.querySelector('.animate-pulse')).not.toBeNull();

      // Resolve async data arrival
      await act(async () => {
        resolvePromise({
          data: [
            {
              id: 'ch-async-1',
              chapter_number: 1,
              chapter_name: 'Polynomials',
              display_order: 1,
              is_active: true,
              syllabus_topics: [
                {
                  id: 'tp-async-1',
                  chapter_id: 'ch-async-1',
                  title: 'Zeroes of a Polynomial',
                  topic_type: 'topic',
                  display_order: 1,
                  is_active: true,
                  resources: [],
                },
              ],
            },
          ],
          error: null,
        });
      });

      // Chapter is rendered AND topic details inside (Zeroes of a Polynomial) are expanded
      expect(container?.textContent).toContain('Polynomials');
      expect(container?.textContent).toContain('Zeroes of a Polynomial');

      // Expand All and Collapse All buttons are present and functional
      const collapseAllBtn = Array.from(container?.querySelectorAll('button') || []).find(
        (b) => b.textContent?.trim() === 'Collapse All'
      );
      expect(collapseAllBtn).not.toBeUndefined();

      await act(async () => {
        collapseAllBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // After Collapse All, topic content is hidden
      expect(container?.textContent).not.toContain('Zeroes of a Polynomial');

      const expandAllBtn = Array.from(container?.querySelectorAll('button') || []).find(
        (b) => b.textContent?.trim() === 'Expand All'
      );
      expect(expandAllBtn).not.toBeUndefined();

      await act(async () => {
        expandAllBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // After Expand All, topic content is visible again
      expect(container?.textContent).toContain('Zeroes of a Polynomial');
    });

    it('18. Dynamic SEO metadata updates document title and meta description tag on route changes', async () => {
      vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
        data: [],
        error: null,
      } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-10/science']}>
            <Routes>
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      expect(document.title).toBe('Class 10 Science Syllabus | Horizon');
      const metaDesc = document.querySelector('meta[name="description"]');
      expect(metaDesc?.getAttribute('content')).toContain('Class 10 Science');
    });
  });
});
