import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import CopyrightFooter from '../CopyrightFooter';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('CopyrightFooter Component', () => {
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

  it('renders exact copyright text with serif styling', () => {
    act(() => {
      root?.render(<CopyrightFooter />);
    });

    const copyrightParagraph = container?.querySelector('p');
    expect(copyrightParagraph).not.toBeNull();
    expect(copyrightParagraph?.textContent).toContain('© 2026 Horizon Educational Platform. All rights reserved.');
    expect(copyrightParagraph?.className).toContain('font-serif');
  });

  it('renders Horizon logo badge with correct asset source and attributes', () => {
    act(() => {
      root?.render(<CopyrightFooter />);
    });

    const logoImg = container?.querySelector('img[alt="Horizon Logo"]') as HTMLImageElement;
    expect(logoImg).not.toBeNull();
    expect(logoImg.getAttribute('src')).toBe('/assets/favicon/logo.avif');
    expect(logoImg.getAttribute('loading')).toBe('lazy');
    expect(logoImg.getAttribute('decoding')).toBe('async');

    const badgeContainer = logoImg.parentElement;
    expect(badgeContainer).not.toBeNull();
    expect(badgeContainer?.className).toContain('bg-white');
    expect(badgeContainer?.className).toContain('rounded-lg');
  });

  it('renders vertical divider with pink styling', () => {
    act(() => {
      root?.render(<CopyrightFooter />);
    });

    const divider = container?.querySelector('[aria-hidden="true"].bg-\\[\\#E11584\\]\\/40');
    expect(divider).not.toBeNull();
    expect(divider?.className).toContain('w-[1.5px]');
    expect(divider?.className).toContain('rounded-full');
  });

  it('renders layered decorative flowing pink waves inside clipped container', () => {
    act(() => {
      root?.render(<CopyrightFooter />);
    });

    const waveSvg = container?.querySelector('svg');
    expect(waveSvg).not.toBeNull();
    const paths = waveSvg?.querySelectorAll('path');
    expect(paths?.length).toBe(4);

    const outerContainer = container?.querySelector('footer > div');
    expect(outerContainer?.className).toContain('overflow-hidden');
    expect(outerContainer?.className).toContain('border-[#FCE7F3]');
  });
});
