import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RenderingScreen from '../RenderingScreen';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('RenderingScreen', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
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
    vi.restoreAllMocks();
  });

  it('renders Notes variant copy correctly', () => {
    act(() => {
      root?.render(
        <RenderingScreen
          variant="notes"
          classLabel="Class 10"
          subjectLabel="Science"
          stage="downloading"
          loadedBytes={19293798} // 18.4 MB
          totalBytes={25794970}  // 24.6 MB
        />
      );
    });

    const titleEl = container?.querySelector('#title');
    expect(titleEl?.textContent).toBe('Getting your notes ready');

    const subtitleEl = container?.querySelector('#subtitle');
    expect(subtitleEl?.textContent).toBe('Class 10 · Science Notes');

    const h2El = container?.querySelector('#h2');
    expect(h2El?.textContent).toBe('Preparing your PDF');

    const sub2El = container?.querySelector('#sub2');
    expect(sub2El?.textContent).toBe('Your notes are on the way');

    const labelEl = container?.querySelector('#label');
    expect(labelEl?.textContent).toBe('Downloading notes...');

    const sizeLineEl = container?.querySelector('#sizeLine');
    expect(sizeLineEl?.textContent).toBe('18.4 MB of 24.6 MB');

    const infoEl = container?.querySelector('#info');
    expect(infoEl?.textContent).toBe('Larger notes may take a little longer.');
  });

  it('renders PYQ variant copy correctly with year and reserved hidden info space', () => {
    act(() => {
      root?.render(
        <RenderingScreen
          variant="pyq"
          classLabel="Class 10"
          subjectLabel="Science"
          year="2023"
          stage="downloading"
          loadedBytes={5242880}
          totalBytes={10485760}
        />
      );
    });

    const titleEl = container?.querySelector('#title');
    expect(titleEl?.textContent).toBe('Getting your paper ready');

    const subtitleEl = container?.querySelector('#subtitle');
    expect(subtitleEl?.textContent).toBe('Class 10 · Science PYQ 2023');

    const sub2El = container?.querySelector('#sub2');
    expect(sub2El?.textContent).toBe('Your paper is on the way');

    const labelEl = container?.querySelector('#label');
    expect(labelEl?.textContent).toBe('Downloading paper...');

    // Info line container should have visibility: hidden
    const infoContainer = container?.querySelector('#info')?.closest('g');
    expect(infoContainer?.getAttribute('style')).toContain('visibility: hidden');
  });

  it('renders size line for unknown totalBytes (Content-Length missing)', () => {
    act(() => {
      root?.render(
        <RenderingScreen
          variant="notes"
          classLabel="Class 10"
          subjectLabel="Science"
          stage="downloading"
          loadedBytes={10485760} // 10.0 MB
          totalBytes={null}
        />
      );
    });

    const sizeLineEl = container?.querySelector('#sizeLine');
    expect(sizeLineEl?.textContent).toBe('10.0 MB downloaded');
  });

  it('renders progressbar WAI-ARIA attributes correctly', () => {
    act(() => {
      root?.render(
        <RenderingScreen
          stage="downloading"
          loadedBytes={10485760}
          totalBytes={20971520}
        />
      );
    });

    const progressbar = container?.querySelector('[role="progressbar"]');
    expect(progressbar).not.toBeNull();
    expect(progressbar?.getAttribute('aria-label')).toBe('PDF loading progress');
    expect(progressbar?.getAttribute('aria-valuemin')).toBe('0');
    expect(progressbar?.getAttribute('aria-valuemax')).toBe('100');
  });

  it('triggers onFinished callback when stage is "ready" after hold and fade', () => {
    vi.useFakeTimers();
    const onFinished = vi.fn();

    act(() => {
      root?.render(<RenderingScreen stage="ready" onFinished={onFinished} />);
    });

    expect(onFinished).not.toHaveBeenCalled();

    // Fast-forward hold time (350ms) + fade time (250ms)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onFinished).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
