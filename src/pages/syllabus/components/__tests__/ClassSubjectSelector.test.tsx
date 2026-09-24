import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ClassSubjectSelector from '../ClassSubjectSelector';
import type { ClassOption, SubjectOption } from '../../../../services/syllabusService';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockClass: ClassOption = {
  id: '8',
  name: 'Class 8',
  slug: 'class-8',
  description: 'NCERT & CBSE syllabus breakdown for Class 8 subjects.',
};

const mockSubjects: SubjectOption[] = [
  { id: 'mathematics', name: 'Mathematics', slug: 'mathematics', description: 'Explore math concepts.' },
  { id: 'science', name: 'Science', slug: 'science', description: 'Explore science concepts.' },
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
    expect(backBtn?.className).toContain('focus-visible:ring-2');

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

  it('2. Renders subject cards with class badges, subject names, descriptions, and CTA View buttons', async () => {
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
    expect(mathCard?.textContent).toContain('Class 8');
    expect(mathCard?.textContent).toContain('Mathematics');
    expect(mathCard?.textContent).toContain('Explore math concepts.');
    expect(mathCard?.textContent).toContain('View');

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
});
