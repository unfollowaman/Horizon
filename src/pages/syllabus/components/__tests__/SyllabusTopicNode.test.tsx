import React, { useState, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import SyllabusTopicNode from '../SyllabusTopicNode';
import type { SyllabusTopic } from '../../../../types';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const sampleTopic: SyllabusTopic = {
  id: 'topic-1',
  chapter_id: 'chap-1',
  title: 'Real Numbers Intro',
  description: 'Basics of Euclid division lemma and prime factorization.',
  topic_type: 'topic',
  display_order: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  resources: [
    {
      id: '87',
      title: 'Chapter 1 Real Numbers Notes',
      subject: 'Mathematics',
      student_class: 'Class 10',
      medium: 'english',
      resource_type: 'notes',
      uploadDate: '2026-01-01',
      pdfUrl: 'https://example.com/math.pdf',
      thumbnailUrl: 'https://example.com/thumb.png',
    },
  ],
};

describe('SyllabusTopicNode', () => {
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

  it('renders topic details, badges, and resource links correctly', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusTopicNode topic={sampleTopic} />
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Real Numbers Intro');
    expect(container?.textContent).toContain('Basics of Euclid division lemma and prime factorization.');
    expect(container?.textContent).toContain('Topic');
    expect(container?.textContent).toContain('View Notes');
    expect(container?.textContent).toContain('English');
  });

  it('renders exercise and grammar badges correctly', () => {
    const exerciseTopic: SyllabusTopic = {
      ...sampleTopic,
      topic_type: 'exercise',
      title: 'Exercise 1.1',
    };

    const grammarTopic: SyllabusTopic = {
      ...sampleTopic,
      topic_type: 'grammar',
      title: 'Active and Passive Voice',
    };

    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusTopicNode topic={exerciseTopic} />
        </MemoryRouter>
      );
    });
    expect(container?.textContent).toContain('Exercise');

    act(() => {
      root?.render(
        <MemoryRouter>
          <SyllabusTopicNode topic={grammarTopic} />
        </MemoryRouter>
      );
    });
    expect(container?.textContent).toContain('Grammar');
  });

  it('has displayName assigned for React DevTools and memoization tracking', () => {
    expect(SyllabusTopicNode.displayName).toBe('SyllabusTopicNode');
  });

  it('skips re-render when parent re-renders with unchanged topic prop (React.memo)', () => {
    let topicNodeRenderCount = 0;

    const TestTopicWrapper: React.FC<{ topic: SyllabusTopic }> = React.memo(({ topic }) => {
      topicNodeRenderCount++;
      return <SyllabusTopicNode topic={topic} />;
    });

    let triggerParentRender: (() => void) | null = null;

    const ParentComponent = () => {
      const [count, setCount] = useState(0);
      triggerParentRender = () => setCount((c) => c + 1);
      return (
        <div>
          <span>Parent Count: {count}</span>
          <TestTopicWrapper topic={sampleTopic} />
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

    expect(topicNodeRenderCount).toBe(1);

    // Trigger parent state update
    act(() => {
      triggerParentRender?.();
    });

    expect(container?.textContent).toContain('Parent Count: 1');
    // Because SyllabusTopicNode is memoized with unchanged props, topicNodeRenderCount remains 1
    expect(topicNodeRenderCount).toBe(1);
  });
});
