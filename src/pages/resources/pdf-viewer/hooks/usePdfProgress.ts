import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../services/supabase';
import type { Resource } from '../../../../types';
import type { User } from '@supabase/supabase-js';

interface UsePdfProgressProps {
  id?: string;
  user: User | null;
  resource: Resource | null;
  numPages: number | null;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export const usePdfProgress = ({ id, user, resource, numPages, pageRefs }: UsePdfProgressProps) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [initialProgressFetched, setInitialProgressFetched] = useState<boolean>(false);

  // Ref to track the latest page for the cleanup function
  const latestPageRef = useRef(currentPage);
  useEffect(() => {
    latestPageRef.current = currentPage;
  }, [currentPage]);

  // Save reading progress debounced
  useEffect(() => {
    if (!id || !user || !initialProgressFetched) return;

    let timeoutId: number;

    const saveProgress = async (pageToSave: number) => {
      try {
        const { error } = await supabase
          .from('reading_progress')
          .upsert({
            user_id: user.id,
            resource_id: id,
            progress: pageToSave,
            last_read_at: new Date().toISOString()
          }, { onConflict: 'user_id, resource_id' });

        if (error) {
          console.error("Error saving reading progress:", error);
        }
      } catch (err) {
        console.error("Failed to save progress:", err);
      }
    };

    if (currentPage > 1 || (currentPage === 1 && initialProgressFetched)) {
      timeoutId = window.setTimeout(() => {
        saveProgress(currentPage);
      }, 2000);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [currentPage, id, user, initialProgressFetched]);

  const completionCheckedRef = useRef<boolean>(false);

  useEffect(() => {
    completionCheckedRef.current = false;
  }, [id]);

  useEffect(() => {
    const handleChapterCompletion = async () => {
      if (!user || !resource || !numPages || completionCheckedRef.current) return;
      if (resource.resource_type !== 'notes' || !resource.chapter_id) return;

      const percentRead = currentPage / numPages;
      if (percentRead >= 0.95) {
        completionCheckedRef.current = true;

        try {
          const { data: existingRecords, error: fetchError } = await supabase
            .from('chapter_completion')
            .select('id')
            .eq('user_id', user.id)
            .eq('chapter_id', resource.chapter_id);

          if (fetchError) {
            console.error("Error checking existing chapter completion:", fetchError);
            completionCheckedRef.current = false;
            return;
          }

          if (!existingRecords || existingRecords.length === 0) {
            const { error: insertError } = await supabase
              .from('chapter_completion')
              .insert({
                user_id: user.id,
                resource_id: resource.id,
                chapter_id: resource.chapter_id
              });

            if (insertError) {
              console.error("Error inserting chapter completion:", insertError);
              completionCheckedRef.current = false;
            } else {
              console.log("Chapter marked as completed.");
            }
          } else {
             console.log("Chapter already completed.");
          }
        } catch (err) {
          console.error("Failed to process chapter completion:", err);
          completionCheckedRef.current = false;
        }
      }
    };

    handleChapterCompletion();
  }, [currentPage, numPages, resource, user]);

  useEffect(() => {
    return () => {
      if (user && id && initialProgressFetched && latestPageRef.current > 0) {
        const saveUnmount = async () => {
          try {
            const { error } = await supabase
              .from('reading_progress')
              .upsert({
                user_id: user.id,
                resource_id: id,
                progress: latestPageRef.current,
                last_read_at: new Date().toISOString()
              }, { onConflict: 'user_id, resource_id' });
            if (error) console.error("Unmount save error", error);
          } catch {
            // ignore
          }
        };
        saveUnmount();
      }
    };
  }, [user, id, initialProgressFetched]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!id || !user || !numPages || initialProgressFetched) return;

      try {
        const { data, error } = await supabase
          .from('reading_progress')
          .select('progress')
          .eq('resource_id', id)
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching reading progress:", error);
          return;
        }

        if (data && data.progress) {
          const targetPage = Math.min(data.progress, numPages);
          setCurrentPage(targetPage);

          setTimeout(() => {
            const pageEl = pageRefs.current[targetPage - 1];
            if (pageEl) {
              pageEl.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
          }, 300);
        }
      } catch (err) {
        console.error("Error in fetchProgress:", err);
      } finally {
        setInitialProgressFetched(true);
      }
    };

    fetchProgress();
  }, [id, user, numPages, initialProgressFetched, pageRefs]);

  return {
    currentPage,
    setCurrentPage,
    initialProgressFetched
  };
};
