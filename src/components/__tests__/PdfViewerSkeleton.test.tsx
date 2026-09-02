import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import PdfViewerSkeleton from '../PdfViewerSkeleton';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PdfViewerSkeleton', () => {
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

  it('renders loading text and spinner without skeleton pulse elements', () => {
    act(() => {
      root?.render(<PdfViewerSkeleton title="Sample Chapter Title" />);
    });

    expect(container?.textContent).toContain('Sample Chapter Title');
    expect(container?.textContent).toContain('Preparing PDF Document...');

    // Verify animate-pulse class is not present anywhere in the DOM tree
    expect(container?.querySelector('.animate-pulse')).toBeNull();
  });

  it('renders default fallback title when title prop is not provided', () => {
    act(() => {
      root?.render(<PdfViewerSkeleton />);
    });

    expect(container?.textContent).toContain('Loading Document...');
    expect(container?.textContent).toContain('Preparing PDF Document...');
  });
});
