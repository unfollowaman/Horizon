import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { Suspense, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { retryImport, lazyWithRetry } from '../lazyWithRetry';
import ErrorBoundary from '../../components/ErrorBoundary';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MockComponent: React.FC = () => <div>Loaded Lazy Component</div>;

describe('lazyWithRetry utility', () => {
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
    vi.restoreAllMocks();
  });

  describe('retryImport function', () => {
    it('resolves immediately on the first attempt if successful', async () => {
      const importFn = vi.fn().mockResolvedValue({ default: MockComponent });

      const promise = retryImport(importFn, 3, 100, 2);
      await expect(promise).resolves.toEqual({ default: MockComponent });
      expect(importFn).toHaveBeenCalledTimes(1);
    });

    it('retries when import fails and succeeds on a subsequent attempt', async () => {
      const importFn = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
        .mockResolvedValueOnce({ default: MockComponent });

      const promise = retryImport(importFn, 3, 100, 2);

      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toEqual({ default: MockComponent });
      expect(importFn).toHaveBeenCalledTimes(2);
    });

    it('re-throws the final error when retries are exhausted', async () => {
      const networkError = new TypeError('Failed to fetch dynamically imported module');
      const importFn = vi.fn().mockRejectedValue(networkError);

      const promise = retryImport(importFn, 2, 100, 2);

      let caughtError: unknown;
      promise.catch((err) => {
        caughtError = err;
      });

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      await expect(promise).rejects.toThrow('Failed to fetch dynamically imported module');
      expect(caughtError).toBe(networkError);
      expect(importFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('lazyWithRetry integration with React.lazy and ErrorBoundary', () => {
    it('renders component successfully when import succeeds on retry', async () => {
      const importFn = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Chunk load failed'))
        .mockResolvedValueOnce({ default: MockComponent });

      const LazyComponent = lazyWithRetry(importFn, {
        maxRetries: 2,
        initialDelayMs: 50,
        backoffFactor: 2,
      });

      await act(async () => {
        root?.render(
          <Suspense fallback={<div>Loading...</div>}>
            <LazyComponent />
          </Suspense>
        );
      });

      expect(container?.textContent).toContain('Loading...');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });

      expect(container?.textContent).toContain('Loaded Lazy Component');
      expect(importFn).toHaveBeenCalledTimes(2);
    });

    it('triggers ErrorBoundary when retries are exhausted', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const importFn = vi.fn().mockRejectedValue(new Error('Persistent Chunk Failure'));

      const LazyComponent = lazyWithRetry(importFn, {
        maxRetries: 2,
        initialDelayMs: 50,
        backoffFactor: 2,
      });

      await act(async () => {
        root?.render(
          <ErrorBoundary fallback={<div>Boundary caught error</div>}>
            <Suspense fallback={<div>Loading...</div>}>
              <LazyComponent />
            </Suspense>
          </ErrorBoundary>
        );
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(container?.textContent).toContain('Boundary caught error');
      expect(importFn).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });
  });
});
