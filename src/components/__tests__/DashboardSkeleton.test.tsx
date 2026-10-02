import React, { act } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DashboardSkeleton from '../DashboardSkeleton';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('DashboardSkeleton Component', () => {
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
      root?.render(<DashboardSkeleton />);
    });

    const statusElement = container?.querySelector('[role="status"]');
    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute('aria-label')).toBe('Loading student dashboard');
  });

  it('renders screen reader announcement text', () => {
    act(() => {
      root?.render(<DashboardSkeleton />);
    });

    const srOnlySpan = container?.querySelector('.sr-only');
    expect(srOnlySpan).not.toBeNull();
    expect(srOnlySpan?.textContent).toBe('Loading student dashboard...');
  });

  it('contains visual placeholder structure marked with aria-hidden="true"', () => {
    act(() => {
      root?.render(<DashboardSkeleton />);
    });

    const hiddenWrapper = container?.querySelector('[aria-hidden="true"]');
    expect(hiddenWrapper).not.toBeNull();
  });
});
