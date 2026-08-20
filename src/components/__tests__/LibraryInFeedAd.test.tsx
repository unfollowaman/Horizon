import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import LibraryInFeedAd from '../LibraryInFeedAd';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LibraryInFeedAd', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.adsbygoogle = [];
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
    delete window.adsbygoogle;
  });

  it('renders ins element with exact AdSense attributes', () => {
    act(() => {
      root?.render(<LibraryInFeedAd />);
    });

    const ins = container?.querySelector('ins.adsbygoogle');
    expect(ins).not.toBeNull();
    expect(ins?.getAttribute('data-ad-format')).toBe('fluid');
    expect(ins?.getAttribute('data-ad-layout-key')).toBe('+1u+s2-y-1h+6i');
    expect(ins?.getAttribute('data-ad-client')).toBe('ca-pub-9895594998996093');
    expect(ins?.getAttribute('data-ad-slot')).toBe('4471690440');
  });

  it('pushes ad configuration to window.adsbygoogle on mount', () => {
    act(() => {
      root?.render(<LibraryInFeedAd />);
    });

    expect(window.adsbygoogle?.length).toBe(1);
  });

  it('does not push duplicate ad configuration if re-rendered', () => {
    act(() => {
      root?.render(<LibraryInFeedAd />);
    });
    expect(window.adsbygoogle?.length).toBe(1);

    act(() => {
      root?.render(<LibraryInFeedAd />);
    });
    expect(window.adsbygoogle?.length).toBe(1);
  });
});
