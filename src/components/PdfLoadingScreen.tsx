import React from 'react';
import styles from './PdfLoadingScreen.module.css';

interface PdfLoadingScreenProps {
  /** Optional custom container class */
  className?: string;
}

export const PdfLoadingScreen: React.FC<PdfLoadingScreenProps> = ({ className = '' }) => {
  return (
    <div className={`${styles.viewportContainer} ${className}`} role="status" aria-live="polite" data-testid="pdf-loading-screen">
      <span className="sr-only">Rendering PDF...</span>

      {/* Main 16:9 Canvas Stage */}
      <div className={styles.stage} data-testid="loading-stage">

        {/* 1. REAR VELOCITY STREAKS */}
        <svg className={`${styles.layer} ${styles.rearStreaks}`} data-testid="rear-streaks" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <line x1="180" y1="-20" x2="165" y2="380" stroke="#FCE7F3" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          <line x1="240" y1="40" x2="228" y2="480" stroke="#FBCFE8" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
          <line x1="310" y1="-50" x2="298" y2="350" stroke="#FCE7F3" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
          <line x1="490" y1="-30" x2="478" y2="420" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
          <line x1="560" y1="20" x2="546" y2="510" stroke="#FBCFE8" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
          <line x1="630" y1="-40" x2="618" y2="360" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
          <line x1="120" y1="100" x2="108" y2="490" stroke="#FCE7F3" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          <line x1="680" y1="80" x2="668" y2="460" stroke="#FCE7F3" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
        </svg>

        {/* 2. GROUNDING HOVER SHADOW */}
        <div className={styles.shadowContainer} data-testid="shadow-container" aria-hidden="true">
          <div className={styles.hoverShadow} data-testid="hover-shadow" />
        </div>

        {/* 3. CENTRAL PDF COMPOSITION CONTAINER */}
        <div className={styles.pdfComposition} data-testid="pdf-composition" aria-hidden="true">

          {/* ATMOSPHERIC BASE THERMAL GLOW */}
          <div className={styles.thermalBaseGlow} data-testid="thermal-base-glow" />

          {/* MAIN STYLIZED 3D PDF OBJECT */}
          <div className={styles.pdfObjectWrapper} data-testid="pdf-object-wrapper">
            <svg className={styles.pdfSvg} viewBox="0 0 280 340" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Linear Gradients for 3D depth, surface shading & thermal edge */}
                <linearGradient id="pdfBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF5F8" />
                  <stop offset="40%" stopColor="#FDE8F1" />
                  <stop offset="100%" stopColor="#FBCFE8" />
                </linearGradient>

                <linearGradient id="pdfDepthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#BE185D" />
                </linearGradient>

                <linearGradient id="foldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F472B6" />
                  <stop offset="100%" stopColor="#DB2777" />
                </linearGradient>

                <linearGradient id="thermalEdgeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#DB2777" stopOpacity="0.95" />
                  <stop offset="25%" stopColor="#F472B6" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#FDE8F1" stopOpacity="0" />
                </linearGradient>

                <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="-2" dy="4" stdDeviation="4" floodColor="#881337" floodOpacity="0.15" />
                </filter>
              </defs>

              {/* 3D Thickness Edge Layer (Rear/Bottom-Left Depth) */}
              <g id="pdfDepthEdge" data-testid="pdf-depth-edge" className={styles.pdfDepthEdge}>
                <path
                  d="M 32 30 L 208 30 C 213 30 217 34 217 39 L 217 270 C 217 275 213 279 208 279 L 32 279 C 27 279 23 275 23 270 L 23 39 C 23 34 27 30 32 30 Z"
                  fill="url(#pdfDepthGradient)"
                  transform="translate(10, 12)"
                />
              </g>

              {/* Main Document Face Surface */}
              <g id="pdfBody" data-testid="pdf-body" className={styles.pdfBody} filter="url(#softShadow)">
                {/* Main page body path with folded top-right corner */}
                <path
                  d="M 38 20
                     L 170 20
                     L 210 60
                     L 210 252
                     A 10 10 0 0 1 200 262
                     L 48 262
                     A 10 10 0 0 1 38 252
                     Z"
                  fill="url(#pdfBodyGradient)"
                  stroke="#F472B6"
                  strokeWidth="1.5"
                />

                {/* Folded Corner Shadow */}
                <path
                  d="M 170 20 L 170 60 L 210 60 Z"
                  fill="#9F1239"
                  opacity="0.18"
                />

                {/* Folded Corner Flap */}
                <path
                  d="M 170 20 L 210 60 L 170 60 Z"
                  fill="url(#foldGradient)"
                  stroke="#BE185D"
                  strokeWidth="1"
                />

                {/* Document Internal Decorative Content Lines */}
                <rect x="58" y="45" width="80" height="8" rx="4" fill="#F472B6" opacity="0.4" />

                {/* PDF Badge Icon Container */}
                <g transform="translate(58, 75)" data-testid="pdf-badge-icon">
                  <rect x="0" y="0" width="48" height="48" rx="10" fill="#E11D48" />
                  <path
                    d="M 14 12 L 28 12 L 34 18 L 34 36 L 14 36 Z"
                    fill="#FFFFFF"
                  />
                  <path
                    d="M 28 12 L 28 18 L 34 18 Z"
                    fill="#FDA4AF"
                  />
                  <rect x="18" y="24" width="12" height="2" rx="1" fill="#E11D48" opacity="0.8" />
                  <rect x="18" y="28" width="10" height="2" rx="1" fill="#E11D48" opacity="0.8" />
                </g>

                {/* PDF Label Text */}
                <text
                  x="118"
                  y="108"
                  fill="#BE185D"
                  fontSize="24"
                  fontWeight="900"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  letterSpacing="1.5"
                >
                  PDF
                </text>

                {/* Page Mockup Text Lines */}
                <rect x="58" y="142" width="134" height="6" rx="3" fill="#F472B6" opacity="0.35" />
                <rect x="58" y="158" width="120" height="6" rx="3" fill="#F472B6" opacity="0.3" />
                <rect x="58" y="174" width="134" height="6" rx="3" fill="#F472B6" opacity="0.35" />
                <rect x="58" y="190" width="90" height="6" rx="3" fill="#F472B6" opacity="0.25" />
                <rect x="58" y="206" width="128" height="6" rx="3" fill="#F472B6" opacity="0.3" />
                <rect x="58" y="222" width="110" height="6" rx="3" fill="#F472B6" opacity="0.2" />

                {/* Molten / Softened Bottom Heat Interaction Overlay */}
                <path
                  data-testid="molten-bottom-edge"
                  d="M 38 230 Q 70 248 110 238 T 180 246 T 210 232 L 210 252 A 10 10 0 0 1 200 262 L 48 262 A 10 10 0 0 1 38 252 Z"
                  fill="url(#thermalEdgeGradient)"
                />
              </g>

              {/* RADIAL / ANGULAR DISPLACEMENT LINES */}
              <g id="angularVelocityLines" data-testid="angular-velocity-lines" className={styles.angularVelocityLines}>
                <line x1="20" y1="210" x2="-15" y2="245" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <line x1="30" y1="245" x2="-2" y2="280" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
                <line x1="230" y1="205" x2="265" y2="240" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <line x1="220" y1="240" x2="252" y2="278" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
              </g>
            </svg>

            {/* LAYERED THERMAL ENTRY FLAMES & WISPS */}
            <svg className={styles.thermalWispsSvg} data-testid="thermal-wisps-svg" viewBox="0 0 320 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="flameGradPrimary" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#BE185D" stopOpacity="0.95" />
                  <stop offset="40%" stopColor="#E11D48" stopOpacity="0.8" />
                  <stop offset="80%" stopColor="#F472B6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#FCE7F3" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="flameGradSecondary" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#910638" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#DB2777" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Layer 1: Outer aerodynamic wisps wrapping up lower sides */}
              <path
                className={styles.wispOuterLeft}
                d="M 40 110 C 25 80 15 50 22 20 C 28 45 42 75 55 95 Z"
                fill="url(#flameGradSecondary)"
                opacity="0.75"
              />
              <path
                className={styles.wispOuterRight}
                d="M 270 110 C 285 80 295 50 288 20 C 282 45 268 75 255 95 Z"
                fill="url(#flameGradSecondary)"
                opacity="0.75"
              />

              {/* Layer 2: Main sharp thermal flame tongues under bottom edge */}
              <path
                className={styles.flameTongue1}
                d="M 60 115 C 50 85 45 55 58 30 C 68 55 82 85 95 110 Z"
                fill="url(#flameGradPrimary)"
              />
              <path
                className={styles.flameTongue2}
                d="M 100 120 C 90 75 95 40 115 10 C 122 45 130 80 145 118 Z"
                fill="url(#flameGradPrimary)"
              />
              <path
                className={styles.flameTongue3}
                d="M 150 122 C 145 70 160 35 178 5 C 182 45 188 82 198 120 Z"
                fill="url(#flameGradPrimary)"
              />
              <path
                className={styles.flameTongue4}
                d="M 200 118 C 205 75 220 45 235 18 C 232 50 238 85 248 112 Z"
                fill="url(#flameGradPrimary)"
              />

              {/* Layer 3: Hot Pink / White Contact Highlights along lower document rim */}
              <path
                className={styles.thermalContactHighlight}
                d="M 45 110 Q 160 135 275 110 Q 160 120 45 110 Z"
                fill="#FFF1F2"
                opacity="0.9"
              />
              <ellipse cx="115" cy="114" rx="35" ry="4" fill="#FFFFFF" opacity="0.95" />
              <ellipse cx="195" cy="113" rx="40" ry="4" fill="#FFFFFF" opacity="0.95" />
            </svg>

            {/* PARTICLE / SPARK SYSTEM LAYER */}
            <div className={styles.particleSystem} data-testid="particle-system" aria-hidden="true">
              <span className={`${styles.spark} ${styles.spark1}`} />
              <span className={`${styles.spark} ${styles.spark2}`} />
              <span className={`${styles.spark} ${styles.spark3}`} />
              <span className={`${styles.spark} ${styles.spark4}`} />
              <span className={`${styles.spark} ${styles.spark5}`} />
              <span className={`${styles.spark} ${styles.spark6}`} />
              <span className={`${styles.spark} ${styles.spark7}`} />
              <span className={`${styles.spark} ${styles.spark8}`} />
            </div>

          </div>
        </div>

        {/* 4. FOREGROUND VELOCITY STREAKS */}
        <svg className={`${styles.layer} ${styles.frontStreaks}`} data-testid="front-streaks" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <line x1="210" y1="60" x2="198" y2="440" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          <line x1="350" y1="-10" x2="338" y2="390" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
          <line x1="450" y1="20" x2="438" y2="460" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
          <line x1="590" y1="-30" x2="578" y2="410" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>

        {/* 5. GROUNDED TEXT LABEL */}
        <div className={styles.textContainer} data-testid="text-container">
          <h1 className={styles.renderingText}>Rendering PDF</h1>
        </div>

      </div>
    </div>
  );
};

export default PdfLoadingScreen;
