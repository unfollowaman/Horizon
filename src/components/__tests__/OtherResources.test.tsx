import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import OtherResources from '../OtherResources';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('OtherResources', () => {
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

  it('renders feature links excluding current category with accessible aria-labels and focus-visible classes', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <OtherResources currentCategoryId="pyq" />
        </MemoryRouter>
      );
    });

    const links = container?.querySelectorAll('a');
    expect(links?.length).toBeGreaterThan(0);

    // Should exclude PYQ Papers
    expect(container?.textContent).not.toContain('PYQ Papers');
    expect(container?.textContent).toContain('Study Notes');

    links?.forEach((link) => {
      expect(link.getAttribute('aria-label')).toMatch(/^Go to /);
      expect(link.className).toContain('focus-visible:ring-[#E91E8C]');
      expect(link.className).toContain('rounded-2xl');
    });
  });
});
