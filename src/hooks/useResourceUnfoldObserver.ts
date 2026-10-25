import { useState, useEffect, useRef, useCallback } from 'react';
import styles from '../pages/resources/ResourcePage.module.css';

type RevealState = 'hidden' | 'visible' | 'settled';

/**
 * Custom hook providing a single shared IntersectionObserver instance per page mount
 * to animate filter dropdown wrappers and PDF resource cards with 3D downward unfold reveal.
 */
export function useResourceUnfoldObserver() {
  const [elementStates, setElementStates] = useState<Record<string, RevealState>>({});
  const [staggerDelays, setStaggerDelays] = useState<Record<string, number>>({});

  const nodesRef = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementStatesRef = useRef<Record<string, RevealState>>({});

  // Synchronize ref with current element states
  useEffect(() => {
    elementStatesRef.current = elementStates;
  }, [elementStates]);

  const updateState = useCallback((id: string, state: RevealState) => {
    setElementStates((prev) => {
      if (prev[id] === state || prev[id] === 'settled') return prev;
      return { ...prev, [id]: state };
    });
  }, []);

  const registerRef = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      if (node) {
        nodesRef.current.set(id, node);
        // If reduced motion or IntersectionObserver unavailable, settle immediately
        const prefersReduced =
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReduced || typeof IntersectionObserver === 'undefined') {
          updateState(id, 'settled');
          return;
        }

        // If this element has not been processed yet, observe it
        if (!elementStatesRef.current[id] || elementStatesRef.current[id] === 'hidden') {
          if (observerRef.current) {
            observerRef.current.observe(node);
          }
        }
      } else {
        const existingNode = nodesRef.current.get(id);
        if (existingNode && observerRef.current) {
          observerRef.current.unobserve(existingNode);
        }
        nodesRef.current.delete(id);
      }
    },
    [updateState]
  );

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingEntries: IntersectionObserverEntry[] = [];

        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          const id = target.dataset.unfoldId;
          if (!id) return;

          const currentState = elementStatesRef.current[id];
          if (currentState === 'settled' || currentState === 'visible') {
            observer.unobserve(target);
            return;
          }

          // If entry is above the viewport on initial check (boundingClientRect.bottom < 0),
          // settle instantly with no delay or animation
          if (entry.boundingClientRect.bottom < 0) {
            updateState(id, 'settled');
            observer.unobserve(target);
            return;
          }

          if (entry.isIntersecting) {
            intersectingEntries.push(entry);
          }
        });

        if (intersectingEntries.length > 0) {
          // Sort intersecting entries in DOM order
          intersectingEntries.sort((a, b) => {
            const pos = a.target.compareDocumentPosition(b.target);
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            return 0;
          });

          const newDelays: Record<string, number> = {};
          const newStates: Record<string, RevealState> = {};

          intersectingEntries.forEach((entry, idx) => {
            const target = entry.target as HTMLElement;
            const id = target.dataset.unfoldId;
            if (!id) return;

            const delay = Math.min(idx * 120, 480);
            newDelays[id] = delay;
            newStates[id] = 'visible';

            observer.unobserve(target);
          });

          // Apply state changes inside requestAnimationFrame
          requestAnimationFrame(() => {
            setStaggerDelays((prev) => ({ ...prev, ...newDelays }));
            setElementStates((prev) => ({ ...prev, ...newStates }));
          });
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -6% 0px',
      }
    );

    observerRef.current = observer;

    // Observe any nodes that were registered before observer creation
    nodesRef.current.forEach((node, id) => {
      if (!elementStatesRef.current[id] || elementStatesRef.current[id] === 'hidden') {
        observer.observe(node);
      }
    });

    // 2.5s Safety Fallback Timer
    const fallbackTimer = setTimeout(() => {
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      nodesRef.current.forEach((node, id) => {
        const state = elementStatesRef.current[id];
        if (!state || state === 'hidden') {
          const rect = node.getBoundingClientRect();
          // If element is inside or above the viewport, force reveal/settle
          if (rect.top <= windowHeight) {
            updateState(id, 'settled');
            if (observerRef.current) {
              observerRef.current.unobserve(node);
            }
          }
        }
      });
    }, 2500);

    return () => {
      clearTimeout(fallbackTimer);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [updateState]);

  const handleTransitionEnd = useCallback(
    (id: string) => (e: React.TransitionEvent<HTMLElement>) => {
      if (e.target === e.currentTarget && e.propertyName === 'transform') {
        updateState(id, 'settled');
      }
    },
    [updateState]
  );

  const getElementProps = useCallback(
    (id: string, extraClassName?: string) => {
      const state = elementStates[id] || 'hidden';
      const delay = staggerDelays[id] || 0;

      let animClass = styles.unfoldHidden;
      if (state === 'visible') {
        animClass = `${styles.unfoldHidden} ${styles.unfoldVisible}`;
      } else if (state === 'settled') {
        animClass = styles.unfoldSettled;
      }

      const className = extraClassName ? `${extraClassName} ${animClass}` : animClass;

      return {
        ref: registerRef(id),
        'data-unfold-id': id,
        className,
        style: state === 'visible' && delay > 0 ? { transitionDelay: `${delay}ms` } : undefined,
        onTransitionEnd: handleTransitionEnd(id),
      };
    },
    [elementStates, staggerDelays, registerRef, handleTransitionEnd]
  );

  return {
    getElementProps,
  };
}

export default useResourceUnfoldObserver;
