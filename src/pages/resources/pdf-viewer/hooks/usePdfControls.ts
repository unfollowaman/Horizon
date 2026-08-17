import { useState, useRef, useCallback, useEffect } from 'react';

export const usePdfControls = (numPages: number | null, pdfError: string | null) => {
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThreeDotsMenuOpen, setIsThreeDotsMenuOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShowControls(true);

    // Only auto-hide if a menu isn't open and pdf is loaded
    if (!isMobileMenuOpen && !isThreeDotsMenuOpen && numPages !== null && !pdfError) {
      timerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000); // 5 seconds inactivity hides controls
    }
  }, [isMobileMenuOpen, isThreeDotsMenuOpen, numPages, pdfError]);

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

  // Automatically start the hide timer once the PDF is fully loaded
  useEffect(() => {
    if (numPages !== null && !pdfError) {
      resetTimer();
    }
  }, [numPages, pdfError, resetTimer]);

  const handleInteraction = useCallback(() => {
    setShowControls(true);
    resetTimer();
  }, [resetTimer]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.threeDotsWrapper`)) {
        setIsThreeDotsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    showControls,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isThreeDotsMenuOpen,
    setIsThreeDotsMenuOpen,
    handleInteraction,
    resetTimer,
  };
};
