import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import PdfLoadingScreen from '../PdfLoadingScreen';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PdfLoadingScreen', () => {
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

  it('renders "Rendering PDF" text correctly', () => {
    act(() => {
      root?.render(<PdfLoadingScreen />);
    });

    expect(container?.textContent).toContain('Rendering PDF');
    expect(container?.querySelector('h1')?.textContent).toBe('Rendering PDF');
  });

  it('contains independent visual layers for PDF, streaks, thermal wisps, and shadow', () => {
    act(() => {
      root?.render(<PdfLoadingScreen />);
    });

    // Rear and Front Streaks SVG layers
    const svgs = container?.querySelectorAll('svg');
    expect(svgs && svgs.length).toBeGreaterThanOrEqual(3);

    // PDF Object SVG
    expect(container?.querySelector('#pdfBody')).not.toBeNull();
    expect(container?.querySelector('#pdfDepthEdge')).not.toBeNull();

    // Hover Shadow using data-testid
    expect(container?.querySelector('[data-testid="hover-shadow"]')).not.toBeNull();

    // Thermal Wisps & Particles using data-testid
    expect(container?.querySelector('[data-testid="particle-system"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="thermal-wisps-svg"]')).not.toBeNull();
  });
});
