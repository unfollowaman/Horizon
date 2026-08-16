import React, { useEffect, useState, useRef, useMemo } from 'react';
import styles from './PdfLoadingScreen.module.css';

const DOT_SPACING = 35; // Pixel spacing between dots

const PdfLoadingScreen: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Measure container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement
    setDimensions({
      width: container.clientWidth,
      height: container.clientHeight
    });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Calculate dots needed based on container size, memoized for performance
  const dots = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return [];

    const cols = Math.ceil(dimensions.width / DOT_SPACING) + 1;
    const rows = Math.ceil(dimensions.height / DOT_SPACING) + 1;

    // Centering offsets
    const offsetX = (dimensions.width - (cols - 1) * DOT_SPACING) / 2;
    const offsetY = (dimensions.height - (rows - 1) * DOT_SPACING) / 2;

    const generatedDots = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Create a nearly randomized, organic cluster effect using sine waves based on coordinates
        // Using negative delay so animation is immediately active
        const timeFactorX = Math.sin(c * 0.3) * 2;
        const timeFactorY = Math.cos(r * 0.3) * 2;
        const organicNoise = Math.sin((c + r) * 0.5);

        const delay = -(timeFactorX + timeFactorY + organicNoise + (c * 0.05) + (r * 0.05));

        generatedDots.push({
          id: `${r}-${c}`,
          x: offsetX + c * DOT_SPACING,
          y: offsetY + r * DOT_SPACING,
          delay
        });
      }
    }

    return generatedDots;
  }, [dimensions]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.dotGrid} aria-hidden="true">
        {dots.map(dot => (
          <div
            key={dot.id}
            className={styles.dot}
            style={{
              left: `${dot.x}px`,
              top: `${dot.y}px`,
              animationDelay: `${dot.delay}s`
            }}
          />
        ))}
      </div>
      <div className={styles.textContainer} role="status" aria-live="polite">
        Rendering PDF...
      </div>
    </div>
  );
};

export default PdfLoadingScreen;
