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
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  it('keeps the PDF, velocity, thermal, particle, and shadow systems as separate SVG layers', () => {
    act(() => root?.render(<PdfLoadingScreen />));

    expect(container?.textContent).toContain('Rendering PDF');
    expect(container?.textContent).not.toContain('Rendering PDF...');
    expect(container?.querySelector('svg')).not.toBeNull();
    expect(container?.querySelectorAll('svg g')).toHaveLength(8);
    expect(container?.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Rendering PDF');
  });
});
