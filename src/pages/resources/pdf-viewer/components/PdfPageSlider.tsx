import React from 'react';
import styles from '../../PdfViewer.module.css';

interface PdfPageSliderProps {
  sliderContainerRef: React.RefObject<HTMLDivElement | null>;
  isSliderVisible: boolean;
  currentPage: number;
  onSliderTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onSliderTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onSliderTouchEnd: () => void;
  onSliderMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const PdfPageSlider: React.FC<PdfPageSliderProps> = ({
  sliderContainerRef,
  isSliderVisible,
  currentPage,
  onSliderTouchStart,
  onSliderTouchMove,
  onSliderTouchEnd,
  onSliderMouseDown,
}) => {
  return (
    <div
      ref={sliderContainerRef}
      className={`${styles.pageSliderContainer} ${isSliderVisible ? styles.sliderVisible : styles.sliderHidden}`}
      style={{ top: '10%' }}
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
