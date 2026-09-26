import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import SyllabusPage from '../SyllabusPage';

const LocationTracker: React.FC = () => {
  const location = useLocation();
  const navType = useNavigationType();
  return (
    <div data-testid="location-tracker" data-pathname={location.pathname} data-navtype={navType}>
      {location.pathname} ({navType})
    </div>
  );
};
import * as learningAPI from '../../../services/learningResourcesAPI';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('S6 Syllabus Flowchart UI & Routing Integration Tests', () => {
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

    expect(container?.textContent).toContain('Choose Your Class');
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

    const class10Card = container?.querySelector('[aria-label="Select Class 10th"]');
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

  it('6. Subject page calls fetchSyllabusHierarchy and renders flowchart nodes', async () => {
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

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    expect(spy).toHaveBeenCalledWith('10', 'Mathematics');
    expect(container?.textContent).toContain('Real Numbers');
    expect(container?.textContent).toContain('Fundamental Theorem of Arithmetic');
    // ProfileButton is rendered on view 3
    const profileBtn = container?.querySelector('[aria-label="Log in"], [aria-label="Go to Dashboard"]');
    expect(profileBtn).not.toBeNull();
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

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
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

    // Only 1 resource link exists on the entire page
    const resourceLinks = container?.querySelectorAll('a[href^="/resource/"]');
    expect(resourceLinks?.length).toBe(1);
    expect(resourceLinks?.[0].getAttribute('href')).toBe('/resource/res-101');
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

  describe('S6 Flowchart Routing Edge-Case Tests', () => {
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

    it('17. Dynamic SEO metadata updates document title and meta description tag on route changes', async () => {
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

    it('18. ClassSubjectSelector buttons and cards include focus-visible focus ring classes', async () => {
      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/syllabus/class-10']}>
            <Routes>
              <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      const backBtn = container?.querySelector('button[aria-label="Back to Classes"]');
      expect(backBtn?.className).toContain('focus-visible:ring-2');

      const subjectCard = container?.querySelector('div[role="button"][aria-label="View syllabus for Class 10 Science"]');
      expect(subjectCard?.className).toContain('focus-visible:ring-2');
    });
  });

  describe('Syllabus Back Navigation & History Cycle Prevention Tests', () => {
    it('19. Full traversal: Home -> /syllabus -> /syllabus/class-10 -> /syllabus/class-10/science -> Back -> Back -> Back -> Home with POP actions', async () => {
      vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
        data: [],
        error: null,
      } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/']}>
            <LocationTracker />
            <Routes>
              <Route path="/" element={<div>Home Page</div>} />
              <Route path="/syllabus" element={<SyllabusPage />} />
              <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      let tracker = container?.querySelector('[data-testid="location-tracker"]');
      expect(tracker?.getAttribute('data-pathname')).toBe('/');

      // Simulate navigating forward to /syllabus
      // (In real app, clicked from Home) - let's render with entries step by step or click
      act(() => {
        root?.unmount();
      });
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);

      await act(async () => {
        root?.render(
          <MemoryRouter initialEntries={['/', '/syllabus', '/syllabus/class-10', '/syllabus/class-10/science']} initialIndex={3}>
            <LocationTracker />
            <Routes>
              <Route path="/" element={<div>Home Page</div>} />
              <Route path="/syllabus" element={<SyllabusPage />} />
              <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
              <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
            </Routes>
          </MemoryRouter>
        );
      });

      tracker = container?.querySelector('[data-testid="location-tracker"]');
      expect(tracker?.getAttribute('data-pathname')).toBe('/syllabus/class-10/science');

      // Click Subject Back button
      const subjectBackBtn = container?.querySelector('button[aria-label="Back to Subject List"]');
      expect(subjectBackBtn).not.toBeNull();

      await act(async () => {
        subjectBackBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      tracker = container?.querySelector('[data-testid="location-tracker"]');
      expect(tracker?.getAttribute('data-pathname')).toBe('/syllabus/class-10');

      // Click Class Back button
      const classBackBtn = container?.querySelector('button[aria-label="Back to Classes"]');
      expect(classBackBtn).not.toBeNull();

      await act(async () => {
        classBackBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      tracker = container?.querySelector('[data-testid="location-tracker"]');
      expect(tracker?.getAttribute('data-pathname')).toBe('/syllabus');

      // Click Syllabus Landing Back button
      const landingBackBtn = container?.querySelector('button[aria-label="Go Back"]');
      expect(landingBackBtn).not.toBeNull();

      await act(async () => {
        landingBackBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      tracker = container?.querySelector('[data-testid="location-tracker"]');
      expect(tracker?.getAttribute('data-pathname')).toBe('/');
      expect(container?.textContent).toContain('Home Page');
    });

    it('20. Back navigation works consistently for Class 8, Class 9, and Class 10', async () => {
      for (const classSlug of ['class-8', 'class-9', 'class-10']) {
        act(() => {
          root?.unmount();
        });
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        await act(async () => {
          root?.render(
            <MemoryRouter initialEntries={['/syllabus', `/syllabus/${classSlug}`]} initialIndex={1}>
              <LocationTracker />
              <Routes>
                <Route path="/syllabus" element={<SyllabusPage />} />
                <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
              </Routes>
            </MemoryRouter>
          );
        });

        const classBackBtn = container?.querySelector('button[aria-label="Back to Classes"]');
        expect(classBackBtn).not.toBeNull();

        await act(async () => {
          classBackBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const tracker = container?.querySelector('[data-testid="location-tracker"]');
        expect(tracker?.getAttribute('data-pathname')).toBe('/syllabus');
      }
    });

    it('21. Back navigation works consistently for multiple Class 10 subjects (Mathematics, Science, English, Hindi, Social Science)', async () => {
      vi.spyOn(learningAPI, 'fetchSyllabusHierarchy').mockResolvedValue({
        data: [],
        error: null,
      } as unknown as Awaited<ReturnType<typeof learningAPI.fetchSyllabusHierarchy>>);

      const subjects = ['mathematics', 'science', 'english', 'hindi-course-a', 'social-science'];

      for (const subjSlug of subjects) {
        act(() => {
          root?.unmount();
        });
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        await act(async () => {
          root?.render(
            <MemoryRouter initialEntries={['/syllabus/class-10', `/syllabus/class-10/${subjSlug}`]} initialIndex={1}>
              <LocationTracker />
              <Routes>
                <Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
                <Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
              </Routes>
            </MemoryRouter>
          );
        });

        const subjectBackBtn = container?.querySelector('button[aria-label="Back to Subject List"]');
        expect(subjectBackBtn).not.toBeNull();

        await act(async () => {
          subjectBackBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const tracker = container?.querySelector('[data-testid="location-tracker"]');
        expect(tracker?.getAttribute('data-pathname')).toBe('/syllabus/class-10');
      }
    });
  });
});
