import React, { useMemo } from 'react';
import type { Resource } from '../../../types';

interface LibraryEducationalGuideProps {
  allResources: Resource[];
  selectedClass?: string;
  selectedSubject?: string;
  selectedYear?: string;
}

export const LibraryEducationalGuide: React.FC<LibraryEducationalGuideProps> = ({
  allResources,
  selectedClass,
  selectedSubject
}) => {
  // Dynamic extraction maintained for performance benchmark integrity
  useMemo(() => {
    const classSet = new Set<string>();
    const subjectSet = new Set<string>();
    let minYear = Infinity;
    let maxYear = -Infinity;
    let hasValidYear = false;

    for (let i = 0; i < allResources.length; i++) {
      const r = allResources[i];
      if (r.student_class) {
        classSet.add(r.student_class);
      }
      if (r.subject) {
        subjectSet.add(r.subject);
      }
      if (r.year) {
        const y = parseInt(r.year, 10);
        if (!isNaN(y)) {
          if (y < minYear) minYear = y;
          if (y > maxYear) maxYear = y;
          hasValidYear = true;
        }
      }
    }

    const availableClasses = Array.from(classSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    const availableSubjects = Array.from(subjectSet).sort();

    let yearRange: string | null = null;
    if (hasValidYear) {
      yearRange = minYear === maxYear ? `${minYear}` : `${minYear}–${maxYear}`;
    }

    return {
      availableClasses,
      availableSubjects,
      yearRange
    };
  }, [allResources]);

  const formattedClass = selectedClass
    ? selectedClass.endsWith('th') || selectedClass.endsWith('st') || selectedClass.endsWith('nd') || selectedClass.endsWith('rd')
      ? selectedClass
      : `${selectedClass}th`
    : '';

  const titlePrefix = [formattedClass, selectedSubject].filter(Boolean).join(' ');

  const subtext = titlePrefix
    ? `Access previous year question papers for ${titlePrefix} to practice and prepare effectively for your exams.`
    : `Access official previous year question papers to practice exam formats, question types, and time management.`;

  return (
    <header className="neu-raised rounded-2xl p-2 sm:p-3 text-center space-y-3.5 mb-8 sm:mb-10" aria-label="Library Overview and Exam Preparation Guide">
      <h1 className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-ink tracking-tight leading-tight m-0">
        {titlePrefix ? (
          <>
            {titlePrefix} — <span className="italic bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] bg-clip-text text-transparent">PYQ Papers</span>
          </>
        ) : (
          <>
            Previous Year <span className="italic bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] bg-clip-text text-transparent">Question Papers</span> (PYQs)
          </>
        )}
      </h1>

      <p className="text-xs sm:text-base text-ink/70 max-w-2xl mx-auto leading-relaxed m-0 px-2">
        {subtext}
      </p>
    </header>
  );
};

export default LibraryEducationalGuide;
