import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MaterialCardSkeleton from '../MaterialCardSkeleton';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MaterialCardSkeleton Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
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

  it('renders with role="status" and correct aria-label', () => {
    act(() => {
      root?.render(<MaterialCardSkeleton />);
    });

    const statusElement = container?.querySelector('[role="status"]');
    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute('aria-label')).toBe('Loading study material');
  });

  it('renders screen reader announcement text', () => {
    act(() => {
      root?.render(<MaterialCardSkeleton />);
    });

    const srOnlySpan = container?.querySelector('.sr-only');
    expect(srOnlySpan).not.toBeNull();
    expect(srOnlySpan?.textContent).toBe('Loading study material...');
  });

  it('contains visual placeholder structure marked with aria-hidden="true"', () => {
    act(() => {
      root?.render(<MaterialCardSkeleton />);
    });

    const hiddenWrapper = container?.querySelector('[aria-hidden="true"]');
    expect(hiddenWrapper).not.toBeNull();
  });
});
