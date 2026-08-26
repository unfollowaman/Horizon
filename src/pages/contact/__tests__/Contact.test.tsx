import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Contact from '../Contact';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Contact Page', () => {
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

  it('renders Contact heading and section titles', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Contact />
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('Contact Horizon');

    const h2s = container?.querySelectorAll('h2');
    expect(h2s?.length).toBe(2);
    expect(h2s?.[0].textContent).toContain('How Can We Help?');
    expect(h2s?.[1].textContent).toContain('Connect & Support');
  });

  it('renders all social links with correct hrefs', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Contact />
        </MemoryRouter>
      );
    });

    const links = Array.from(container?.querySelectorAll('a') || []);
    const hrefs = links.map(l => l.getAttribute('href'));

    expect(hrefs).toContain('mailto:tryhorizon18@gmail.com');
    expect(hrefs).toContain('https://x.com/unfollowaman');
    expect(hrefs).toContain('https://github.com/unfollowaman');
    expect(hrefs).toContain('https://www.instagram.com/unfollowaman_');
    expect(hrefs).toContain('https://substack.com/@unfollowaman');
  });

  it('sets document title and meta description on mount', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Contact />
        </MemoryRouter>
      );
    });

    expect(document.title).toBe('Contact Us | Horizon - Free Student Library');
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toContain('Get in touch with Horizon');
  });
});
