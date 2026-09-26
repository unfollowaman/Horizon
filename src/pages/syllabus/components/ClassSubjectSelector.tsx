import React from 'react';
import ProfileButton from '../../../components/ProfileButton';
import type { SubjectOption, ClassOption } from '../../../services/syllabusService';

interface ClassSubjectSelectorProps {
  currentClass: ClassOption;
  subjects: SubjectOption[];
  onSelectSubject: (subjectSlug: string) => void;
  onBackToClasses: () => void;
}

// Subject Card Illustrations for Top Placeholder Section
const MathIllustration: React.FC = () => (
  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
    <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="14" width="48" height="52" rx="6" fill="#1A1A2E" opacity="0.08" />
      <rect x="18" y="12" width="44" height="52" rx="6" fill="#FFFFFF" />
      <path d="M28 26H38M33 21V31" stroke="#E91E8C" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 26H54" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M28 44L36 52M36 44L28 52" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <path d="M44 46H54M44 52H54" stroke="#E91E8C" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="38" r="2.5" fill="#FFC107" />
    </svg>
  </div>
);

const ScienceIllustration: React.FC = () => (
  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
    <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M34 18H46V30L56 52C58 56 55 62 50 62H30C25 62 22 56 24 52L34 30V18Z" fill="#1A1A2E" opacity="0.08" />
      <path d="M36 16H44V28L54 50C56 54 53 60 48 60H32C27 60 24 54 26 50L36 28V16Z" fill="#FFFFFF" stroke="#1A1A2E" strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
      <path d="M28 46C28 46 34 42 40 46C46 50 52 46 52 46L48 58H32L28 46Z" fill="#E91E8C" opacity="0.85" />
      <circle cx="36" cy="50" r="2" fill="#FFFFFF" opacity="0.9" />
      <circle cx="43" cy="53" r="1.5" fill="#FFFFFF" opacity="0.9" />
      <circle cx="40" cy="24" r="3" fill="#FFC107" />
    </svg>
  </div>
);

const SocialScienceIllustration: React.FC = () => (
  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
    <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="38" r="22" fill="#1A1A2E" opacity="0.08" />
      <circle cx="40" cy="36" r="20" fill="#FFFFFF" stroke="#E91E8C" strokeWidth="2" />
      <path d="M20 36H60" stroke="#E91E8C" strokeWidth="1.5" strokeDasharray="2 2" />
      <ellipse cx="40" cy="36" rx="10" ry="20" stroke="#1A1A2E" strokeWidth="1.5" opacity="0.5" />
      <path d="M28 62H52" stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 56V62" stroke="#1A1A2E" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </div>
);

const LanguageIllustration: React.FC = () => (
  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
    <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="16" width="44" height="48" rx="4" fill="#1A1A2E" opacity="0.08" />
      <rect x="20" y="14" width="40" height="48" rx="4" fill="#FFFFFF" stroke="#1A1A2E" strokeWidth="1.5" />
      <path d="M26 24H54M26 32H48M26 40H50M26 48H40" stroke="#E91E8C" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="48" r="4" fill="#FFC107" />
    </svg>
  </div>
);

const getSubjectIllustration = (slug: string, name: string) => {
  const lower = `${slug} ${name}`.toLowerCase();
  if (lower.includes('math')) return <MathIllustration />;
  if (lower.includes('science') && !lower.includes('social')) return <ScienceIllustration />;
  if (lower.includes('social') || lower.includes('history') || lower.includes('geography')) return <SocialScienceIllustration />;
  if (lower.includes('english') || lower.includes('hindi') || lower.includes('sanskrit') || lower.includes('language')) return <LanguageIllustration />;

  return (
    <img
      src="/assets/SVG Illustrations/study-notes.svg"
      alt={`${name} Illustration`}
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
            className="neu-raised p-3.5 sm:p-[14px] rounded-2xl flex flex-col justify-between items-center text-center h-full cursor-pointer group hover:neu-raised-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
          >
            {/* Top Placeholder Section */}
            <div className="w-full h-24 sm:h-32 neu-recessed rounded-xl flex items-center justify-center p-2 sm:p-3 overflow-hidden shrink-0 mb-3 sm:mb-[12px]">
              {getSubjectIllustration(subj.slug, subj.name)}
            </div>

            {/* Middle Section: Subject Title & Description */}
            <div className="flex flex-col items-center text-center w-full space-y-1 sm:space-y-[3px]">
              <h2 className="text-base sm:text-xl font-extrabold text-ink group-hover:text-[#E91E8C] transition-colors m-0 line-clamp-1 w-full text-center">
                {subj.name}
              </h2>
              <p className="text-xs sm:text-sm text-ink/70 leading-snug m-0 line-clamp-2 w-full text-center">
                {subj.description || 'Explore chapter hierarchy, subtopics, and practice exercises.'}
              </p>
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
