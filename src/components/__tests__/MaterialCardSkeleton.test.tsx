import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MaterialCardSkeleton from '../MaterialCardSkeleton';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MaterialCardSkeleton', () => {
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

  it('renders correctly with aria-hidden="true" and animate-pulse animation', () => {
    act(() => {
      root?.render(<MaterialCardSkeleton />);
    });

    const rootDiv = container?.firstElementChild as HTMLDivElement;
    expect(rootDiv).not.toBeNull();
    expect(rootDiv.getAttribute('aria-hidden')).toBe('true');
    expect(rootDiv.className).toContain('neu-raised');
    expect(rootDiv.className).toContain('animate-pulse');
  });

  it('renders layout placeholder elements for thumbnail, title, subtitle, and action buttons', () => {
    act(() => {
      root?.render(<MaterialCardSkeleton />);
    });

    const rootDiv = container?.firstElementChild as HTMLDivElement;

    // Thumbnail Skeleton
    const thumbnail = rootDiv.querySelector('.neu-recessed.h-\\[100px\\]');
    expect(thumbnail).not.toBeNull();

    // Title line placeholders
    const titleLine1 = rootDiv.querySelector('.w-4\\/5');
    const titleLine2 = rootDiv.querySelector('.w-3\\/5');
    expect(titleLine1).not.toBeNull();
    expect(titleLine2).not.toBeNull();

    // Subtitle / Year line placeholder
    const subtitleLine = rootDiv.querySelector('.w-2\\/5');
    expect(subtitleLine).not.toBeNull();

    // Action button placeholders
    const actionButtons = rootDiv.querySelectorAll('.neu-raised-sm');
    expect(actionButtons.length).toBe(2);
  });
});
