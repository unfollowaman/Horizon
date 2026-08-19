import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ErrorBoundary } from '../ErrorBoundary';

// Enable React act environment flag for React 19 testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test rendering error');
  }
  return <div>Normal Content</div>;
};

describe('ErrorBoundary', () => {
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

  it('renders children normally when no error occurs', () => {
    act(() => {
      root?.render(
        <ErrorBoundary>
          <ProblemChild />
        </ErrorBoundary>
      );
    });

    expect(container?.textContent).toContain('Normal Content');
  });

  it('renders default fallback when child throws an error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root?.render(
        <ErrorBoundary>
          <ProblemChild shouldThrow />
        </ErrorBoundary>
      );
    });

    expect(container?.textContent).toContain('Something went wrong');
    expect(container?.textContent).toContain(
      'An unexpected error occurred while rendering this component.'
    );
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('renders custom fallback when provided and an error occurs', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root?.render(
        <ErrorBoundary fallback={<div>Custom Fallback View</div>}>
          <ProblemChild shouldThrow />
        </ErrorBoundary>
      );
    });

    expect(container?.textContent).toContain('Custom Fallback View');
    expect(container?.textContent).not.toContain('Something went wrong');

    consoleSpy.mockRestore();
  });

  it('calls onError callback with Error and ErrorInfo when an error is caught', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onErrorMock = vi.fn();

    act(() => {
      root?.render(
        <ErrorBoundary onError={onErrorMock}>
          <ProblemChild shouldThrow />
        </ErrorBoundary>
      );
    });

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    const [error, errorInfo] = onErrorMock.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Test rendering error');
    expect(errorInfo).toHaveProperty('componentStack');

    consoleSpy.mockRestore();
  });
});
