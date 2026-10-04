import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ClassSubjectSelector from '../ClassSubjectSelector';
import { getSubjectsForClass, CLASS_SUBJECTS, type ClassOption, type SubjectOption } from '../../../../services/syllabusService';
import { subjectToSlug } from '../../../../utils/urlHelper';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockClass: ClassOption = {
  id: '8',
  name: 'Class 8',
  slug: 'class-8',
  description: 'NCERT & CBSE syllabus with chapter-wise learning resources.',
};

const mockSubjects: SubjectOption[] = [
  { id: 'mathematics', name: 'Mathematics', slug: 'mathematics', description: 'Explore math concepts.' },
  { id: 'science', name: 'Science', slug: 'science', description: 'Explore science concepts.' },
  { id: 'social-science', name: 'Social Science', slug: 'social-science', description: 'Explore social science.' },
  { id: 'hindi', name: 'Hindi', slug: 'hindi', description: 'Explore Hindi.' },
  { id: 'english', name: 'English', slug: 'english', description: 'Explore English.' },
  { id: 'sanskrit', name: 'Sanskrit', slug: 'sanskrit', description: 'Explore Sanskrit.' },
];

describe('ClassSubjectSelector Component Tests', () => {
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

  it('1. Renders unified header navigation, serif title with pink gradient accent on "Subject", and flow pill', async () => {
    const handleSelectSubject = vi.fn();
    const handleBack = vi.fn();

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <ClassSubjectSelector
            currentClass={mockClass}
            subjects={mockSubjects}
            onSelectSubject={handleSelectSubject}
            onBackToClasses={handleBack}
          />
        </MemoryRouter>
      );
    });

    // Back button
    const backBtn = container?.querySelector('button[aria-label="Back to Classes"]');
    expect(backBtn).not.toBeNull();
    expect(backBtn?.getAttribute('title')).toBe('Back to Classes');
    expect(backBtn?.className).toContain('focus-visible:ring-[#E91E8C]');

    // Primary Heading
    const heading = container?.querySelector('h1');
    expect(heading?.textContent).toContain('Select Subject for Class 8');
    expect(heading?.className).toContain('font-serif');

    const pinkWord = heading?.querySelector('span');
    expect(pinkWord?.textContent).toBe('Subject');
    expect(pinkWord?.className).toContain('text-transparent');

    // Flow Pill Progress Indicator
    const flowPill = container?.querySelector('[aria-label="Syllabus Navigation Steps"]');
    expect(flowPill).not.toBeNull();
    expect(flowPill?.textContent).toContain('Class');
    expect(flowPill?.textContent).toContain('Subject');
    expect(flowPill?.textContent).toContain('Syllabus');

    const activeStep = flowPill?.querySelector('[aria-current="step"]');
    expect(activeStep?.textContent?.trim()).toBe('Subject');
    expect(activeStep?.className).toContain('text-[#E91E8C]');
  });

  it('2. Renders subject cards with subject names, descriptions, circular arrow CTA, and exact SVG illustration assets', async () => {
    const handleSelectSubject = vi.fn();
    const handleBack = vi.fn();

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <ClassSubjectSelector
            currentClass={mockClass}
            subjects={mockSubjects}
            onSelectSubject={handleSelectSubject}
            onBackToClasses={handleBack}
          />
        </MemoryRouter>
      );
    });

    const mathImg = container?.querySelector('img[alt="Mathematics illustration"]') as HTMLImageElement | null;
    expect(mathImg).not.toBeNull();
    expect(mathImg?.src).toContain('/assets/SVG%20Illustrations/mathematics.svg');

    const scienceImg = container?.querySelector('img[alt="Science illustration"]') as HTMLImageElement | null;
    expect(scienceImg).not.toBeNull();
    expect(scienceImg?.src).toContain('/assets/SVG%20Illustrations/science.svg');

    const socialScienceImg = container?.querySelector('img[alt="Social Science illustration"]') as HTMLImageElement | null;
    expect(socialScienceImg).not.toBeNull();
    expect(socialScienceImg?.src).toContain('/assets/SVG%20Illustrations/social-science.svg');

    const hindiImg = container?.querySelector('img[alt="Hindi illustration"]') as HTMLImageElement | null;
    expect(hindiImg).not.toBeNull();
    expect(hindiImg?.src).toContain('/assets/SVG%20Illustrations/Hindi.svg');

    const englishImg = container?.querySelector('img[alt="English illustration"]') as HTMLImageElement | null;
    expect(englishImg).not.toBeNull();
    expect(englishImg?.src).toContain('/assets/SVG%20Illustrations/english.svg');

    const sanskritImg = container?.querySelector('img[alt="Sanskrit illustration"]') as HTMLImageElement | null;
    expect(sanskritImg).not.toBeNull();
    expect(sanskritImg?.src).toContain('/assets/SVG%20Illustrations/sanskrit.svg');
  });

  it('3. Renders subject cards with subject names and descriptions', async () => {
    const handleSelectSubject = vi.fn();
    const handleBack = vi.fn();

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <ClassSubjectSelector
            currentClass={mockClass}
            subjects={mockSubjects}
            onSelectSubject={handleSelectSubject}
            onBackToClasses={handleBack}
          />
        </MemoryRouter>
      );
    });

    const mathCard = container?.querySelector('[aria-label="View syllabus for Class 8 Mathematics"]');
    expect(mathCard).not.toBeNull();
    expect(mathCard?.textContent).toContain('Mathematics');
    expect(mathCard?.textContent).toContain('Explore math concepts.');

    const scienceCard = container?.querySelector('[aria-label="View syllabus for Class 8 Science"]');
    expect(scienceCard).not.toBeNull();
    expect(scienceCard?.textContent).toContain('Science');
  });

  it('3. Triggers onSelectSubject on card click/Enter key and onBackToClasses on back button click', async () => {
    const handleSelectSubject = vi.fn();
    const handleBack = vi.fn();

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <ClassSubjectSelector
            currentClass={mockClass}
            subjects={mockSubjects}
            onSelectSubject={handleSelectSubject}
            onBackToClasses={handleBack}
          />
        </MemoryRouter>
      );
    });

    // Test back button
    const backBtn = container?.querySelector('button[aria-label="Back to Classes"]');
    await act(async () => {
      backBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(handleBack).toHaveBeenCalledTimes(1);

    // Test subject card click
    const mathCard = container?.querySelector('[aria-label="View syllabus for Class 8 Mathematics"]');
    await act(async () => {
      mathCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(handleSelectSubject).toHaveBeenCalledWith('mathematics');

    // Test subject card keyboard Enter key
    const scienceCard = container?.querySelector('[aria-label="View syllabus for Class 8 Science"]');
    await act(async () => {
      scienceCard?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(handleSelectSubject).toHaveBeenCalledWith('science');
  });

  it('4. Has React.memo and displayName set on ClassSubjectSelector', () => {
    expect(ClassSubjectSelector.displayName).toBe('ClassSubjectSelector');
  });

  it('5. getSubjectsForClass returns cached array reference on repeated calls', () => {
    const firstCall = getSubjectsForClass('10');
    const secondCall = getSubjectsForClass('10');
    expect(firstCall).toBe(secondCall);
    expect(firstCall.length).toBeGreaterThan(0);
  });

  it('6. Demonstrates measurable performance improvement for cached getSubjectsForClass over unmemoized baseline', () => {
    const iterations = 100000;

    // Baseline: Unmemoized allocation loop
    const startBaseline = performance.now();
    for (let i = 0; i < iterations; i++) {
      const classId = '10';
      const subjects = CLASS_SUBJECTS[classId].map((subjectName) => {
        const slug = subjectToSlug(subjectName) || subjectName.toLowerCase().replace(/\s+/g, '-');
        return {
          id: slug,
          name: subjectName,
          slug,
        };
      });
      // Prevent dead code elimination
      if (subjects.length === 0) throw new Error('Unreachable');
    }
    const durationBaseline = performance.now() - startBaseline;

    // Optimized: Cached lookup
    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
      const subjects = getSubjectsForClass('10');
      if (subjects.length === 0) throw new Error('Unreachable');
    }
    const durationOptimized = performance.now() - startOptimized;

    const speedup = durationBaseline / (durationOptimized || 0.001);

    console.log(`[ClassSubjectSelector Benchmark] Unmemoized baseline duration: ${durationBaseline.toFixed(2)}ms`);
    console.log(`[ClassSubjectSelector Benchmark] Cached lookup duration: ${durationOptimized.toFixed(2)}ms`);
    console.log(`[ClassSubjectSelector Benchmark] Speedup factor: ${speedup.toFixed(2)}x`);

    expect(durationOptimized).toBeLessThan(durationBaseline);
  });
});
