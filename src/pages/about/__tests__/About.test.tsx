import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import About from '../About';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('About Page', () => {
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

  it('renders About title and subheadings', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <About />
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('About Horizon');

    const h3s = Array.from(container?.querySelectorAll('h3') || []).map(el => el.textContent);
    expect(h3s).toContain('Why Horizon');
    expect(h3s).toContain('How it works');
    expect(h3s).toContain('Our Mission');
    expect(h3s).toContain('An Evolving Online Library');
    expect(h3s).toContain('Transparency & Quality');
  });

  it('renders inline links with descriptive ARIA labels and correct destinations', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <About />
        </MemoryRouter>
      );
    });

    const libraryLink = container?.querySelector('a[href="/library"]');
    expect(libraryLink).toBeTruthy();
    expect(libraryLink?.getAttribute('aria-label')).toBe('Visit our online Library to browse study materials');

    const contactLink = container?.querySelector('a[href="/contact"]');
    expect(contactLink).toBeTruthy();
    expect(contactLink?.getAttribute('aria-label')).toBe('Go to the Contact page to send feedback or report issues');
  });

  it('sets document title and meta description on mount', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <About />
        </MemoryRouter>
      );
    });

    expect(document.title).toBe('About Us | Horizon - Free Learning Platform');
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toContain('Learn more about Horizon');
  });
});
