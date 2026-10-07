import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { Suspense, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { retryImport, lazyWithRetry, isChunkLoadError, CHUNK_RELOAD_GUARD_KEY } from '../lazyWithRetry';
import ErrorBoundary from '../../components/ErrorBoundary';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MockComponent: React.FC = () => <div>Loaded Lazy Component</div>;

describe('lazyWithRetry utility', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
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
    sessionStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('isChunkLoadError helper', () => {
    it('correctly identifies stale/missing chunk errors', () => {
      expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module'))).toBe(true);
      expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
      expect(isChunkLoadError(new Error('Loading chunk 5 failed'))).toBe(true);
      expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);

      const chunkErr = new Error('Custom chunk error');
      chunkErr.name = 'ChunkLoadError';
      expect(isChunkLoadError(chunkErr)).toBe(true);
    });

    it('returns false for unrelated application errors', () => {
      expect(isChunkLoadError(new Error('Database query failed'))).toBe(false);
      expect(isChunkLoadError(new TypeError('Cannot read property of undefined'))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
    });
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

    it('re-throws the final error when retries are exhausted and guard is already active', async () => {
      sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, 'true');
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

    it('triggers window.location.reload when chunk error occurs and guard is not set', async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { reload: reloadSpy },
      });

      const chunkError = new TypeError('Failed to fetch dynamically imported module');
      const importFn = vi.fn().mockRejectedValue(chunkError);

      const promise = retryImport(importFn, 1, 50, 2);
      promise.catch(() => {}); // Catch handled promise rejection to prevent unhandled rejection warning

      await vi.advanceTimersByTimeAsync(50);

      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY)).toBe('true');
    });

    it('clears reload guard on a successful import', async () => {
      sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, 'true');
      const importFn = vi.fn().mockResolvedValue({ default: MockComponent });

      await retryImport(importFn, 3, 100, 2);

      expect(sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY)).toBeNull();
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

    it('triggers ErrorBoundary when retries are exhausted and reload guard prevents infinite reloads', async () => {
      sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, 'true');
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
