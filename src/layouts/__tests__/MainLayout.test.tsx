import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from '../MainLayout';

// Enable React act environment flag for React 19 testing
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

  it('renders skip to main content link targeting #main-content', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      );
    });

    const skipLink = container?.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();
    expect(skipLink?.textContent).toContain('Skip to main content');
    expect(skipLink?.className).toContain('sr-only');
    expect(skipLink?.className).toContain('focus:not-sr-only');
  });

  it('renders main element with id="main-content" and tabIndex={-1}', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      );
    });

    const mainElement = container?.querySelector('main#main-content');
    expect(mainElement).not.toBeNull();
    expect(mainElement?.getAttribute('tabindex')).toBe('-1');
  });
});
