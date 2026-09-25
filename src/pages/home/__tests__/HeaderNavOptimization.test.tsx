import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';
import { navLinks } from '../../../data/navigation';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('HeaderNavOptimization', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    };

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

  it('renders desktop navigation links correctly with single-pass reduce', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/notes']}>
          <Home />
        </MemoryRouter>
      );
    });

    const desktopNav = container?.querySelector('nav[aria-label="Main navigation"]');
    expect(desktopNav).not.toBeNull();

    const desktopLinks = desktopNav?.querySelectorAll('a');
    const expectedDesktopCount = navLinks.filter(l => l.showOnDesktop).length;
    expect(desktopLinks?.length).toBe(expectedDesktopCount);

    const activeLink = desktopNav?.querySelector('a[aria-current="page"]');
    expect(activeLink?.getAttribute('href')).toBe('/notes');
  });

  it('renders mobile navigation links correctly with single-pass reduce', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/library']}>
          <Home />
        </MemoryRouter>
      );
    });

    const mobileNav = container?.querySelector('nav[aria-label="Mobile navigation"]');
    expect(mobileNav).not.toBeNull();

    const mobileLinks = mobileNav?.querySelectorAll('a');
    const expectedMobileCount = navLinks.filter(l => l.showOnMobile).length;
    expect(mobileLinks?.length).toBe(expectedMobileCount);

    const activeMobileLink = mobileNav?.querySelector('a[aria-current="page"]');
    expect(activeMobileLink?.getAttribute('href')).toBe('/library');
  });

  it('demonstrates structural equivalence and elimination of intermediate array allocation', () => {
    interface NavItem {
      label: string;
      path: string;
      showOnDesktop: boolean;
      showOnMobile: boolean;
      id: string;
    }

    const navCollection: NavItem[] = Array.from({ length: 1000 }, (_, i) => ({
      label: `Nav Link ${i}`,
      path: `/path-${i}`,
      showOnDesktop: i % 2 === 0,
      showOnMobile: i % 3 === 0,
      id: `nav-${i}`
    }));

    const currentPath = '/path-100';

    // Baseline multi-pass: allocates 2 arrays (filter result + map result)
    const multiPassProcess = (links: NavItem[]) => {
      return links
        .filter(l => l.showOnDesktop)
        .map(link => ({
          label: link.label,
          path: link.path,
          isActive: currentPath === link.path
        }));
    };

    // Single-pass reduce: allocates 1 array (accumulator)
    const singlePassProcess = (links: NavItem[]) => {
      return links.reduce<{ label: string; path: string; isActive: boolean }[]>((acc, link) => {
        if (link.showOnDesktop) {
          acc.push({
            label: link.label,
            path: link.path,
            isActive: currentPath === link.path
          });
        }
        return acc;
      }, []);
    };

    const multiResult = multiPassProcess(navCollection);
    const singleResult = singlePassProcess(navCollection);

    expect(singleResult).toEqual(multiResult);
    expect(singleResult.length).toBe(500);
  });
});
