import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useAuth } from '../../context/AuthContext';
import styles from './PdfViewer.module.css';
import PdfLoadingScreen from '../../components/PdfLoadingScreen';
import { usePdfData } from './pdf-viewer/hooks/usePdfData';
import { usePdfProgress } from './pdf-viewer/hooks/usePdfProgress';
import { usePdfControls } from './pdf-viewer/hooks/usePdfControls';
import { usePdfSlider } from './pdf-viewer/hooks/usePdfSlider';
import { usePdfKeyboardShortcuts } from './pdf-viewer/hooks/usePdfKeyboardShortcuts';
import { PdfMobileMenu } from './pdf-viewer/components/PdfMobileMenu';
import { PdfPageSlider } from './pdf-viewer/components/PdfPageSlider';
import { PdfTopControls } from './pdf-viewer/components/PdfFloatingControls';
import { PdfDocumentRenderer } from './pdf-viewer/components/PdfDocumentRenderer';
import { PdfRenderErrorFallback } from './pdf-viewer/components/PdfRenderErrorFallback';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { isResourceProtected } from '../../utils/resourceHelper';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [renderResetKey, setRenderResetKey] = useState<number>(0);

  const { resource, signedUrl, pdfError, loading, fetchSignedUrl } = usePdfData({ id, user, authLoading });

  const [numPages, setNumPages] = useState<number | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const setTransformRef = useRef<((x: number, y: number, scale: number) => void) | null>(null);
  const transformStateRef = useRef<{ positionX: number, positionY: number, scale: number }>({ positionX: 0, positionY: 0, scale: 1 });

  const { currentPage, setCurrentPage } = usePdfProgress({ id, user, resource, numPages, pageRefs });

  const {
    showControls,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isThreeDotsMenuOpen,
    setIsThreeDotsMenuOpen,
    handleInteraction,
  } = usePdfControls(numPages, pdfError);

  const {
    isSliderVisible,
    isDraggingSlider,
    sliderTopPx,
    sliderContainerRef,
    onSliderTouchStart,
    onSliderTouchMove,
    onSliderTouchEnd,
    onSliderMouseDown,
    handleTransformed,
    handleScroll,
  } = usePdfSlider({
    containerRef,
    scrollContainerRef,
    transformStateRef,
    pageRefs,
    numPages,
    currentPage,
    setCurrentPage,
  });

  const [showToast, setShowToast] = useState(false);

  const onDocumentLoadSuccess = (pdf: { numPages: number }) => {
    setNumPages(pdf.numPages);
    pageRefs.current = new Array(pdf.numPages).fill(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error while loading document!', error);
    if (resource && isResourceProtected(resource) && id) {
      fetchSignedUrl(id);
    }
  };

  const onDocumentSourceError = (error: Error) => {
    console.error('Error with document source!', error);
    if (resource && isResourceProtected(resource) && id) {
      fetchSignedUrl(id);
    }
  };

  usePdfKeyboardShortcuts();

  const handleShare = async () => {
    const url = window.location.href;
    setIsThreeDotsMenuOpen(false);

    if (navigator.share) {
      try {
        await navigator.share({
          title: resource?.title || 'Learning Resource',
          url: url
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }).catch(err => {
        console.error("Failed to copy link:", err);
      });
    }
  };

  if (loading) {
    return <PdfLoadingScreen />;
  }

  if (!resource) {
    return (
      <div className={`${styles.pageContainer} justify-center items-center overflow-y-auto`}>
        <div className="text-center p-8 neu-card flex flex-col items-center justify-center rounded-2xl w-[calc(100%-3rem)] max-w-[400px] my-8">
          <h1 className="text-h2 uppercase mb-4 text-accent-red">Resource not found</h1>
          <button onClick={() => navigate(-1)} className="inline-block p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink">Go Back</button>
        </div>
      </div>
    );
  }

  if (pdfError === '401_UNAUTHORIZED') {
    return (
      <div className={`${styles.pageContainer} justify-center items-center overflow-y-auto`}>
        <div className="flex flex-col items-center justify-center p-2 neu-card rounded-2xl w-[calc(100%-3rem)] max-w-[400px] text-center gap-3 my-8">
          <h1 className="text-h2 uppercase text-ink m-0">Login required</h1>
          <p className="text-ink text-sm font-medium m-0">To access notes please sign in or register</p>
          <img
            src="/assets/SVG Illustrations/login-signin-page.svg"
            alt=""
            className="w-40 h-auto my-2"
          />
          <div className="flex flex-col gap-2 w-full max-w-[300px]">
             <Link to="/login" className="block w-full p-2 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center">
               Log in
             </Link>
             <Link to="/register" className="block w-full p-2 font-bold neu-raised rounded-xl hover:neu-raised-hover no-underline text-ink text-center">
               Create account
             </Link>
          </div>
          <button onClick={() => navigate(-1)} className="mt-2 p-2 font-bold neu-raised rounded-md hover:neu-raised-hover no-underline text-ink text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (pdfError === '403_FORBIDDEN') {
    return (
      <div className={`${styles.pageContainer} justify-center items-center overflow-y-auto`}>
        <div className="text-center p-8 neu-card flex flex-col items-center justify-center rounded-2xl w-[calc(100%-3rem)] max-w-[400px] my-8">
          <h1 className="text-h2 uppercase mb-4 text-accent-red">Access denied</h1>
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

      <PdfTopControls
        showControls={showControls}
        onBack={() => navigate(-1)}
        isMobileMenuOpen={isMobileMenuOpen}
        toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <PdfMobileMenu
        isMobileMenuOpen={isMobileMenuOpen}
        closeMenu={() => setIsMobileMenuOpen(false)}
        user={user}
        signOut={signOut}
      />

      <PdfPageSlider
        sliderContainerRef={sliderContainerRef}
        isSliderVisible={isSliderVisible}
        currentPage={currentPage}
        sliderTopPx={sliderTopPx}
        isDraggingSlider={isDraggingSlider}
        onSliderTouchStart={onSliderTouchStart}
        onSliderTouchMove={onSliderTouchMove}
        onSliderTouchEnd={onSliderTouchEnd}
        onSliderMouseDown={onSliderMouseDown}
      />

      <ErrorBoundary
        key={renderResetKey}
        fallback={
          <PdfRenderErrorFallback
            onRetry={() => setRenderResetKey((prev) => prev + 1)}
            onGoBack={() => navigate(-1)}
          />
        }
      >
        <PdfDocumentRenderer
          signedUrl={signedUrl}
          pdfError={pdfError}
          numPages={numPages}
          containerRef={containerRef}
          scrollContainerRef={scrollContainerRef}
          pageRefs={pageRefs}
          setTransformRef={setTransformRef}
          handleTransformed={handleTransformed}
          handleScroll={handleScroll}
          onDocumentLoadSuccess={onDocumentLoadSuccess}
          onDocumentLoadError={onDocumentLoadError}
          onDocumentSourceError={onDocumentSourceError}
          showControls={showControls}
          isThreeDotsMenuOpen={isThreeDotsMenuOpen}
          toggleThreeDotsMenu={() => setIsThreeDotsMenuOpen(!isThreeDotsMenuOpen)}
          handleShare={handleShare}
          setCurrentPage={setCurrentPage}
        />
      </ErrorBoundary>
    </div>
  );
};

export default PdfViewer;
