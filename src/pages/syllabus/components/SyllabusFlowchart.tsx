import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SyllabusChapterHierarchy } from '../../../types';
import SyllabusTopicNode from './SyllabusTopicNode';

interface FlowchartChapterCardProps {
  chapter: SyllabusChapterHierarchy;
  isOpen: boolean;
  onToggle: (id: string) => void;
  notesPath: string;
  pyqPath: string;
}

/**
 * FlowchartChapterCard renders a single chapter card with optional accordion sub-topics.
 * Wrapped in React.memo to prevent unnecessary virtual DOM reconciliations and re-renders when
 * toggling other chapters in the flowchart or when parent state updates.
 */
const FlowchartChapterCard = React.memo<FlowchartChapterCardProps>(
  ({ chapter, isOpen, onToggle, notesPath, pyqPath }) => {
    // Memoize sorted topics with a non-mutating copy to prevent render-time array mutation and repeated sorts
    const topics = useMemo(() => {
      if (!chapter.syllabus_topics || chapter.syllabus_topics.length === 0) return [];
      return [...chapter.syllabus_topics].sort(
        (a, b) => a.display_order - b.display_order
      );
    }, [chapter.syllabus_topics]);

    const hasTopics = topics.length > 0;

    return (
      <div className="neu-card rounded-2xl p-2 sm:p-3 transition-all space-y-3.5 relative z-10 flex flex-col justify-between h-full min-w-0">
        {/* Header & Main Tile Section */}
        {hasTopics ? (
          <button
            type="button"
            onClick={() => onToggle(chapter.id)}
            aria-expanded={isOpen}
            aria-controls={`chapter-topics-${chapter.id}`}
            aria-label={`Toggle topics for Chapter ${chapter.chapter_number}: ${chapter.chapter_name}`}
            className="w-full text-left flex flex-col space-y-3 min-w-0 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-xl border-0 bg-transparent"
          >
            <div className="flex flex-row items-center justify-between gap-3 min-w-0 w-full">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Chapter Number Badge */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 neu-raised-sm rounded-full flex items-center justify-center font-bold text-[#E91E8C] text-base sm:text-lg shrink-0">
                  {chapter.chapter_number}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase block">
                    CHAPTER {chapter.chapter_number}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-ink leading-snug break-words m-0 group-hover:text-[#E91E8C] transition-colors">
                    {chapter.chapter_name}
                  </h2>
                </div>
              </div>

              {/* Right side arrow toggle icon */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 neu-raised-sm rounded-full flex items-center justify-center text-[#E91E8C] shrink-0">
                <svg
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Chapter Summary (Short) */}
            {chapter.chapter_summary && (
              <p className="text-xs sm:text-sm text-ink/75 leading-relaxed m-0 pt-1 border-t border-ink/5 break-words w-full">
                {chapter.chapter_summary}
              </p>
            )}
          </button>
        ) : (
          <div className="flex flex-col space-y-3 min-w-0">
            <div className="flex flex-row items-center justify-between gap-3 min-w-0 w-full">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Chapter Number Badge */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 neu-raised-sm rounded-full flex items-center justify-center font-bold text-[#E91E8C] text-base sm:text-lg shrink-0">
                  {chapter.chapter_number}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase block">
                    CHAPTER {chapter.chapter_number}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-ink leading-snug break-words m-0">
                    {chapter.chapter_name}
                  </h2>
                </div>
              </div>
            </div>

            {/* Chapter Summary (Short) */}
            {chapter.chapter_summary && (
              <p className="text-xs sm:text-sm text-ink/75 leading-relaxed m-0 pt-1 border-t border-ink/5 break-words w-full">
                {chapter.chapter_summary}
              </p>
            )}
          </div>
        )}

        {/* Chapter Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-2.5 border-t border-ink/10 mt-auto min-w-0 w-full">
          <Link
            to={notesPath}
            onClick={(e) => e.stopPropagation()}
            aria-label={`View notes for Chapter ${chapter.chapter_number}`}
            className="neu-raised-sm neu-raised-sm-hover rounded-full py-1.5 sm:py-2 px-3.5 sm:px-4 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-ink hover:text-[#E91E8C] transition-all no-underline text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="whitespace-nowrap">Notes</span>
          </Link>

          <Link
            to={pyqPath}
            onClick={(e) => e.stopPropagation()}
            aria-label={`View PYQs for Chapter ${chapter.chapter_number}`}
            className="neu-raised-sm neu-raised-sm-hover rounded-full py-1.5 sm:py-2 px-3.5 sm:px-4 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-ink hover:text-[#E91E8C] transition-all no-underline text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="whitespace-nowrap">PYQs</span>
          </Link>

          <Link
            to={notesPath}
            onClick={(e) => e.stopPropagation()}
            aria-label={`View important questions for Chapter ${chapter.chapter_number}`}
            className="neu-raised-sm neu-raised-sm-hover rounded-full py-1.5 sm:py-2 px-3.5 sm:px-4 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-ink hover:text-[#E91E8C] transition-all no-underline text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E91E8C] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m0 4h.01" />
            </svg>
            <span className="whitespace-nowrap">Top Qs</span>
          </Link>
        </div>

        {/* Subordinate Topic Branches (Structure B) - Shown when open */}
        {hasTopics && isOpen && (
          <div
            id={`chapter-topics-${chapter.id}`}
            className="space-y-3 sm:space-y-4 mt-3 pt-2 border-t border-ink/5"
          >
            {topics.map((topic) => (
              <SyllabusTopicNode key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </div>
    );
  }
);

FlowchartChapterCard.displayName = 'FlowchartChapterCard';

interface SyllabusFlowchartProps {
  chapters: SyllabusChapterHierarchy[];
  subjectName: string;
  classNameTitle: string;
  classSlug?: string;
  subjectSlug?: string;
}

export const SyllabusFlowchart: React.FC<SyllabusFlowchartProps> = ({
  chapters,
  subjectName,
  classNameTitle,
  classSlug,
  subjectSlug,
}) => {
  // Track open/collapsed state for chapters with sub-topics (defaults to all closed initially)
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});

  // Sort chapters predictably by chapter_number or display_order
  const sortedChapters = useMemo(() => {
    if (!chapters) return [];
    return [...chapters].sort((a, b) => {
      const orderA = a.chapter_number ?? a.display_order ?? 0;
      const orderB = b.chapter_number ?? b.display_order ?? 0;
      return orderA - orderB;
    });
  }, [chapters]);

  const toggleChapter = useCallback((id: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // Resolve navigation paths for action buttons
  const notesPath = useMemo(() => {
    return classSlug
      ? subjectSlug
        ? `/notes/${classSlug}/${subjectSlug}`
        : `/notes/${classSlug}`
      : '/notes';
  }, [classSlug, subjectSlug]);

  const pyqPath = useMemo(() => {
    return classSlug
      ? subjectSlug
        ? `/library/${classSlug}/${subjectSlug}`
        : `/library/${classSlug}`
      : '/library';
  }, [classSlug, subjectSlug]);

  if (!sortedChapters || sortedChapters.length === 0) {
    return (
      <div className="neu-card rounded-2xl p-8 text-center space-y-3 my-4">
        <h3 className="text-lg font-bold text-ink">No Syllabus Found</h3>
        <p className="text-sm text-ink/70">
          Syllabus data is currently not available for {classNameTitle} {subjectName}.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-8 sm:space-y-10">
      {/* Subject Identity Hero Banner Container */}
      <header className="neu-raised rounded-2xl p-2 sm:p-3 text-center space-y-3.5 mb-8 sm:mb-10">
        {/* Primary Heading */}
        <h1 className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-ink tracking-tight leading-tight m-0">
          {classNameTitle} — <span className="italic bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] bg-clip-text text-transparent">{subjectName}</span> Syllabus
        </h1>

        {/* Supporting Description */}
        <p className="text-xs sm:text-base text-ink/70 max-w-2xl mx-auto leading-relaxed m-0 px-2">
          Interactive, chapter-by-chapter learning roadmap with linked study notes and practice exercises.
        </p>

        {/* Journey Progress Indicator / Flow Pill */}
        <div className="flex justify-center items-center w-full min-w-0" aria-label="Syllabus Navigation Steps">
          <ol className="inline-flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-1.5 sm:py-2 neu-raised-sm rounded-lg text-xs sm:text-sm font-bold text-ink/60 list-none m-0 max-w-full shrink-0">
            <li className="text-ink/50 shrink-0">
              Class
            </li>
            <li className="text-ink/30 select-none shrink-0" aria-hidden="true">&rarr;</li>
            <li className="text-ink/50 shrink-0">
              Subject
            </li>
            <li className="text-ink/30 select-none shrink-0" aria-hidden="true">&rarr;</li>
            <li className="text-[#E91E8C] font-extrabold shrink-0" aria-current="step">
              Syllabus
            </li>
          </ol>
        </div>
      </header>

      {/* Main Chapter Cards Container - 2 Column Grid on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start w-full min-w-0">
        {sortedChapters.map((chapter) => (
          <FlowchartChapterCard
            key={chapter.id}
            chapter={chapter}
            isOpen={Boolean(openChapters[chapter.id])}
            onToggle={toggleChapter}
            notesPath={notesPath}
            pyqPath={pyqPath}
          />
        ))}
      </div>
    </div>
  );
};

export default SyllabusFlowchart;
