import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Terms from '../Terms';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Terms Page', () => {
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

  it('renders Terms of Service heading and sections', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Terms />
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('Terms of Service');

    const h2s = container?.querySelectorAll('h2');
    expect(h2s?.length).toBe(13);
    expect(h2s?.[0].textContent).toContain('1. Acceptance of Terms');
    expect(h2s?.[2].textContent).toContain('3. Educational Content and Usage');
    expect(h2s?.[12].textContent).toContain('13. Contact Information');
  });

  it('sets document title and meta description on mount', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Terms />
        </MemoryRouter>
      );
    });

    expect(document.title).toBe('Terms of Service | Horizon - Free Student Library');
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toContain('Terms of Service for Horizon');
  });
});
