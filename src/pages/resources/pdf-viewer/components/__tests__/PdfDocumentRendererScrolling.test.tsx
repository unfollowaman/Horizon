import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PdfDocumentRenderer } from '../PdfDocumentRenderer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock react-pdf to avoid canvas loading issues in jsdom
vi.mock('react-pdf', () => ({
  Document: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="mock-document" className={className}>
      {children}
    </div>
  ),
  Page: ({ pageNumber, width }: { pageNumber: number; width: number }) => (
    <div data-testid={`mock-page-${pageNumber}`} data-width={width}>
      Page {pageNumber}
    </div>
  ),
}));

// Mock react-zoom-pan-pinch to inspect props passed to TransformWrapper
let lastTransformWrapperProps: Record<string, unknown> = {};

vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: (props: Record<string, unknown> & { children: (ref: { zoomIn: () => void; zoomOut: () => void; setTransform: () => void }) => React.ReactNode }) => {
    lastTransformWrapperProps = props;
    return (
      <div data-testid="mock-transform-wrapper">
        {props.children({
          zoomIn: () => {},
          zoomOut: () => {},
          setTransform: () => {},
        })}
      </div>
    );
  },
  TransformComponent: ({ children, wrapperClass, contentClass }: { children: React.ReactNode; wrapperClass?: string; contentClass?: string }) => (
    <div data-testid="mock-transform-component" className={`${wrapperClass || ''} ${contentClass || ''}`}>
      {children}
    </div>
  ),
}));

describe('PdfDocumentRenderer Scrolling & Touch Lock Behavior', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const defaultProps = {
    signedUrl: 'https://example.com/test.pdf',
    pdfError: null,
    numPages: 3,
    containerRef: { current: null } as React.RefObject<HTMLDivElement | null>,
    scrollContainerRef: { current: null } as React.RefObject<HTMLDivElement | null>,
    pageRefs: { current: [null, null, null] } as React.MutableRefObject<(HTMLDivElement | null)[]>,
    setTransformRef: { current: null } as React.MutableRefObject<((x: number, y: number, scale: number) => void) | null>,
    handleTransformed: vi.fn(),
    handleScroll: vi.fn(),
    onDocumentLoadSuccess: vi.fn(),
    onDocumentLoadError: vi.fn(),
    onDocumentSourceError: vi.fn(),
    showControls: true,
    isThreeDotsMenuOpen: false,
    toggleThreeDotsMenu: vi.fn(),
    handleShare: vi.fn(),
    setCurrentPage: vi.fn(),
  };

  beforeEach(() => {
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
    if (typeof globalThis.IntersectionObserver === 'undefined') {
      globalThis.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof IntersectionObserver;
    }
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    lastTransformWrapperProps = {};
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

  it('disables panning and locks touchAction to pan-y at default scale 1', () => {
    const containerRef = { current: container };
    const scrollContainerRef = { current: document.createElement('div') };

    act(() => {
      root?.render(
        <PdfDocumentRenderer
          {...defaultProps}
          containerRef={containerRef}
          scrollContainerRef={scrollContainerRef}
        />
      );
    });

    // Check TransformWrapper props at scale 1
    const panning = lastTransformWrapperProps.panning as { disabled?: boolean; lockAxisX?: boolean };
    const trackPadPanning = lastTransformWrapperProps.trackPadPanning as { disabled?: boolean; lockAxisX?: boolean };

    expect(panning?.disabled).toBe(true);
    expect(panning?.lockAxisX).toBe(true);
    expect(trackPadPanning?.disabled).toBe(true);
    expect(trackPadPanning?.lockAxisX).toBe(true);

    // Check scroll container touch-action style
    const scrollContainer = (container?.querySelector(`.${scrollContainerRef.current.className}`) || scrollContainerRef.current) as HTMLElement;
    expect(scrollContainer.style.touchAction).toBe('pan-y');
  });

  it('enables panning and sets touchAction to pan-x pan-y when scale > 1.01', () => {
    const containerRef = { current: container };
    const scrollContainerRef = { current: document.createElement('div') };

    act(() => {
      root?.render(
        <PdfDocumentRenderer
          {...defaultProps}
          containerRef={containerRef}
          scrollContainerRef={scrollContainerRef}
        />
      );
    });

    const onTransform = lastTransformWrapperProps.onTransform as (ref: { state: { positionX: number; positionY: number; scale: number } }) => void;

    // Simulate zoom in transform event
    act(() => {
      onTransform({ state: { positionX: 50, positionY: 20, scale: 2.0 } });
    });

    const panning = lastTransformWrapperProps.panning as { disabled?: boolean; lockAxisX?: boolean };

    expect(panning?.disabled).toBe(false);
    expect(panning?.lockAxisX).toBe(false);

    const scrollContainer = scrollContainerRef.current;
    expect(scrollContainer.style.touchAction).toBe('pan-x pan-y');
  });

  it('re-locks panning and touchAction when zooming back out to scale 1', () => {
    const containerRef = { current: container };
    const scrollContainerRef = { current: document.createElement('div') };

    act(() => {
      root?.render(
        <PdfDocumentRenderer
          {...defaultProps}
          containerRef={containerRef}
          scrollContainerRef={scrollContainerRef}
        />
      );
    });

    const onTransform = lastTransformWrapperProps.onTransform as (ref: { state: { positionX: number; positionY: number; scale: number } }) => void;

    // Zoom in
    act(() => {
      onTransform({ state: { positionX: 50, positionY: 20, scale: 2.0 } });
    });

    // Zoom out back to 1
    act(() => {
      onTransform({ state: { positionX: 0, positionY: 0, scale: 1.0 } });
    });

    const panning = lastTransformWrapperProps.panning as { disabled?: boolean; lockAxisX?: boolean };

    expect(panning?.disabled).toBe(true);
    expect(panning?.lockAxisX).toBe(true);

    const scrollContainer = scrollContainerRef.current;
    expect(scrollContainer.style.touchAction).toBe('pan-y');
  });
});
