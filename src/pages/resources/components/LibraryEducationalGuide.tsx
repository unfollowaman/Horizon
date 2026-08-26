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
  selectedSubject,
  selectedYear
}) => {
  // Extract dynamic details based strictly on loaded resources
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

  const yearRange = useMemo(() => {
    const years = allResources
      .map(r => (r.year ? parseInt(r.year, 10) : NaN))
      .filter(y => !isNaN(y));
    if (years.length === 0) return null;
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min}–${max}`;
  }, [allResources]);

  // Contextual text summarizing current filter state
  const contextualFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedClass) parts.push(selectedClass);
    if (selectedSubject) parts.push(selectedSubject);
    if (selectedYear && selectedYear !== 'Years' && selectedYear !== 'All Years') {
      parts.push(`Year ${selectedYear}`);
    }

    if (parts.length === 0) {
      return null;
    }

    return `Currently displaying previous year question papers filtered for ${parts.join(' • ')}.`;
  }, [selectedClass, selectedSubject, selectedYear]);

  return (
    <section aria-label="Library Overview and Exam Preparation Guide" className="neu-raised rounded-2xl p-[clamp(16px,3vw,28px)] mb-[clamp(20px,3vw,32px)] text-ink">
      <div className="space-y-4">
        <div>
          <h2 className="text-[clamp(18px,2.5vw,22px)] font-bold mb-2">
            Horizon Previous Year Question Papers (PYQs)
          </h2>
          <p className="text-body2 text-muted-foreground leading-relaxed">
            The Horizon Library provides a structured repository of official previous year question papers designed to help students prepare for upcoming board and school examinations. Practicing with past papers offers direct insight into exam question formats, topic weightage, marking schemes, and time management strategies.
          </p>
        </div>

        {contextualFilterSummary && (
          <div className="neu-inset rounded-xl p-3 text-caption font-medium text-ink bg-opacity-50">
            {contextualFilterSummary}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="neu-inset rounded-xl p-4">
            <h3 className="text-body1 font-semibold mb-2">Available Resource Categories</h3>
            <p className="text-caption text-muted-foreground mb-3 leading-relaxed">
              Our library is systematically organized to enable efficient browsing across academic levels, subjects, and examination years:
            </p>
            <ul className="list-disc list-inside text-caption text-muted-foreground space-y-1.5">
              <li>
                <strong>Classes Covered:</strong> {availableClasses.length > 0 ? availableClasses.join(', ') : 'Secondary & Higher Secondary grades'}
              </li>
              <li>
                <strong>Subjects Available:</strong> {availableSubjects.length > 0 ? availableSubjects.join(', ') : 'Mathematics, Science, Social Sciences'}
              </li>
              {yearRange && (
                <li>
                  <strong>Examination Years:</strong> {yearRange} past exam papers
                </li>
              )}
            </ul>
          </div>

          <div className="neu-inset rounded-xl p-4">
            <h3 className="text-body1 font-semibold mb-2">How to Use PYQs for Revision</h3>
            <ul className="list-disc list-inside text-caption text-muted-foreground space-y-1.5 leading-relaxed">
              <li>
                <strong>Simulate Exam Conditions:</strong> Solve complete past papers within the designated time limit to build speed and accuracy.
              </li>
              <li>
                <strong>Identify High-Frequency Topics:</strong> Analyze recurring question types and essential core concepts across multiple years.
              </li>
              <li>
                <strong>Assess Knowledge Gaps:</strong> Cross-check your answers against standard solutions to spot areas needing further study.
              </li>
              <li>
                <strong>Refine Writing Technique:</strong> Practice structured answer presentation, numerical steps, and labeled diagrams.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LibraryEducationalGuide;
