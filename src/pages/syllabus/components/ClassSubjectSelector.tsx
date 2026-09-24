import React from 'react';
import ProfileButton from '../../../components/ProfileButton';
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
    <div className="max-w-5xl mx-auto min-w-0">
      {/* Top Header Navigation */}
      <div className="flex justify-between items-center w-full min-w-0 mb-[clamp(12px,3vw,20px)]">
        <button
          type="button"
          onClick={onBackToClasses}
          className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer shrink-0 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
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

        <ProfileButton />
      </div>

      {/* Hero Section Card Container */}
      <header className="neu-raised rounded-2xl p-2 sm:p-3 text-center space-y-3.5 mb-8 sm:mb-10">
        {/* Primary Heading with Pink Gradient Accent on Subject */}
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-ink tracking-tight leading-tight m-0">
          Select <span className="italic bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] bg-clip-text text-transparent">Subject</span> for {currentClass.name}
        </h1>

        {/* Supporting Description */}
        <p className="text-xs sm:text-base text-ink/70 max-w-2xl mx-auto leading-relaxed m-0 px-2">
          Choose a subject below to view its complete chapter hierarchy, subtopics, and practice exercises.
        </p>

        {/* Journey Progress Indicator / Flow Pill */}
        <div className="flex justify-center items-center w-full min-w-0" aria-label="Syllabus Navigation Steps">
          <ol className="inline-flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-1.5 sm:py-2 neu-raised-sm rounded-lg text-xs sm:text-sm font-bold text-ink/60 list-none m-0 max-w-full shrink-0">
            <li className="text-ink/50 shrink-0">
              Class
            </li>
            <li className="text-ink/30 select-none shrink-0" aria-hidden="true">&rarr;</li>
            <li className="text-[#E91E8C] font-extrabold shrink-0" aria-current="step">
              Subject
            </li>
            <li className="text-ink/30 select-none shrink-0" aria-hidden="true">&rarr;</li>
            <li className="text-ink/50 shrink-0">
              Syllabus
            </li>
          </ol>
        </div>
      </header>

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-[18px] mb-8 sm:mb-10">
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
            className="neu-raised p-3.5 sm:p-[14px] rounded-2xl flex flex-col justify-between h-full cursor-pointer group hover:neu-raised-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
          >
            <div className="flex flex-col text-left w-full">
              {/* Top Section: Class Badge & Pink Accent Dot */}
              <div className="flex items-center justify-between mb-3 sm:mb-[12px] w-full">
                <span className="text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-md neu-recessed text-ink/70 uppercase tracking-wider">
                  {currentClass.name}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#E91E8C] shadow-sm shrink-0"></span>
              </div>

              {/* Middle Section: Subject Title & Description */}
              <div className="space-y-1 sm:space-y-[3px] w-full">
                <h2 className="text-base sm:text-xl font-extrabold text-ink group-hover:text-[#E91E8C] transition-colors m-0 line-clamp-1">
                  {subj.name}
                </h2>
                <p className="text-xs sm:text-sm text-ink/70 leading-snug m-0 line-clamp-2">
                  {subj.description || 'Explore chapter hierarchy, subtopics, and practice exercises.'}
                </p>
              </div>
            </div>

            {/* Bottom Section: View CTA Button */}
            <div className="pt-3.5 sm:pt-4 w-full mt-auto">
              <div className="w-full py-1.5 sm:py-2 px-3 flex items-center justify-center text-xs sm:text-sm gap-1.5 font-bold neu-raised-sm rounded-lg group-hover:neu-raised-sm-hover text-ink text-center transition-all">
                <svg
                  aria-hidden="true"
                  className="shrink-0 text-[#E91E8C]"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 1 3-3h7z"></path>
                </svg>
                <span>View</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassSubjectSelector;
