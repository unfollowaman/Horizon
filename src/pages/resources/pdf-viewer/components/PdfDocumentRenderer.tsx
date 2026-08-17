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

  useEffect(() => {
    if (!numPages || pageRefs.current.length === 0) return;

    const observerOptions = {
      root: scrollContainerRef.current,
      rootMargin: '0px',
      threshold: 0.5,
    };

    const observerCallback: IntersectionObserverCallback = (entries) => {
      let maxIntersectionRatio = 0;
      let visiblePage: number | null = null;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxIntersectionRatio) {
          maxIntersectionRatio = entry.intersectionRatio;
          const pageIndex = Number(entry.target.getAttribute('data-page-index'));
          if (!isNaN(pageIndex)) {
            visiblePage = pageIndex + 1;
          }
        }
      });

      if (visiblePage !== null) {
        setCurrentPage(visiblePage);
      }
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
  }, [numPages, setCurrentPage, pageRefs, scrollContainerRef]);

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
                    onScroll={handleScroll}
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
                            loading={<div className="h-64 w-full animate-pulse bg-gray-200 rounded-md"></div>}
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
