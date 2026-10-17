import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import styles from './RenderingScreen.module.css';
import { FIT } from './renderingScreenData';
import { AnimatedDotField } from './AnimatedDotField';
import { PageStack } from './PageStack';

export interface RenderingScreenProps {
  variant?: 'notes' | 'pyq';
  classLabel?: string;
  subjectLabel?: string;
  year?: string;
  stage?: 'connecting' | 'downloading' | 'preparing' | 'ready';
  loadedBytes?: number;
  totalBytes?: number | null;
  onFinished?: () => void;
}

export default function RenderingScreen({
  variant = 'notes',
  stage = 'connecting',
  loadedBytes = 0,
  totalBytes = null,
  onFinished,
}: RenderingScreenProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const h2Ref = useRef<SVGTextElement | null>(null);

  const [fontSizes, setFontSizes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const [key, [, , targetWidth]] of Object.entries(FIT)) {
      initial[key] = Math.round(targetWidth / 5);
    }
    return initial;
  });

  const [h2Scale, setH2Scale] = useState(1);
  const [rootOpacity, setRootOpacity] = useState(1);

  // Compute text font sizes matching approved design target widths
  useEffect(() => {
    let isMounted = true;

    const computeSizes = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const sizes: Record<string, number> = {};
        for (const [key, [refText, weight, targetWidth]] of Object.entries(FIT)) {
          ctx.font = `${weight} 100px Roboto, system-ui, sans-serif`;
          const w = ctx.measureText(refText).width || 100;
          sizes[key] = (100 * targetWidth) / w;
        }
        setFontSizes(sizes);
      } catch {
        // Fallback font measurement
      }
    };

    if (typeof document !== 'undefined' && document.fonts) {
      Promise.all([400, 600, 700, 800].map((w) => document.fonts.load(`${w} 40px Roboto`)))
        .then(() => computeSizes())
        .catch(() => computeSizes());

      if (document.fonts.ready) {
        document.fonts.ready.then(() => computeSizes()).catch(() => {});
      }
    } else {
      computeSizes();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth progress calculation using rAF
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const mountTime = performance.now();
    let preparingStartTime: number | null = null;
    let animFrameId = 0;
    let lastTime = performance.now();

    const updateProgress = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const t = (now - mountTime) / 1000;

      let target = 0;
      let cap = 92;

      if (stage === 'connecting') {
        target = Math.min(2, t * 2.5);
        cap = 92;
      } else if (stage === 'downloading') {
        if (totalBytes && totalBytes > 0) {
          const frac = Math.min(1, loadedBytes / totalBytes);
          target = 2 + frac * 90;
        } else {
          const mb = loadedBytes / 1048576;
          const frac = 1 - Math.exp(-mb / 12);
          target = 2 + frac * 88;
        }
        cap = 92;
      } else if (stage === 'preparing') {
        if (preparingStartTime === null) {
          preparingStartTime = now;
        }
        const prepSec = (now - preparingStartTime) / 1000;
        target = 92 + Math.min(7.9, 8 * (prepSec / 1.4));
        cap = 99.9;
      } else if (stage === 'ready') {
        setShown(100);
        return;
      }

      setShown((prev) => {
        if (prev >= target) return prev;
        const next = prev + (target - prev) * Math.min(1, dt * 5);
        return Math.min(cap, Math.max(prev, next));
      });

      animFrameId = requestAnimationFrame(updateProgress);
    };

    if (stage === 'ready') {
      setShown(100);
    } else {
      animFrameId = requestAnimationFrame(updateProgress);
    }

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [stage, loadedBytes, totalBytes]);

  // Ready hold and fade behavior
  useEffect(() => {
    if (stage === 'ready') {
      const holdTimer = setTimeout(() => {
        setRootOpacity(0);
        const fadeTimer = setTimeout(() => {
          if (onFinished) {
            onFinished();
          }
        }, 250);
        return () => clearTimeout(fadeTimer);
      }, 350);
      return () => clearTimeout(holdTimer);
    } else {
      setRootOpacity(1);
    }
  }, [stage, onFinished]);

  // Construct copy
  const isPYQ = variant === 'pyq';
  const h2Text = isPYQ ? 'Preparing your Pyq Paper' : 'Preparing your Notes';
  const subheading2 = isPYQ ? 'Your paper is on the way' : 'Your notes are on the way';

  let stageLabel = 'Connecting...';
  if (stage === 'downloading') {
    stageLabel = isPYQ ? 'Downloading paper...' : 'Downloading notes...';
  } else if (stage === 'preparing') {
    stageLabel = 'Preparing pages...';
  } else if (stage === 'ready') {
    stageLabel = 'Ready';
  }

  const loadedMB = (loadedBytes / 1048576).toFixed(1);
  const sizeLineText =
    totalBytes && totalBytes > 0
      ? `${loadedMB} MB of ${(totalBytes / 1048576).toFixed(1)} MB`
      : `${loadedMB} MB downloaded`;

  const displayProgress = stage === 'ready' ? 100 : Math.min(99, Math.round(shown));
  const percentText = `${displayProgress}%`;
  const p = stage === 'ready' ? 100 : Number(shown.toFixed(2));

  // Safety clamp text scale
  useLayoutEffect(() => {
    if (h2Ref.current) {
      try {
        const bbox = h2Ref.current.getBBox();
        if (bbox.width > 820) {
          setH2Scale(820 / bbox.width);
        } else {
          setH2Scale(1);
        }
      } catch {
        // SVG bounding box fallback
      }
    }
  }, [h2Text, fontSizes]);

  return (
    <div
      className={styles.root}
      style={{ opacity: rootOpacity }}
      role="region"
      aria-label="Loading document"
    >
      <AnimatedDotField />
      <div className={styles.stage} ref={stageRef}>
        {/* Shared Defs SVG */}
        <svg
          width="0"
          height="0"
          style={{ position: 'absolute' }}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <path
              id="rs-acro"
              d="M30 4C25 4 25 14 28 26C31 38 38 48 47 53C55 57 60 55 58 51C56 47 47 46 38 48C28 50 14 58 7 62C2 64 3 58 9 55C18 50 28 36 31 24C33 14 33 4 30 4Z"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <linearGradient id="rs-icon" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e83f90" />
              <stop offset="1" stopColor="#f45ea5" />
            </linearGradient>
            <filter id="rs-sh" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#f0509a" floodOpacity=".22" />
            </filter>
          </defs>
        </svg>

        {/* Layer 2: Page Stack */}
        <PageStack stageRef={stageRef} />

        {/* Layer 3: Dynamic Content Layer */}
        <div className={styles.layer}>
          <svg
            viewBox="0 0 941 1672"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`${h2Text}, ${subheading2}, ${stageLabel}, ${percentText}`}
          >
            <defs>
              <linearGradient id="rs-fill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#d0126f" />
                <stop offset=".55" stopColor="#ec3f93" />
                <stop offset="1" stopColor="#f96aa8" />
              </linearGradient>
              <filter id="rs-b12" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
            </defs>

            {/* Heading */}
            <text
              id="h2"
              ref={h2Ref}
              x="472"
              y="720"
              textAnchor="middle"
              fill="#85023a"
              style={{
                fontSize: (fontSizes.h2 || 48) * h2Scale,
                fontWeight: FIT.h2[1],
              }}
            >
              {h2Text}
            </text>
            <text
              id="sub2"
              x="471"
              y="770"
              textAnchor="middle"
              fill="#4a3f5e"
              style={{
                fontSize: fontSizes.sub2 || 30,
                fontWeight: FIT.sub2[1],
              }}
            >
              {subheading2}
            </text>

            {/* Horizontal Progress Bar Card */}
            <rect
              x="118"
              y="824"
              width="706"
              height="168"
              rx="30"
              fill="#ff4fa0"
              opacity=".16"
              filter="url(#rs-b12)"
            />
            <rect
              x="118"
              y="820"
              width="706"
              height="172"
              rx="30"
              fill="#fffafd"
              fillOpacity=".72"
              stroke="#fff"
              strokeOpacity=".9"
              strokeWidth="1.5"
            />
            <rect x="152" y="852" width="638" height="29" rx="14.5" fill="#efdce8" />
            <rect
              x="152"
              y="852"
              width={Math.max(29, (638 * p) / 100)}
              height="29"
              rx="14.5"
              fill="url(#rs-fill)"
              opacity={p <= 0 ? 0 : 1}
            />

            <g aria-live="polite">
              <text
                id="label"
                x="152"
                y="926"
                fill="#0d0a10"
                style={{
                  fontSize: fontSizes.label || 32,
                  fontWeight: FIT.label[1],
                }}
              >
                {stageLabel}
              </text>
            </g>

            <text
              id="sizeLine"
              x="152"
              y="963"
              fill="#736a80"
              style={{
                fontSize: fontSizes.sizeLine || 24,
                fontWeight: FIT.sizeLine[1],
              }}
            >
              {sizeLineText}
            </text>
            <text
              id="cardPct"
              x="791"
              y="943"
              textAnchor="end"
              fill="#a8044f"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={displayProgress}
              aria-label="PDF loading progress"
              style={{
                fontSize: fontSizes.cardPct || 48,
                fontWeight: FIT.cardPct[1],
              }}
            >
              {percentText}
            </text>

            {/* Info Line */}
            <g style={{ visibility: isPYQ ? 'hidden' : 'visible' }}>
              <circle cx="277" cy="1032" r="15.5" fill="none" stroke="#4a3f5e" strokeWidth="2.6" />
              <circle cx="277" cy="1024.5" r="1.9" fill="#4a3f5e" />
              <path d="M277 1030.5V1041" stroke="#4a3f5e" strokeWidth="2.8" strokeLinecap="round" />
              <text
                id="info"
                x="311"
                y="1041"
                fill="#4a3f5e"
                style={{
                  fontSize: fontSizes.info || 24,
                  fontWeight: FIT.info[1],
                }}
              >
                Larger notes may take a little longer.
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
