import { useEffect, useRef } from 'react';

export const MAX_STRETCH_PX = 120;
export const RESISTANCE = 0.55;
export const SPRING_BACK_MS = 550;
export const SPRING_BACK_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const WHEEL_RELEASE_DELAY_MS = 140;
export const AT_BOTTOM_TOLERANCE_PX = 1;
export const MAX_RAW_PULL_PX = 600;

function calculateDisplacement(rawPull: number): number {
  if (rawPull <= 0) return 0;
  return (1 - 1 / ((rawPull * RESISTANCE / MAX_STRETCH_PX) + 1)) * MAX_STRETCH_PX;
}

function rawPullFromDisplacement(displacement: number): number {
  if (displacement <= 0) return 0;
  const clampedD = Math.min(displacement, MAX_STRETCH_PX - 0.01);
  const scale = 1 - clampedD / MAX_STRETCH_PX;
  return ((1 / scale) - 1) * MAX_STRETCH_PX / RESISTANCE;
}

function getCurrentTranslateY(element: HTMLElement): number {
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === 'none') return 0;
  if (typeof DOMMatrix !== 'undefined') {
    try {
      const matrix = new DOMMatrix(transform);
      return matrix.m42;
    } catch {
      // Fall through to regex parsing if DOMMatrix fails
    }
  }
  const match3d = transform.match(/^matrix3d\((?:[^,]+,\s*){13}([^,]+)/);
  if (match3d) return parseFloat(match3d[1]);
  const match2d = transform.match(/^matrix\((?:[^,]+,\s*){5}([^,]+)/);
  if (match2d) return parseFloat(match2d[1]);
  return 0;
}

export function useBottomRubberBand(
  scrollRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLElement | null>
): void {
  const rawPullRef = useRef<number>(0);
  const touchOriginRef = useRef<number | null>(null);
  const lastTouchYRef = useRef<number>(0);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const springBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpringingBackRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }
      } catch {
        // Fall through if matchMedia throws
      }
    }

    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;

    const stopSpringBack = () => {
      if (springBackTimerRef.current) {
        clearTimeout(springBackTimerRef.current);
        springBackTimerRef.current = null;
      }

      if (isSpringingBackRef.current) {
        isSpringingBackRef.current = false;
        const currentY = getCurrentTranslateY(contentEl);
        const currentDisplacement = Math.max(0, -currentY);
        rawPullRef.current = rawPullFromDisplacement(currentDisplacement);
        contentEl.style.transition = 'none';
        contentEl.style.transform = `translate3d(0, -${currentDisplacement.toFixed(3)}px, 0)`;
      }
    };

    const springBack = () => {
      if (wheelTimerRef.current) {
        clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = null;
      }
      if (springBackTimerRef.current) {
        clearTimeout(springBackTimerRef.current);
        springBackTimerRef.current = null;
      }

      const currentY = getCurrentTranslateY(contentEl);
      if (rawPullRef.current <= 0 && currentY === 0 && !isSpringingBackRef.current) {
        contentEl.style.transition = '';
        contentEl.style.willChange = '';
        return;
      }

      isSpringingBackRef.current = true;
      contentEl.style.willChange = 'transform';
      contentEl.style.transition = `transform ${SPRING_BACK_MS}ms ${SPRING_BACK_EASING}`;
      contentEl.style.transform = 'translate3d(0, 0px, 0)';
      rawPullRef.current = 0;
      touchOriginRef.current = null;

      const handleTransitionEnd = (e?: TransitionEvent) => {
        if (e && e.target !== contentEl) return;
        if (springBackTimerRef.current) {
          clearTimeout(springBackTimerRef.current);
          springBackTimerRef.current = null;
        }
        contentEl.removeEventListener('transitionend', handleTransitionEnd);
        contentEl.style.transition = '';
        contentEl.style.willChange = '';
        isSpringingBackRef.current = false;
      };

      contentEl.addEventListener('transitionend', handleTransitionEnd);
      springBackTimerRef.current = setTimeout(() => {
        handleTransitionEnd();
      }, SPRING_BACK_MS + 50);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const startY = e.touches[0].clientY;
      lastTouchYRef.current = startY;

      if (wheelTimerRef.current) {
        clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = null;
      }

      stopSpringBack();

      const currentDisplacement = Math.max(0, -getCurrentTranslateY(contentEl));
      if (currentDisplacement > 0) {
        contentEl.style.willChange = 'transform';
        contentEl.style.transition = 'none';
        touchOriginRef.current = startY + rawPullRef.current;
      } else {
        touchOriginRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const prevY = lastTouchYRef.current;
      lastTouchYRef.current = currentY;

      const isAtBottom =
        scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - AT_BOTTOM_TOLERANCE_PX;

      if (!isAtBottom && rawPullRef.current === 0) {
        touchOriginRef.current = null;
        return;
      }

      if (isAtBottom || rawPullRef.current > 0) {
        if (touchOriginRef.current === null) {
          if (currentY < prevY) {
            touchOriginRef.current = prevY + rawPullRef.current;
          } else {
            return;
          }
        }

        if (touchOriginRef.current !== null) {
          const rawPull = Math.min(MAX_RAW_PULL_PX, Math.max(0, touchOriginRef.current - currentY));
          rawPullRef.current = rawPull;

          if (rawPull > 0) {
            if (e.cancelable) {
              e.preventDefault();
            }
            contentEl.style.willChange = 'transform';
            contentEl.style.transition = 'none';
            const displacement = calculateDisplacement(rawPull);
            contentEl.style.transform = `translate3d(0, -${displacement.toFixed(3)}px, 0)`;
          } else {
            rawPullRef.current = 0;
            touchOriginRef.current = null;
            contentEl.style.transform = 'translate3d(0, 0px, 0)';
          }
        }
      }
    };

    const handleTouchEnd = () => {
      touchOriginRef.current = null;
      if (rawPullRef.current > 0 || isSpringingBackRef.current || getCurrentTranslateY(contentEl) !== 0) {
        springBack();
      }
    };

    const handleTouchCancel = () => {
      touchOriginRef.current = null;
      if (rawPullRef.current > 0 || isSpringingBackRef.current || getCurrentTranslateY(contentEl) !== 0) {
        springBack();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const isAtBottom =
        scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - AT_BOTTOM_TOLERANCE_PX;

      if (isAtBottom && e.deltaY > 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        if (wheelTimerRef.current) {
          clearTimeout(wheelTimerRef.current);
          wheelTimerRef.current = null;
        }
        stopSpringBack();

        const newRawPull = Math.min(MAX_RAW_PULL_PX, rawPullRef.current + e.deltaY);
        rawPullRef.current = newRawPull;

        contentEl.style.willChange = 'transform';
        contentEl.style.transition = 'none';
        const displacement = calculateDisplacement(newRawPull);
        contentEl.style.transform = `translate3d(0, -${displacement.toFixed(3)}px, 0)`;

        wheelTimerRef.current = setTimeout(() => {
          springBack();
        }, WHEEL_RELEASE_DELAY_MS);
      } else if (rawPullRef.current > 0 && e.deltaY < 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        if (wheelTimerRef.current) {
          clearTimeout(wheelTimerRef.current);
          wheelTimerRef.current = null;
        }
        stopSpringBack();

        const newRawPull = Math.max(0, rawPullRef.current + e.deltaY);
        rawPullRef.current = newRawPull;

        contentEl.style.willChange = 'transform';
        contentEl.style.transition = 'none';
        const displacement = calculateDisplacement(newRawPull);
        contentEl.style.transform = `translate3d(0, -${displacement.toFixed(3)}px, 0)`;

        if (newRawPull > 0) {
          wheelTimerRef.current = setTimeout(() => {
            springBack();
          }, WHEEL_RELEASE_DELAY_MS);
        } else {
          springBack();
        }
      }
    };

    scrollEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    scrollEl.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    scrollEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollEl.removeEventListener('touchstart', handleTouchStart);
      scrollEl.removeEventListener('touchmove', handleTouchMove);
      scrollEl.removeEventListener('touchend', handleTouchEnd);
      scrollEl.removeEventListener('touchcancel', handleTouchCancel);
      scrollEl.removeEventListener('wheel', handleWheel);

      if (wheelTimerRef.current) {
        clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = null;
      }
      if (springBackTimerRef.current) {
        clearTimeout(springBackTimerRef.current);
        springBackTimerRef.current = null;
      }

      if (contentEl) {
        contentEl.style.transition = '';
        contentEl.style.willChange = '';
        contentEl.style.transform = '';
      }
      rawPullRef.current = 0;
      touchOriginRef.current = null;
      isSpringingBackRef.current = false;
    };
  }, [scrollRef, contentRef]);
}
