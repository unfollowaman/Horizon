import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MaterialCardSkeleton from '../MaterialCardSkeleton';
import SyllabusSkeleton from '../../pages/syllabus/components/SyllabusSkeleton';
import DashboardSkeleton from '../DashboardSkeleton';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Skeleton Components Accessibility', () => {
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

  it('MaterialCardSkeleton renders with role="status" and accessible label', () => {
    act(() => {
      root?.render(<MaterialCardSkeleton />);
    });

    const statusEl = container?.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.getAttribute('aria-label')).toBe('Loading study material...');

    const srSpan = statusEl?.querySelector('span.sr-only');
    expect(srSpan).not.toBeNull();
    expect(srSpan?.textContent).toBe('Loading study material...');
  });

  it('SyllabusSkeleton renders with role="status" and accessible label', () => {
    act(() => {
      root?.render(<SyllabusSkeleton />);
    });

    const statusEl = container?.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.getAttribute('aria-label')).toBe('Loading syllabus...');

    const srSpan = statusEl?.querySelector('span.sr-only');
    expect(srSpan).not.toBeNull();
    expect(srSpan?.textContent).toBe('Loading syllabus...');
  });

  it('DashboardSkeleton renders with role="status" and accessible label', () => {
    act(() => {
      root?.render(<DashboardSkeleton />);
    });

    const statusEl = container?.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl?.getAttribute('aria-label')).toBe('Loading dashboard...');

    const srSpan = statusEl?.querySelector('span.sr-only');
    expect(srSpan).not.toBeNull();
    expect(srSpan?.textContent).toBe('Loading dashboard...');
  });
});
