import React, { useEffect, useRef, useState } from 'react';
import styles from './HeroPhoneAnimation.module.css';

const TOTAL = 10500;
const ARRIVE_END = 1800;
const ORBIT_END = 6800;
const ORGANIZE_END = 8000;
const CENTER_X = 150;
const CENTER_Y = 235;
const ORBIT_RADIUS = 118;
const ORBIT_SPEED = 72;

interface IconConfig {
  label: string;
  asset: string;
  baseAngle: number;
  arriveDelay: number;
  grid: { x: number; y: number };
}

const iconsConfig: IconConfig[] = [
  { label: 'Notes', asset: 'notes.png', baseAngle: -90, arriveDelay: 0, grid: { x: 92, y: 160 } },
  { label: 'PYQ Papers', asset: 'pyq-papers.png', baseAngle: -30, arriveDelay: 150, grid: { x: 208, y: 160 } },
  { label: 'MCQ Sheets', asset: 'mcq-sheets.png', baseAngle: 30, arriveDelay: 300, grid: { x: 92, y: 235 } },
  { label: 'Flashcards', asset: 'flashcards.png', baseAngle: 90, arriveDelay: 450, grid: { x: 208, y: 235 } },
  { label: 'Announcements', asset: 'announcements.png', baseAngle: 150, arriveDelay: 600, grid: { x: 92, y: 310 } },
  { label: 'Revision Sheets', asset: 'revision-sheets.png', baseAngle: 210, arriveDelay: 750, grid: { x: 208, y: 310 } },
];

const easeOutBack = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
const easeInOutCubic = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const HeroPhoneAnimation: React.FC = () => {
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mascotRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
  }, []);

  const applyState = (t: number) => {
    const fadeStart = TOTAL - 300;
    const globalFade = t > fadeStart ? clamp(1 - (t - fadeStart) / 300, 0, 1) : 1;

    let settle = 0;
    if (t >= ORBIT_END && t < ORGANIZE_END) {
      settle = easeInOutCubic((t - ORBIT_END) / (ORGANIZE_END - ORBIT_END));
    } else if (t >= ORGANIZE_END) {
      settle = 1;
    }

    // Mascot
    if (mascotRef.current) {
      let mascotOpacity = 1;
      let mascotScaleMultiplier = 1;
      let mascotBlur = 0;

      if (t < 1000) {
        const localT = clamp(t / 1000, 0, 1);
        const eased = easeOutBack(localT);
        mascotOpacity = localT;
        mascotScaleMultiplier = lerp(0.1, 1, eased);
        mascotBlur = Math.max(0, lerp(20, 0, eased));
      }

      const x = lerp(CENTER_X, 40, settle);
      const y = lerp(CENTER_Y, 54, settle);
      const scale = lerp(1, 16 / 45, settle) * mascotScaleMultiplier;

      mascotRef.current.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      mascotRef.current.style.opacity = `${mascotOpacity * globalFade}`;
      mascotRef.current.style.filter = `blur(${mascotBlur}px)`;
    }

    // Glow
    if (glowRef.current) {
      glowRef.current.style.opacity = `${(1 - settle) * globalFade}`;
      glowRef.current.style.transform = `translate(-50%, -50%) translate(${CENTER_X}px, ${CENTER_Y}px)`;
    }

    // Wordmark & Explore
    if (wordmarkRef.current) {
      wordmarkRef.current.style.opacity = `${settle * globalFade}`;
    }
    if (exploreRef.current) {
      exploreRef.current.style.opacity = `${settle * globalFade}`;
    }

    // Ring
    if (ringRef.current) {
      ringRef.current.style.opacity = `${(1 - settle) * 0.5 * clamp(t / 900, 0, 1) * globalFade}`;
    }

    // Icons
    iconsConfig.forEach((config, idx) => {
      const el = iconRefs.current[idx];
      if (!el) return;

      let x: number, y: number, opacity: number, labelOpacity: number;

      if (t < ARRIVE_END) {
        // Act 1
        const rad = config.baseAngle * Math.PI / 180;
        const originX = CENTER_X + 210 * Math.cos(rad);
        const originY = CENTER_Y + 210 * Math.sin(rad);
        const orbitStartX = CENTER_X + ORBIT_RADIUS * Math.cos(rad);
        const orbitStartY = CENTER_Y + ORBIT_RADIUS * Math.sin(rad);

        const localT = clamp((t - config.arriveDelay) / 700, 0, 1);
        const eased = easeOutBack(localT);

        x = lerp(originX, orbitStartX, eased);
        y = lerp(originY, orbitStartY, eased);
        opacity = localT;
        labelOpacity = 0;
      } else if (t < ORBIT_END) {
        // Act 2
        const tOrbit = t - ARRIVE_END;
        const angleDeg = config.baseAngle + ORBIT_SPEED * (tOrbit / 1000);
        const angleRad = angleDeg * Math.PI / 180;

        x = CENTER_X + ORBIT_RADIUS * Math.cos(angleRad);
        y = CENTER_Y + ORBIT_RADIUS * Math.sin(angleRad);
        opacity = 1;
        labelOpacity = 0;
      } else if (t < ORGANIZE_END) {
        // Act 3
        const tOrbitEnd = ORBIT_END - ARRIVE_END; // 5000
        const endAngleDeg = config.baseAngle + ORBIT_SPEED * (tOrbitEnd / 1000); // base + 70
        const endAngleRad = endAngleDeg * Math.PI / 180;

        const orbitEndX = CENTER_X + ORBIT_RADIUS * Math.cos(endAngleRad);
        const orbitEndY = CENTER_Y + ORBIT_RADIUS * Math.sin(endAngleRad);

        x = lerp(orbitEndX, config.grid.x, settle);
        y = lerp(orbitEndY, config.grid.y, settle);
        opacity = 1;
        labelOpacity = settle;
      } else {
        // Pause
        x = config.grid.x;
        y = config.grid.y;
        opacity = 1;
        labelOpacity = 1;
      }

      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      el.style.opacity = `${opacity * globalFade}`;

      const label = el.querySelector('.iconLabel') as HTMLDivElement;
      if (label) {
        label.style.opacity = `${labelOpacity * globalFade}`;
      }
    });
  };

  useEffect(() => {
    if (prefersReducedMotion) return;

    let frameId: number;
    const startTime = performance.now();

    const animate = (time: number) => {
      let t = (time - startTime) % TOTAL;
      if (t < 0) t += TOTAL;

      applyState(t);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      applyState(9250);
    }
  }, [prefersReducedMotion]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.phoneFrame}>
        <div className={styles.notch} />

        <div ref={glowRef} className={styles.glow} style={{ opacity: 0 }} />

        <svg ref={ringRef} className={styles.ring} viewBox="0 0 300 560" style={{ opacity: 0 }}>
          <circle cx={CENTER_X} cy={CENTER_Y} r={ORBIT_RADIUS} />
        </svg>

        <img
          ref={mascotRef}
          src="/assets/favicon/logo.png"
          alt="Mascot"
          className={styles.mascot}
          style={{ opacity: 0 }}
        />

        <div ref={wordmarkRef} className={styles.wordmark} style={{ opacity: 0 }}>
          HORIZON
        </div>
        <div ref={exploreRef} className={styles.exploreLabel} style={{ opacity: 0 }}>
          Explore
        </div>

        {iconsConfig.map((config, idx) => (
          <div
            key={config.label}
            ref={el => { iconRefs.current[idx] = el; }}
            className={styles.iconContainer}
            style={{ opacity: 0 }}
          >
            <img
              src={`/assets/hero/${config.asset}`}
              alt={config.label}
              className={styles.iconImage}
            />
            <div className={`iconLabel ${styles.iconLabel}`}>
              {config.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
