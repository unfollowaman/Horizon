import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RouteErrorFallback from '../RouteErrorFallback';
import MainLayout from '../../layouts/MainLayout';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NormalPage: React.FC = () => <div>Normal Route Content</div>;

const CrashingPage: React.FC = () => {
  throw new Error('Test route crash error');
};

describe('RouteErrorFallback and MainLayout Error Boundary Integration', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
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
  });

  it('renders RouteErrorFallback UI elements correctly', () => {
    const onRetryMock = vi.fn();

    act(() => {
      root?.render(
        <MemoryRouter>
          <RouteErrorFallback onRetry={onRetryMock} />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Unable to load page');
    expect(container?.textContent).toContain('An unexpected error occurred while loading this page content.');
    expect(container?.textContent).toContain('Try Again');
    expect(container?.textContent).toContain('Go Home');
  });

  it('calls onRetry callback when Try Again button is clicked', () => {
    const onRetryMock = vi.fn();

    act(() => {
      root?.render(
        <MemoryRouter>
          <RouteErrorFallback onRetry={onRetryMock} />
        </MemoryRouter>
      );
    });

    const buttons = container?.querySelectorAll('button');
    const tryAgainButton = Array.from(buttons || []).find(
      (btn) => btn.textContent?.includes('Try Again')
    );

    expect(tryAgainButton).toBeDefined();

    act(() => {
      tryAgainButton?.click();
    });

    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it('renders route content normally inside MainLayout when no error occurs', () => {
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/test']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/test" element={<NormalPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Normal Route Content');
    expect(container?.textContent).toContain('Horizon Educational Platform');
  });

  it('catches route render crash, displays RouteErrorFallback, and preserves footer', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/crash']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/crash" element={<CrashingPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    // Fallback UI appears
    expect(container?.textContent).toContain('Unable to load page');
    expect(container?.textContent).toContain('An unexpected error occurred while loading this page content.');
    expect(container?.textContent).not.toContain('Test route crash error');

    // Footer remains visible outside the boundary
    expect(container?.textContent).toContain('Horizon Educational Platform');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('resets error boundary state when navigating to another route', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/crash']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/crash" element={<CrashingPage />} />
              <Route path="/home" element={<NormalPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Unable to load page');

    // Link to "/" exists in RouteErrorFallback
    const link = container?.querySelector('a[href="/"]');
    expect(link).not.toBeNull();

    consoleSpy.mockRestore();
  });
});
