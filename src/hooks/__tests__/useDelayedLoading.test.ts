import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useDelayedLoading } from '../useDelayedLoading';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface TestComponentProps {
  isLoading: boolean;
  delayMs?: number;
  onUpdate: (value: boolean) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ isLoading, delayMs, onUpdate }) => {
  const result = useDelayedLoading(isLoading, delayMs);
  React.useEffect(() => {
    onUpdate(result);
  }, [result, onUpdate]);
  return null;
};

describe('useDelayedLoading', () => {
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
    vi.useRealTimers();
  });

  it('returns false initially and stays false when isLoading is false', () => {
    let latestResult = true;

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          isLoading: false,
          onUpdate: (val) => {
            latestResult = val;
          },
        })
      );
    });

    expect(latestResult).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(latestResult).toBe(false);
  });

  it('returns false initially, then turns true after default delay (250ms) when isLoading is true', () => {
    let latestResult = true;

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          isLoading: true,
          onUpdate: (val) => {
            latestResult = val;
          },
        })
      );
    });

    // Initially false before delay
    expect(latestResult).toBe(false);

    // Advance time by 249ms (still false)
    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(latestResult).toBe(false);

    // Advance time by 1ms (total 250ms elapsed) -> becomes true
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(latestResult).toBe(true);
  });

  it('respects a custom delayMs parameter', () => {
    let latestResult = true;

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          isLoading: true,
          delayMs: 500,
          onUpdate: (val) => {
            latestResult = val;
          },
        })
      );
    });

    expect(latestResult).toBe(false);

    // At 250ms, should still be false
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(latestResult).toBe(false);

    // At 500ms, should become true
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(latestResult).toBe(true);
  });

  it('does not set loading to true if isLoading becomes false before delayMs', () => {
    let latestResult = false;

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          isLoading: true,
          onUpdate: (val) => {
            latestResult = val;
          },
        })
      );
    });

    expect(latestResult).toBe(false);

    // Advance time 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(latestResult).toBe(false);

    // Re-render with isLoading = false before 250ms
    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          isLoading: false,
          onUpdate: (val) => {
            latestResult = val;
          },
        })
      );
    });

    // Advance remaining time past 250ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(latestResult).toBe(false);
  });

  it('resets to false immediately when isLoading transitions from true to false after delay', () => {
    let latestResult = false;

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          isLoading: true,
          onUpdate: (val) => {
            latestResult = val;
          },
        })
      );
    });

    // Elapse delay so loading is true
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(latestResult).toBe(true);

    // Transition isLoading to false
    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          isLoading: false,
          onUpdate: (val) => {
            latestResult = val;
          },
        })
      );
    });

    expect(latestResult).toBe(false);
  });

  it('cleans up timeout on component unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          isLoading: true,
          onUpdate: () => {},
        })
      );
    });

    expect(clearTimeoutSpy).not.toHaveBeenCalled();

    act(() => {
      root?.unmount();
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
