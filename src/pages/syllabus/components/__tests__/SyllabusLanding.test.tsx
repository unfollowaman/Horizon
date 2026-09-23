import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SyllabusLanding from '../SyllabusLanding';
import { SUPPORTED_CLASSES } from '../../../../services/syllabusService';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SyllabusLanding', () => {
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

  it('renders top navigation buttons, title, simplified step indicator, and bottom motivational section', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusLanding classes={SUPPORTED_CLASSES} onSelectClass={() => {}} />
        </MemoryRouter>
      );
    });

    const backButton = container?.querySelector('button[aria-label="Go Back"]');
    expect(backButton).not.toBeNull();

    expect(container?.textContent).toContain('Choose Your Class');
    expect(container?.textContent).toContain('Class');
    expect(container?.textContent).toContain('Subject');
    expect(container?.textContent).toContain('Syllabus');
    expect(container?.textContent).toContain('Master Your NCERT & Board Curriculum');

    const stepIndicator = container?.querySelector('ol');
    expect(stepIndicator?.textContent).not.toContain('01');
    expect(stepIndicator?.textContent).not.toContain('02');
    expect(stepIndicator?.textContent).not.toContain('03');
  });

  it('renders class cards with prominent class numbers, derived subject counts, and CTA', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusLanding classes={SUPPORTED_CLASSES} onSelectClass={() => {}} />
        </MemoryRouter>
      );
    });

    const buttons = container?.querySelectorAll('[role="button"]');
    expect(buttons?.length).toBe(3);

    expect(container?.textContent).toContain('08');
    expect(container?.textContent).toContain('09');
    expect(container?.textContent).toContain('10');
    expect(container?.textContent).toContain('Class 8');
    expect(container?.textContent).toContain('Class 9');
    expect(container?.textContent).toContain('Class 10');
    expect(container?.textContent).toContain('6 Subjects');
    expect(container?.textContent).toContain('7 Subjects');
    expect(container?.textContent).toContain('View Subjects');
  });

  it('displays database chapter counts with document icons when provided', () => {
    const chapterCounts = { '8': 38, '9': 40, '10': 45 };
    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusLanding
            classes={SUPPORTED_CLASSES}
            chapterCounts={chapterCounts}
            onSelectClass={() => {}}
          />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('38 Chapters');
    expect(container?.textContent).toContain('40 Chapters');
    expect(container?.textContent).toContain('45 Chapters');
  });

  it('shows loading state when countsLoading is true', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusLanding
            classes={SUPPORTED_CLASSES}
            countsLoading={true}
            onSelectClass={() => {}}
          />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Loading chapters...');
  });

  it('triggers onSelectClass callback on click and keyboard enter', () => {
    const handleSelectClass = vi.fn();
    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusLanding classes={SUPPORTED_CLASSES} onSelectClass={handleSelectClass} />
        </MemoryRouter>
      );
    });

    const class8Card = container?.querySelector('[aria-label="Select Class 8"]');
    expect(class8Card).not.toBeNull();

    act(() => {
      class8Card?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(handleSelectClass).toHaveBeenCalledWith('class-8');

    act(() => {
      class8Card?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });
    expect(handleSelectClass).toHaveBeenCalledWith('class-8');
  });
});
