import { useEffect, useRef } from "react";
import styles from "./RenderingScreen.module.css";

const GRID_SIZE = 20;
const DOT_SIZE = 5;

type Dot = {
  x: number;
  y: number;
  baseOpacity: number;
  phase: number;
  speed: number;
  delay: number;
  starPower: number;
  tint: number;
  flareOffset: number;
  flareLength: number;
  flareSpeed: number;
};

function bell(value: number, center: number, spread: number) {
  const distance = (value - center) / spread;
  return Math.exp(-(distance * distance));
}

function AnimatedDotField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let frameId = 0;
    let width = 1;
    let height = 1;
    let dots: Dot[] = [];
    const startedAt = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const buildGrid = () => {
      const columns = Math.ceil(width / GRID_SIZE) + 2;
      const rows = Math.ceil(height / GRID_SIZE) + 2;
      const next: Dot[] = [];

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const star = Math.random() < 0.1;
          next.push({
            x: column * GRID_SIZE + GRID_SIZE / 2,
            y: row * GRID_SIZE + GRID_SIZE / 2,
            baseOpacity: 0.22 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2,
            speed: 0.65 + Math.random() * 1.5,
            delay: Math.random() * 0.4,
            starPower: star ? 0.65 + Math.random() * 0.35 : 0,
            tint: Math.random(),
            flareOffset: Math.random() * 8,
            flareLength: 0.05 + Math.random() * 0.05,
            flareSpeed: 0.1 + Math.random() * 0.18,
          });
        }
      }

      dots = next;
    };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, Math.ceil(bounds.width));
      height = Math.max(1, Math.ceil(bounds.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      buildGrid();
    };

    const drawFlare = (dot: Dot, amount: number) => {
      const radius = 8 + amount * 18;

      context.save();
      context.globalCompositeOperation = "source-over";

      const glow = context.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, radius);
      glow.addColorStop(0, `rgba(233,30,140,${0.55 * amount})`);
      glow.addColorStop(0.35, `rgba(255,126,179,${0.38 * amount})`);
      glow.addColorStop(1, "rgba(255,126,179,0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      context.fill();

      context.globalAlpha = amount;
      context.fillStyle = "#C2185B";
      context.beginPath();
      context.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const draw = (now: number) => {
      const time = (now - startedAt) / 1000;
      const still = reducedMotion.matches;

      const background = context.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#ffffff");
      background.addColorStop(0.55, "#fffbfd");
      background.addColorStop(1, "#fdf2f7");
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      for (const dot of dots) {
        const reveal = still ? 1 : Math.min(1, Math.max(0, (time - dot.delay) * 4));
        const twinkle = still
          ? 0.7
          : 0.56 + (Math.sin(time * dot.speed + dot.phase) + 1) * 0.19;

        const sweepPosition = (time * 165) % (width + height + 240) - 120;
        const sweepDistance = Math.abs(dot.x + dot.y - sweepPosition);
        const sweep = still ? 0 : Math.max(0, 1 - sweepDistance / 105) ** 5;

        const cycle = (time * dot.flareSpeed + dot.flareOffset) % 1;
        const flare = still || dot.starPower === 0
          ? 0
          : bell(cycle, 0.12, dot.flareLength) * dot.starPower;

        const alpha = Math.min(
          0.95,
          reveal * (dot.baseOpacity * twinkle + sweep * 0.3 + flare * 0.3),
        );

        context.globalCompositeOperation = "source-over";
        context.globalAlpha = alpha;
        context.fillStyle = dot.tint > 0.7 ? "#C2185B" : "#FF7EB3";
        context.beginPath();
        context.arc(dot.x, dot.y, DOT_SIZE / 2, 0, Math.PI * 2);
        context.fill();

        if (flare > 0.08) drawFlare(dot, flare);
      }

      context.globalAlpha = 1;
      frameId = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.dotField} aria-hidden="true" />;
}

export default function RenderingScreen() {
  return (
    <main className={styles.bgPage}>
      <AnimatedDotField />
      <p className={styles.renderingText}>Rendering PDF</p>
    </main>
  );
}
