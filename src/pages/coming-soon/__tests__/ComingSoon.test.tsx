import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ComingSoon from '../ComingSoon';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ComingSoon Page', () => {
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

  it('renders heading, description, decorative illustration, and accessible home link', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <ComingSoon />
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('Coming Soon');

    const p = container?.querySelector('p');
    expect(p?.textContent).toContain('We are working hard to bring you this feature');

    const image = container?.querySelector('img');
    expect(image).toBeTruthy();
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.getAttribute('aria-hidden')).toBe('true');

    const homeLink = container?.querySelector('a');
    expect(homeLink).toBeTruthy();
    expect(homeLink?.textContent?.trim()).toBe('Back to Home');
    expect(homeLink?.getAttribute('href')).toBe('/');
    expect(homeLink?.className).toContain('focus-visible:ring-2');
    expect(homeLink?.className).toContain('focus-visible:ring-[#E91E8C]');
  });
});
