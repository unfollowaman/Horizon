import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PdfPageSlider } from '../PdfPageSlider';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PdfPageSlider', () => {
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

  const dummyProps = {
    sliderContainerRef: React.createRef<HTMLDivElement>(),
    isSliderVisible: true,
    currentPage: 5,
    sliderTopPx: 250,
    isDraggingSlider: false,
    onSliderTouchStart: vi.fn(),
    onSliderTouchMove: vi.fn(),
    onSliderTouchEnd: vi.fn(),
    onSliderMouseDown: vi.fn(),
  };

  it('renders current page number accurately', () => {
    act(() => {
      root?.render(<PdfPageSlider {...dummyProps} currentPage={5} />);
    });
    expect(container?.textContent).toContain('5');
  });

  it('renders updated current page number when page changes', () => {
    act(() => {
      root?.render(<PdfPageSlider {...dummyProps} currentPage={1} />);
    });
    expect(container?.textContent).toContain('1');

    act(() => {
      root?.render(<PdfPageSlider {...dummyProps} currentPage={12} />);
    });
    expect(container?.textContent).toContain('12');
  });

  it('applies top position style and visible class correctly', () => {
    act(() => {
      root?.render(<PdfPageSlider {...dummyProps} sliderTopPx={320} isSliderVisible={true} />);
    });
    const sliderContainer = container?.firstElementChild as HTMLElement;

    expect(sliderContainer.style.top).toBe('320px');
    expect(sliderContainer.className).toContain('sliderVisible');
  });

  it('applies sliderHidden class when isSliderVisible is false', () => {
    act(() => {
      root?.render(<PdfPageSlider {...dummyProps} isSliderVisible={false} />);
    });
    const sliderContainer = container?.firstElementChild as HTMLElement;

    expect(sliderContainer.className).toContain('sliderHidden');
  });

  it('disables transition style when dragging', () => {
    act(() => {
      root?.render(<PdfPageSlider {...dummyProps} isDraggingSlider={true} />);
    });
    const sliderContainer = container?.firstElementChild as HTMLElement;

    expect(sliderContainer.style.transition).toBe('none');
  });
});
