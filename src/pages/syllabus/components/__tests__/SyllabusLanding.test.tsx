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
    expect(backButton?.getAttribute('title')).toBe('Go Back');
    expect(backButton?.className).toContain('focus-visible:ring-[#E91E8C]');

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

  it('renders horizontal class cards with SVG illustrations, class titles, descriptions, and circular arrow CTA', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusLanding classes={SUPPORTED_CLASSES} onSelectClass={() => {}} />
        </MemoryRouter>
      );
    });

    const classCards = container?.querySelectorAll('[role="button"]');
    expect(classCards?.length).toBe(3);

    expect(container?.textContent).toContain('Class 8th');
    expect(container?.textContent).toContain('Class 9th');
    expect(container?.textContent).toContain('Class 10th');

    // Confirm descriptions from SUPPORTED_CLASSES are rendered
    expect(container?.textContent).toContain('NCERT & CBSE syllabus with chapter-wise learning resources.');

    // Confirm circular class number badges and subject/chapter counts are NOT rendered on front-end cards
    expect(container?.textContent).not.toContain('08');
    expect(container?.textContent).not.toContain('09');
    expect(container?.textContent).not.toContain('6 Subjects');
    expect(container?.textContent).not.toContain('7 Subjects');
    expect(container?.textContent).not.toContain('Chapters');
  });

  it('renders exact SVG illustration assets for Class 8, Class 9, and Class 10 with accessible alt text', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusLanding classes={SUPPORTED_CLASSES} onSelectClass={() => {}} />
        </MemoryRouter>
      );
    });

    const class8Img = container?.querySelector('img[alt="Class 8 illustration"]') as HTMLImageElement | null;
    expect(class8Img).not.toBeNull();
    expect(class8Img?.src).toContain('/assets/SVG%20Illustrations/class-8.svg');

    const class9Img = container?.querySelector('img[alt="Class 9 illustration"]') as HTMLImageElement | null;
    expect(class9Img).not.toBeNull();
    expect(class9Img?.src).toContain('/assets/SVG%20Illustrations/class-9.svg');

    const class10Img = container?.querySelector('img[alt="Class 10 illustration"]') as HTMLImageElement | null;
    expect(class10Img).not.toBeNull();
    expect(class10Img?.src).toContain('/assets/SVG%20Illustrations/class-10.svg');
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

    const class8Card = container?.querySelector('[aria-label="View Class 8th syllabus"]');
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

  it('applies 3D reveal animation classes, staggered delays, double rAF trigger, and resets will-change on transition end', () => {
    let rafCallbacks: FrameRequestCallback[] = [];
    const origRequestAnimationFrame = window.requestAnimationFrame;
    const origCancelAnimationFrame = window.cancelAnimationFrame;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      rafCallbacks = [];
    });

    try {
      act(() => {
        root?.render(
          <MemoryRouter>
            <SyllabusLanding classes={SUPPORTED_CLASSES} onSelectClass={() => {}} />
          </MemoryRouter>
        );
      });

      const cards = container?.querySelectorAll('[role="button"]') as NodeListOf<HTMLDivElement>;
      expect(cards.length).toBe(3);

      // Initially on first frame, represents hidden state (isVisible is false)
      expect(cards[0].className).not.toContain('isVisible');

      // Stagger delays
      expect(cards[0].style.transitionDelay).toBe('0ms');
      expect(cards[1].style.transitionDelay).toBe('120ms');
      expect(cards[2].style.transitionDelay).toBe('240ms');

      // Initial willChange style
      expect(cards[0].style.willChange).toBe('transform, opacity');

      // Flush double rAF
      act(() => {
        while (rafCallbacks.length > 0) {
          const cb = rafCallbacks.shift();
          cb?.(performance.now());
        }
      });

      // Now isVisible is true
      expect(cards[0].className).toContain('isVisible');

      // Dispatch transitionend with propertyName 'transform' on first tile
      act(() => {
        const event = new Event('transitionend', { bubbles: true }) as TransitionEvent;
        Object.defineProperty(event, 'propertyName', { value: 'transform' });
        cards[0].dispatchEvent(event);
      });

      // Confirms willChange reset to auto for completed tile
      expect(cards[0].style.willChange).toBe('auto');
      expect(cards[1].style.willChange).toBe('transform, opacity');
    } finally {
      window.requestAnimationFrame = origRequestAnimationFrame;
      window.cancelAnimationFrame = origCancelAnimationFrame;
    }
  });
});
