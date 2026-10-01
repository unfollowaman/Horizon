import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  useBottomRubberBand,
  MAX_STRETCH_PX,
  RESISTANCE,
  SPRING_BACK_MS,
  SPRING_BACK_EASING,
  WHEEL_RELEASE_DELAY_MS,
  AT_BOTTOM_TOLERANCE_PX,
  MAX_RAW_PULL_PX,
} from '../useBottomRubberBand';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface TestComponentProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const TestComponent: React.FC<TestComponentProps> = ({ scrollRef, contentRef }) => {
  useBottomRubberBand(scrollRef, contentRef);
  return null;
};

describe('useBottomRubberBand', () => {
  let scrollEl: HTMLDivElement;
  let contentEl: HTMLDivElement;
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    scrollEl = document.createElement('div');
    contentEl = document.createElement('div');

    Object.defineProperty(scrollEl, 'scrollTop', { value: 500, writable: true, configurable: true });
    Object.defineProperty(scrollEl, 'clientHeight', { value: 500, writable: true, configurable: true });
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 1000, writable: true, configurable: true });

    document.body.appendChild(scrollEl);
    scrollEl.appendChild(contentEl);
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
    if (scrollEl && scrollEl.parentNode) {
      scrollEl.parentNode.removeChild(scrollEl);
    }
    container = null;
    root = null;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('exports correct constants', () => {
    expect(MAX_STRETCH_PX).toBe(120);
    expect(RESISTANCE).toBe(0.55);
    expect(SPRING_BACK_MS).toBe(550);
    expect(SPRING_BACK_EASING).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(WHEEL_RELEASE_DELAY_MS).toBe(140);
    expect(AT_BOTTOM_TOLERANCE_PX).toBe(1);
    expect(MAX_RAW_PULL_PX).toBe(600);
  });

  it('attaches touch listeners and applies displacement on touchmove at bottom', () => {
    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          scrollRef: { current: scrollEl },
          contentRef: { current: contentEl },
        })
      );
    });

    // Touch start at y = 300
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientY: 300 } as Touch],
    });
    scrollEl.dispatchEvent(touchStartEvent);

    // Touch move up to y = 200 (pulling down past end by 100px)
    const touchMoveEvent = new TouchEvent('touchmove', {
      cancelable: true,
      touches: [{ clientY: 200 } as Touch],
    });
    const preventDefaultSpy = vi.spyOn(touchMoveEvent, 'preventDefault');

    scrollEl.dispatchEvent(touchMoveEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(contentEl.style.transform).toContain('translate3d(0, -');
    expect(contentEl.style.willChange).toBe('transform');

    // Touch end triggers spring back
    const touchEndEvent = new TouchEvent('touchend', { cancelable: true });
    scrollEl.dispatchEvent(touchEndEvent);

    expect(contentEl.style.transition).toBe(`transform ${SPRING_BACK_MS}ms ${SPRING_BACK_EASING}`);
    expect(contentEl.style.transform).toBe('translate3d(0, 0px, 0)');

    // Fast-forward spring back duration
    act(() => {
      vi.advanceTimersByTime(SPRING_BACK_MS + 60);
    });

    expect(contentEl.style.transition).toBe('');
    expect(contentEl.style.willChange).toBe('');
  });

  it('does not interfere with normal scrolling when not at bottom', () => {
    Object.defineProperty(scrollEl, 'scrollTop', { value: 0, writable: true, configurable: true });
    Object.defineProperty(scrollEl, 'clientHeight', { value: 500, writable: true, configurable: true });
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, writable: true, configurable: true });

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          scrollRef: { current: scrollEl },
          contentRef: { current: contentEl },
        })
      );
    });

    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientY: 300 } as Touch],
    });
    scrollEl.dispatchEvent(touchStartEvent);

    const touchMoveEvent = new TouchEvent('touchmove', {
      cancelable: true,
      touches: [{ clientY: 250 } as Touch],
    });
    const preventDefaultSpy = vi.spyOn(touchMoveEvent, 'preventDefault');

    scrollEl.dispatchEvent(touchMoveEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(contentEl.style.transform).toBe('');
  });

  it('handles wheel events past bottom and springs back after release delay', () => {
    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          scrollRef: { current: scrollEl },
          contentRef: { current: contentEl },
        })
      );
    });

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 50,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault');

    scrollEl.dispatchEvent(wheelEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(contentEl.style.transform).toContain('translate3d(0, -');

    // Timer before spring back
    act(() => {
      vi.advanceTimersByTime(WHEEL_RELEASE_DELAY_MS - 10);
    });
    expect(contentEl.style.transition).toBe('none');

    // Timer fires
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(contentEl.style.transition).toBe(`transform ${SPRING_BACK_MS}ms ${SPRING_BACK_EASING}`);
    expect(contentEl.style.transform).toBe('translate3d(0, 0px, 0)');
  });

  it('disables rubber band effect when prefers-reduced-motion is true', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          scrollRef: { current: scrollEl },
          contentRef: { current: contentEl },
        })
      );
    });

    const wheelEvent = new WheelEvent('wheel', { deltaY: 50, cancelable: true });
    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault');

    scrollEl.dispatchEvent(wheelEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(contentEl.style.transform).toBe('');
  });

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(scrollEl, 'removeEventListener');

    act(() => {
      root?.render(
        React.createElement(TestComponent, {
          scrollRef: { current: scrollEl },
          contentRef: { current: contentEl },
        })
      );
    });

    act(() => {
      root?.unmount();
      root = null;
    });

    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
  });
});
