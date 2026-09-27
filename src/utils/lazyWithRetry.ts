import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

export interface LazyWithRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
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
  return componentImport().catch((error) => {
    if (retriesLeft <= 0) {
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
