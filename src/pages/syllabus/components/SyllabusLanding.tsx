import React from 'react';
import { type ClassOption, getSubjectsForClass } from '../../../services/syllabusService';

interface SyllabusLandingProps {
  classes: ClassOption[];
  chapterCounts?: Record<string, number> | null;
  countsLoading?: boolean;
  onSelectClass: (classSlug: string) => void;
}

// Clean illustration placeholders matching visual reference
const BookStackIllustration: React.FC = () => (
  <div className="w-full h-24 sm:h-28 flex items-center justify-center neu-raised rounded-xl p-3 bg-gradient-to-b from-white/40 to-transparent" aria-hidden="true">
    <svg viewBox="0 0 120 90" className="h-full max-w-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Book 1 (Bottom) */}
      <rect x="20" y="62" width="80" height="14" rx="3" fill="#1A1A2E" opacity="0.15" />
      <rect x="22" y="60" width="76" height="14" rx="3" fill="#E91E8C" opacity="0.85" />
      <rect x="26" y="63" width="68" height="8" rx="1.5" fill="#FFFFFF" opacity="0.9" />
      {/* Book 2 (Middle) */}
      <rect x="28" y="44" width="68" height="13" rx="2.5" fill="#1A1A2E" opacity="0.8" />
      <rect x="32" y="47" width="60" height="7" rx="1" fill="#FFFFFF" opacity="0.85" />
      {/* Book 3 (Top) */}
      <rect x="24" y="28" width="72" height="13" rx="2.5" fill="#E91E8C" />
      <rect x="28" y="31" width="64" height="7" rx="1" fill="#FFFFFF" />
      {/* Bookmark */}
      <path d="M78 28V46L83 42L88 46V28H78Z" fill="#FFC107" />
    </svg>
  </div>
);

const ChecklistIllustration: React.FC = () => (
  <div className="w-full h-24 sm:h-28 flex items-center justify-center neu-raised rounded-xl p-3 bg-gradient-to-b from-white/40 to-transparent" aria-hidden="true">
    <svg viewBox="0 0 120 90" className="h-full max-w-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Board */}
      <rect x="30" y="15" width="60" height="65" rx="6" fill="#1A1A2E" opacity="0.08" />
      <rect x="32" y="13" width="56" height="65" rx="6" fill="#FFFFFF" className="neu-card" />
      {/* Clip */}
      <rect x="48" y="9" width="24" height="8" rx="2" fill="#E91E8C" />
      {/* Check lines */}
      <circle cx="44" cy="28" r="4" fill="#E91E8C" />
      <path d="M42 28L43.5 29.5L46 27" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="52" y="26" width="26" height="4" rx="2" fill="#1A1A2E" opacity="0.3" />

      <circle cx="44" cy="42" r="4" fill="#E91E8C" />
      <path d="M42 42L43.5 43.5L46 41" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="52" y="40" width="22" height="4" rx="2" fill="#1A1A2E" opacity="0.3" />

      <circle cx="44" cy="56" r="4" fill="#1A1A2E" opacity="0.15" />
      <rect x="52" y="54" width="24" height="4" rx="2" fill="#1A1A2E" opacity="0.2" />
    </svg>
  </div>
);

const GradCapIllustration: React.FC = () => (
  <div className="w-full h-24 sm:h-28 flex items-center justify-center neu-raised rounded-xl p-3 bg-gradient-to-b from-white/40 to-transparent" aria-hidden="true">
    <svg viewBox="0 0 120 90" className="h-full max-w-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cap Base */}
      <path d="M42 46C42 46 45 58 60 58C75 58 78 46 78 46V54C78 58 70 62 60 62C50 62 42 58 42 54V46Z" fill="#1A1A2E" opacity="0.85" />
      {/* Cap Diamond Top */}
      <polygon points="60,22 100,36 60,50 20,36" fill="#E91E8C" />
      <polygon points="60,25 92,36 60,47 28,36" fill="#C2185B" opacity="0.4" />
      {/* Tassel Button */}
      <circle cx="60" cy="36" r="3" fill="#FFC107" />
      {/* Tassel String & Flag */}
      <path d="M60 36C60 36 78 38 82 48" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" />
      <rect x="80" y="48" width="6" height="10" rx="1" fill="#FFC107" />
    </svg>
  </div>
);

const getCardIllustration = (classId: string) => {
  switch (classId) {
    case '8':
      return <BookStackIllustration />;
    case '9':
      return <ChecklistIllustration />;
    case '10':
      return <GradCapIllustration />;
    default:
      return <BookStackIllustration />;
  }
};

export const SyllabusLanding: React.FC<SyllabusLandingProps> = ({
  classes,
  chapterCounts,
  countsLoading = false,
  onSelectClass,
}) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto min-w-0">
      {/* Page Header */}
      <header className="neu-card p-6 sm:p-10 rounded-2xl text-center space-y-4">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 neu-raised rounded-full text-xs font-bold tracking-[0.2em] text-[#E91E8C] uppercase">
          <span>Syllabus</span>
        </div>

        {/* Primary Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-ink tracking-tight leading-tight m-0">
          Choose Your Class
        </h1>

        {/* Supporting Description */}
        <p className="text-xs sm:text-base text-ink/70 max-w-2xl mx-auto leading-relaxed m-0">
          Select your class to explore structured subjects, active chapter breakdowns, topics, and mapped NCERT learning resources.
        </p>

        {/* Journey Progress Indicator */}
        <div className="pt-1 flex justify-center items-center w-full" aria-label="Syllabus Navigation Steps">
          <ol className="inline-flex items-center gap-1 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2 neu-raised rounded-full text-[10px] sm:text-xs font-bold text-ink/60 list-none m-0 max-w-full overflow-x-auto no-scrollbar">
            <li className="flex items-center gap-1 sm:gap-1.5 text-[#E91E8C] font-extrabold shrink-0" aria-current="step">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#E91E8C] text-white flex items-center justify-center text-[9px] sm:text-[10px]">
                01
              </span>
              <span>Class</span>
            </li>
            <li className="text-ink/30 select-none shrink-0">&rarr;</li>
            <li className="flex items-center gap-1 sm:gap-1.5 text-ink/50 shrink-0">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-ink/10 text-ink/60 flex items-center justify-center text-[9px] sm:text-[10px]">
                02
              </span>
              <span>Subject</span>
            </li>
            <li className="text-ink/30 select-none shrink-0">&rarr;</li>
            <li className="flex items-center gap-1 sm:gap-1.5 text-ink/50 shrink-0">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-ink/10 text-ink/60 flex items-center justify-center text-[9px] sm:text-[10px]">
                03
              </span>
              <span>Syllabus</span>
            </li>
          </ol>
        </div>
      </header>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {classes.map((cls) => {
          const subjects = getSubjectsForClass(cls.id);
          const subjectCount = subjects.length;
          const chapterCount = chapterCounts ? chapterCounts[cls.id] : undefined;

          return (
            <div
              key={cls.id}
              onClick={() => onSelectClass(cls.slug)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectClass(cls.slug);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Select ${cls.name}`}
              className="neu-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 cursor-pointer hover:neu-raised-hover transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
            >
              <div className="space-y-4">
                {/* Illustration Placeholder Area */}
                {getCardIllustration(cls.id)}

                {/* Class Badge & Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl sm:text-3xl font-extrabold text-ink group-hover:text-[#E91E8C] transition-colors">
                      {cls.name}
                    </span>
                    <span className="w-9 h-9 neu-raised rounded-xl flex items-center justify-center font-bold text-sm text-[#E91E8C] group-hover:scale-105 transition-transform">
                      {String(cls.id).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Syllabus Stats Chips */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                    <span className="px-2.5 py-0.5 neu-raised rounded-md text-ink/80">
                      {subjectCount} Subjects
                    </span>
                    {countsLoading ? (
                      <span className="px-2.5 py-0.5 neu-raised rounded-md text-ink/40 animate-pulse">
                        Loading chapters...
                      </span>
                    ) : chapterCount !== undefined ? (
                      <span className="px-2.5 py-0.5 neu-raised rounded-md text-[#E91E8C] bg-[#E91E8C]/5 font-bold">
                        {chapterCount} Chapters
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-ink/70 leading-relaxed m-0 line-clamp-3">
                  {cls.description}
                </p>
              </div>

              {/* Action Link CTA */}
              <div className="pt-3 border-t border-ink/5 flex items-center justify-between font-bold text-xs sm:text-sm text-[#E91E8C]">
                <span>View Subjects</span>
                <span className="transition-transform group-hover:translate-x-1.5" aria-hidden="true">
                  &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SyllabusLanding;
