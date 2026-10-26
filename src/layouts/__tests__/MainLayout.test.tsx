import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '../MainLayout';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SamplePage: React.FC = () => <div>Sample Page Content</div>;

describe('MainLayout Component Accessibility', () => {
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

  it('renders "Skip to main content" link with correct attributes and href', () => {
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<SamplePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    const skipLink = container?.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();
    expect(skipLink?.textContent?.trim()).toBe('Skip to main content');
    expect(skipLink?.className).toContain('sr-only');
    expect(skipLink?.className).toContain('focus:not-sr-only');
    expect(skipLink?.className).toContain('focus:ring-[#E91E8C]');
  });

  it('renders main element with id="main-content" and tabIndex={-1}', () => {
    act(() => {
      root?.render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<SamplePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    const mainEl = container?.querySelector('main#main-content');
    expect(mainEl).not.toBeNull();
    expect(mainEl?.getAttribute('tabindex')).toBe('-1');
    expect(mainEl?.textContent).toContain('Sample Page Content');
  });
});
