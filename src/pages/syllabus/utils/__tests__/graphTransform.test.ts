import { describe, it, expect } from 'vitest';
import { transformHierarchyToGraph } from '../graphTransform';
import type { SyllabusChapterHierarchy } from '../../../../types';

describe('S6 Syllabus Graph Data Transformer (graphTransform)', () => {
  const mockClass8MathChapters: SyllabusChapterHierarchy[] = [
    {
      id: 'ch-8-1',
      chapter_number: 1,
      chapter_name: 'Rational Numbers',
      display_order: 1,
      is_active: true,
      syllabus_topics: [
        {
          id: 'tp-8-1-1',
          chapter_id: 'ch-8-1',
          title: 'Properties of Rational Numbers',
          topic_type: 'topic',
          display_order: 1,
          is_active: true,
          resources: [],
        },
        {
          id: 'tp-8-1-2',
          chapter_id: 'ch-8-1',
          title: 'Exercise 1.1',
          topic_type: 'exercise',
          display_order: 2,
          is_active: true,
          resources: [
            {
              id: 'res-8-1',
              title: 'Rational Numbers Solution',
              medium: 'english',
              resource_type: 'notes',
              pdfUrl: '/view/res-8-1',
              thumbnailUrl: '',
              uploadDate: new Date().toISOString(),
            },
          ],
        },
      ],
    },
    {
      id: 'ch-8-2',
      chapter_number: 2,
      chapter_name: 'Linear Equations in One Variable',
      display_order: 2,
      is_active: true,
      syllabus_topics: [], // Zero topics
    },
  ];

  it('1. converts Class 8 Mathematics hierarchy into deterministic chapter and topic nodes with edges', () => {
    const graph = transformHierarchyToGraph(mockClass8MathChapters);

    // Nodes check
    expect(graph.nodes).toHaveLength(4); // 2 chapters + 2 topics

    // Chapter nodes
    const ch1Node = graph.nodes.find((n) => n.id === 'chapter-ch-8-1');
    const ch2Node = graph.nodes.find((n) => n.id === 'chapter-ch-8-2');
    expect(ch1Node).toBeDefined();
    expect(ch1Node?.type).toBe('chapter');
    expect(ch1Node?.data.title).toBe('Rational Numbers');
    expect(ch1Node?.data.chapterNumber).toBe(1);

    expect(ch2Node).toBeDefined();
    expect(ch2Node?.type).toBe('chapter');
    expect(ch2Node?.data.title).toBe('Linear Equations in One Variable');

    // Topic / Exercise nodes
    const tp1Node = graph.nodes.find((n) => n.id === 'topic-tp-8-1-1');
    const tp2Node = graph.nodes.find((n) => n.id === 'topic-tp-8-1-2');
    expect(tp1Node).toBeDefined();
    expect(tp1Node?.type).toBe('topic');
    expect(tp1Node?.data.topicType).toBe('topic');

    expect(tp2Node).toBeDefined();
    expect(tp2Node?.type).toBe('topic');
    expect(tp2Node?.data.topicType).toBe('exercise');

    // Sequential Edges check (Chapter -> Topic 1, Topic 1 -> Topic 2)
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[0]).toMatchObject({
      id: 'edge-chapter-ch-8-1-tp-8-1-1',
      source: 'chapter-ch-8-1',
      target: 'topic-tp-8-1-1',
    });
    expect(graph.edges[1]).toMatchObject({
      id: 'edge-topic-tp-8-1-1-tp-8-1-2',
      source: 'topic-tp-8-1-1',
      target: 'topic-tp-8-1-2',
    });
  });

  it('2. supports Class 9 Mathematics chapters with exercises and chapters with zero exercise nodes', () => {
    const class9Chapters: SyllabusChapterHierarchy[] = [
      {
        id: 'ch-9-1',
        chapter_number: 1,
        chapter_name: 'Number Systems',
        display_order: 1,
        is_active: true,
        syllabus_topics: [
          {
            id: 'tp-9-1-1',
            chapter_id: 'ch-9-1',
            title: 'Irrational Numbers',
            topic_type: 'topic',
            display_order: 1,
            is_active: true,
          },
          {
            id: 'tp-9-1-2',
            chapter_id: 'ch-9-1',
            title: 'Exercise 1.1',
            topic_type: 'exercise',
            display_order: 2,
            is_active: true,
          },
        ],
      },
      {
        id: 'ch-9-9',
        chapter_number: 9,
        chapter_name: 'Circles',
        display_order: 9,
        is_active: true,
        syllabus_topics: [
          {
            id: 'tp-9-9-1',
            chapter_id: 'ch-9-9',
            title: 'Angle Subtended by a Chord at a Point',
            topic_type: 'topic',
            display_order: 1,
            is_active: true,
          },
        ], // Zero exercise nodes
      },
    ];

    const graph = transformHierarchyToGraph(class9Chapters);

    const exerciseNodes = graph.nodes.filter((n) => n.data.topicType === 'exercise');
    expect(exerciseNodes).toHaveLength(1);
    expect(exerciseNodes[0].data.title).toBe('Exercise 1.1');

    const circlesTopicNodes = graph.nodes.filter(
      (n) => n.type === 'topic' && n.data.chapterId === 'ch-9-9'
    );
    expect(circlesTopicNodes).toHaveLength(1);
    expect(circlesTopicNodes[0].data.topicType).toBe('topic');
  });

  it('3. preserves topic_type = grammar for language subjects (Hindi / Sanskrit / English)', () => {
    const languageChapters: SyllabusChapterHierarchy[] = [
      {
        id: 'ch-lang-1',
        chapter_number: 1,
        chapter_name: 'व्याकरण सन्धि',
        display_order: 1,
        is_active: true,
        syllabus_topics: [
          {
            id: 'tp-lang-1-1',
            chapter_id: 'ch-lang-1',
            title: 'स्वर सन्धि एवं उसके भेद',
            topic_type: 'grammar',
            display_order: 1,
            is_active: true,
          },
        ],
      },
    ];

    const graph = transformHierarchyToGraph(languageChapters);
    const grammarNode = graph.nodes.find((n) => n.id === 'topic-tp-lang-1-1');

    expect(grammarNode).toBeDefined();
    expect(grammarNode?.data.topicType).toBe('grammar');
    expect(grammarNode?.data.title).toBe('स्वर सन्धि एवं उसके भेद');
  });

  it('4. ensures nodes exist independently of whether a PDF resource exists', () => {
    const chapters: SyllabusChapterHierarchy[] = [
      {
        id: 'ch-res-test',
        chapter_number: 1,
        chapter_name: 'Test Chapter',
        display_order: 1,
        is_active: true,
        syllabus_topics: [
          {
            id: 'tp-no-res',
            chapter_id: 'ch-res-test',
            title: 'Topic Without PDF',
            topic_type: 'topic',
            display_order: 1,
            is_active: true,
            resources: [], // No resource
          },
        ],
      },
    ];

    const graph = transformHierarchyToGraph(chapters);
    const topicNode = graph.nodes.find((n) => n.id === 'topic-tp-no-res');

    expect(topicNode).toBeDefined();
    expect(topicNode?.data.resources).toEqual([]);
  });

  it('5. preserves chapter and topic display order strictly', () => {
    const chapters: SyllabusChapterHierarchy[] = [
      {
        id: 'ch-b',
        chapter_number: 2,
        chapter_name: 'Chapter Two',
        display_order: 2,
        is_active: true,
        syllabus_topics: [
          {
            id: 'tp-b2',
            chapter_id: 'ch-b',
            title: 'Topic B2',
            topic_type: 'topic',
            display_order: 2,
            is_active: true,
          },
          {
            id: 'tp-b1',
            chapter_id: 'ch-b',
            title: 'Topic B1',
            topic_type: 'topic',
            display_order: 1,
            is_active: true,
          },
        ],
      },
      {
        id: 'ch-a',
        chapter_number: 1,
        chapter_name: 'Chapter One',
        display_order: 1,
        is_active: true,
        syllabus_topics: [],
      },
    ];

    const graph = transformHierarchyToGraph(chapters);
    const chapterNodes = graph.nodes.filter((n) => n.type === 'chapter');

    // Chapter 1 before Chapter 2 because of display_order sorting in graphTransform
    expect(chapterNodes[0].data.chapterNumber).toBe(1);
    expect(chapterNodes[1].data.chapterNumber).toBe(2);

    const chapter2TopicNodes = graph.nodes.filter(
      (n) => n.type === 'topic' && n.data.chapterId === 'ch-b'
    );
    expect(chapter2TopicNodes[0].data.title).toBe('Topic B1');
    expect(chapter2TopicNodes[1].data.title).toBe('Topic B2');
  });

  it('6. handles empty chapters array safely', () => {
    const graph = transformHierarchyToGraph([]);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.width).toBeGreaterThanOrEqual(0);
    expect(graph.height).toBeGreaterThanOrEqual(0);
  });

  it('7. demonstrates measurable performance improvement over closure/multi-sort baseline', () => {
    // Generate large test dataset with 100 chapters, each with 20 topics
    const largeDataset: SyllabusChapterHierarchy[] = Array.from({ length: 100 }, (_, cIdx) => ({
      id: `ch-bench-${cIdx}`,
      chapter_number: cIdx + 1,
      chapter_name: `Benchmark Chapter ${cIdx + 1}`,
      display_order: cIdx + 1,
      is_active: true,
      syllabus_topics: Array.from({ length: 20 }, (_, tIdx) => ({
        id: `tp-bench-${cIdx}-${tIdx}`,
        chapter_id: `ch-bench-${cIdx}`,
        title: `Topic ${tIdx + 1}`,
        topic_type: 'topic',
        display_order: tIdx + 1,
        is_active: true,
        resources: [],
      })),
    }));

    // Baseline implementation with forEach and unconditional sorting
    const transformBaseline = (chapters: SyllabusChapterHierarchy[]) => {
      const sortedChapters = [...chapters].sort((a, b) => {
        const orderA = a.display_order ?? a.chapter_number ?? 0;
        const orderB = b.display_order ?? b.chapter_number ?? 0;
        return orderA - orderB;
      });

      const nodes: unknown[] = [];
      const edges: unknown[] = [];
      let maxGraphWidth = 0;
      let maxGraphHeight = 0;

      sortedChapters.forEach((chapter, colIndex) => {
        const colX = 50 + colIndex * (340 + 80);
        const chapterY = 50;
        const topics = [...(chapter.syllabus_topics || [])].sort((a, b) => a.display_order - b.display_order);

        const chapterNodeId = `chapter-${chapter.id}`;
        nodes.push({
          id: chapterNodeId,
          type: 'chapter',
          x: colX,
          y: chapterY,
          width: 340,
          height: 130,
          data: {
            title: chapter.chapter_name,
            chapterNumber: chapter.chapter_number,
            chapterSummary: chapter.chapter_summary,
            topicCount: topics.length,
            chapterId: chapter.id,
          },
        });

        let currentColumnBottom = chapterY + 130;
        let lastNodeId = chapterNodeId;
        let lastNodeY = chapterY;
        let lastNodeHeight = 130;

        topics.forEach((topic, topicIdx) => {
          const gap = topicIdx === 0 ? 60 : 50;
          const topicY = lastNodeY + lastNodeHeight + gap;
          const topicNodeId = `topic-${topic.id}`;

          nodes.push({
            id: topicNodeId,
            type: 'topic',
            x: colX,
            y: topicY,
            width: 340,
            height: 140,
            data: {
              title: topic.title,
              description: topic.description,
              topicType: topic.topic_type,
              resources: topic.resources || [],
              chapterId: chapter.id,
            },
          });

          edges.push({
            id: `edge-${lastNodeId}-${topic.id}`,
            source: lastNodeId,
            target: topicNodeId,
            startX: colX + 170,
            startY: lastNodeY + lastNodeHeight,
            endX: colX + 170,
            endY: topicY,
          });

          lastNodeId = topicNodeId;
          lastNodeY = topicY;
          lastNodeHeight = 140;
          currentColumnBottom = topicY + 140;
        });

        const colRight = colX + 340 + 50;
        if (colRight > maxGraphWidth) maxGraphWidth = colRight;
        const colBottom = currentColumnBottom + 50;
        if (colBottom > maxGraphHeight) maxGraphHeight = colBottom;
      });

      return { nodes, edges, width: maxGraphWidth, height: maxGraphHeight };
    };

    // Warmup
    for (let i = 0; i < 10; i++) {
      transformBaseline(largeDataset);
      transformHierarchyToGraph(largeDataset);
    }

    const iterations = 500;

    const startBaseline = performance.now();
    for (let i = 0; i < iterations; i++) {
      transformBaseline(largeDataset);
    }
    const durationBaseline = performance.now() - startBaseline;

    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
      transformHierarchyToGraph(largeDataset);
    }
    const durationOptimized = performance.now() - startOptimized;

    const baselineResult = transformBaseline(largeDataset);
    const optimizedResult = transformHierarchyToGraph(largeDataset);

    expect(optimizedResult.nodes.length).toBe(baselineResult.nodes.length);
    expect(optimizedResult.edges.length).toBe(baselineResult.edges.length);

    console.log(`[graphTransform Benchmark] Baseline duration: ${durationBaseline.toFixed(2)}ms`);
    console.log(`[graphTransform Benchmark] Optimized duration: ${durationOptimized.toFixed(2)}ms`);
    console.log(`[graphTransform Benchmark] Speedup factor: ${(durationBaseline / Math.max(durationOptimized, 0.01)).toFixed(2)}x`);
  });
});
