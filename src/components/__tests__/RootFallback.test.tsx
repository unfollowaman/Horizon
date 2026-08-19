import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import RootFallback from '../RootFallback';
import ErrorBoundary from '../ErrorBoundary';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Root level application crash');
  }
  return <div>Application Loaded Successfully</div>;
};

describe('RootFallback and Root Error Boundary Integration', () => {
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

  it('renders RootFallback UI elements correctly', () => {
    act(() => {
      root?.render(<RootFallback />);
    });

    expect(container?.textContent).toContain('Something went wrong');
    expect(container?.textContent).toContain('An unexpected error occurred while loading the application.');
    expect(container?.textContent).toContain('Reload Page');

    const logo = container?.querySelector('img');
    expect(logo).not.toBeNull();
    expect(logo?.getAttribute('src')).toBe('/assets/favicon/logo.avif');
  });

  it('triggers window.location.reload when Reload Page button is clicked', () => {
    const reloadSpy = vi.fn();
    const originalLocation = window.location;

    // Redefine window.location for testing reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });

    act(() => {
      root?.render(<RootFallback />);
    });

    const button = container?.querySelector('button');
    expect(button).not.toBeNull();

    act(() => {
      button?.click();
    });

    expect(reloadSpy).toHaveBeenCalledTimes(1);

    // Restore original window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('catches root-level render crash and displays RootFallback UI', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root?.render(
        <ErrorBoundary fallback={<RootFallback />}>
          <ProblemChild shouldThrow />
        </ErrorBoundary>
      );
    });

    expect(container?.textContent).toContain('Something went wrong');
    expect(container?.textContent).toContain('Reload Page');
    expect(container?.textContent).not.toContain('Root level application crash');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
