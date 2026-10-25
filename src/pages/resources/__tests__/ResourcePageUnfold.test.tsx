import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudyNotesRoute from '../StudyNotesRoute';
import LibraryRoute from '../LibraryRoute';
import * as learningResourcesAPI from '../../../services/learningResourcesAPI';
import type { Resource } from '../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    profile: { study_medium: 'English' },
    loading: false,
  }),
}));

const mockResources: Resource[] = [
  {
    id: 'res-1',
    title: 'Class 10 Science Notes - Chapter 1',
    resource_type: 'notes',
    student_class: 'Class 10',
    subject: 'Science',
    medium: 'English',
    pdfUrl: 'https://example.com/notes1.pdf',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'res-2',
    title: 'Class 10 Science Notes - Chapter 2',
    resource_type: 'notes',
    student_class: 'Class 10',
    subject: 'Science',
    medium: 'English',
    pdfUrl: 'https://example.com/notes2.pdf',
    created_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'res-3',
    title: 'Class 10 Mathematics Notes',
    resource_type: 'notes',
    student_class: 'Class 10',
    subject: 'Mathematics',
    medium: 'English',
    pdfUrl: 'https://example.com/notes3.pdf',
    created_at: '2026-01-03T00:00:00Z',
  },
];

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let mockObserverInstances: MockIntersectionObserver[] = [];

class MockIntersectionObserver {
  callback: ObserverCallback;
  options?: IntersectionObserverInit;
  observedElements: Set<Element> = new Set();

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    mockObserverInstances.push(this);
  }

  observe(element: Element) {
    this.observedElements.add(element);
  }

  unobserve(element: Element) {
    this.observedElements.delete(element);
  }

  disconnect() {
    this.observedElements.clear();
  }

  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(entries as IntersectionObserverEntry[]);
  }
}

describe('ResourcePage 3D Downward Unfold Animation', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    mockObserverInstances = [];

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    vi.spyOn(learningResourcesAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockResources,
      error: null,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('min-width: 768px') ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
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
    vi.restoreAllMocks();
  });

  it('1. Renders 3 dropdown wrappers and PDF cards with initial hidden unfold state and registers them with IntersectionObserver', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/notes']}>
          <Routes>
            <Route path="/notes" element={<StudyNotesRoute />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const dropdownClassWrapper = container?.querySelector('[data-unfold-id="dropdown-class"]');
    expect(dropdownClassWrapper).not.toBeNull();
    expect(dropdownClassWrapper?.className).toContain('unfoldHidden');

    expect(mockObserverInstances.length).toBeGreaterThan(0);
    const instance = mockObserverInstances[0];
    expect(instance.observedElements.size).toBeGreaterThanOrEqual(3);
  });

  it('2. Batches intersecting elements in DOM order and applies stagger transition delays up to 480ms cap', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/notes']}>
          <Routes>
            <Route path="/notes" element={<StudyNotesRoute />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const instance = mockObserverInstances[0];
    expect(instance).toBeDefined();

    const observed = Array.from(instance.observedElements);
    expect(observed.length).toBeGreaterThanOrEqual(3);

    const entries = observed.slice(0, 5).map((el, idx) => ({
      target: el,
      isIntersecting: true,
      boundingClientRect: { top: 100 + idx * 50, bottom: 150 + idx * 50 } as DOMRectReadOnly,
    }));

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    await act(async () => {
      instance.trigger(entries);
    });

    const firstElement = observed[0] as HTMLElement;
    const fifthElement = observed[4] as HTMLElement;

    expect(firstElement.className).toContain('unfoldVisible');
    expect(fifthElement.className).toContain('unfoldVisible');
    expect(fifthElement.style.transitionDelay).toBe('480ms');
  });

  it('3. Settles instantly without animation for elements above the viewport (scroll restored state)', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/notes']}>
          <Routes>
            <Route path="/notes" element={<StudyNotesRoute />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const instance = mockObserverInstances[0];
    const observed = Array.from(instance.observedElements);
    const aboveViewportElement = observed[0] as HTMLElement;

    await act(async () => {
      instance.trigger([
        {
          target: aboveViewportElement,
          isIntersecting: false,
          boundingClientRect: { top: -200, bottom: -50 } as DOMRectReadOnly,
        },
      ]);
    });

    expect(aboveViewportElement.className).toContain('unfoldSettled');
  });

  it('4. Applies settled class (transform: none) on transitionEnd of transform property', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/notes']}>
          <Routes>
            <Route path="/notes" element={<StudyNotesRoute />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const instance = mockObserverInstances[0];
    const observed = Array.from(instance.observedElements);
    const dropdownWrapper = observed[0] as HTMLElement;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    await act(async () => {
      instance.trigger([
        {
          target: dropdownWrapper,
          isIntersecting: true,
          boundingClientRect: { top: 50, bottom: 100 } as DOMRectReadOnly,
        },
      ]);
    });

    expect(dropdownWrapper.className).toContain('unfoldVisible');

    await act(async () => {
      const event = new Event('transitionend', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'propertyName', { value: 'transform' });
      dropdownWrapper.dispatchEvent(event);
    });

    expect(dropdownWrapper.className).toContain('unfoldSettled');
  });

  it('5. Settles immediately when prefers-reduced-motion is active', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce') ? true : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/notes']}>
          <Routes>
            <Route path="/notes" element={<StudyNotesRoute />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const dropdownClassWrapper = container?.querySelector('[data-unfold-id="dropdown-class"]');
    expect(dropdownClassWrapper?.className).toContain('unfoldSettled');
  });

  it('6. Executes safety fallback timer after 2.5s settling any unrevealed elements in viewport', async () => {
    vi.useFakeTimers();

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/library']}>
          <Routes>
            <Route path="/library" element={<LibraryRoute />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const instance = mockObserverInstances[0];
    const observed = Array.from(instance.observedElements);

    observed.forEach((el) => {
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 200,
        left: 0,
        right: 300,
        width: 300,
        height: 100,
        x: 0,
        y: 100,
        toJSON: () => {},
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(2600);
    });

    const dropdownWrapper = observed[0] as HTMLElement;
    expect(dropdownWrapper.className).toContain('unfoldSettled');

    vi.useRealTimers();
  });
});
