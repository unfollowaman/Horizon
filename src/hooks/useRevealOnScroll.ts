import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook to reveal elements on scroll using IntersectionObserver.
 * Plays once per element per page load.
 * Handles prefers-reduced-motion and missing IntersectionObserver support.
 */
export function useRevealOnScroll(count: number, threshold = 0.2) {
  const [visibleIndices, setVisibleIndices] = useState<boolean[]>(() =>
    new Array(count).fill(false)
  );
  const elementsRef = useRef<(HTMLElement | null)[]>([]);

  const registerRef = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      elementsRef.current[index] = node;
    },
    []
  );

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setVisibleIndices(new Array(count).fill(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexStr = (entry.target as HTMLElement).dataset.revealIndex;
            if (indexStr !== undefined) {
              const index = parseInt(indexStr, 10);
              if (!isNaN(index)) {
                setVisibleIndices((prev) => {
                  if (prev[index]) return prev;
                  const next = [...prev];
                  next[index] = true;
                  return next;
                });
                observer.unobserve(entry.target);
              }
            }
          }
        });
      },
      { threshold }
    );

    elementsRef.current.forEach((el) => {
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [count, threshold]);

  return { visibleIndices, registerRef };
}
