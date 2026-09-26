import React, { useMemo } from 'react';
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
  // Sort chapters predictably by chapter_number or display_order
  const sortedChapters = useMemo(() => {
    if (!chapters) return [];
    return [...chapters].sort((a, b) => {
      const orderA = a.chapter_number ?? a.display_order ?? 0;
      const orderB = b.chapter_number ?? b.display_order ?? 0;
      return orderA - orderB;
    });
  }, [chapters]);

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

  const totalChapters = sortedChapters.length;

  return (
    <div className="w-full min-w-0 space-y-8 sm:space-y-10">
      {/* Subject Identity Hero Banner */}
      <div className="neu-raised rounded-2xl p-4 sm:p-6 text-center space-y-3.5 border border-ink/5 relative overflow-hidden">
        {/* Step Progress Pill */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold bg-cream/80 border border-ink/10 shadow-xs">
          <span className="text-ink/60">Class</span>
          <span className="text-ink/40">→</span>
          <span className="text-ink/60">Subject</span>
          <span className="text-ink/40">→</span>
          <span className="text-[#E91E8C] font-extrabold" aria-current="step">
            Roadmap
          </span>
        </div>

        <div className="space-y-1.5 max-w-3xl mx-auto">
          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-ink leading-tight">
            {classNameTitle} — <span className="text-[#E91E8C]">{subjectName}</span> Roadmap
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-ink/70 leading-relaxed">
            Interactive, chapter-by-chapter learning roadmap with linked study notes and practice exercises.
          </p>
        </div>

        {/* Dynamic Chapter Count Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black/5 border border-ink/10 text-xs sm:text-sm font-bold text-ink/80">
          <span className="w-2 h-2 rounded-full bg-[#E91E8C]"></span>
          <span>{totalChapters} {totalChapters === 1 ? 'Chapter' : 'Chapters'}</span>
        </div>
      </div>

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

          return (
            <div key={chapter.id} className="relative min-w-0 w-full space-y-4">
              {/* Chapter Milestone Card */}
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

                  {/* Section Count or Quick Info */}
                  {hasTopics ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/5 text-xs font-bold text-ink/70 shrink-0 self-start sm:self-center">
                      <span>{topics.length} {topics.length === 1 ? 'Topic' : 'Topics'}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 text-xs font-bold text-purple-700 shrink-0 self-start sm:self-center">
                      <span>Chapter Overview</span>
                    </div>
                  )}
                </div>

                {/* Chapter Summary (Short) */}
                {chapter.chapter_summary && (
                  <p className="text-xs sm:text-sm text-ink/75 leading-relaxed m-0 pt-1 border-t border-ink/5 break-words">
                    {chapter.chapter_summary}
                  </p>
                )}
              </div>

              {/* Subordinate Topic Branches (Structure B) */}
              {hasTopics && (
                <div className="pl-4 sm:pl-10 space-y-3 border-l-2 border-[#E91E8C]/20 ml-5 sm:ml-6 pt-1">
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
