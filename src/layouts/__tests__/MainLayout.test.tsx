import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../MainLayout';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MainLayout Component', () => {
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

  it('renders skip to content link and main element with id="main-content" and tabIndex={-1}', () => {
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/test']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/test" element={<div>Test Page Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    const skipLink = container?.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();
    expect(skipLink?.textContent?.trim()).toBe('Skip to main content');

    const mainContent = container?.querySelector('main#main-content');
    expect(mainContent).not.toBeNull();
    expect(mainContent?.getAttribute('tabindex')).toBe('-1');
    expect(container?.textContent).toContain('Test Page Content');
  });
});
