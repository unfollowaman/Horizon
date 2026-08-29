import React, { useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import styles from '../../PdfViewer.module.css';
import { PdfBottomControls } from './PdfFloatingControls';

interface PdfDocumentRendererProps {
  signedUrl: string | null;
  pdfError: string | null;
  numPages: number | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  setTransformRef: React.MutableRefObject<((x: number, y: number, scale: number) => void) | null>;
  handleTransformed: (ref: { state: { positionX: number, positionY: number, scale: number }, instance?: { contentComponent?: HTMLElement | null } }) => void;
  handleScroll: () => void;
  onDocumentLoadSuccess: (pdf: { numPages: number }) => void;
  onDocumentLoadError: (error: Error) => void;
  onDocumentSourceError: (error: Error) => void;
  showControls: boolean;
  isThreeDotsMenuOpen: boolean;
  toggleThreeDotsMenu: () => void;
  handleShare: () => void;
  setCurrentPage: (page: number) => void;
}

export const PdfDocumentRenderer: React.FC<PdfDocumentRendererProps> = ({
  signedUrl,
  pdfError,
  numPages,
  containerRef,
  scrollContainerRef,
  pageRefs,
  setTransformRef,
  handleTransformed,
  handleScroll,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  onDocumentSourceError,
  showControls,
  isThreeDotsMenuOpen,
  toggleThreeDotsMenu,
  handleShare,
  setCurrentPage
}) => {
  const [containerWidth, setContainerWidth] = useState<number>(0);

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
  }, [containerRef]);

  const calculateActivePage = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !pageRefs.current || pageRefs.current.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let bestPage = 1;
    let maxVisibleHeight = -1;
    let minDistanceToCenter = Infinity;

    for (let i = 0; i < pageRefs.current.length; i++) {
      const pageEl = pageRefs.current[i];
      if (!pageEl) continue;

      const rect = pageEl.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, containerRect.top);
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      const pageCenter = rect.top + rect.height / 2;
      const distanceToCenter = Math.abs(pageCenter - containerCenter);

      if (visibleHeight > maxVisibleHeight + 5) {
        maxVisibleHeight = visibleHeight;
        minDistanceToCenter = distanceToCenter;
        bestPage = i + 1;
      } else if (Math.abs(visibleHeight - maxVisibleHeight) <= 5) {
        if (distanceToCenter < minDistanceToCenter) {
          minDistanceToCenter = distanceToCenter;
          bestPage = i + 1;
        }
      }
    }

    setCurrentPage(bestPage);
  }, [pageRefs, scrollContainerRef, setCurrentPage]);

  useEffect(() => {
    if (!numPages || pageRefs.current.length === 0) return;

    calculateActivePage();

    const observerOptions = {
      root: scrollContainerRef.current,
      rootMargin: '0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
    };

    const observerCallback: IntersectionObserverCallback = () => {
      calculateActivePage();
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    pageRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [numPages, calculateActivePage, pageRefs, scrollContainerRef]);

  const onScrollHandler = React.useCallback(() => {
    handleScroll();
    calculateActivePage();
  }, [handleScroll, calculateActivePage]);

  return (
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
          onTransform={handleTransformed}
        >
          {({ zoomIn, zoomOut, setTransform }) => {
            setTransformRef.current = setTransform;
            return (
              <>
                <PdfBottomControls
                  showControls={showControls}
                  isThreeDotsMenuOpen={isThreeDotsMenuOpen}
                  toggleThreeDotsMenu={toggleThreeDotsMenu}
                  zoomIn={zoomIn}
                  zoomOut={zoomOut}
                  handleShare={handleShare}
                />

                <TransformComponent wrapperClass={styles.transformWrapper} contentClass={styles.transformContent}>
                  <div
                    className={styles.pdfScrollContainer}
                    ref={scrollContainerRef}
                    onScroll={onScrollHandler}
                  >
                    {pdfError ? (
                       <div className="p-4 font-bold flex justify-center w-full text-accent-red">{pdfError}</div>
                    ) : (
                    <Document
                      file={signedUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      onSourceError={onDocumentSourceError}
                      loading={<div style={{ display: 'none' }} />}
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
                            loading={<div className="h-64 w-full animate-pulse neu-recessed rounded-xl"></div>}
                          />
                        </div>
                      ))}
                    </Document>
                    )}
                  </div>
                </TransformComponent>
              </>
            );
          }}
        </TransformWrapper>
      </div>
    </div>
  );
};
