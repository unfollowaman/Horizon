import React, { useMemo, useState } from 'react';
import type { SyllabusChapterHierarchy } from '../../../types';
import SyllabusTopicNode from './SyllabusTopicNode';

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

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

      {/* Main Roadmap Progression Timeline Container */}
      <div className="relative w-full min-w-0 space-y-8 sm:space-y-10">
        {/* Continuous Connecting Stem Line (Desktop & Mobile) */}
        <div
          className="absolute left-6 sm:left-8 top-8 bottom-8 w-1 bg-gradient-to-b from-[#E91E8C] via-[#C2185B] to-[#8B0A50] rounded-full opacity-30 pointer-events-none hidden sm:block"
          aria-hidden="true"
        />

        {sortedChapters.map((chapter, index) => {
          const topics = (chapter.syllabus_topics || []).sort(
            (a, b) => a.display_order - b.display_order
          );
          const hasTopics = topics.length > 0;
          const isLast = index === sortedChapters.length - 1;

          const isOpen = Boolean(openChapters[chapter.id]);

          return (
            <div key={chapter.id} className="relative min-w-0 w-full space-y-4">
              {/* Chapter Milestone Card */}
              {hasTopics ? (
                <button
                  type="button"
                  onClick={() => toggleChapter(chapter.id)}
                  aria-expanded={isOpen}
                  aria-controls={`chapter-topics-${chapter.id}`}
                  aria-label={`Toggle topics for Chapter ${chapter.chapter_number}: ${chapter.chapter_name}`}
                  className="w-full text-left neu-card rounded-2xl p-4 sm:p-6 border-2 border-[#E91E8C]/30 hover:border-[#E91E8C] transition-all space-y-3 relative z-10 shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 group"
                >
                  <div className="flex flex-row items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Chapter Number Badge */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 neu-raised rounded-2xl flex items-center justify-center font-bold text-[#E91E8C] text-base sm:text-lg shrink-0">
                        {chapter.chapter_number}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase block">
                          CHAPTER {chapter.chapter_number}
                        </span>
                        <h2 className="text-base sm:text-xl font-bold text-ink leading-snug break-words m-0 group-hover:text-[#E91E8C] transition-colors">
                          {chapter.chapter_name}
                        </h2>
                      </div>
                    </div>

                    {/* Right side: Topic Count Badge + Toggle Arrow Icon */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-black/5 text-xs font-bold text-ink/70">
                        <span>{topics.length} {topics.length === 1 ? 'Topic' : 'Topics'}</span>
                      </div>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 neu-raised rounded-full flex items-center justify-center text-[#E91E8C] shrink-0">
                        <svg
                          className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Chapter Summary (Short) */}
                  {chapter.chapter_summary && (
                    <p className="text-xs sm:text-sm text-ink/75 leading-relaxed m-0 pt-1 border-t border-ink/5 break-words">
                      {chapter.chapter_summary}
                    </p>
                  )}
                </button>
              ) : (
                <div className="neu-card rounded-2xl p-4 sm:p-6 border-2 border-[#E91E8C]/30 hover:border-[#E91E8C] transition-all space-y-3 relative z-10 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Chapter Number Badge */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 neu-raised rounded-2xl flex items-center justify-center font-bold text-[#E91E8C] text-base sm:text-lg shrink-0">
                        {chapter.chapter_number}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="text-[10px] sm:text-xs font-bold tracking-widest text-[#E91E8C] uppercase block">
                          CHAPTER {chapter.chapter_number}
                        </span>
                        <h2 className="text-base sm:text-xl font-bold text-ink leading-snug break-words m-0">
                          {chapter.chapter_name}
                        </h2>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 text-xs font-bold text-purple-700 shrink-0 self-start sm:self-center">
                      <span>Chapter Overview</span>
                    </div>
                  </div>

                  {/* Chapter Summary (Short) */}
                  {chapter.chapter_summary && (
                    <p className="text-xs sm:text-sm text-ink/75 leading-relaxed m-0 pt-1 border-t border-ink/5 break-words">
                      {chapter.chapter_summary}
                    </p>
                  )}
                </div>
              )}

              {/* Subordinate Topic Branches (Structure B) - Shown when open */}
              {hasTopics && isOpen && (
                <div
                  id={`chapter-topics-${chapter.id}`}
                  className="pl-4 sm:pl-10 space-y-3 border-l-2 border-[#E91E8C]/20 ml-5 sm:ml-6 pt-1"
                >
                  {topics.map((topic) => (
                    <SyllabusTopicNode key={topic.id} topic={topic} />
                  ))}
                </div>
              )}

              {/* Connector dot indicator between chapters */}
              {!isLast && (
                <div className="flex justify-center sm:justify-start sm:pl-8 py-1" aria-hidden="true">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E91E8C] shadow-xs" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SyllabusFlowchart;
