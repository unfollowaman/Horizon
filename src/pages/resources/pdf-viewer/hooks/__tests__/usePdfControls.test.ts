import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { usePdfControls } from '../usePdfControls';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ReturnOfUsePdfControls = ReturnType<typeof usePdfControls>;

interface TestComponentProps {
  numPages: number | null;
  pdfError: string | null;
  onUpdate: (controlsState: ReturnOfUsePdfControls) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ numPages, pdfError, onUpdate }) => {
  const controlsState = usePdfControls(numPages, pdfError);

  React.useEffect(() => {
    onUpdate(controlsState);
  }, [controlsState, onUpdate]);

  return null;
};

describe('usePdfControls hook', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes with controls shown and menus closed, and does not hide when numPages is null or error exists', async () => {
    const stateRef: { current: ReturnOfUsePdfControls | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: null,
          pdfError: null,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    expect(stateRef.current?.showControls).toBe(true);
    expect(stateRef.current?.isMobileMenuOpen).toBe(false);
    expect(stateRef.current?.isThreeDotsMenuOpen).toBe(false);

    // Fast-forward timers - should not auto-hide since numPages is null
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(stateRef.current?.showControls).toBe(true);

    // Render with error
    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 10,
          pdfError: 'Failed to load PDF',
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    expect(stateRef.current?.showControls).toBe(true);
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(stateRef.current?.showControls).toBe(true);
  });

  it('automatically hides controls 5 seconds after PDF is loaded', async () => {
    const stateRef: { current: ReturnOfUsePdfControls | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 5,
          pdfError: null,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    expect(stateRef.current?.showControls).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(stateRef.current?.showControls).toBe(true);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(stateRef.current?.showControls).toBe(false);
  });

  it('resets auto-hide timer on handleInteraction and resetTimer calls', async () => {
    const stateRef: { current: ReturnOfUsePdfControls | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 5,
          pdfError: null,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(stateRef.current?.showControls).toBe(true);

    // Trigger handleInteraction to reset timer
    await act(async () => {
      stateRef.current?.handleInteraction();
    });

    // Advance 3 more seconds (6s total since start, but only 3s since reset)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(stateRef.current?.showControls).toBe(true);

    // Advance another 2.1 seconds (5.1s after reset)
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(stateRef.current?.showControls).toBe(false);

    // Call handleInteraction when controls are hidden
    await act(async () => {
      stateRef.current?.handleInteraction();
    });
    expect(stateRef.current?.showControls).toBe(true);
  });

  it('prevents auto-hiding when mobile menu or three dots menu is open', async () => {
    const stateRef: { current: ReturnOfUsePdfControls | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 5,
          pdfError: null,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    // Open mobile menu
    await act(async () => {
      stateRef.current?.setIsMobileMenuOpen(true);
    });

    expect(stateRef.current?.isMobileMenuOpen).toBe(true);

    // Fast-forward past 5 seconds
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(stateRef.current?.showControls).toBe(true);

    // Close mobile menu
    await act(async () => {
      stateRef.current?.setIsMobileMenuOpen(false);
    });

    // Fast-forward 5 seconds after closing
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(stateRef.current?.showControls).toBe(false);

    // Open three dots menu
    await act(async () => {
      stateRef.current?.setIsThreeDotsMenuOpen(true);
    });

    expect(stateRef.current?.isThreeDotsMenuOpen).toBe(true);
    expect(stateRef.current?.showControls).toBe(true);

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(stateRef.current?.showControls).toBe(true);
  });

  it('closes three dots menu when clicking outside wrapper', async () => {
    const stateRef: { current: ReturnOfUsePdfControls | null } = { current: null };

    // Setup wrapper DOM structure in test document
    const wrapper = document.createElement('div');
    wrapper.className = 'threeDotsWrapper';
    const insideButton = document.createElement('button');
    wrapper.appendChild(insideButton);
    const outsideButton = document.createElement('button');
    document.body.appendChild(wrapper);
    document.body.appendChild(outsideButton);

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 5,
          pdfError: null,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    await act(async () => {
      stateRef.current?.setIsThreeDotsMenuOpen(true);
    });
    expect(stateRef.current?.isThreeDotsMenuOpen).toBe(true);

    // Click inside wrapper
    await act(async () => {
      insideButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(stateRef.current?.isThreeDotsMenuOpen).toBe(true);

    // Click outside wrapper
    await act(async () => {
      outsideButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(stateRef.current?.isThreeDotsMenuOpen).toBe(false);

    // Clean up extra elements
    document.body.removeChild(wrapper);
    document.body.removeChild(outsideButton);
  });
});
