import React, { useEffect, useRef } from 'react';
import styles from './RenderingScreen.module.css';

interface PageStackProps {
  stageRef: React.RefObject<HTMLDivElement | null>;
}

const SL = [
  { x: 0, y: 0, s: 1 },
  { x: 87.6, y: -3.4, s: 0.796 },
  { x: 142.3, y: 27.9, s: 0.751 },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function slotAt(p: number) {
  p = clamp(p, 0, 2);
  const i = Math.min(1, Math.floor(p));
  const f = p - i;
  const a = SL[i];
  const b = SL[i + 1];
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    s: a.s + (b.s - a.s) * f,
  };
}

function ease(t: number) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const PageStack: React.FC<PageStackProps> = ({ stageRef }) => {
  const stackRef = useRef<HTMLDivElement | null>(null);
  const slotsRef = useRef<(HTMLDivElement | null)[]>([]);
  const pgsRef = useRef<(HTMLDivElement | null)[]>([]);
  const lasRef = useRef<(SVGGElement | null)[]>([]);
  const lbsRef = useRef<(SVGGElement | null)[]>([]);

  // Scale stack to fit stage container (base 941px width)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateScale = () => {
      const width = stage.clientWidth;
      if (width > 0 && stackRef.current) {
        const k = width / 941;
        stackRef.current.style.transform = `scale(${k})`;
      }
    };

    updateScale();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef]);

  // Flip animation loop
  useEffect(() => {
    const order = [0, 1, 2];

    const render = (currOrder: number[], u: number) => {
      for (let k = 0; k < 3; k++) {
        const pageIdx = currOrder[k];
        const slotEl = slotsRef.current[pageIdx];
        const pgEl = pgsRef.current[pageIdx];
        const laEl = lasRef.current[pageIdx];
        const lbEl = lbsRef.current[pageIdx];
        if (!slotEl || !pgEl || !laEl || !lbEl) continue;

        let pos: number;
        let ang = 0;
        let dx = 0;
        let dy = 0;
        let sc = 1;

        if (k === 0) {
          pos = 2 * ease((u - 0.28) / 0.72);
          ang = 360 * ease(u);
          const w = Math.sin(Math.PI * u);
          dx = -95 * w;
          dy = -28 * w;
          sc = 1 + 0.05 * w;
        } else {
          pos = k - ease((u - 0.3) / 0.6);
        }

        const s = slotAt(pos);
        const m = Math.min(1, Math.max(0, pos));

        slotEl.style.transform = `translate(${s.x + dx}px,${s.y + dy}px) scale(${s.s * sc})`;
        pgEl.style.transform = `perspective(1000px) rotateY(${-38.53 + ang}deg) rotateZ(-1.39deg)`;
        laEl.setAttribute('opacity', String(1 - m));
        lbEl.setAttribute('opacity', String(m));
        slotEl.style.zIndex = String(Math.round(20 - pos * 6) + (k === 0 && u < 0.5 ? 8 : 0));
      }
    };

    render(order, 0);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const HOLD = 800;
    const FLIP = 1500;
    let animFrameId = 0;

    let cycleState: 'HOLD' | 'FLIP' = 'HOLD';
    let cycleStart = performance.now();
    let currentHoldDuration = HOLD + 300; // First cycle waits HOLD + 300ms

    const loop = (now: number) => {
      if (document.hidden) {
        animFrameId = requestAnimationFrame(loop);
        return;
      }

      const elapsed = now - cycleStart;

      if (cycleState === 'HOLD') {
        if (elapsed >= currentHoldDuration) {
          cycleState = 'FLIP';
          cycleStart = now;
          render(order, 0);
        } else {
          render(order, 0);
        }
      } else {
        const u = Math.min(1, elapsed / FLIP);
        render(order, u);

        if (u >= 1) {
          // Cycle complete: rotate order array
          const temp0 = order[0];
          order[0] = order[1];
          order[1] = order[2];
          order[2] = temp0;

          cycleState = 'HOLD';
          cycleStart = now;
          currentHoldDuration = HOLD * 0.4; // Subsequent cycles wait HOLD * 0.4ms
          render(order, 0);
        }
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        cycleStart = performance.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className={styles.stack} ref={stackRef} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={styles.slot}
          ref={(el) => {
            slotsRef.current[i] = el;
          }}
        >
          <div
            className={styles.pg}
            ref={(el) => {
              pgsRef.current[i] = el;
            }}
          >
            <div className={styles.plate} />
            <div className={styles.face}>
              <svg viewBox="0 0 343 371" width="343" height="371" aria-hidden="true">
                <g
                  ref={(el) => {
                    lbsRef.current[i] = el;
                  }}
                  opacity={0}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                    <rect
                      key={row}
                      x={55}
                      y={114 + row * 24.2}
                      width={255}
                      height={12.4}
                      rx={6.2}
                      fill="#e6cfdd"
                    />
                  ))}
                </g>
                <g
                  ref={(el) => {
                    lasRef.current[i] = el;
                  }}
                  opacity={1}
                >
                  <g transform="translate(143,64)" filter="url(#rs-sh)">
                    <path
                      d="M18 0H78L112 34V100Q112 118 94 118H18Q0 118 0 100V18Q0 0 18 0Z"
                      fill="url(#rs-icon)"
                    />
                    <path d="M78 0L112 34H96Q78 34 78 16Z" fill="#fbdceb" />
                    <use
                      href="#rs-acro"
                      transform="translate(21,22) scale(1.18)"
                      stroke="#fff"
                      strokeWidth={3.2}
                    />
                  </g>
                  <rect x={55.5} y={208} width={248} height={15} rx={7.5} fill="#e6d3df" />
                  <rect x={54.5} y={231} width={248} height={15} rx={7.5} fill="#e6d3df" />
                  <rect x={53.5} y={255} width={248} height={15} rx={7.5} fill="#e6d3df" />
                  <rect x={52.5} y={284} width={162} height={15} rx={7.5} fill="#e6d3df" />
                </g>
              </svg>
              <div className={styles.glow} />
            </div>
            <div className={styles.bk}>
              <svg viewBox="0 0 343 371" width="343" height="371" aria-hidden="true">
                <rect x={60} y={70} width={223} height={15} rx={7.5} fill="#f0dde8" />
                <rect x={60} y={100} width={223} height={15} rx={7.5} fill="#f0dde8" />
                <rect x={60} y={130} width={160} height={15} rx={7.5} fill="#f0dde8" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
