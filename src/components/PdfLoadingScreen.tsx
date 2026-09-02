import React from 'react';
import styles from './PdfLoadingScreen.module.css';

/**
 * A deliberately layered loading illustration. Each group has its own class so
 * the document, atmospheric trails, heat interaction, particles, and shadow
 * can be tuned or animated without coupling them to the PDF artwork.
 */
const PdfLoadingScreen: React.FC = () => (
  <main className={styles.screen} aria-label="Rendering PDF" role="status" aria-live="polite">
    <div className={styles.composition}>
      <svg className={styles.artwork} viewBox="0 0 800 720" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="document-face" x1="285" y1="154" x2="530" y2="555" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE7F0" /><stop offset="1" stopColor="#FFA8CC" />
          </linearGradient>
          <linearGradient id="document-edge" x1="265" y1="175" x2="303" y2="558" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF75AA" /><stop offset="1" stopColor="#D92C72" />
          </linearGradient>
          <linearGradient id="fold" x1="488" y1="172" x2="571" y2="293" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF9CC5" /><stop offset="1" stopColor="#EA407F" />
          </linearGradient>
          <filter id="shadow-blur" x="180" y="586" width="440" height="74" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="14" /></filter>
          <filter id="glow-blur" x="215" y="465" width="370" height="155" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="17" /></filter>
        </defs>

        <g className={styles.rearStreaks} stroke="#F56AA2" strokeLinecap="round">
          <path d="M284 12 306 359" strokeWidth="4" opacity=".2" /><path d="M318 0 347 386" strokeWidth="12" opacity=".1" />
          <path d="m357 40 18 333" strokeWidth="4" opacity=".48" /><path d="m390 0 15 365" strokeWidth="7" opacity=".17" />
          <path d="m424 44 17 316" strokeWidth="3" opacity=".42" /><path d="m453 0 20 352" strokeWidth="10" opacity=".12" />
          <path d="m488 31 12 315" strokeWidth="3" opacity=".55" /><path d="m526 57 14 273" strokeWidth="4" opacity=".24" />
          <path d="m251 81 26 282" strokeWidth="3" opacity=".34" /><path d="m559 65 31 268" strokeWidth="3" opacity=".42" />
        </g>
        <g className={styles.foregroundStreaks} stroke="#F44189" strokeLinecap="round">
          <path d="m214 214 30 235" strokeWidth="3" opacity=".62" /><path d="m601 177 23 233" strokeWidth="3" opacity=".55" />
          <path d="m176 307 22 126" strokeWidth="2" opacity=".34" /><path d="m650 302 20 106" strokeWidth="2" opacity=".32" />
          <path d="m188 447 103 98" strokeWidth="3" opacity=".36" /><path d="m608 447-96 94" strokeWidth="3" opacity=".42" />
          <path d="m150 414 78 79" strokeWidth="2" opacity=".22" /><path d="m655 425-80 78" strokeWidth="2" opacity=".25" />
        </g>

        <ellipse className={styles.hoverShadow} cx="401" cy="632" rx="156" ry="15" fill="#F54791" opacity=".36" filter="url(#shadow-blur)" />
        <ellipse className={styles.thermalGlow} cx="400" cy="535" rx="144" ry="54" fill="#FF7DB1" opacity=".34" filter="url(#glow-blur)" />

        <g className={styles.pdfDepth}>
          <path d="m267 179 26-20 23 374-26 31-23-385Z" fill="url(#document-edge)" />
          <path d="m293 159 184 35 81 92-2 242-260 36-3-405Z" fill="#DD3476" opacity=".8" />
        </g>
        <g className={styles.pdfBody}>
          <path d="m293 159 186 36 79 92-2 241-260 36-3-405Z" fill="url(#document-face)" stroke="#F13E82" strokeWidth="4" strokeLinejoin="round" />
          <path d="m479 195-5 73c0 13 6 20 19 23l65 12-79-108Z" fill="url(#fold)" stroke="#D9286F" strokeWidth="4" strokeLinejoin="round" />
          <path d="m479 195-5 73c0 13 6 20 19 23l65 12" stroke="#FFCCE1" strokeWidth="5" strokeLinecap="round" />
        </g>
        <g className={styles.pdfIconography} transform="rotate(11 408 350)">
          <rect x="337" y="277" width="153" height="67" rx="9" fill="#F34287" />
          <text x="413" y="324" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="43" fontWeight="800">PDF</text>
          <path d="M402 404c-20 65-42 105-59 121m59-121c-17 37-1 58 38 78m-38-78c10 65 29 98 79 113m-95-11c33-18 72-20 104-5" stroke="#EE3C82" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <g className={styles.thermalWisps} stroke="#FFB4D1" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M287 499c-23 24 5 40-9 57-12 15-12 30 7 42" /><path d="M322 511c-18 25 8 35-7 58-8 13-2 26 11 34" />
          <path d="M469 512c22 19-3 38 12 57 8 13 6 26-7 36" /><path d="M511 499c22 23-2 45 10 61 8 11 3 27-9 38" />
        </g>
        <g className={styles.thermalCore}>
          <path d="M276 541c22-37 30 5 48-21 18-27 22 26 42-4 18-29 27 16 43-5 18-25 26 24 46 4 20-21 30 17 50-6 18-20 27 20 43 10-9 45-55 67-137 70-78 1-124-15-135-48Z" fill="#E72D77" />
          <path d="M292 548c18-24 27 14 43-9 15-22 24 25 39-4 18-32 29 17 45-5 17-23 28 27 47 4 17-20 28 15 42-5 13-19 24 7 30 4-25 35-72 45-131 46-61 1-101-10-115-31Z" fill="#FF69A5" />
          <path d="M309 556c17-16 24 13 40-4 17-18 23 19 42-5 14-18 26 17 42-3 14-18 24 19 39 1 13-15 19 14 34-1-28 27-143 36-197 12Z" fill="#FFCEE2" />
          <path d="M300 526c11 3 17-20 22-31m33 34c8-9 7-30 5-43m62 39c8-10 4-29 1-41m50 41c8-7 12-27 11-41" stroke="#FFF4F8" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className={styles.particles} fill="#F34A91">
          <circle cx="241" cy="519" r="4" /><circle cx="255" cy="559" r="3" /><circle cx="215" cy="490" r="2" /><circle cx="566" cy="517" r="4" /><circle cx="547" cy="559" r="3" /><circle cx="595" cy="486" r="2" />
          <path d="m230 469 17 17m-18 58 18 8m348-83-17 18m18 58-18 8" stroke="#F34A91" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    </div>
    <p className={styles.label}>Rendering PDF</p>
  </main>
);

export default PdfLoadingScreen;
