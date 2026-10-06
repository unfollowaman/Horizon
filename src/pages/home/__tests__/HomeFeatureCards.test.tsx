import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Home Feature Cards', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
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

  it('renders Syllabus, Study Notes, and PYQ Papers cards with SVG illustrations and circular arrow buttons', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });

    const syllabusImg = container?.querySelector('img[src="/assets/SVG Illustrations/syllabus.svg"]');
    expect(syllabusImg).not.toBeNull();
    expect(syllabusImg?.getAttribute('alt')).toBe('Syllabus illustration');

    const notesImg = container?.querySelector('img[src="/assets/SVG Illustrations/notes.svg"]');
    expect(notesImg).not.toBeNull();
    expect(notesImg?.getAttribute('alt')).toBe('Study Notes illustration');

    const pyqsImg = container?.querySelector('img[src="/assets/SVG Illustrations/pyqs.svg"]');
    expect(pyqsImg).not.toBeNull();
    expect(pyqsImg?.getAttribute('alt')).toBe('PYQ Papers illustration');

    const syllabusLink = container?.querySelector('a[href="/syllabus/"]');
    expect(syllabusLink).not.toBeNull();

    const notesLink = container?.querySelector('a[href="/notes"]');
    expect(notesLink).not.toBeNull();

    const pyqLink = container?.querySelector('a[href="/library"]');
    expect(pyqLink).not.toBeNull();
  });
});
