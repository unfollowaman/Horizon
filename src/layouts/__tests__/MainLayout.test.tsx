import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from '../MainLayout';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('MainLayout', () => {
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

  it('renders a "Skip to main content" link pointing to #main-content', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      );
    });

    const skipLink = container?.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();
    expect(skipLink?.textContent).toBe('Skip to main content');
  });

  it('renders a main element with id="main-content" and tabIndex={-1}', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      );
    });

    const mainElement = container?.querySelector('#main-content');
    expect(mainElement).not.toBeNull();
    expect(mainElement?.getAttribute('tabindex')).toBe('-1');
  });
});
