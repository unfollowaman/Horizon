import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileButton from '../../../components/ProfileButton';
import { type ClassOption } from '../../../services/syllabusService';

interface SyllabusLandingProps {
  classes: ClassOption[];
  chapterCounts?: Record<string, number> | null;
  countsLoading?: boolean;
  onSelectClass: (classSlug: string) => void;
}

// Compact SVG Illustration Placeholders for Class Cards
const BookStackIllustration: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
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
  <div className="w-full h-full flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
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
  <div className="w-full h-full flex items-center justify-center shrink-0 opacity-90" aria-hidden="true">
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
  onSelectClass,
}) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto min-w-0">
      {/* Top Header Navigation */}
      <div className="flex justify-between items-center w-full min-w-0 mb-[clamp(12px,3vw,20px)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer shrink-0 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          aria-label="Go Back"
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
        {/* Primary Heading */}
        <h1 className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-ink tracking-tight leading-tight m-0">
          Choose Your <span className="italic bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] bg-clip-text text-transparent">Class</span>
        </h1>

        {/* Supporting Description */}
        <p className="text-xs sm:text-base text-ink/70 max-w-2xl mx-auto leading-relaxed m-0 px-2">
          Select your class to explore structured subjects, active chapter breakdowns, topics, and mapped NCERT learning resources.
        </p>

        {/* Journey Progress Indicator */}
        <div className="flex justify-center items-center w-full min-w-0" aria-label="Syllabus Navigation Steps">
          <ol className="inline-flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-1.5 sm:py-2 neu-raised-sm rounded-lg text-xs sm:text-sm font-bold text-ink/60 list-none m-0 max-w-full shrink-0">
            <li className="text-[#E91E8C] font-extrabold shrink-0" aria-current="step">
              Class
            </li>
            <li className="text-ink/30 select-none shrink-0">&rarr;</li>
            <li className="text-ink/50 shrink-0">
              Subject
            </li>
            <li className="text-ink/30 select-none shrink-0">&rarr;</li>
            <li className="text-ink/50 shrink-0">
              Syllabus
            </li>
          </ol>
        </div>
      </header>

      {/* Single-Column Horizontal Class Cards Stack */}
      <div className="flex flex-col gap-3.5 sm:gap-4 mb-8 sm:mb-10">
        {classes.map((cls) => {
          const classNameFormatted = cls.name.endsWith('th') ? cls.name : `${cls.name}th`;

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
              aria-label={`View ${classNameFormatted} syllabus`}
              className="neu-raised p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5 sm:gap-4 cursor-pointer group hover:neu-raised-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 w-full min-w-0"
            >
              {/* LEFT: Compact Icon Container */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 neu-recessed rounded-xl flex items-center justify-center p-2 shrink-0 overflow-hidden">
                {getCardIllustration(cls.id)}
              </div>

              {/* CENTER: Title & Left-Aligned Description */}
              <div className="flex-1 min-w-0 space-y-1 text-left">
                <h2 className="text-base sm:text-lg font-extrabold text-ink group-hover:text-[#E91E8C] transition-colors m-0 truncate">
                  {classNameFormatted}
                </h2>
                <p className="text-xs sm:text-sm text-ink/70 leading-snug sm:leading-relaxed m-0">
                  {cls.description}
                </p>
              </div>

              {/* RIGHT: Circular Neumorphic Arrow Action Button */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 neu-raised-sm group-hover:neu-raised-sm-hover rounded-full flex items-center justify-center shrink-0 transition-all">
                <svg
                  aria-hidden="true"
                  className="w-5 h-5 text-[#E91E8C] shrink-0"
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
