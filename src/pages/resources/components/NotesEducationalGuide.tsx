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
  selectedSubject,
  selectedMedium
}) => {
  const availableClasses = useMemo(() => {
    const set = new Set(allResources.map(r => r.student_class).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  }, [allResources]);

  const availableSubjects = useMemo(() => {
    const set = new Set(allResources.map(r => r.subject).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [allResources]);

  const availableMediums = useMemo(() => {
    const set = new Set(allResources.map(r => r.medium).filter(Boolean) as string[]);
    return Array.from(set).map(m => m.charAt(0).toUpperCase() + m.slice(1)).sort();
  }, [allResources]);

  const chapterCount = useMemo(() => {
    const chapterIds = new Set(allResources.map(r => r.chapter_id).filter(Boolean));
    return chapterIds.size;
  }, [allResources]);

  const contextualFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedClass) parts.push(selectedClass);
    if (selectedSubject) parts.push(selectedSubject);
    if (selectedMedium && selectedMedium !== 'Mediums' && selectedMedium !== 'All Mediums') {
      parts.push(`${selectedMedium} Medium`);
    }

    if (parts.length === 0) {
      return null;
    }

    return `Currently displaying study notes filtered for ${parts.join(' • ')}.`;
  }, [selectedClass, selectedSubject, selectedMedium]);

  return (
    <section aria-label="Study Notes Overview and Learning Guide" className="neu-raised rounded-2xl p-[clamp(16px,3vw,28px)] mb-[clamp(20px,3vw,32px)] text-ink">
      <div className="space-y-4">
        <div>
          <h2 className="text-[clamp(18px,2.5vw,22px)] font-bold mb-2">
            Horizon Comprehensive Study Notes
          </h2>
          <p className="text-body2 text-muted-foreground leading-relaxed">
            Horizon Study Notes provide clear, chapter-wise concept summaries and structured academic guides designed to simplify learning and strengthen fundamental understanding. Each note module breaks down complex textbook topics into clear explanations, key formulas, essential definitions, and step-by-step topic outlines.
          </p>
        </div>

        {contextualFilterSummary && (
          <div className="neu-inset rounded-xl p-3 text-caption font-medium text-ink bg-opacity-50">
            {contextualFilterSummary}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="neu-inset rounded-xl p-4">
            <h3 className="text-body1 font-semibold mb-2">Notes Organization & Coverage</h3>
            <p className="text-caption text-muted-foreground mb-3 leading-relaxed">
              Notes are mapped sequentially to official curriculum chapters to support structured study throughout the academic year:
            </p>
            <ul className="list-disc list-inside text-caption text-muted-foreground space-y-1.5">
              <li>
                <strong>Classes Supported:</strong> {availableClasses.length > 0 ? availableClasses.join(', ') : 'Middle & High School grades'}
              </li>
              <li>
                <strong>Subjects Covered:</strong> {availableSubjects.length > 0 ? availableSubjects.join(', ') : 'Science, Social Studies, Mathematics'}
              </li>
              <li>
                <strong>Study Mediums:</strong> {availableMediums.length > 0 ? availableMediums.join(', ') : 'English and Hindi medium'}
              </li>
              {chapterCount > 0 && (
                <li>
                  <strong>Syllabus Chapters:</strong> Covers over {chapterCount} curriculum chapters
                </li>
              )}
            </ul>
          </div>

          <div className="neu-inset rounded-xl p-4">
            <h3 className="text-body1 font-semibold mb-2">Study & Revision Strategy</h3>
            <ul className="list-disc list-inside text-caption text-muted-foreground space-y-1.5 leading-relaxed">
              <li>
                <strong>Pre-Class Preparation:</strong> Read note summaries before classroom lectures to familiarize yourself with key terminology.
              </li>
              <li>
                <strong>Active Concept Review:</strong> Revisit core formulas, definitions, and diagrams during weekly study sessions.
              </li>
              <li>
                <strong>Self-Assessment:</strong> Test your recall by explaining concepts in your own words after completing each chapter outline.
              </li>
              <li>
                <strong>Accessing Full Documents:</strong> Detailed interactive note materials can be accessed seamlessly. Complete protected document access may require logging into your free Horizon account.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NotesEducationalGuide;
