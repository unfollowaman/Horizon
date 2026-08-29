import { useState, useEffect } from 'react';

/**
 * Custom hook to delay showing a loading indicator by a given delay in ms (default 250ms).
 * Prevents UI flickering for fast network or cached state responses.
 */
export function useDelayedLoading(isLoading: boolean, delayMs: number = 250): boolean {
  const [shouldShowLoading, setShouldShowLoading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isLoading) {
      timer = setTimeout(() => {
        setShouldShowLoading(true);
      }, delayMs);
    } else {
      setShouldShowLoading(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isLoading, delayMs]);

  return shouldShowLoading;
}
