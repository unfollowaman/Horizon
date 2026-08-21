import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePdfSliderProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setTransformRef: React.MutableRefObject<((x: number, y: number, scale: number) => void) | null>;
  transformStateRef: React.MutableRefObject<{ positionX: number, positionY: number, scale: number }>;
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  numPages: number | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export const usePdfSlider = ({
  containerRef,
  scrollContainerRef,
  setTransformRef,
  transformStateRef,
  pageRefs,
  numPages,
  currentPage,
  setCurrentPage,
}: UsePdfSliderProps) => {
  const [isSliderVisible, setIsSliderVisible] = useState<boolean>(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [dragTopPx, setDragTopPx] = useState<number | null>(null);
  const [windowHeight, setWindowHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  const sliderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingSliderRef = useRef<boolean>(false);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetSliderTimer = useCallback(() => {
    if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
    if (!isDraggingSliderRef.current) {
      sliderTimerRef.current = setTimeout(() => {
        setIsSliderVisible(false);
      }, 5000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (sliderTimerRef.current) {
        clearTimeout(sliderTimerRef.current);
      }
    };
  }, []);

  const topOffset = 80;
  const bottomOffset = 80;
  const indicatorHeight = 44;
  const usableRange = Math.max(0, windowHeight - topOffset - bottomOffset - indicatorHeight);

  const calculatedProgress = (!numPages || numPages <= 1)
    ? 0
    : Math.max(0, Math.min(1, (currentPage - 1) / (numPages - 1)));

  const sliderTopPx = isDraggingSlider && dragTopPx !== null
    ? dragTopPx
    : topOffset + calculatedProgress * usableRange;

  const handleTransformed = useCallback((ref: { state: { positionX: number, positionY: number, scale: number }, instance?: { contentComponent?: HTMLElement | null } }) => {
    if (!ref.state) return;
    transformStateRef.current = ref.state;

    if (!isDraggingSliderRef.current) {
      setIsSliderVisible(true);
      resetSliderTimer();
    }
  }, [resetSliderTimer, transformStateRef]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    const viewer = containerRef.current;
    if (!container || !viewer) return;

    if (!isDraggingSliderRef.current) {
      setIsSliderVisible(true);
      resetSliderTimer();
    }
  }, [resetSliderTimer, containerRef, scrollContainerRef]);

  const handleSliderDrag = useCallback((clientY: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const rawProgress = usableRange > 0
      ? (clientY - topOffset - indicatorHeight / 2) / usableRange
      : 0;
    const dragProgress = Math.max(0, Math.min(1, rawProgress));

    const currentTop = topOffset + dragProgress * usableRange;
    setDragTopPx(currentTop);

    const total = numPages || 1;
    const targetPage = Math.round(1 + dragProgress * (total - 1));
    const clampedTargetPage = Math.max(1, Math.min(total, targetPage));

    setCurrentPage(clampedTargetPage);

    const targetEl = pageRefs.current[clampedTargetPage - 1];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
    }

    resetSliderTimer();
  }, [usableRange, topOffset, indicatorHeight, numPages, setCurrentPage, pageRefs, scrollContainerRef, resetSliderTimer]);

  const onSliderTouchStart = (e: React.TouchEvent) => {
    isDraggingSliderRef.current = true;
    setIsDraggingSlider(true);
    handleSliderDrag(e.touches[0].clientY);
    setIsSliderVisible(true);
    if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
    e.stopPropagation();
  };

  const onSliderTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSliderRef.current) return;
    handleSliderDrag(e.touches[0].clientY);
    e.preventDefault();
    e.stopPropagation();
  };

  const onSliderTouchEnd = () => {
    isDraggingSliderRef.current = false;
    setIsDraggingSlider(false);
    setDragTopPx(null);
    resetSliderTimer();
  };

  const onSliderMouseDown = (e: React.MouseEvent) => {
    isDraggingSliderRef.current = true;
    setIsDraggingSlider(true);
    handleSliderDrag(e.clientY);
    setIsSliderVisible(true);
    if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSliderRef.current) return;
      handleSliderDrag(e.clientY);
      e.preventDefault();
    };

    const handleMouseUp = () => {
      if (isDraggingSliderRef.current) {
        isDraggingSliderRef.current = false;
        setIsDraggingSlider(false);
        setDragTopPx(null);
        resetSliderTimer();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleSliderDrag, resetSliderTimer]);

  return {
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
  };
};
