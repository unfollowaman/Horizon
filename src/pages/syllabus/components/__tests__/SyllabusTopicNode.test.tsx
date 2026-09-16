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

  const sampleTopic: SyllabusTopic = {
    id: 'topic-1',
    chapter_id: 'chap-1',
    title: 'Real Numbers & Divisibility',
    description: 'Fundamental Theorem of Arithmetic and Euclidean algorithm',
    topic_type: 'topic',
    display_order: 1,
    is_active: true,
    resources: [
      {
        id: 'res-101',
        title: 'Real Numbers Notes',
        description: 'Detailed study notes for real numbers',
        resource_type: 'notes',
        medium: 'english',
        uploadDate: '2026-01-01T00:00:00Z',
        pdfUrl: 'https://example.com/notes.pdf',
        thumbnailUrl: '',
        student_class: 'Class 10',
        subject: 'Mathematics',
      },
    ],
  };

  it('renders topic title, description, badge, and linked resources', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusTopicNode topic={sampleTopic} />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Real Numbers & Divisibility');
    expect(container?.textContent).toContain('Fundamental Theorem of Arithmetic and Euclidean algorithm');
    expect(container?.textContent).toContain('Topic');

    const resourceLink = container?.querySelector('a[href="/resource/res-101"]');
    expect(resourceLink).not.toBeNull();
    expect(container?.textContent).toContain('View Notes');
    expect(container?.textContent).toContain('English');
  });

  it('renders correct badges for grammar and exercise topic types', async () => {
    const grammarTopic: SyllabusTopic = {
      ...sampleTopic,
      id: 'topic-2',
      title: 'Tenses and Verbs',
      topic_type: 'grammar',
    };

    const exerciseTopic: SyllabusTopic = {
      ...sampleTopic,
      id: 'topic-3',
      title: 'Exercise 1.1',
      topic_type: 'exercise',
    };

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusTopicNode topic={grammarTopic} />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Grammar');

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <SyllabusTopicNode topic={exerciseTopic} />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Exercise');
  });

  it('has React.memo displayName attached', () => {
    expect(SyllabusTopicNode.displayName).toBe('SyllabusTopicNode');
  });
});
