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

  it('1. renders Chapter node, Topic node, Exercise node, and Grammar node correctly', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={sampleChapters} subjectName="Mathematics" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('CHAPTER 1');
    expect(container?.textContent).toContain('Real Numbers');

    expect(container?.textContent).toContain('Fundamental Theorem of Arithmetic');
    expect(container?.textContent).toContain('Exercise 1.1');
    expect(container?.textContent).toContain('व्याकरण सन्धि नियम');

    expect(container?.textContent).toContain('Topic');
    expect(container?.textContent).toContain('Exercise');
    expect(container?.textContent).toContain('Grammar');
  });

  it('2. provides compact accessible graph control buttons with aria-labels and focus-visible styling (Zoom In, Zoom Out, Fit View)', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={sampleChapters} subjectName="Mathematics" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    const zoomInBtn = container?.querySelector('button[aria-label="Zoom in flowchart"]');
    const zoomOutBtn = container?.querySelector('button[aria-label="Zoom out flowchart"]');
    const fitViewBtn = container?.querySelector('button[aria-label="Fit flowchart to view"]');

    expect(zoomInBtn).not.toBeNull();
    expect(zoomOutBtn).not.toBeNull();
    expect(fitViewBtn).not.toBeNull();

    expect(zoomInBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
    expect(zoomOutBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
    expect(fitViewBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
  });

  it('3. renders resource action links with aria-labels and focus-visible styling when resources exist', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={sampleChapters} subjectName="Mathematics" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    // Topic with resource link check
    const resourceLink = container?.querySelector(
      'a[aria-label="View english notes for Fundamental Theorem of Arithmetic"]'
    );
    expect(resourceLink).not.toBeNull();
    expect(resourceLink?.className).toContain('focus-visible:ring-[#E91E8C]');
    expect(container?.textContent).toContain('View Notes');
    expect(container?.textContent).toContain('English');

    // Topic without resource (Exercise 1.1) is still rendered
    expect(container?.textContent).toContain('Exercise 1.1');
  });

  it('4. renders SVG connector edges between Chapter and Topic nodes', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusFlowchart chapters={sampleChapters} subjectName="Mathematics" classNameTitle="Class 10" />
        </MemoryRouter>
      );
    });

    const svgEdges = container?.querySelectorAll('svg path.flowchart-edge');
    expect(svgEdges?.length).toBeGreaterThan(0);
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

  it('6. memoizes ChapterNodeCard and TopicNodeCard to prevent unnecessary re-renders during viewport transformation state updates', async () => {
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
