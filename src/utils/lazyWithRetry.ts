import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

export interface LazyWithRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

export const CHUNK_RELOAD_GUARD_KEY = 'horizon_chunk_reload_guard';

/**
 * Determines whether an error is likely caused by a missing/stale hashed JavaScript chunk
 * following a new deployment or network chunk loading failure.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';

  return (
    name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [0-9]+ failed/i.test(message) ||
    /Loading CSS chunk [0-9]+ failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

// Global Vite event listener for asset preload failures
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const guard = sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY);
    if (!guard) {
      sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, 'true');
      try {
        window.location.reload();
      } catch {
        // Ignore in test environments
      }
    }
  });
}

/**
 * Retries a dynamic component import factory function when it fails due to transient network issues.
 * Each retry invokes componentImport() fresh to create a new import Promise rather than reusing a rejected Promise.
 */
export function retryImport<P extends object>(
  componentImport: () => Promise<{ default: ComponentType<P> }>,
  retriesLeft = 3,
  delay = 500,
  backoffFactor = 2
): Promise<{ default: ComponentType<P> }> {
  return componentImport()
    .then((module) => {
      // Clear the reload guard on a successful import
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);
      }
      return module;
    })
    .catch((error) => {
      if (retriesLeft <= 0) {
        // If retries are exhausted and error is a stale chunk error, attempt a single auto-reload
        if (typeof window !== 'undefined' && isChunkLoadError(error)) {
          const guard = sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY);
          if (!guard) {
            sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, 'true');
            try {
              window.location.reload();
            } catch {
              // Ignore reload errors in test environments
            }
          }
        }
        throw error;
      }
      return new Promise<{ default: ComponentType<P> }>((resolve) => {
        setTimeout(() => {
          resolve(retryImport(componentImport, retriesLeft - 1, delay * backoffFactor, backoffFactor));
        }, delay);
      });
    });
}

/**
 * Wraps React.lazy() with dynamic import retry logic to make route loading resilient
 * to transient network interruptions and chunk load failures.
 */
export function lazyWithRetry<P extends object>(
  componentImport: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWithRetryOptions = {}
): LazyExoticComponent<ComponentType<P>> {
  const { maxRetries = 3, initialDelayMs = 500, backoffFactor = 2 } = options;
  return lazy(() => retryImport(componentImport, maxRetries, initialDelayMs, backoffFactor));
}
