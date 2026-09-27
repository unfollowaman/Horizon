import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SyllabusHierarchyTree from '../SyllabusHierarchyTree';
import type { SyllabusChapterHierarchy } from '../../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockChapters: SyllabusChapterHierarchy[] = [
  {
    id: 'ch-1',
    student_class: 'Class 10',
    subject: 'Mathematics',
    chapter_number: 1,
    chapter_name: 'Real Numbers',
    display_order: 1,
    is_active: true,
    chapter_summary: 'Introduction to irrational numbers and fundamental theorem of arithmetic.',
    created_at: '2026-01-01T00:00:00Z',
    syllabus_topics: [
      {
        id: 'top-1',
        chapter_id: 'ch-1',
        title: 'Fundamental Theorem of Arithmetic',
        description: 'Every composite number can be expressed as a product of primes.',
        topic_type: 'topic',
        display_order: 1,
        is_active: true,
        resources: [
          {
            id: 'res-1',
            title: 'Real Numbers Notes (English)',
            resource_type: 'notes',
            medium: 'english',
            uploadDate: '2026-01-01',
            pdfUrl: 'https://example.com/real-numbers.pdf',
            thumbnailUrl: '',
          },
        ],
      },
    ],
  },
  {
    id: 'ch-2',
    student_class: 'Class 10',
    subject: 'Mathematics',
    chapter_number: 2,
    chapter_name: 'Polynomials',
    display_order: 2,
    is_active: true,
    chapter_summary: 'Zeroes of a polynomial and relationship between zeroes and coefficients.',
    created_at: '2026-01-01T00:00:00Z',
    syllabus_topics: [],
  },
];

describe('SyllabusHierarchyTree Accessibility & UX Tests', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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

  it('1. Renders header controls and chapter accordions with proper ARIA attributes', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusHierarchyTree
            chapters={mockChapters}
            subjectName="Mathematics"
            classNameTitle="Class 10"
          />
        </MemoryRouter>
      );
    });

    const expandAllBtn = container?.querySelector(
      'button[aria-label="Expand all chapters in Class 10 Mathematics syllabus"]'
    );
    expect(expandAllBtn).not.toBeNull();
    expect(expandAllBtn?.className).toContain('focus-visible:ring-offset-2');

    const collapseAllBtn = container?.querySelector(
      'button[aria-label="Collapse all chapters in Class 10 Mathematics syllabus"]'
    );
    expect(collapseAllBtn).not.toBeNull();
    expect(collapseAllBtn?.className).toContain('focus-visible:ring-offset-2');

    const chapter1Toggle = container?.querySelector('button[aria-expanded="true"]');
    expect(chapter1Toggle).not.toBeNull();
    expect(chapter1Toggle?.getAttribute('aria-label')).toBe('Collapse Chapter 1: Real Numbers');
    expect(chapter1Toggle?.className).toContain('focus-visible:ring-offset-2');
  });

  it('2. Dynamically updates aria-label and accordion content on toggle', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusHierarchyTree
            chapters={mockChapters}
            subjectName="Mathematics"
            classNameTitle="Class 10"
          />
        </MemoryRouter>
      );
    });

    const chapter1Toggle = container?.querySelector(
      'button[aria-label="Collapse Chapter 1: Real Numbers"]'
    ) as HTMLButtonElement;
    expect(chapter1Toggle).not.toBeNull();

    // Click to collapse
    await act(async () => {
      chapter1Toggle.click();
    });

    expect(chapter1Toggle.getAttribute('aria-expanded')).toBe('false');
    expect(chapter1Toggle.getAttribute('aria-label')).toBe('Expand Chapter 1: Real Numbers');

    // Click to expand again
    await act(async () => {
      chapter1Toggle.click();
    });

    expect(chapter1Toggle.getAttribute('aria-expanded')).toBe('true');
    expect(chapter1Toggle.getAttribute('aria-label')).toBe('Collapse Chapter 1: Real Numbers');
  });

  it('3. Expand All and Collapse All buttons toggle all chapter accordions', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusHierarchyTree
            chapters={mockChapters}
            subjectName="Mathematics"
            classNameTitle="Class 10"
          />
        </MemoryRouter>
      );
    });

    const collapseAllBtn = container?.querySelector(
      'button[aria-label="Collapse all chapters in Class 10 Mathematics syllabus"]'
    ) as HTMLButtonElement;
    const expandAllBtn = container?.querySelector(
      'button[aria-label="Expand all chapters in Class 10 Mathematics syllabus"]'
    ) as HTMLButtonElement;

    // Collapse All
    await act(async () => {
      collapseAllBtn.click();
    });

    const collapsedToggles = container?.querySelectorAll('button[aria-expanded="false"]');
    expect(collapsedToggles?.length).toBe(2);

    // Expand All
    await act(async () => {
      expandAllBtn.click();
    });

    const expandedToggles = container?.querySelectorAll('button[aria-expanded="true"]');
    expect(expandedToggles?.length).toBe(2);
  });
});
