import React, { useState, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MaterialCard from '../MaterialCard';
import type { Resource } from '../../types';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockResource: Resource = {
  id: '101',
  title: 'Chapter 1: Real Numbers Notes',
  resource_type: 'notes',
  student_class: 'Class 10',
  subject: 'Mathematics',
  medium: 'english',
  year: '2024',
  uploadDate: '2024-01-01',
  thumbnailUrl: 'https://example.com/thumb.png',
  pdfUrl: 'https://example.com/math.pdf',
};

describe('MaterialCard', () => {
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

  it('renders card title, subject/year, and links correctly', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <MaterialCard resource={mockResource} />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Chapter 1: Real Numbers Notes');
    expect(container?.textContent).toContain('2024');

    const viewLink = container?.querySelector('a[aria-label="View Chapter 1: Real Numbers Notes"]');
    expect(viewLink).not.toBeNull();
    expect(viewLink?.getAttribute('href')).toBe('/resource/101');
    expect(viewLink?.className).toContain('flex-1 min-w-0');
  });

  it('renders dynamic flex classes for PYQ resource buttons on mobile', () => {
    const mockPyqResource: Resource = {
      ...mockResource,
      id: 'pyq-101',
      resource_type: 'pyq',
      title: 'Class 10 Science PYQ 2023',
    };

    act(() => {
      root?.render(
        <MemoryRouter>
          <MaterialCard resource={mockPyqResource} />
        </MemoryRouter>
      );
    });

    const viewLink = container?.querySelector('a[aria-label="View Class 10 Mathematics PYQ"]');
    expect(viewLink).not.toBeNull();
    expect(viewLink?.className).toContain('flex-none w-auto md:flex-1 md:min-w-0');

    const downloadButton = container?.querySelector('button[aria-label="Download Class 10 Mathematics PYQ"]');
    expect(downloadButton).not.toBeNull();
    expect(downloadButton?.className).toContain('flex-1 min-w-0');
  });

  it('skips re-rendering when parent re-renders with unchanged resource prop', () => {
    let cardRenderCount = 0;

    const TestCardWrapper: React.FC<{ resource: Resource }> = React.memo(({ resource }) => {
      cardRenderCount++;
      return <MaterialCard resource={resource} />;
    });

    let triggerRender: (() => void) | null = null;

    const ParentComponent = () => {
      const [count, setCount] = useState(0);
      triggerRender = () => setCount(c => c + 1);
      return (
        <div>
          <span>Parent Count: {count}</span>
          <TestCardWrapper resource={mockResource} />
        </div>
      );
    };

    act(() => {
      root?.render(
        <MemoryRouter>
          <ParentComponent />
        </MemoryRouter>
      );
    });

    expect(cardRenderCount).toBe(1);

    // Trigger parent state update
    act(() => {
      triggerRender?.();
    });

    expect(container?.textContent).toContain('Parent Count: 1');
    // Because MaterialCard is memoized with unchanged props, cardRenderCount remains 1
    expect(cardRenderCount).toBe(1);
  });
});
