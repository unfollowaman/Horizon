import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { usePdfSlider } from '../usePdfSlider';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface ReturnOfUsePdfSlider {
  isSliderVisible: boolean;
  isDraggingSlider: boolean;
  sliderTopPx: number;
  sliderContainerRef: React.RefObject<HTMLDivElement | null>;
  onSliderTouchStart: (e: React.TouchEvent) => void;
  onSliderTouchMove: (e: React.TouchEvent) => void;
  onSliderTouchEnd: () => void;
  onSliderMouseDown: (e: React.MouseEvent) => void;
  handleTransformed: (ref: { state: { positionX: number; positionY: number; scale: number } }) => void;
  handleScroll: () => void;
}

interface TestComponentProps {
  numPages: number | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  containerEl?: HTMLDivElement | null;
  scrollContainerEl?: HTMLDivElement | null;
  pageRefsArr?: (HTMLDivElement | null)[];
  onUpdate: (sliderState: ReturnOfUsePdfSlider) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({
  numPages,
  currentPage,
  setCurrentPage,
  containerEl = null,
  scrollContainerEl = null,
  pageRefsArr = [],
  onUpdate,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(containerEl);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(scrollContainerEl);
  const transformStateRef = React.useRef({ positionX: 0, positionY: 0, scale: 1 });
  const pageRefs = React.useRef<(HTMLDivElement | null)[]>(pageRefsArr);

  containerRef.current = containerEl;
  scrollContainerRef.current = scrollContainerEl;
  pageRefs.current = pageRefsArr;

  const sliderState = usePdfSlider({
    containerRef,
    scrollContainerRef,
    transformStateRef,
    pageRefs,
    numPages,
    currentPage,
    setCurrentPage,
  });

  React.useEffect(() => {
    onUpdate(sliderState);
  }, [sliderState, onUpdate]);

  return null;
};

describe('usePdfSlider hook', () => {
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

  it('initializes with default hidden state and calculates correct sliderTopPx for page 1 of 10', async () => {
    const stateRef: { current: ReturnOfUsePdfSlider | null } = { current: null };
    const setCurrentPage = vi.fn();

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 10,
          currentPage: 1,
          setCurrentPage,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    expect(stateRef.current?.isSliderVisible).toBe(false);
    expect(stateRef.current?.isDraggingSlider).toBe(false);
    // topOffset = 80, progress = 0 -> sliderTopPx = 80
    expect(stateRef.current?.sliderTopPx).toBe(80);
  });

  it('calculates correct sliderTopPx for last page and null/single numPages', async () => {
    const stateRef: { current: ReturnOfUsePdfSlider | null } = { current: null };
    const setCurrentPage = vi.fn();

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 10,
          currentPage: 10,
          setCurrentPage,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    // topOffset (80) + 1 * usableRange (windowHeight 768 - 80 - 80 - 44 = 564) = 644
    expect(stateRef.current?.sliderTopPx).toBe(644);

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 1,
          currentPage: 1,
          setCurrentPage,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    expect(stateRef.current?.sliderTopPx).toBe(80);
  });

  it('shows slider on scroll or transform and hides automatically after 5 seconds', async () => {
    const stateRef: { current: ReturnOfUsePdfSlider | null } = { current: null };
    const setCurrentPage = vi.fn();
    const containerEl = document.createElement('div');
    const scrollContainerEl = document.createElement('div');

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 5,
          currentPage: 1,
          setCurrentPage,
          containerEl,
          scrollContainerEl,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    expect(stateRef.current?.isSliderVisible).toBe(false);

    await act(async () => {
      stateRef.current?.handleScroll();
    });

    expect(stateRef.current?.isSliderVisible).toBe(true);

    // Fast forward 4.9 seconds - should still be visible
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(stateRef.current?.isSliderVisible).toBe(true);

    // Fast forward past 5 seconds total
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(stateRef.current?.isSliderVisible).toBe(false);

    // Test handleTransformed
    await act(async () => {
      stateRef.current?.handleTransformed({
        state: { positionX: 10, positionY: 20, scale: 1.5 },
      });
    });

    expect(stateRef.current?.isSliderVisible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(stateRef.current?.isSliderVisible).toBe(false);
  });

  it('handles mouse dragging and calls setCurrentPage and scrollIntoView', async () => {
    const stateRef: { current: ReturnOfUsePdfSlider | null } = { current: null };
    const setCurrentPage = vi.fn();
    const scrollIntoViewMock = vi.fn();

    const page1 = document.createElement('div');
    page1.scrollIntoView = scrollIntoViewMock;
    const page2 = document.createElement('div');
    page2.scrollIntoView = scrollIntoViewMock;

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 2,
          currentPage: 1,
          setCurrentPage,
          scrollContainerEl: document.createElement('div'),
          pageRefsArr: [page1, page2],
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    const preventDefaultSpy = vi.fn();
    const fakeMouseDownEvent = {
      clientY: 362, // Drag to middle position
      preventDefault: preventDefaultSpy,
    } as unknown as React.MouseEvent;

    await act(async () => {
      stateRef.current?.onSliderMouseDown(fakeMouseDownEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stateRef.current?.isDraggingSlider).toBe(true);
    expect(stateRef.current?.isSliderVisible).toBe(true);

    // Simulate mouse move across window
    const mouseMoveEvent = new MouseEvent('mousemove', { clientY: 644 });
    await act(async () => {
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(setCurrentPage).toHaveBeenCalledWith(2);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });

    // Release mouse
    const mouseUpEvent = new MouseEvent('mouseup');
    await act(async () => {
      document.dispatchEvent(mouseUpEvent);
    });

    expect(stateRef.current?.isDraggingSlider).toBe(false);
  });

  it('handles touch dragging start, move, and end', async () => {
    const stateRef: { current: ReturnOfUsePdfSlider | null } = { current: null };
    const setCurrentPage = vi.fn();
    const scrollIntoViewMock = vi.fn();

    const page1 = document.createElement('div');
    page1.scrollIntoView = scrollIntoViewMock;
    const page2 = document.createElement('div');
    page2.scrollIntoView = scrollIntoViewMock;

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 2,
          currentPage: 1,
          setCurrentPage,
          scrollContainerEl: document.createElement('div'),
          pageRefsArr: [page1, page2],
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    const stopPropagationSpy = vi.fn();
    const preventDefaultSpy = vi.fn();

    const fakeTouchStartEvent = {
      touches: [{ clientY: 80 }],
      stopPropagation: stopPropagationSpy,
    } as unknown as React.TouchEvent;

    await act(async () => {
      stateRef.current?.onSliderTouchStart(fakeTouchStartEvent);
    });

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(stateRef.current?.isDraggingSlider).toBe(true);
    expect(stateRef.current?.isSliderVisible).toBe(true);

    const fakeTouchMoveEvent = {
      touches: [{ clientY: 644 }],
      preventDefault: preventDefaultSpy,
      stopPropagation: stopPropagationSpy,
    } as unknown as React.TouchEvent;

    await act(async () => {
      stateRef.current?.onSliderTouchMove(fakeTouchMoveEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(setCurrentPage).toHaveBeenCalledWith(2);

    await act(async () => {
      stateRef.current?.onSliderTouchEnd();
    });

    expect(stateRef.current?.isDraggingSlider).toBe(false);
  });

  it('updates slider position calculation when window is resized', async () => {
    const stateRef: { current: ReturnOfUsePdfSlider | null } = { current: null };
    const setCurrentPage = vi.fn();

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          numPages: 10,
          currentPage: 10,
          setCurrentPage,
          onUpdate: (state) => {
            stateRef.current = state;
          },
        })
      );
    });

    // Default windowHeight is 768 -> 80 + 1 * (768 - 80 - 80 - 44) = 644
    expect(stateRef.current?.sliderTopPx).toBe(644);

    // Change window.innerHeight
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1000 });

    await act(async () => {
      window.dispatchEvent(new Event('resize'));
    });

    // New windowHeight = 1000 -> usableRange = 1000 - 204 = 796 -> topPx = 80 + 796 = 876
    expect(stateRef.current?.sliderTopPx).toBe(876);
  });
});
