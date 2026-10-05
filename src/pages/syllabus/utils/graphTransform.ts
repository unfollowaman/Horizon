import type { SyllabusChapterHierarchy, Resource } from '../../../types';

export interface GraphNodeData {
  title: string;
  chapterNumber?: number;
  chapterSummary?: string | null;
  topicType?: string;
  description?: string | null;
  resources?: Resource[];
  chapterId?: string;
  topicCount?: number;
}

export interface GraphNode {
  id: string;
  type: 'chapter' | 'topic';
  x: number;
  y: number;
  width: number;
  height: number;
  data: GraphNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface SyllabusGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

// Layout Constants - generous card height allocations and gaps to eliminate card overlaps
const CHAPTER_WIDTH = 340;
const CHAPTER_HEIGHT = 130;
const TOPIC_WIDTH = 340;
const TOPIC_HEIGHT = 140;
const COLUMN_GAP = 80;
const ROW_GAP = 50;
const HEADER_GAP = 60;
const PADDING = 50;

export function transformHierarchyToGraph(chapters: SyllabusChapterHierarchy[]): SyllabusGraph {
  if (!chapters || chapters.length === 0) {
    return {
      nodes: [],
      edges: [],
      width: 0,
      height: 0,
    };
  }

  // Skip array allocation and sorting when chapters count is <= 1
  const sortedChapters =
    chapters.length > 1
      ? [...chapters].sort((a, b) => {
          const orderA = a.display_order ?? a.chapter_number ?? 0;
          const orderB = b.display_order ?? b.chapter_number ?? 0;
          return orderA - orderB;
        })
      : chapters;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  let maxGraphWidth = 0;
  let maxGraphHeight = 0;

  // Single-pass indexed loop eliminating closure allocation
  for (let colIndex = 0; colIndex < sortedChapters.length; colIndex++) {
    const chapter = sortedChapters[colIndex];
    const colX = PADDING + colIndex * (CHAPTER_WIDTH + COLUMN_GAP);
    const chapterY = PADDING;

    const rawTopics = chapter.syllabus_topics || [];
    // Skip topic array allocation and sorting when topics count is <= 1
    const topics =
      rawTopics.length > 1
        ? [...rawTopics].sort((a, b) => a.display_order - b.display_order)
        : rawTopics;

    const chapterNodeId = `chapter-${chapter.id}`;
    nodes.push({
      id: chapterNodeId,
      type: 'chapter',
      x: colX,
      y: chapterY,
      width: CHAPTER_WIDTH,
      height: CHAPTER_HEIGHT,
      data: {
        title: chapter.chapter_name,
        chapterNumber: chapter.chapter_number,
        chapterSummary: chapter.chapter_summary,
        topicCount: topics.length,
        chapterId: chapter.id,
      },
    });

    let currentColumnBottom = chapterY + CHAPTER_HEIGHT;
    let lastNodeId = chapterNodeId;
    let lastNodeY = chapterY;
    let lastNodeHeight = CHAPTER_HEIGHT;

    for (let topicIdx = 0; topicIdx < topics.length; topicIdx++) {
      const topic = topics[topicIdx];
      const gap = topicIdx === 0 ? HEADER_GAP : ROW_GAP;
      const topicY = lastNodeY + lastNodeHeight + gap;
      const topicNodeId = `topic-${topic.id}`;

      nodes.push({
        id: topicNodeId,
        type: 'topic',
        x: colX,
        y: topicY,
        width: TOPIC_WIDTH,
        height: TOPIC_HEIGHT,
        data: {
          title: topic.title,
          description: topic.description,
          topicType: topic.topic_type,
          resources: topic.resources || [],
          chapterId: chapter.id,
        },
      });

      // Edge connecting previous node to current topic node in sequence
      edges.push({
        id: `edge-${lastNodeId}-${topic.id}`,
        source: lastNodeId,
        target: topicNodeId,
        startX: colX + CHAPTER_WIDTH / 2,
        startY: lastNodeY + lastNodeHeight,
        endX: colX + TOPIC_WIDTH / 2,
        endY: topicY,
      });

      lastNodeId = topicNodeId;
      lastNodeY = topicY;
      lastNodeHeight = TOPIC_HEIGHT;
      currentColumnBottom = topicY + TOPIC_HEIGHT;
    }

    const colRight = colX + CHAPTER_WIDTH + PADDING;
    if (colRight > maxGraphWidth) {
      maxGraphWidth = colRight;
    }

    const colBottom = currentColumnBottom + PADDING;
    if (colBottom > maxGraphHeight) {
      maxGraphHeight = colBottom;
    }
  }

  return {
    nodes,
    edges,
    width: maxGraphWidth,
    height: maxGraphHeight,
  };
}
