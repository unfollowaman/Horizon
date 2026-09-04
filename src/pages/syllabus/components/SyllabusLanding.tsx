import React from 'react';
import type { ClassOption } from '../../../services/syllabusService';

interface SyllabusLandingProps {
  classes: ClassOption[];
  onSelectClass: (classSlug: string) => void;
}

export const SyllabusLanding: React.FC<SyllabusLandingProps> = ({ classes, onSelectClass }) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto min-w-0">
      {/* Hero Header */}
      <header className="neu-card p-6 sm:p-10 rounded-2xl text-center space-y-3">
        <span className="text-xs sm:text-sm font-bold tracking-widest text-[#E91E8C] uppercase">
          CBSE &amp; NCERT SYLLABUS DIRECTORY
        </span>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-ink leading-tight">
          Explore <span className="text-gradient">Syllabus</span> Hierarchy
        </h1>
        <p className="text-sm sm:text-lg text-ink/80 max-w-2xl mx-auto leading-relaxed">
          Detailed chapter-by-chapter topics, exercise structures, and grammar sections mapped directly to official NCERT standards and Horizon learning resources.
        </p>
      </header>

      {/* Class Selector Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {classes.map((cls) => (
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
            aria-label={`Explore syllabus for ${cls.name}`}
            className="neu-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 cursor-pointer hover:neu-raised-hover transition-all group focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 neu-raised rounded-2xl flex items-center justify-center font-bold text-xl text-[#E91E8C] group-hover:scale-105 transition-transform">
                {cls.id}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-ink group-hover:text-[#E91E8C] transition-colors m-0">
                {cls.name}
              </h2>
              <p className="text-xs sm:text-sm text-ink/70 leading-relaxed m-0">
                {cls.description}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#E91E8C] pt-2 border-t border-ink/5">
              <span>Explore Subjects</span>
              <span className="transition-transform group-hover:translate-x-1.5">&rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SyllabusLanding;
