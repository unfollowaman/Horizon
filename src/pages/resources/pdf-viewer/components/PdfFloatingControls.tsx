import React from 'react';
import styles from '../../PdfViewer.module.css';

interface PdfTopControlsProps {
  showControls: boolean;
  onBack: () => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

export const PdfTopControls: React.FC<PdfTopControlsProps> = ({ showControls, onBack, isMobileMenuOpen, toggleMobileMenu }) => {
  return (
    <>
      <button
        onClick={onBack}
        className={`${styles.floatingTopLeft} neu-raised rounded-full neu-raised-hover ${showControls ? styles.controlsVisible : styles.controlsHidden}`}
        aria-label="Go Back"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <button
        onClick={toggleMobileMenu}
        className={`${styles.floatingTopRight} neu-raised rounded-full neu-raised-hover ${showControls ? styles.controlsVisible : styles.controlsHidden}`}
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
};

interface PdfBottomControlsProps {
  showControls: boolean;
  isThreeDotsMenuOpen: boolean;
  toggleThreeDotsMenu: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  handleShare: () => void;
}

export const PdfBottomControls: React.FC<PdfBottomControlsProps> = ({
  showControls,
  isThreeDotsMenuOpen,
  toggleThreeDotsMenu,
  zoomIn,
  zoomOut,
  handleShare
}) => {
  return (
    <div className={`${styles.floatingBottomRight} ${styles.threeDotsWrapper} ${isThreeDotsMenuOpen ? styles.menuOpen : styles.menuClosed} neu-raised neu-raised-hover ${showControls ? styles.controlsVisible : styles.controlsHidden}`}>
      <div className={styles.menuItemsContainer}>
        <button onClick={zoomIn} className={styles.iconBtn} aria-label="Zoom In">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button onClick={zoomOut} className={styles.iconBtn} aria-label="Zoom Out">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button onClick={handleShare} className={styles.iconBtn} aria-label="Share">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
      </div>
      <button
        onClick={toggleThreeDotsMenu}
        className={styles.toggleBtn}
        aria-label="More options"
        aria-expanded={isThreeDotsMenuOpen}
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
  );
};
