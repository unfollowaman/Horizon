import React from 'react';
import { type ClassOption, getSubjectsForClass } from '../../../services/syllabusService';

interface SyllabusLandingProps {
  classes: ClassOption[];
  chapterCounts?: Record<string, number> | null;
  countsLoading?: boolean;
  onSelectClass: (classSlug: string) => void;
}

// Compact SVG Illustration Placeholders for Class Cards
const BookStackIllustration: React.FC = () => (
  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
    <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Book Stack */}
      <rect x="14" y="52" width="52" height="10" rx="2" fill="#1A1A2E" opacity="0.15" />
      <rect x="16" y="50" width="48" height="10" rx="2" fill="#E91E8C" opacity="0.9" />
      <rect x="20" y="52" width="40" height="6" rx="1" fill="#FFFFFF" opacity="0.9" />

      <rect x="20" y="38" width="44" height="9" rx="2" fill="#1A1A2E" opacity="0.8" />
      <rect x="23" y="40" width="38" height="5" rx="1" fill="#FFFFFF" opacity="0.85" />

      <rect x="16" y="26" width="48" height="9" rx="2" fill="#E91E8C" />
      <rect x="19" y="28" width="42" height="5" rx="1" fill="#FFFFFF" />
      <path d="M52 26V38L55 35L58 38V26H52Z" fill="#FFC107" />
    </svg>
  </div>
);

const ChecklistIllustration: React.FC = () => (
  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
    <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="14" width="44" height="52" rx="5" fill="#1A1A2E" opacity="0.08" />
      <rect x="20" y="12" width="40" height="52" rx="5" fill="#FFFFFF" className="neu-card" />
      <rect x="32" y="9" width="16" height="6" rx="1.5" fill="#E91E8C" />

      <circle cx="28" cy="24" r="3" fill="#E91E8C" />
      <path d="M26.5 24L27.5 25L29.5 23" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="34" y="22.5" width="20" height="3" rx="1.5" fill="#1A1A2E" opacity="0.3" />

      <circle cx="28" cy="35" r="3" fill="#E91E8C" />
      <path d="M26.5 35L27.5 36L29.5 34" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="34" y="33.5" width="17" height="3" rx="1.5" fill="#1A1A2E" opacity="0.3" />

      <circle cx="28" cy="46" r="3" fill="#1A1A2E" opacity="0.15" />
      <rect x="34" y="44.5" width="18" height="3" rx="1.5" fill="#1A1A2E" opacity="0.2" />
    </svg>
  </div>
);

const GradCapIllustration: React.FC = () => (
  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
    <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 42C26 42 28 52 40 52C52 52 54 42 54 42V48C54 52 48 55 40 55C32 55 26 52 26 48V42Z" fill="#1A1A2E" opacity="0.85" />
      <polygon points="40,20 68,31 40,42 12,31" fill="#E91E8C" />
      <polygon points="40,22 62,31 40,40 18,31" fill="#C2185B" opacity="0.4" />
      <circle cx="40" cy="31" r="2.5" fill="#FFC107" />
      <path d="M40 31C40 31 54 33 57 40" stroke="#FFC107" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="55.5" y="40" width="4.5" height="7" rx="1" fill="#FFC107" />
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
    <div className="space-y-8 sm:space-y-10 max-w-5xl mx-auto min-w-0">
      {/* Hero Section */}
      <header className="text-center space-y-3.5 pt-2 sm:pt-4">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-0.5 neu-raised rounded-full text-[11px] font-bold tracking-[0.2em] text-[#E91E8C] uppercase">
          <span>Syllabus</span>
        </div>

        {/* Primary Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-ink tracking-tight leading-tight m-0">
          Choose Your Class
        </h1>

        {/* Supporting Description */}
        <p className="text-xs sm:text-base text-ink/70 max-w-2xl mx-auto leading-relaxed m-0 px-2">
          Select your class to explore structured subjects, active chapter breakdowns, topics, and mapped NCERT learning resources.
        </p>

        {/* Journey Progress Indicator */}
        <div className="pt-2 flex justify-center items-center w-full min-w-0" aria-label="Syllabus Navigation Steps">
          <ol className="inline-flex items-center gap-1 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 neu-raised rounded-full text-[11px] sm:text-xs font-bold text-ink/60 list-none m-0 max-w-full overflow-x-auto no-scrollbar shrink-0">
            <li className="flex items-center gap-1.5 text-[#E91E8C] font-extrabold shrink-0" aria-current="step">
              <span className="w-5 h-5 rounded-full bg-[#E91E8C] text-white flex items-center justify-center text-[10px] font-bold">
                01
              </span>
              <span>Class</span>
            </li>
            <li className="text-ink/30 select-none shrink-0">&rarr;</li>
            <li className="flex items-center gap-1.5 text-ink/50 shrink-0">
              <span className="w-5 h-5 rounded-full bg-ink/10 text-ink/60 flex items-center justify-center text-[10px] font-bold">
                02
              </span>
              <span>Subject</span>
            </li>
            <li className="text-ink/30 select-none shrink-0">&rarr;</li>
            <li className="flex items-center gap-1.5 text-ink/50 shrink-0">
              <span className="w-5 h-5 rounded-full bg-ink/10 text-ink/60 flex items-center justify-center text-[10px] font-bold">
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
              className="neu-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-4 cursor-pointer hover:neu-raised-hover transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
            >
              <div className="space-y-3.5">
                {/* Top Identity Row: Prominent Class Number Badge + Compact Illustration Placeholder */}
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 neu-raised rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl text-[#E91E8C] group-hover:scale-105 transition-transform shrink-0">
                    {String(cls.id).padStart(2, '0')}
                  </div>
                  {getCardIllustration(cls.id)}
                </div>

                {/* Class Title */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-ink group-hover:text-[#E91E8C] transition-colors m-0">
                    {cls.name}
                  </h2>
                </div>

                {/* Description (Full readability, no artificial line-clamp truncation) */}
                <p className="text-xs sm:text-sm text-ink/75 leading-relaxed m-0">
                  {cls.description}
                </p>

                {/* Metadata Counts (Placed BELOW description and ABOVE CTA as clean text metadata) */}
                <div className="pt-1 flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-ink/70">
                  {/* Book Icon + Subject Count */}
                  <div className="inline-flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#E91E8C] shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span>{subjectCount} Subjects</span>
                  </div>

                  {/* Document Icon + Chapter Count */}
                  <div className="inline-flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#E91E8C] shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    {countsLoading ? (
                      <span className="text-ink/40 animate-pulse">Loading chapters...</span>
                    ) : chapterCount !== undefined ? (
                      <span className="font-semibold text-ink/80">{chapterCount} Chapters</span>
                    ) : (
                      <span className="text-ink/50">-- Chapters</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Link CTA */}
              <div className="pt-3 border-t border-ink/5 flex items-center justify-between font-bold text-xs sm:text-sm text-[#E91E8C] group-hover:underline">
                <span>View Subjects</span>
                <span className="transition-transform group-hover:translate-x-1.5" aria-hidden="true">
                  &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Bottom Motivational Placeholder Section */}
      <section className="neu-card rounded-2xl p-6 sm:p-8 text-center space-y-2.5 bg-gradient-to-r from-transparent via-[#E91E8C]/5 to-transparent">
        <h3 className="text-lg sm:text-xl font-bold text-ink m-0">
          Master Your NCERT & Board Curriculum
        </h3>
        <p className="text-xs sm:text-sm text-ink/70 max-w-xl mx-auto m-0 leading-relaxed">
          Structured chapter breakdowns, topic maps, and textbook-linked resources tailored for RBSE, NCERT, and CBSE students.
        </p>
      </section>
    </div>
  );
};

export default SyllabusLanding;
