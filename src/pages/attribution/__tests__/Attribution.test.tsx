import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Attribution from '../Attribution';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Attribution Page', () => {
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

  it('renders Attribution & Sourcing heading and sections', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Attribution />
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('Attribution & Sourcing');

    const h2s = container?.querySelectorAll('h2');
    expect(h2s?.[0].textContent).toContain('Educational Content Sourcing');
  });

  it('renders inline links for external sources and contact page', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Attribution />
        </MemoryRouter>
      );
    });

    const contactLink = container?.querySelector('a[href="/contact"]');
    expect(contactLink).not.toBeNull();
    expect(contactLink?.textContent).toContain('Contact');

    const rbseLink = container?.querySelector('a[href="https://rajeduboard.rajasthan.gov.in"]');
    expect(rbseLink).not.toBeNull();
  });
});
