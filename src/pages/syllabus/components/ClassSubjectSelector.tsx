import React from 'react';
import ProfileButton from '../../../components/ProfileButton';
import type { SubjectOption, ClassOption } from '../../../services/syllabusService';

interface ClassSubjectSelectorProps {
  currentClass: ClassOption;
  subjects: SubjectOption[];
  onSelectSubject: (subjectSlug: string) => void;
  onBackToClasses: () => void;
}

const getSubjectIllustration = (slug: string, name: string) => {
  const lower = `${slug} ${name}`.toLowerCase();

  if (lower.includes('social') || lower.includes('history') || lower.includes('geography') || lower.includes('civics')) {
    return (
      <img
        src="/assets/SVG Illustrations/social-science.svg"
        alt="Social Science illustration"
        className="w-full h-full object-contain"
      />
    );
  }

  if (lower.includes('science')) {
    return (
      <img
        src="/assets/SVG Illustrations/science.svg"
        alt="Science illustration"
        className="w-full h-full object-contain"
      />
    );
  }

  if (lower.includes('math')) {
    return (
      <img
        src="/assets/SVG Illustrations/mathematics.svg"
        alt="Mathematics illustration"
        className="w-full h-full object-contain"
      />
    );
  }

  if (lower.includes('hindi')) {
    return (
      <img
        src="/assets/SVG Illustrations/Hindi.svg"
        alt="Hindi illustration"
        className="w-full h-full object-contain"
      />
    );
  }

  if (lower.includes('english')) {
    return (
      <img
        src="/assets/SVG Illustrations/english.svg"
        alt="English illustration"
        className="w-full h-full object-contain"
      />
    );
  }

  if (lower.includes('sanskrit')) {
    return (
      <img
        src="/assets/SVG Illustrations/sanskrit.svg"
        alt="Sanskrit illustration"
        className="w-full h-full object-contain"
      />
    );
  }

  return (
    <img
      src="/assets/SVG Illustrations/study-notes.svg"
      alt={`${name} illustration`}
      className="w-full h-full object-contain"
    />
  );
};

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
        <h1 className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-ink tracking-tight leading-tight m-0">
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

      {/* Single-Column Horizontal Subject Cards Stack */}
      <div className="flex flex-col gap-3.5 sm:gap-4 mb-8 sm:mb-10">
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
            className="neu-raised p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5 sm:gap-4 cursor-pointer group hover:neu-raised-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 w-full min-w-0"
          >
            {/* LEFT: Compact Icon Container */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 neu-recessed rounded-md flex items-center justify-center p-1 sm:p-1.5 shrink-0 overflow-hidden">
              {getSubjectIllustration(subj.slug, subj.name)}
            </div>

            {/* CENTER: Subject Title & Left-Aligned Description */}
            <div className="flex-1 min-w-0 space-y-1 text-left">
              <h2 className="text-base sm:text-lg font-extrabold text-ink group-hover:text-[#E91E8C] transition-colors m-0 truncate">
                {subj.name}
              </h2>
              <p className="text-xs sm:text-sm text-ink/70 leading-snug sm:leading-relaxed m-0">
                {subj.description || 'Explore chapter hierarchy, subtopics, and practice exercises.'}
              </p>
            </div>

            {/* RIGHT: Circular Neumorphic Arrow Action Button */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 neu-raised-sm group-hover:neu-raised-sm-hover rounded-full flex items-center justify-center shrink-0 transition-all">
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-[#E91E8C] shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassSubjectSelector;
