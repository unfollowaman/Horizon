import React from 'react';
import styles from '../../PdfViewer.module.css';

interface PdfPageSliderProps {
  sliderContainerRef: React.RefObject<HTMLDivElement | null>;
  isSliderVisible: boolean;
  currentPage: number;
  numPages?: number | null;
  sliderTopPx: number;
  isDraggingSlider: boolean;
  onSliderTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onSliderTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onSliderTouchEnd: () => void;
  onSliderMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const PdfPageSlider: React.FC<PdfPageSliderProps> = ({
  sliderContainerRef,
  isSliderVisible,
  currentPage,
  numPages,
  sliderTopPx,
  isDraggingSlider,
  onSliderTouchStart,
  onSliderTouchMove,
  onSliderTouchEnd,
  onSliderMouseDown,
}) => {
  return (
    <div
      ref={sliderContainerRef}
      role="slider"
      tabIndex={0}
      aria-label="Page slider"
      aria-valuenow={currentPage}
      aria-valuemin={1}
      aria-valuemax={numPages || undefined}
      aria-valuetext={numPages ? `Page ${currentPage} of ${numPages}` : `Page ${currentPage}`}
      className={`${styles.pageSliderContainer} ${isSliderVisible ? styles.sliderVisible : styles.sliderHidden} rounded-l-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2`}
      style={{
        top: `${sliderTopPx}px`,
        transition: isDraggingSlider ? 'none' : undefined,
      }}
      onTouchStart={onSliderTouchStart}
      onTouchMove={onSliderTouchMove}
      onTouchEnd={onSliderTouchEnd}
      onMouseDown={onSliderMouseDown}
    >
      <div className={`${styles.pageSliderThumb} neu-raised neu-raised-hover`}>
        <span className={styles.pageSliderText}>{currentPage}</span>
      </div>
    </div>
  );
};
