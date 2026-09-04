import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  SUPPORTED_CLASSES,
  getClassBySlug,
  getSubjectsForClass,
  resolveSubjectName,
  normalizeClassId,
} from '../../services/syllabusService';
import { fetchSyllabusHierarchy } from '../../services/learningResourcesAPI';
import type { SyllabusChapterHierarchy } from '../../types';
import SyllabusLanding from './components/SyllabusLanding';
import ClassSubjectSelector from './components/ClassSubjectSelector';
import SyllabusHierarchyTree from './components/SyllabusHierarchyTree';
import SyllabusSkeleton from './components/SyllabusSkeleton';

export const SyllabusPage: React.FC = () => {
  const { classSlug, subjectSlug } = useParams<{ classSlug?: string; subjectSlug?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<SyllabusChapterHierarchy[]>([]);

  const currentClass = getClassBySlug(classSlug);
  const currentClassId = normalizeClassId(classSlug);
  const resolvedSubjectName = resolveSubjectName(classSlug, subjectSlug);

  // Dynamic SEO Page Title & Meta Tags
  useEffect(() => {
    if (currentClass && resolvedSubjectName) {
      document.title = `${currentClass.name} ${resolvedSubjectName} Syllabus | Horizon`;
    } else if (currentClass) {
      document.title = `${currentClass.name} Syllabus Subjects | Horizon`;
    } else {
      document.title = 'CBSE & NCERT Syllabus Directory | Horizon';
    }
  }, [currentClass, resolvedSubjectName]);

  // Data fetching when both class and subject are selected
  useEffect(() => {
    let isMounted = true;

    const loadHierarchy = async () => {
      if (!currentClassId || !resolvedSubjectName) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: apiError } = await fetchSyllabusHierarchy(
          currentClassId,
          resolvedSubjectName
        );

        if (!isMounted) return;

        if (apiError) {
          setError('Failed to fetch syllabus data. Please try again.');
          setChapters([]);
        } else {
          setChapters((data as SyllabusChapterHierarchy[]) || []);
        }
      } catch (err) {
        if (isMounted) {
          setError('An unexpected error occurred while loading the syllabus.');
          setChapters([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (classSlug && subjectSlug) {
      loadHierarchy();
    } else {
      setChapters([]);
      setError(null);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [classSlug, subjectSlug, currentClassId, resolvedSubjectName]);

  const handleSelectClass = (cSlug: string) => {
    navigate(`/syllabus/${cSlug}`);
  };

  const handleSelectSubject = (sSlug: string) => {
    if (classSlug) {
      navigate(`/syllabus/${classSlug}/${sSlug}`);
    }
  };

  const handleBackToClasses = () => {
    navigate('/syllabus');
  };

  const handleBackToSubjects = () => {
    if (classSlug) {
      navigate(`/syllabus/${classSlug}`);
    }
  };

  // View 1: Syllabus Landing Page (/syllabus)
  if (!classSlug) {
    return (
      <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0">
        <SyllabusLanding
          classes={SUPPORTED_CLASSES}
          onSelectClass={handleSelectClass}
        />
      </div>
    );
  }

  // View 2: Class Subject Selector (/syllabus/:classSlug)
  if (classSlug && !subjectSlug) {
    if (!currentClass) {
      return (
        <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] text-center py-12 space-y-4">
          <h2 className="text-2xl font-bold text-ink">Class Not Found</h2>
          <p className="text-ink/70">The requested class syllabus route does not exist.</p>
          <button
            type="button"
            onClick={handleBackToClasses}
            className="neu-raised neu-raised-hover px-4 py-2 rounded-xl font-bold text-ink"
          >
            Back to Syllabus Directory
          </button>
        </div>
      );
    }

    const availableSubjects = getSubjectsForClass(classSlug);

    return (
      <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0">
        <ClassSubjectSelector
          currentClass={currentClass}
          subjects={availableSubjects}
          onSelectSubject={handleSelectSubject}
          onBackToClasses={handleBackToClasses}
        />
      </div>
    );
  }

  // View 3: Subject Hierarchy View (/syllabus/:classSlug/:subjectSlug)
  return (
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0 space-y-6">
      {/* Top Header Controls */}
      <div className="flex justify-between items-center w-full min-w-0">
        <button
          type="button"
          onClick={handleBackToSubjects}
          className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer shrink-0 text-ink focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
          aria-label="Back to Subject List"
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

        {currentClass && resolvedSubjectName && (
          <span className="text-xs sm:text-sm font-bold tracking-widest text-[#E91E8C] uppercase truncate">
            {currentClass.name} — {resolvedSubjectName}
          </span>
        )}
      </div>

      {loading && <SyllabusSkeleton />}

      {!loading && error && (
        <div className="neu-card rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-ink">Unable to Load Syllabus</h2>
          <p className="text-sm text-ink/70">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchSyllabusHierarchy(currentClassId!, resolvedSubjectName!)
                .then(({ data, error: apiErr }) => {
                  if (apiErr) {
                    setError('Failed to fetch syllabus data. Please try again.');
                    setChapters([]);
                  } else {
                    setChapters((data as SyllabusChapterHierarchy[]) || []);
                  }
                })
                .catch(() => {
                  setError('An unexpected error occurred while loading the syllabus.');
                })
                .finally(() => setLoading(false));
            }}
            className="neu-raised neu-raised-hover px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-[#E91E8C] to-[#8B0A50]"
          >
            Retry Loading
          </button>
        </div>
      )}

      {!loading && !error && currentClass && resolvedSubjectName && (
        <SyllabusHierarchyTree
          chapters={chapters}
          subjectName={resolvedSubjectName}
          classNameTitle={currentClass.name}
        />
      )}
    </div>
  );
};

export default SyllabusPage;
