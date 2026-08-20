import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
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

describe('Home Ad trigger behavior', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let observerCallback: IntersectionObserverCallback | null = null;
  let observeMock: Mock<(target: Element) => void>;
  let disconnectMock: Mock<() => void>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.adsbygoogle = [];

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

    observeMock = vi.fn();
    disconnectMock = vi.fn();
    observerCallback = null;

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];
      readonly scrollMargin: string = '';

      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }

      observe(target: Element) {
        observeMock(target);
      }
      unobserve() {}
      disconnect() {
        disconnectMock();
      }
      takeRecords() {
        return [];
      }
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
    delete window.adsbygoogle;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not render or initialize HomeAd before Feature Cards enters viewport', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });

    const homeAd = container?.querySelector('ins.adsbygoogle[data-ad-slot="5844481863"]');
    expect(homeAd).toBeNull();
    expect(window.adsbygoogle?.length).toBe(0);
    expect(observeMock).toHaveBeenCalled();
  });

  it('renders and initializes HomeAd when Feature Cards enters viewport', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });

    expect(observerCallback).not.toBeNull();

    // Simulate Feature Cards section entering viewport
    act(() => {
      if (observerCallback) {
        observerCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      }
    });

    const homeAd = container?.querySelector('ins.adsbygoogle[data-ad-slot="5844481863"]');
    expect(homeAd).not.toBeNull();
    expect(window.adsbygoogle?.length).toBe(1);
    expect(disconnectMock).toHaveBeenCalled();
  });
});
