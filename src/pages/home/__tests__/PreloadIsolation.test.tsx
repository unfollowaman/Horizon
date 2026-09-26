import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    session: null,
    user: null,
    profile: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

describe('Preload Isolation & Mobile Touch Behavior', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    window.matchMedia = window.matchMedia || vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];
      readonly scrollMargin: string = '';

      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders feature card navigation links for library, notes, and syllabus', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });

    const libraryLink = container?.querySelector('a[href="/library"]');
    const notesLink = container?.querySelector('a[href="/notes"]');
    const syllabusLink = container?.querySelector('a[href="/syllabus/"]');

    expect(libraryLink).not.toBeNull();
    expect(notesLink).not.toBeNull();
    expect(syllabusLink).not.toBeNull();
  });

  it('safely handles mouseenter preload triggers without throwing unhandled rejections', async () => {
    let unhandledRejectionOccurred = false;
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      unhandledRejectionOccurred = true;
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });

    const libraryCard = container?.querySelector('a[href="/library"]')?.closest('div');
    const notesCard = container?.querySelector('a[href="/notes"]')?.closest('div');

    expect(libraryCard).not.toBeNull();
    expect(notesCard).not.toBeNull();

    // Trigger mouseEnter on feature cards
    await act(async () => {
      libraryCard?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      notesCard?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    // Small delay to allow any unhandled promise rejections to flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    expect(unhandledRejectionOccurred).toBe(false);
  });

  it('does not trigger preloads on touchstart events on mobile', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });

    const libraryCard = container?.querySelector('a[href="/library"]')?.closest('div');
    expect(libraryCard).not.toBeNull();

    // Fire touchstart on card
    let touchEventHandled = false;
    await act(async () => {
      const touchEvent = new Event('touchstart', { bubbles: true });
      libraryCard?.dispatchEvent(touchEvent);
      touchEventHandled = true;
    });

    expect(touchEventHandled).toBe(true);
  });
});
