import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { supabase } from '../../services/supabase';
import type { Resource } from '../../types';
import styles from './PdfViewer.module.css';
import { useAuth } from '../../context/AuthContext';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [resource, setResource] = useState<Resource | null>(null);

  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [initialProgressFetched, setInitialProgressFetched] = useState<boolean>(false);

  // Ref to container to calculate scale dynamically
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Measure container width for dynamic PDF scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Set up intersection observer to detect current reading page
  useEffect(() => {
    if (!numPages || pageRefs.current.length === 0) return;

    const observerOptions = {
      root: null, // use viewport (or we could use the pdfScrollContainer)
      rootMargin: '0px',
      threshold: 0.3 // Trigger when 30% of a page is visible
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      let maxRatio = 0;
      let mostVisiblePage = -1;

      // We might get multiple entries at once, so we need to find the one with the highest intersection ratio
      // or simply rely on the one that is currently intersecting
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageIndex = Number(entry.target.getAttribute('data-page-index'));
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisiblePage = pageIndex;
          }
        }
      });

      if (mostVisiblePage !== -1) {
        setCurrentPage(mostVisiblePage + 1);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [numPages]);

  useEffect(() => {
    const fetchResourceAndRelated = async () => {
      if (!id) return;
      setLoading(true);

      const { data, error } = await supabase
        .from('learning_resources')
        .select('*, chapters(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching resource:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const mappedResource: Resource = {
          id: data.id,
          title: data.title,
          description: data.description,
          resource_type: data.resource_type,
          medium: data.medium,
          uploadDate: data.created_at || new Date().toISOString(),
          pdfUrl: data.file_path ? supabase.storage.from('pdfs').getPublicUrl(data.file_path).data.publicUrl : (data.pdf_url || ''),
          thumbnailUrl: data.thumbnail_url || '',
          student_class: data.student_class || undefined,
          subject: data.subject || undefined,
          chapter_id: data.chapter_id || null,
          chapters: data.chapters || null
        };
        setResource(mappedResource);

        // Fetch suggested PDFs based on class and subject
        let query = supabase.from('learning_resources').select('*, chapters(*)').neq('id', data.id);
        if (data.student_class) query = query.eq('student_class', data.student_class);
        if (data.subject) query = query.eq('subject', data.subject);
        if (data.medium) query = query.eq('medium', data.medium);
        query = query.eq('resource_type', data.resource_type);

        const { data: relatedData, error: relatedError } = await query.limit(4);

        if (relatedError) {
          console.error("Error fetching related resources:", relatedError);
        } else if (relatedData) {
        }
      }
      setLoading(false);
    };

    fetchResourceAndRelated();
  }, [id]);

  // Ref to track the latest page for the cleanup function
  const latestPageRef = useRef(currentPage);
  useEffect(() => {
    latestPageRef.current = currentPage;
  }, [currentPage]);

  // Save reading progress debounced and on unmount
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

    // Debounce the save when currentPage changes
    if (currentPage > 1 || (currentPage === 1 && initialProgressFetched)) {
      timeoutId = window.setTimeout(() => {
        saveProgress(currentPage);
      }, 2000); // Save after 2 seconds of resting on a page
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [currentPage, id, user, initialProgressFetched]);


  // Track chapter completion status for this session to avoid multiple DB calls
  const completionCheckedRef = useRef<boolean>(false);

  // Reset completion check when resource changes
  useEffect(() => {
    completionCheckedRef.current = false;
  }, [id]);

  // Chapter completion logic
  useEffect(() => {
    const handleChapterCompletion = async () => {
      // Requirements:
      // - Only Notes complete a chapter
      // - Need a chapter_id
      // - Reached the completion threshold (95% - as confirmed by user, which means currentPage === numPages for simplicity based on our previous discussion?
      // Wait, let's look at the instruction: "Use a completion threshold of 95%. A chapter should be marked as completed once the student has reached at least 95% of the Chapter Notes PDF. Do not require the student to reach the absolute last page."

      if (!user || !resource || !numPages || completionCheckedRef.current) return;
      if (resource.resource_type !== 'notes' || !resource.chapter_id) return;

      // Calculate percentage read
      const percentRead = currentPage / numPages;
      if (percentRead >= 0.95) {
        completionCheckedRef.current = true; // Mark checked immediately to prevent multiple concurrent calls

        try {
          // Check if completion record already exists
          const { data: existingRecords, error: fetchError } = await supabase
            .from('chapter_completion')
            .select('id')
            .eq('user_id', user.id)
            .eq('chapter_id', resource.chapter_id);

          if (fetchError) {
            console.error("Error checking existing chapter completion:", fetchError);
            completionCheckedRef.current = false; // Reset to allow retry on error
            return;
          }

          if (!existingRecords || existingRecords.length === 0) {
            // No record exists, insert new one
            const { error: insertError } = await supabase
              .from('chapter_completion')
              .insert({
                user_id: user.id,
                resource_id: resource.id,
                chapter_id: resource.chapter_id
              });

            if (insertError) {
              console.error("Error inserting chapter completion:", insertError);
              completionCheckedRef.current = false; // Reset to allow retry on error
            } else {
              console.log("Chapter marked as completed.");
            }
          } else {
             // Record already exists
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

  // Cleanup: save immediately when unmounting
  useEffect(() => {
    return () => {
      if (user && id && initialProgressFetched && latestPageRef.current > 0) {
        // We use an inline async function since we can't await in cleanup easily
        // and we want it to fire as best-effort.
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


  // Fetch initial reading progress
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

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
          console.error("Error fetching reading progress:", error);
          return;
        }

        if (data && data.progress) {
          const targetPage = Math.min(data.progress, numPages);
          setCurrentPage(targetPage);

          // Small delay to ensure refs are attached and layout is settled
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
  }, [id, user, numPages, initialProgressFetched]);


    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThreeDotsMenuOpen, setIsThreeDotsMenuOpen] = useState(false);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.threeDotsWrapper}`)) {
        setIsThreeDotsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hamburger Menu Handlers
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const closeMenu = () => setIsMobileMenuOpen(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className="text-center p-8 neu-card rounded-2xl w-full max-w-lg mt-20">
            <h2 className="text-h2 uppercase mb-4 text-ink">Loading PDF...</h2>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className={styles.pageContainer}>
        <div className="text-center p-8 neu-card rounded-2xl w-full max-w-lg mt-20">
          <h2 className="text-h2 uppercase mb-4 text-accent-red">Resource not found</h2>
          <button onClick={() => navigate(-1)} className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Floating Controls */}
      <button
        onClick={() => navigate(-1)}
        className={`${styles.floatingTopLeft} neu-raised rounded-full neu-raised-hover`}
        aria-label="Go Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`${styles.floatingTopRight} neu-raised rounded-full neu-raised-hover`}
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Expanded Hamburger Menu Overlay (Replicated from Home.tsx) */}
      <div className={`${styles.menuOverlayWrapper} ${isMobileMenuOpen ? styles.menuOverlayVisible : styles.menuOverlayHidden}`}>
        <div className={styles.menuBackdrop} onClick={closeMenu} aria-hidden="true" />
        <div className={styles.menuContentWrapper}>
          <div className={`${styles.menuPanel} neu-raised ${isMobileMenuOpen ? styles.menuPanelActive : styles.menuPanelInactive}`}>
            <div className={styles.menuHeader}>
              <div className={styles.menuBrandIcon}>
                <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.menuBrandLogoImg} />
              </div>
              <button onClick={closeMenu} className={styles.menuCloseBtn}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className={styles.menuNavLinks}>
              <Link to="/library" onClick={closeMenu} className={styles.menuNavLink}>PYQ Papers</Link>
              <Link to="/" onClick={closeMenu} className={styles.menuNavLink}>Flashcards</Link>
              <Link to="/" onClick={closeMenu} className={styles.menuNavLink}>MCQ Sets</Link>
              <Link to="/" onClick={closeMenu} className={styles.menuNavLink}>Revision Sheets</Link>
              <Link to="/notes" onClick={closeMenu} className={styles.menuNavLink}>Study Notes</Link>
              <Link to="/" onClick={closeMenu} className={styles.menuNavLink}>Updates</Link>
            </nav>
            <div className={styles.menuActionButtons}>
              {user ? (
                <Link to="/dashboard" onClick={closeMenu} className={styles.menuSignInBtn}>Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" onClick={closeMenu} className={styles.menuSignInBtn}>Sign in</Link>
                  <Link to="/register" onClick={closeMenu} className={styles.menuGetNowBtn}>Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Reader Container (Full screen) */}
      <div
        ref={containerRef}
        className={styles.viewerContainer}
      >
        <div className={styles.transformWrapperContainer}>
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
            wheel={{
              wheelDisabled: false,
              activationKeys: ['Control', 'Shift', 'Meta', 'Alt']
            }}
            panning={{ excluded: ['a', 'button', 'input'] }}
            trackPadPanning={{ disabled: false }}
          >
            {({ zoomIn, zoomOut }) => (
              <>


                {/* Floating Bottom Right Three-Dots Menu */}
                <div className={`${styles.floatingBottomRight} ${styles.threeDotsWrapper}`}>
                  {isThreeDotsMenuOpen && (
                    <div className={`${styles.threeDotsMenu} neu-raised`}>
                      <button onClick={() => { zoomIn(); setIsThreeDotsMenuOpen(false); }} className={styles.threeDotsMenuItem}>
                        Zoom In
                      </button>
                      <button onClick={() => { zoomOut(); setIsThreeDotsMenuOpen(false); }} className={styles.threeDotsMenuItem}>
                        Zoom Out
                      </button>
                      <a
                        href={resource.pdfUrl.startsWith('http') ? resource.pdfUrl : supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.threeDotsMenuItem}
                        onClick={() => setIsThreeDotsMenuOpen(false)}
                      >
                        Download PDF
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => setIsThreeDotsMenuOpen(!isThreeDotsMenuOpen)}
                    className={`${styles.threeDotsBtn} neu-raised rounded-full neu-raised-hover`}
                    aria-label="More options"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                </div>

                <TransformComponent wrapperClass={styles.transformWrapper} contentClass={styles.transformContent}>
                  <div className={styles.pdfScrollContainer}>
                    <Document
                      file={resource.pdfUrl.startsWith('http') ? resource.pdfUrl : supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={<div className="p-4 font-bold flex justify-center w-full">Rendering PDF...</div>}
                      className={styles.pdfDocument}
                    >
                      {Array.from(new Array(numPages || 0), (_, index) => (
                        <div
                          key={`page_${index + 1}`}
                          className={styles.reactPdfPage}
                          ref={(el) => { pageRefs.current[index] = el; }}
                          data-page-index={index}
                        >
                          <Page
                            pageNumber={index + 1}
                            width={containerWidth || Math.min(window.innerWidth, 800)}
                            scale={1}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            loading={<div className="h-64 w-full animate-pulse bg-gray-200 rounded-md"></div>}
                          />
                        </div>
                      ))}
                    </Document>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
