import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabase';
import { fetchSyllabusChapters } from '../../../services/learningResourcesAPI';
import { normalizeClassValue, normalizeMediumValue } from '../../../utils/resourceHelper';

export interface ProgressData {
  allTimeCompletedChapters: number;
  syllabusTotalChapters: number;
  syllabusCompletedChapters: number;
  percentageComplete: number;
  subjectProgress: Record<string, { total: number; completed: number; percentage: number }>;
}

export interface UseDashboardProgressProps {
  user: User | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any | null;
}

export function useDashboardProgress({ user, profile }: UseDashboardProgressProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchProgress() {
      if (!user || !profile) {
        if (isMounted) {
          setIsLoadingProgress(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingProgress(true);
      }

      try {
        // Fetch syllabus: all chapters for the student's class
        const normalizedClass = normalizeClassValue(profile.student_class);
        const { data: syllabusData, error: syllabusError } = await fetchSyllabusChapters(
          normalizedClass,
          normalizeMediumValue(profile.study_medium)
        );

        if (syllabusError) throw syllabusError;

        // Fetch completed chapters for the user
        const { data: completionsData, error: completionsError } = await supabase
          .from('chapter_completion')
          .select('chapter_id')
          .eq('user_id', user.id);

        if (completionsError) throw completionsError;

        const allTimeCompletedChapters = completionsData ? completionsData.length : 0;

        if (!syllabusData || syllabusData.length === 0) {
          if (isMounted) {
            setProgressData({
              allTimeCompletedChapters,
              syllabusTotalChapters: 0,
              syllabusCompletedChapters: 0,
              percentageComplete: 0,
              subjectProgress: {}
            });
          }
          return;
        }

        // Create a set of unique chapters for the syllabus and group by subject
        const syllabusChapterIds = new Set<string>();
        const subjectTotals: Record<string, Set<string>> = {};

        syllabusData.forEach(resource => {
          if (resource.chapter_id) {
            syllabusChapterIds.add(resource.chapter_id);
            const subject = resource.subject || 'Other';
            if (!subjectTotals[subject]) {
              subjectTotals[subject] = new Set();
            }
            subjectTotals[subject].add(resource.chapter_id);
          }
        });

        // Check which completions are within the current syllabus
        const completedChapterIds = new Set(completionsData?.map(c => c.chapter_id) || []);

        let syllabusCompletedChapters = 0;
        const subjectCompleted: Record<string, number> = {};

        for (const subject of Object.keys(subjectTotals)) {
          subjectCompleted[subject] = 0;
          for (const chapterId of subjectTotals[subject]) {
            if (completedChapterIds.has(chapterId)) {
              syllabusCompletedChapters++;
              subjectCompleted[subject]++;
            }
          }
        }

        const syllabusTotalChapters = syllabusChapterIds.size;
        const percentageComplete =
          syllabusTotalChapters > 0
            ? Math.round((syllabusCompletedChapters / syllabusTotalChapters) * 100)
            : 0;

        const subjectProgress: Record<
          string,
          { total: number; completed: number; percentage: number }
        > = {};
        for (const subject of Object.keys(subjectTotals)) {
          const total = subjectTotals[subject].size;
          const completed = subjectCompleted[subject];
          subjectProgress[subject] = {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
          };
        }

        if (isMounted) {
          setProgressData({
            allTimeCompletedChapters,
            syllabusTotalChapters,
            syllabusCompletedChapters,
            percentageComplete,
            subjectProgress
          });
        }
      } catch (err) {
        console.error('Error fetching progress:', err);
      } finally {
        if (isMounted) {
          setIsLoadingProgress(false);
        }
      }
    }

    fetchProgress();

    return () => {
      isMounted = false;
    };
  }, [user, profile]);

  return { progressData, isLoadingProgress };
}
