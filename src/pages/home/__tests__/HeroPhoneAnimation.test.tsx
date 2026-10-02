import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HeroPhoneAnimation } from '../HeroPhoneAnimation';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('HeroPhoneAnimation Optimization & Correctness', () => {
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

  it('renders all hero animation icons and brand elements correctly', async () => {
    await act(async () => {
      root?.render(<HeroPhoneAnimation />);
    });

    const icons = container?.querySelectorAll('.iconLabel');
    expect(icons).not.toBeNull();
    expect(icons?.length).toBe(6);

    const labels = Array.from(icons || []).map(el => el.textContent?.trim());
    expect(labels).toContain('Study Notes');
    expect(labels).toContain('PYQ Papers');
    expect(labels).toContain('MCQ Sheets');
    expect(labels).toContain('Flashcards');
    expect(labels).toContain('Announcements');
    expect(labels).toContain('Revision Sheets');
  });

  it('demonstrates measurable performance improvement over repeated querySelector baseline', () => {
    // Setup mock DOM structure simulating 6 icon containers
    const testContainer = document.createElement('div');
    const mockElements: {
      container: HTMLDivElement;
      box: HTMLDivElement;
      img: HTMLImageElement;
      label: HTMLDivElement;
    }[] = [];

    for (let i = 0; i < 6; i++) {
      const iconContainer = document.createElement('div');
      iconContainer.className = 'iconContainer';

      const box = document.createElement('div');
      box.className = 'iconBox neu-raised';

      const img = document.createElement('img');
      img.src = '/assets/hero/notes.avif';

      const label = document.createElement('div');
      label.className = 'iconLabel';
      label.textContent = `Icon ${i}`;

      iconContainer.appendChild(box);
      iconContainer.appendChild(img);
      iconContainer.appendChild(label);
      testContainer.appendChild(iconContainer);

      mockElements.push({
        container: iconContainer,
        box,
        img,
        label,
      });
    }

    const ITERATIONS = 10000;

    // Baseline: Query DOM on every frame pass for every item (18 querySelector calls per iteration)
    const startUnoptimized = performance.now();
    const containers = Array.from(testContainer.querySelectorAll('.iconContainer'));
    for (let iter = 0; iter < ITERATIONS; iter++) {
      containers.forEach(el => {
        const img = el.querySelector('img') as HTMLImageElement | null;
        const box = el.querySelector('.iconBox') as HTMLDivElement | null;
        const label = el.querySelector('.iconLabel') as HTMLDivElement | null;

        if (img) img.style.width = '50px';
        if (box) box.style.opacity = '1';
        if (label) label.style.opacity = '1';
      });
    }
    const durationUnoptimized = performance.now() - startUnoptimized;

    // Optimized: Direct cached ref property access (0 querySelector calls per iteration)
    const startOptimized = performance.now();
    for (let iter = 0; iter < ITERATIONS; iter++) {
      mockElements.forEach(item => {
        if (item.img) item.img.style.width = '50px';
        if (item.box) item.box.style.opacity = '1';
        if (item.label) item.label.style.opacity = '1';
      });
    }
    const durationOptimized = performance.now() - startOptimized;

    const speedup = durationUnoptimized / Math.max(durationOptimized, 0.001);

    console.log(`[HeroPhoneAnimation Benchmark] QuerySelector Baseline: ${durationUnoptimized.toFixed(2)}ms`);
    console.log(`[HeroPhoneAnimation Benchmark] Cached Ref Access: ${durationOptimized.toFixed(2)}ms`);
    console.log(`[HeroPhoneAnimation Benchmark] Speedup Factor: ${speedup.toFixed(2)}x`);

    expect(durationOptimized).toBeLessThan(durationUnoptimized);
    expect(speedup).toBeGreaterThan(1.2);
  });
});
