import { useState, useRef, useCallback, useEffect } from 'react';

export const usePdfSlider = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  setTransformRef: React.MutableRefObject<((x: number, y: number, scale: number) => void) | null>,
  transformStateRef: React.MutableRefObject<{ positionX: number, positionY: number, scale: number }>
) => {
  const [isSliderVisible, setIsSliderVisible] = useState<boolean>(false);
  const sliderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingSliderRef = useRef<boolean>(false);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);

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

  const handleTransformed = useCallback((ref: { state: { positionX: number, positionY: number, scale: number }, instance?: { contentComponent?: HTMLElement | null } }) => {
    if (!ref.state) return;
    transformStateRef.current = ref.state;

    if (!isDraggingSliderRef.current) {
      setIsSliderVisible(true);
      resetSliderTimer();

      const container = scrollContainerRef.current;
      const viewer = containerRef.current;
      if (container && viewer && sliderContainerRef.current) {
        const { scale, positionY } = ref.state;
        const contentHeight = container.scrollHeight;
        const scaledContentHeight = contentHeight * scale;
        const { clientHeight } = viewer;

        const maxScrollY = Math.max(0, scaledContentHeight - clientHeight);
        let progress: number;

        if (scale === 1) {
          const maxContainerScroll = Math.max(0, contentHeight - clientHeight);
          progress = maxContainerScroll > 0 ? container.scrollTop / maxContainerScroll : 0;
        } else {
          progress = maxScrollY > 0 ? Math.abs(positionY) / maxScrollY : 0;
        }

        const sliderHeight = sliderContainerRef.current.clientHeight;
        const thumbHeight = 44;
        const maxSliderTop = sliderHeight - thumbHeight;

        const thumbTop = progress * maxSliderTop;
        const thumb = sliderContainerRef.current.firstChild as HTMLElement;
        if (thumb) {
          thumb.style.transform = `translateY(${thumbTop}px)`;
        }
      }
    }
  }, [resetSliderTimer, containerRef, scrollContainerRef, transformStateRef]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    const viewer = containerRef.current;
    if (!container || !viewer) return;

    if (!isDraggingSliderRef.current) {
      setIsSliderVisible(true);
      resetSliderTimer();

      const { scale } = transformStateRef.current;

      if (scale === 1 && sliderContainerRef.current) {
        const contentHeight = container.scrollHeight;
        const { clientHeight } = viewer;
        const maxScroll = Math.max(0, contentHeight - clientHeight);
        const progress = maxScroll > 0 ? container.scrollTop / maxScroll : 0;

        const sliderHeight = sliderContainerRef.current.clientHeight;
        const thumbHeight = 44;
        const maxSliderTop = sliderHeight - thumbHeight;

        const thumbTop = progress * maxSliderTop;
        const thumb = sliderContainerRef.current.firstChild as HTMLElement;
        if (thumb) {
          thumb.style.transform = `translateY(${thumbTop}px)`;
        }
      }
    }
  }, [resetSliderTimer, containerRef, scrollContainerRef, transformStateRef]);

  const handleSliderDrag = useCallback((clientY: number) => {
    const container = scrollContainerRef.current;
    const viewer = containerRef.current;
    if (!container || !viewer || !setTransformRef.current) return;

    const windowHeight = window.innerHeight;
    const sliderTopOffset = windowHeight * 0.10;
    const sliderHeight = windowHeight * 0.80;

    let progress: number;
    progress = (clientY - sliderTopOffset) / sliderHeight;
    progress = Math.max(0, Math.min(1, progress));

    const thumbHeight = 44;
    const maxSliderTop = sliderHeight - thumbHeight;
    const thumbTop = progress * maxSliderTop;

    if (sliderContainerRef.current) {
      const thumb = sliderContainerRef.current.firstChild as HTMLElement;
      if (thumb) {
        thumb.style.transform = `translateY(${thumbTop}px)`;
      }
    }

    const { positionX, scale } = transformStateRef.current;
    const contentHeight = container.scrollHeight;
    const scaledContentHeight = contentHeight * scale;
    const { clientHeight } = viewer;
    const maxScrollY = Math.max(0, scaledContentHeight - clientHeight);

    const targetY = -(progress * maxScrollY);

    if (scale === 1) {
      const targetScrollTop = progress * Math.max(0, contentHeight - clientHeight);
      container.scrollTop = targetScrollTop;
    } else {
      setTransformRef.current(positionX, targetY, scale);
    }

    resetSliderTimer();
  }, [resetSliderTimer, containerRef, scrollContainerRef, setTransformRef, transformStateRef]);

  const onSliderTouchStart = (e: React.TouchEvent) => {
    isDraggingSliderRef.current = true;
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
    resetSliderTimer();
  };

  const onSliderMouseDown = (e: React.MouseEvent) => {
    isDraggingSliderRef.current = true;
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
    sliderContainerRef,
    onSliderTouchStart,
    onSliderTouchMove,
    onSliderTouchEnd,
    onSliderMouseDown,
    handleTransformed,
    handleScroll,
  };
};
