import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SyllabusFlowchart from '../SyllabusFlowchart';
import type { SyllabusChapterHierarchy } from '../../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('S6 SyllabusFlowchart Component Tests', () => {
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

  const sampleChapters: SyllabusChapterHierarchy[] = [
    {
      id: 'ch-10-1',
      chapter_number: 1,
      chapter_name: 'Real Numbers',
      display_order: 1,
      is_active: true,
      syllabus_topics: [
        {
          id: 'tp-10-1-1',
          chapter_id: 'ch-10-1',
          title: 'Fundamental Theorem of Arithmetic',
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
          id: 'tp-10-1-2',
          chapter_id: 'ch-10-1',
          title: 'Exercise 1.1',
          topic_type: 'exercise',
          display_order: 2,
          is_active: true,
          resources: [],
        },
        {
          id: 'tp-10-1-3',
          chapter_id: 'ch-10-1',
          title: 'व्याकरण सन्धि नियम',
          topic_type: 'grammar',
          display_order: 3,
          is_active: true,
          resources: [],
        },
      ],
    },
  ];

  const literatureChapters: SyllabusChapterHierarchy[] = [
    {
      id: 'ch-eng-1',
      chapter_number: 1,
      chapter_name: 'A Letter to God',
      display_order: 1,
      is_active: true,
      syllabus_topics: [],
    },
    {
      id: 'ch-eng-2',
      chapter_number: 2,
      chapter_name: 'Nelson Mandela: Long Walk to Freedom',
      display_order: 2,
      is_active: true,
      syllabus_topics: [],
    },
  ];

  it('1. renders Subject Identity Hero Banner with step progress indicator and total chapter count', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={sampleChapters} subjectName="Mathematics" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Class 10 — Mathematics Roadmap');
    expect(container?.textContent).toContain('Syllabus');
    expect(container?.textContent).toContain('1 Chapter');
  });

  it('2. renders Structure B (Chapter + Topics) closed by default and expands/collapses on toggle', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={sampleChapters} subjectName="Mathematics" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('CHAPTER 1');
    expect(container?.textContent).toContain('Real Numbers');
    expect(container?.textContent).toContain('3 Topics');

    // Sub-topics should be closed by default initially
    expect(container?.textContent).not.toContain('Fundamental Theorem of Arithmetic');
    expect(container?.textContent).not.toContain('Exercise 1.1');

    const toggleButton = container?.querySelector(
      'button[aria-label="Toggle topics for Chapter 1: Real Numbers"]'
    ) as HTMLButtonElement | null;
    expect(toggleButton).not.toBeNull();
    expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');

    // Expand sub-topics by tapping/clicking chapter tile
    await act(async () => {
      toggleButton?.click();
    });

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true');
    expect(container?.textContent).toContain('Fundamental Theorem of Arithmetic');
    expect(container?.textContent).toContain('Exercise 1.1');
    expect(container?.textContent).toContain('व्याकरण सन्धि नियम');

    // Collapse sub-topics by tapping/clicking again
    await act(async () => {
      toggleButton?.click();
    });

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('false');
    expect(container?.textContent).not.toContain('Fundamental Theorem of Arithmetic');
  });

  it('3. renders Structure A (Chapter-Only sequence) for literature subjects without artificial topics', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={literatureChapters} subjectName="English" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('CHAPTER 1');
    expect(container?.textContent).toContain('A Letter to God');
    expect(container?.textContent).toContain('CHAPTER 2');
    expect(container?.textContent).toContain('Nelson Mandela');
    expect(container?.textContent).toContain('Chapter Overview');
    expect(container?.textContent).not.toContain('Reading Comprehension');
  });

  it('4. renders resource action links with aria-labels and focus-visible styling when expanded', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={sampleChapters} subjectName="Mathematics" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    const toggleButton = container?.querySelector(
      'button[aria-label="Toggle topics for Chapter 1: Real Numbers"]'
    ) as HTMLButtonElement | null;

    await act(async () => {
      toggleButton?.click();
    });

    const resourceLink = container?.querySelector(
      'a[aria-label="View English notes for Fundamental Theorem of Arithmetic"]'
    );
    expect(resourceLink).not.toBeNull();
    expect(resourceLink?.className).toContain('focus-visible:ring-[#E91E8C]');
    expect(container?.textContent).toContain('View Notes');
    expect(container?.textContent).toContain('English');
  });

  it('5. renders empty state cleanly when chapters array is empty', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={[]} subjectName="Mathematics" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('No Syllabus Found');
    expect(container?.textContent).toContain('Syllabus data is currently not available');
  });

  it('6. updates correctly when parent component state triggers re-render', async () => {
    let parentRenderCount = 0;

    const TestParentWrapper = () => {
      const [, setCounter] = useState(0);
      parentRenderCount++;
      return (
        <div>
          <button onClick={() => setCounter((c) => c + 1)}>Force Parent Render</button>
          <SyllabusFlowchart chapters={sampleChapters} subjectName="Mathematics" classNameTitle="Class 10" />
        </div>
      );
    };

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <TestParentWrapper />
        </MemoryRouter>
      );
    });

    expect(parentRenderCount).toBe(1);
    expect(container?.textContent).toContain('CHAPTER 1');

    const btn = container?.querySelector('button');
    await act(async () => {
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(parentRenderCount).toBe(2);
    expect(container?.textContent).toContain('CHAPTER 1');
  });
});
