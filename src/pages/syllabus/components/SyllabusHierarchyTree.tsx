import React, { useState } from 'react';
import type { SyllabusChapterHierarchy } from '../../../types';
import SyllabusTopicNode from './SyllabusTopicNode';

interface SyllabusHierarchyTreeProps {
  chapters: SyllabusChapterHierarchy[];
  subjectName: string;
  classNameTitle: string;
}

export const SyllabusHierarchyTree: React.FC<SyllabusHierarchyTreeProps> = ({
  chapters,
  subjectName,
  classNameTitle,
}) => {
  // Track open state for chapter cards
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() => {
    // Default open all chapters initially for easy browsing
    const initial: Record<string, boolean> = {};
    chapters.forEach((ch) => {
      initial[ch.id] = true;
    });
    return initial;
  });

  // Expand all chapters when chapters data arrives asynchronously or changes
  React.useEffect(() => {
    if (chapters && chapters.length > 0) {
      setOpenChapters((prev) => {
        const next: Record<string, boolean> = { ...prev };
        let updated = false;
        chapters.forEach((ch) => {
          if (next[ch.id] === undefined) {
            next[ch.id] = true;
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }
  }, [chapters]);

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    chapters.forEach((ch) => {
      next[ch.id] = true;
    });
    setOpenChapters(next);
  };

  const collapseAll = () => {
    setOpenChapters({});
  };

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
    <div className="space-y-6 min-w-0">
      {/* Hierarchy Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-ink/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase text-ink m-0">
            {classNameTitle} — {subjectName} Syllabus
          </h2>
          <p className="text-xs sm:text-sm text-ink/70 m-0 pt-1">
            Browse chapters, topics, exercises, and linked study resources.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="neu-raised neu-raised-hover px-3 py-1.5 rounded-xl text-xs font-bold text-ink cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="neu-raised neu-raised-hover px-3 py-1.5 rounded-xl text-xs font-bold text-ink cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Chapters Accordion */}
      <div className="space-y-4 min-w-0">
        {chapters.map((chapter) => {
          const isOpen = Boolean(openChapters[chapter.id]);
          const topics = chapter.syllabus_topics || [];

          return (
            <div
              key={chapter.id}
              className="neu-card rounded-2xl p-4 sm:p-6 space-y-4 transition-all min-w-0"
            >
              {/* Chapter Header Toggle Button */}
              <button
                type="button"
                onClick={() => toggleChapter(chapter.id)}
                aria-expanded={isOpen}
                aria-label={`Toggle Chapter ${chapter.chapter_number}: ${chapter.chapter_name}`}
                className="w-full flex items-center justify-between gap-3 text-left focus:outline-none cursor-pointer group min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 neu-raised rounded-full flex items-center justify-center shrink-0 font-bold text-[#E91E8C] text-sm sm:text-base">
                    {chapter.chapter_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase block">
                      CHAPTER {chapter.chapter_number}
                    </span>
                    <h3 className="text-base sm:text-xl font-bold text-ink group-hover:text-[#E91E8C] transition-colors m-0 break-words leading-snug">
                      {chapter.chapter_name}
                    </h3>
                  </div>
                </div>

                <div className="w-8 h-8 neu-raised rounded-full flex items-center justify-center shrink-0 text-ink">
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
              </button>

              {/* Chapter Details & Topic Nodes */}
              {isOpen && (
                <div className="space-y-4 pt-2 border-t border-ink/5 min-w-0">
                  {chapter.chapter_summary && (
                    <p className="text-xs sm:text-body1 text-ink/80 leading-relaxed break-words m-0 bg-black/5 p-3 rounded-xl">
                      {chapter.chapter_summary}
                    </p>
                  )}

                  {topics.length > 0 ? (
                    <div className="space-y-2.5 min-w-0">
                      {topics.map((topic) => (
                        <SyllabusTopicNode key={topic.id} topic={topic} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-ink/60 italic p-3 text-center">
                      No topics listed under this chapter.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SyllabusHierarchyTree;
