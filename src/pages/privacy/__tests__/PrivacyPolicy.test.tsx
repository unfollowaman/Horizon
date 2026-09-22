import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicy from '../PrivacyPolicy';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PrivacyPolicy Page', () => {
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

  it('renders Privacy Policy heading and sections', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <PrivacyPolicy />
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('Privacy Policy');

    const h2s = container?.querySelectorAll('h2');
    expect(h2s?.length).toBe(15);
    expect(h2s?.[0].textContent).toContain('1. Introduction');
    expect(h2s?.[14].textContent).toContain('15. Contact Information');
  });

  it('renders inline contact link with expected href', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <PrivacyPolicy />
        </MemoryRouter>
      );
    });

    const contactLink = container?.querySelector('a[href="/contact"]');
    expect(contactLink).not.toBeNull();
    expect(contactLink?.textContent).toContain('Contact');
  });
});
