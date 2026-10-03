import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import SkipToContent from '../SkipToContent';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('SkipToContent Component', () => {
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

  it('renders a skip to content link targeting default main-content', () => {
    act(() => {
      root?.render(<SkipToContent />);
    });

    const link = container?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.textContent?.trim()).toBe('Skip to main content');
    expect(link?.getAttribute('href')).toBe('#main-content');
  });

  it('allows customizing targetId prop', () => {
    act(() => {
      root?.render(<SkipToContent targetId="custom-content" />);
    });

    const link = container?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('#custom-content');
  });

  it('includes sr-only class for screen reader visibility and focus utilities for keyboard navigation', () => {
    act(() => {
      root?.render(<SkipToContent />);
    });

    const link = container?.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.className).toContain('sr-only');
    expect(link?.className).toContain('focus:not-sr-only');
    expect(link?.className).toContain('focus:fixed');
    expect(link?.className).toContain('focus:bg-[#E91E8C]');
  });
});
