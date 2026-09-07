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

  // Sort chapters by display_order or chapter_number
  const sortedChapters = [...chapters].sort((a, b) => {
    const orderA = a.display_order ?? a.chapter_number ?? 0;
    const orderB = b.display_order ?? b.chapter_number ?? 0;
    return orderA - orderB;
  });

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  let maxGraphWidth = 0;
  let maxGraphHeight = 0;

  sortedChapters.forEach((chapter, colIndex) => {
    const colX = PADDING + colIndex * (CHAPTER_WIDTH + COLUMN_GAP);
    const chapterY = PADDING;

    const topics = [...(chapter.syllabus_topics || [])].sort((a, b) => a.display_order - b.display_order);

    const chapterNodeId = `chapter-${chapter.id}`;
    const chapterNode: GraphNode = {
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
    };

    nodes.push(chapterNode);

    let currentColumnBottom = chapterY + CHAPTER_HEIGHT;
    let lastNodeId = chapterNodeId;
    let lastNodeY = chapterY;
    let lastNodeHeight = CHAPTER_HEIGHT;

    topics.forEach((topic, topicIdx) => {
      const isFirstTopic = topicIdx === 0;
      const gap = isFirstTopic ? HEADER_GAP : ROW_GAP;
      const topicY = lastNodeY + lastNodeHeight + gap;
      const topicNodeId = `topic-${topic.id}`;

      const topicNode: GraphNode = {
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
      };

      nodes.push(topicNode);

      // Edge connecting previous node to current topic node in sequence
      const edgeStartX = colX + CHAPTER_WIDTH / 2;
      const edgeStartY = lastNodeY + lastNodeHeight;
      const edgeEndX = colX + TOPIC_WIDTH / 2;
      const edgeEndY = topicY;

      edges.push({
        id: `edge-${lastNodeId}-${topic.id}`,
        source: lastNodeId,
        target: topicNodeId,
        startX: edgeStartX,
        startY: edgeStartY,
        endX: edgeEndX,
        endY: edgeEndY,
      });

      lastNodeId = topicNodeId;
      lastNodeY = topicY;
      lastNodeHeight = TOPIC_HEIGHT;
      currentColumnBottom = topicY + TOPIC_HEIGHT;
    });

    const colRight = colX + CHAPTER_WIDTH + PADDING;
    if (colRight > maxGraphWidth) {
      maxGraphWidth = colRight;
    }

    const colBottom = currentColumnBottom + PADDING;
    if (colBottom > maxGraphHeight) {
      maxGraphHeight = colBottom;
    }
  });

  return {
    nodes,
    edges,
    width: maxGraphWidth,
    height: maxGraphHeight,
  };
}
