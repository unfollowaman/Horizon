import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { supabase } from '../../services/supabase';
import type { Resource } from '../../types';
import styles from './PdfViewer.module.css';
import { useAuth } from '../../context/AuthContext';
import { navLinks } from '../../data/navigation';
import { getResourceUrl, isResourceProtected } from '../../utils/resourceHelper';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [resource, setResource] = useState<Resource | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [initialProgressFetched, setInitialProgressFetched] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

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
      if (!id || authLoading) return;
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
          pdfUrl: getResourceUrl(data),
          thumbnailUrl: data.thumbnail_url || '',
          student_class: data.student_class || undefined,
          subject: data.subject || undefined,
          chapter_id: data.chapter_id || null,
          chapters: data.chapters || null,
          allow_download: data.allow_download ?? undefined,
          storage_bucket: data.storage_bucket,
          file_path: data.file_path
        };
        setResource(mappedResource);

        if (isResourceProtected(mappedResource)) {
          if (!user) {
            setPdfError('401_UNAUTHORIZED');
            setLoading(false);
            return;
          }

          try {
            const { data: edgeData, error: edgeError } = await supabase.functions.invoke('resource-access', {
              body: { resource_id: mappedResource.id },
            });
            if (edgeError) {
              const errorMessage = edgeError.message?.toLowerCase() || '';
              if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
                setPdfError('401_UNAUTHORIZED');
                return;
              } else if (errorMessage.includes('404')) {
                setPdfError('Resource not found');
              } else {
                setPdfError('403_FORBIDDEN');
              }
            } else if (!edgeData?.success) {
              const dataError = edgeData?.error?.toLowerCase() || '';
              if (dataError.includes('unauthorized') || dataError.includes('401')) {
                setPdfError('401_UNAUTHORIZED');
                return;
              }
              setPdfError(edgeData?.error || '403_FORBIDDEN');
            } else {
              setSignedUrl(edgeData.signed_url);
            }
          } catch {
            setPdfError('Error accessing protected resource');
          }
        } else {
          setSignedUrl(mappedResource.pdfUrl);
        }

        // Fetch suggested PDFs based on class and subject
        let query = supabase.from('learning_resources').select('*, chapters(*)').neq('id', data.id);
        if (data.student_class) query = query.eq('student_class', data.student_class);
        if (data.subject) query = query.eq('subject', data.subject);
        if (data.medium) query = query.eq('medium', data.medium);
        query = query.eq('resource_type', data.resource_type);

        const { error: relatedError } = await query.limit(4);

        if (relatedError) {
          console.error("Error fetching related resources:", relatedError);
          // ignore
        }
      }
      setLoading(false);
    };

    fetchResourceAndRelated();
  }, [id, user, authLoading]);

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
  const [showToast, setShowToast] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (numPages === null || pdfError) {
      setShowControls(true);
      return;
    }
    if (!isMobileMenuOpen && !isThreeDotsMenuOpen) {
      timerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
  }, [isMobileMenuOpen, isThreeDotsMenuOpen, numPages, pdfError]);

  const handleInteraction = useCallback(() => {
    setShowControls(true);
    resetTimer();
  }, [resetTimer]);

  const handleShare = async () => {
    const url = window.location.href;
    setIsThreeDotsMenuOpen(false);

    if (navigator.share) {
      try {
        await navigator.share({
          title: resource?.title || 'PDF Resource',
          text: 'Check out this PDF on Horizon.',
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  useEffect(() => {
    if (isMobileMenuOpen || isThreeDotsMenuOpen) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setShowControls(true);
    } else {
      resetTimer();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isMobileMenuOpen, isThreeDotsMenuOpen, resetTimer]);

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

  // Block keyboard shortcuts (Save/Print)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
      }

      // Check for Ctrl/Cmd+S and Ctrl/Cmd+Shift+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
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

  const [retryCount, setRetryCount] = useState(0);

  const fetchSignedUrl = useCallback(async () => {
    if (!resource || !isResourceProtected(resource) || retryCount > 3) return;
    try {
      setRetryCount(prev => prev + 1);
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('resource-access', {
        body: { resource_id: resource.id },
      });
      if (!edgeError && edgeData?.success) {
        setSignedUrl(edgeData.signed_url);
        setPdfError(null);
        setRetryCount(0);
      } else {
        const errorMessage = edgeError?.message?.toLowerCase() || '';
        const dataError = edgeData?.error?.toLowerCase() || '';
        if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || dataError.includes('unauthorized') || dataError.includes('401')) {
           setPdfError('401_UNAUTHORIZED');
        } else {
           setPdfError(edgeData?.error || 'Failed to refresh signed URL');
        }
      }
    } catch (_err) {
      console.error("Failed to refresh signed URL", _err);
    }
  }, [resource, retryCount, navigate]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Automatically start the hide timer once the PDF is fully loaded
  useEffect(() => {
    if (numPages !== null && !pdfError) {
      resetTimer();
    }
  }, [numPages, pdfError, resetTimer]);

  function onDocumentLoadError(error: Error) {
    console.error("Document Load Error:", error);
    if (resource && isResourceProtected(resource) && error.message.includes('Setting up fake worker failed')) {
        // Just generic catch-all for potential 403s on load if worker is trying to fetch.
        // Realistically pdf.js throws specific errors for 403/404s we might want to catch.
        // Let's just try to refresh the URL.
        fetchSignedUrl();
    } else if (resource && isResourceProtected(resource)) {
      fetchSignedUrl();
    }
  }

  function onDocumentSourceError(error: Error) {
    console.error("Document Source Error:", error);
    if (resource && isResourceProtected(resource)) {
      fetchSignedUrl();
    }
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
        <div className="text-center p-8 neu-card flex flex-col items-center justify-center rounded-2xl w-full max-w-lg mt-20 mx-auto">
          <h2 className="text-h2 uppercase mb-4 text-accent-red">Resource not found</h2>
          <button onClick={() => navigate(-1)} className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">Go Back</button>
        </div>
      </div>
    );
  }

  if (pdfError === '401_UNAUTHORIZED') {
    return (
      <div className={styles.pageContainer}>
        <div className="flex flex-col items-center justify-center p-8 neu-card rounded-2xl w-full max-w-lg mt-20 mx-auto text-center gap-4">
          <h2 className="text-h2 uppercase text-ink">Login required</h2>
          <p className="text-ink text-lg font-medium mb-4">To access notes please sign in or register</p>
          <div className="flex flex-col gap-3 w-full max-w-[300px]">
             <Link to="/login" className="block w-full p-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center">
               Log in
             </Link>
             <Link to="/register" className="block w-full p-3 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center">
               Create account
             </Link>
          </div>
          <button onClick={() => navigate(-1)} className="mt-4 p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (pdfError === '403_FORBIDDEN') {
    return (
      <div className={styles.pageContainer}>
        <div className="text-center p-8 neu-card flex flex-col items-center justify-center rounded-2xl w-full max-w-lg mt-20 mx-auto">
          <h2 className="text-h2 uppercase mb-4 text-accent-red">Access denied</h2>
          <p className="text-ink text-lg font-medium mb-4">You do not have permission to view this resource.</p>
          <button onClick={() => navigate(-1)} className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer} onClick={handleInteraction} onTouchStart={handleInteraction}>
      {showToast && (
        <div className={styles.toast}>
          Link copied to clipboard.
        </div>
      )}
      {/* Floating Controls */}
      <button
        onClick={() => navigate(-1)}
        className={`${styles.floatingTopLeft} neu-raised rounded-full neu-raised-hover ${showControls ? styles.controlsVisible : styles.controlsHidden}`}
        aria-label="Go Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`${styles.floatingTopRight} neu-raised rounded-full neu-raised-hover ${showControls ? styles.controlsVisible : styles.controlsHidden}`}
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
              {navLinks.filter(link => link.showOnMobile).map((link, index, array) => (
                <React.Fragment key={link.id || index}>
                  <Link
                    to={link.path}
                    onClick={closeMenu}
                    className={styles.menuNavLink}
                  >
                    {link.label}
                  </Link>
                  {index < array.length - 1 && <div className={styles.menuDivider} style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', margin: '4px var(--spacing-1)' }} />}
                </React.Fragment>
              ))}
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
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className={styles.transformWrapperContainer}>
          <TransformWrapper
            initialScale={1}
            minScale={1}
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
                <div className={`${styles.floatingBottomRight} ${styles.threeDotsWrapper} ${isThreeDotsMenuOpen ? styles.menuOpen : styles.menuClosed} neu-raised neu-raised-hover ${showControls ? styles.controlsVisible : styles.controlsHidden}`}>
                  <div className={styles.menuItemsContainer}>
                    <button onClick={() => { zoomIn(); setIsThreeDotsMenuOpen(false); }} className={styles.iconBtn} aria-label="Zoom In">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                      </svg>
                    </button>
                    <button onClick={() => { zoomOut(); setIsThreeDotsMenuOpen(false); }} className={styles.iconBtn} aria-label="Zoom Out">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                      </svg>
                    </button>
                    <button onClick={handleShare} className={styles.iconBtn} aria-label="Share">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => setIsThreeDotsMenuOpen(!isThreeDotsMenuOpen)}
                    className={styles.toggleBtn}
                    aria-label="More options"
                  >
                    {isThreeDotsMenuOpen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    )}
                  </button>
                </div>

                <TransformComponent wrapperClass={styles.transformWrapper} contentClass={styles.transformContent}>
                  <div className={styles.pdfScrollContainer}>
                    {pdfError ? (
                       <div className="p-4 font-bold flex justify-center w-full text-accent-red">{pdfError}</div>
                    ) : (
                    <Document
                      file={signedUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      onSourceError={onDocumentSourceError}
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
                    )}
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
