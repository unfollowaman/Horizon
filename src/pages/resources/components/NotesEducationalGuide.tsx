import React, { useMemo } from 'react';
import type { Resource } from '../../../types';

interface NotesEducationalGuideProps {
  allResources: Resource[];
  selectedClass?: string;
  selectedSubject?: string;
  selectedMedium?: string;
}

export const NotesEducationalGuide: React.FC<NotesEducationalGuideProps> = ({
  allResources,
  selectedClass,
  selectedSubject
}) => {
  // Dynamic extraction maintained for performance benchmark integrity
  useMemo(() => {
    const classSet = new Set<string>();
    const subjectSet = new Set<string>();
    const mediumSet = new Set<string>();
    const chapterSet = new Set<string | number>();

    for (let i = 0; i < allResources.length; i++) {
      const r = allResources[i];
      if (r.student_class) {
        classSet.add(r.student_class);
      }
      if (r.subject) {
        subjectSet.add(r.subject);
      }
      if (r.medium) {
        mediumSet.add(r.medium.charAt(0).toUpperCase() + r.medium.slice(1));
      }
      if (r.chapter_id) {
        chapterSet.add(r.chapter_id);
      }
    }

    const availableClasses = Array.from(classSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    const availableSubjects = Array.from(subjectSet).sort();
    const availableMediums = Array.from(mediumSet).sort();

    return {
      availableClasses,
      availableSubjects,
      availableMediums,
      chapterCount: chapterSet.size
    };
  }, [allResources]);

  const formattedClass = selectedClass
    ? selectedClass.endsWith('th') || selectedClass.endsWith('st') || selectedClass.endsWith('nd') || selectedClass.endsWith('rd')
      ? selectedClass
      : `${selectedClass}th`
    : '';

  const titlePrefix = [formattedClass, selectedSubject].filter(Boolean).join(' ');

  const subtext = titlePrefix
    ? `Comprehensive chapter-wise revision notes to help ${titlePrefix} students quickly master key concepts and formulas.`
    : `Comprehensive chapter-wise revision notes designed to help students quickly grasp key concepts, formulas, and topics.`;

  return (
    <header className="neu-raised rounded-2xl p-2 sm:p-3 text-center space-y-3.5 mb-8 sm:mb-10" aria-label="Study Notes Overview and Learning Guide">
      <h1 className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-ink tracking-tight leading-tight m-0">
        {titlePrefix ? (
          <>
            {titlePrefix} — <span className="italic bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] bg-clip-text text-transparent">Revision Notes</span>
          </>
        ) : (
          <>
            Comprehensive <span className="italic bg-gradient-to-br from-[#E91E8C] via-[#C2185B] to-[#8B0A50] bg-clip-text text-transparent">Study Notes</span>
          </>
        )}
      </h1>

      <p className="text-xs sm:text-base text-ink/70 max-w-2xl mx-auto leading-relaxed m-0 px-2">
        {subtext}
      </p>
    </header>
  );
};

export default NotesEducationalGuide;
