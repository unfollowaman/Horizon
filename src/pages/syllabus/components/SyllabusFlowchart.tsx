import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { SyllabusChapterHierarchy, Resource } from '../../../types';
import { transformHierarchyToGraph, type GraphNode } from '../utils/graphTransform';

interface SyllabusFlowchartProps {
  chapters: SyllabusChapterHierarchy[];
  subjectName: string;
  classNameTitle: string;
}

export const SyllabusFlowchart: React.FC<SyllabusFlowchartProps> = ({
  chapters,
  subjectName,
  classNameTitle,
}) => {
  const graph = useMemo(() => transformHierarchyToGraph(chapters), [chapters]);
  const [currentScale, setCurrentScale] = useState<number>(1);

  if (!chapters || chapters.length === 0) {
    return (
      <div className="neu-card rounded-2xl p-8 text-center space-y-3">
        <h3 className="text-lg font-bold text-ink">No Syllabus Found</h3>
        <p className="text-sm text-ink/70">
          Syllabus data is currently not available for {classNameTitle} {subjectName}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0 w-full">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-ink/10 min-w-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase text-ink m-0">
            {classNameTitle} — {subjectName} Flowchart
          </h2>
          <p className="text-xs sm:text-sm text-ink/70 m-0 pt-1">
            Interactive visual roadmap of chapters, topics, exercises, and linked study resources.
          </p>
        </div>
      </div>

      {/* Main Graph Viewport Container */}
      <div className="relative w-full rounded-2xl neu-recessed overflow-hidden min-h-[500px] sm:min-h-[600px] h-[70vh] max-h-[800px]">
        <TransformWrapper
          initialScale={1}
          minScale={0.4}
          maxScale={2.5}
          centerOnInit={false}
          limitToBounds={false}
          wheel={{ step: 0.1 }}
          panning={{
            velocityDisabled: false,
            excluded: ['a', 'button'],
          }}
          onTransform={(ref) => {
            if (ref.state) {
              setCurrentScale(ref.state.scale);
            }
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Floating Graph Controls */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-cream/90 backdrop-blur-md p-1.5 rounded-xl neu-raised shadow-md border border-ink/10">
                <button
                  type="button"
                  onClick={() => zoomIn(0.2)}
                  aria-label="Zoom in flowchart"
                  className="w-8 h-8 neu-raised rounded-lg flex items-center justify-center font-bold text-ink hover:text-[#E91E8C] transition-colors cursor-pointer text-base"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => zoomOut(0.2)}
                  aria-label="Zoom out flowchart"
                  className="w-8 h-8 neu-raised rounded-lg flex items-center justify-center font-bold text-ink hover:text-[#E91E8C] transition-colors cursor-pointer text-base"
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => resetTransform()}
                  aria-label="Fit flowchart to view"
                  className="px-3 py-1.5 neu-raised rounded-lg font-bold text-xs text-ink hover:text-[#E91E8C] transition-colors cursor-pointer"
                  title="Reset View"
                >
                  Fit View
                </button>
                <span className="text-[10px] font-bold text-ink/60 px-1 select-none">
                  {Math.round(currentScale * 100)}%
                </span>
              </div>

              {/* Pan & Zoom Canvas */}
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  cursor: 'grab',
                }}
                contentStyle={{
                  width: `${graph.width}px`,
                  height: `${graph.height}px`,
                  position: 'relative',
                }}
              >
                {/* SVG Edges Layer */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={graph.width}
                  height={graph.height}
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#E91E8C" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#8B0A50" stopOpacity="0.7" />
                    </linearGradient>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#8B0A50" />
                    </marker>
                  </defs>
                  {graph.edges.map((edge) => {
                    const midY = (edge.startY + edge.endY) / 2;
                    const pathData = `M ${edge.startX} ${edge.startY} C ${edge.startX} ${midY}, ${edge.endX} ${midY}, ${edge.endX} ${edge.endY}`;
                    return (
                      <g key={edge.id}>
                        {/* Shadow line for contrast */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="rgba(0,0,0,0.15)"
                          strokeWidth="5"
                        />
                        {/* Gradient connecting stroke */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="url(#edgeGradient)"
                          strokeWidth="3"
                          markerEnd="url(#arrow)"
                          className="flowchart-edge"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Nodes HTML Overlay Layer */}
                <div
                  className="relative pointer-events-auto"
                  style={{ width: `${graph.width}px`, height: `${graph.height}px` }}
                >
                  {graph.nodes.map((node) => {
                    if (node.type === 'chapter') {
                      return <ChapterNodeCard key={node.id} node={node} />;
                    }
                    return <TopicNodeCard key={node.id} node={node} />;
                  })}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};

// Chapter Node Component
const ChapterNodeCard: React.FC<{ node: GraphNode }> = ({ node }) => {
  return (
    <div
      className="absolute neu-card rounded-2xl p-4 flex flex-col justify-between border-2 border-[#E91E8C]/40 shadow-md transition-all hover:border-[#E91E8C] box-border"
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 neu-raised rounded-full flex items-center justify-center shrink-0 font-bold text-[#E91E8C] text-base">
          {node.data.chapterNumber}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold tracking-widest text-[#E91E8C] uppercase block">
            CHAPTER {node.data.chapterNumber}
          </span>
          <h3 className="text-sm sm:text-base font-bold text-ink leading-tight m-0 break-words line-clamp-2">
            {node.data.title}
          </h3>
        </div>
      </div>
      {node.data.topicCount !== undefined && (
        <div className="mt-2 text-[11px] font-bold text-ink/60 bg-black/5 px-2 py-0.5 rounded-md inline-block self-start">
          {node.data.topicCount} {node.data.topicCount === 1 ? 'Section' : 'Sections'}
        </div>
      )}
    </div>
  );
};

// Topic / Exercise / Grammar Node Component
const TopicNodeCard: React.FC<{ node: GraphNode }> = ({ node }) => {
  const isGrammar = node.data.topicType === 'grammar';
  const isExercise = node.data.topicType === 'exercise';

  const typeBadgeClass = isGrammar
    ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300'
    : isExercise
    ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
    : 'bg-black/5 text-ink/80 border-black/10';

  const typeLabel = isGrammar
    ? 'Grammar'
    : isExercise
    ? 'Exercise'
    : node.data.topicType
    ? node.data.topicType.charAt(0).toUpperCase() + node.data.topicType.slice(1)
    : 'Topic';

  const resources: Resource[] = node.data.resources || [];

  return (
    <div
      className="absolute neu-recessed rounded-xl p-3.5 flex flex-col justify-between border border-ink/10 shadow-sm transition-all hover:shadow-md hover:border-ink/20 box-border"
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`,
      }}
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${typeBadgeClass}`}
          >
            {typeLabel}
          </span>
          <h4 className="text-xs font-bold text-ink break-words m-0 min-w-0 flex-1 leading-snug">
            {node.data.title}
          </h4>
        </div>
        {node.data.description && (
          <p className="text-[11px] text-ink/70 leading-tight m-0 line-clamp-2 break-words">
            {node.data.description}
          </p>
        )}
      </div>

      {/* Linked Resources */}
      {resources.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 mt-auto border-t border-ink/5">
          {resources.map((res) => (
            <Link
              key={res.id}
              to={`/resource/${res.id}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 font-bold text-[11px] text-white bg-gradient-to-r from-[#E91E8C] to-[#8B0A50] rounded-md shadow-sm hover:opacity-95 transition-all no-underline shrink-0"
              title={`View ${res.medium} notes for ${node.data.title}`}
            >
              <span>View Notes</span>
              <span className="text-[9px] uppercase opacity-90 px-1 py-0.2 rounded bg-black/20 font-semibold">
                {res.medium === 'hindi' ? 'Hindi' : 'English'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SyllabusFlowchart;
