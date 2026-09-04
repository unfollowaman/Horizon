import React from 'react';
import type { SubjectOption, ClassOption } from '../../../services/syllabusService';

interface ClassSubjectSelectorProps {
  currentClass: ClassOption;
  subjects: SubjectOption[];
  onSelectSubject: (subjectSlug: string) => void;
  onBackToClasses: () => void;
}

export const ClassSubjectSelector: React.FC<ClassSubjectSelectorProps> = ({
  currentClass,
  subjects,
  onSelectSubject,
  onBackToClasses,
}) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto min-w-0">
      {/* Header with Back Navigation */}
      <div className="flex justify-between items-center w-full min-w-0">
        <button
          type="button"
          onClick={onBackToClasses}
          className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer shrink-0 text-ink focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
          aria-label="Back to Classes"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>

        <span className="text-xs sm:text-sm font-bold tracking-widest text-[#E91E8C] uppercase">
          {currentClass.name} SYLLABUS
        </span>
      </div>

      {/* Hero Title */}
      <header className="neu-card p-6 sm:p-8 rounded-2xl text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold text-ink">
          Select Subject for <span className="text-gradient">{currentClass.name}</span>
        </h1>
        <p className="text-xs sm:text-body1 text-ink/80 max-w-xl mx-auto">
          Choose a subject below to view its complete chapter hierarchy, subtopics, and practice exercises.
        </p>
      </header>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {subjects.map((subj) => (
          <div
            key={subj.slug}
            onClick={() => onSelectSubject(subj.slug)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSubject(subj.slug);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`View syllabus for ${currentClass.name} ${subj.name}`}
            className="neu-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4 cursor-pointer hover:neu-raised-hover transition-all group focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-black/5 text-ink/80 uppercase">
                  {currentClass.name}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#E91E8C]"></span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-ink group-hover:text-[#E91E8C] transition-colors m-0 leading-snug">
                {subj.name}
              </h2>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-[#E91E8C] pt-2 border-t border-ink/5">
              <span>View Chapter Hierarchy</span>
              <span className="transition-transform group-hover:translate-x-1.5">&rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassSubjectSelector;
