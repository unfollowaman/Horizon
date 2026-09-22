import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SyllabusTopicNode from '../SyllabusTopicNode';
import type { SyllabusTopic } from '../../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SyllabusTopicNode Component Tests', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
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

  it('renders topic title, description, and topic type badge correctly', async () => {
    const mockTopic: SyllabusTopic = {
      id: 'topic-1',
      chapter_id: 'ch-1',
      title: 'Chemical Reactions and Equations Overview',
      description: 'Understanding reactants, products, and chemical equation balancing.',
      topic_type: 'topic',
      display_order: 1,
      is_active: true,
      resources: [],
    };

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusTopicNode topic={mockTopic} />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Chemical Reactions and Equations Overview');
    expect(container?.textContent).toContain('Understanding reactants, products, and chemical equation balancing.');
    expect(container?.textContent).toContain('Topic');
  });

  it('renders linked resource action links with descriptive aria-label and focus-visible styling', async () => {
    const mockTopicWithResources: SyllabusTopic = {
      id: 'topic-2',
      chapter_id: 'ch-1',
      title: 'Balancing Chemical Equations',
      topic_type: 'topic',
      display_order: 2,
      is_active: true,
      resources: [
        {
          id: 'res-hindi-101',
          title: 'Chemical Reactions Notes in Hindi',
          medium: 'hindi',
          resource_type: 'notes',
          pdfUrl: '/view/res-hindi-101',
          thumbnailUrl: '',
          uploadDate: new Date().toISOString(),
        },
        {
          id: 'res-english-102',
          title: 'Chemical Reactions Notes in English',
          medium: 'english',
          resource_type: 'notes',
          pdfUrl: '/view/res-english-102',
          thumbnailUrl: '',
          uploadDate: new Date().toISOString(),
        },
      ],
    };

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusTopicNode topic={mockTopicWithResources} />
        </MemoryRouter>
      );
    });

    const hindiLink = container?.querySelector(
      'a[aria-label="View Hindi notes for Balancing Chemical Equations"]'
    );
    const englishLink = container?.querySelector(
      'a[aria-label="View English notes for Balancing Chemical Equations"]'
    );

    expect(hindiLink).not.toBeNull();
    expect(englishLink).not.toBeNull();

    expect(hindiLink?.getAttribute('href')).toBe('/resource/res-hindi-101');
    expect(englishLink?.getAttribute('href')).toBe('/resource/res-english-102');

    expect(hindiLink?.className).toContain('focus-visible:ring-2');
    expect(hindiLink?.className).toContain('focus-visible:ring-[#E91E8C]');
    expect(hindiLink?.className).toContain('focus-visible:ring-offset-2');

    expect(englishLink?.className).toContain('focus-visible:ring-2');
    expect(englishLink?.className).toContain('focus-visible:ring-[#E91E8C]');
    expect(englishLink?.className).toContain('focus-visible:ring-offset-2');
  });
});
