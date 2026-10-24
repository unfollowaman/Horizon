import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook providing double-rAF mount triggering and transition completion tracking
 * for 3D downward unfold reveal animations across subject and class selection tiles.
 */
export function useUnfoldReveal() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [completedTiles, setCompletedTiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let rafId2: number;

    const rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });

    return () => {
      cancelAnimationFrame(rafId1);
      if (rafId2) cancelAnimationFrame(rafId2);
    };
  }, []);

  const handleTransitionEnd = useCallback((e: React.TransitionEvent<HTMLElement>, key: string) => {
    if (e.propertyName === 'transform') {
      setCompletedTiles((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    }
  }, []);

  return {
    isVisible,
    completedTiles,
    handleTransitionEnd,
  };
}

export default useUnfoldReveal;
