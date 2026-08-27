import React from 'react';
import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { Resource } from '../types';
import { handleDownload } from '../utils/download';
import { canDownload } from '../utils/permissions';

interface MaterialCardProps {
  resource: Resource;
}


const doodle_backpack = 'data:image/webp;base64,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';
const doodle_books = 'data:image/webp;base64,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';
const doodle_circle_left = 'data:image/webp;base64,UklGRmIAAABXRUJQVlA4WAoAAAAQAAAATwAATwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IDIAAAAQBACdASpQAFAAPm02mUmkIyKhIUgAgA2JaQAACfGjRo0aNGjRo0Z+AAD++5zAAAAAAA==';
const doodle_notebook = 'data:image/webp;base64,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';
const doodle_plus_right = 'data:image/webp;base64,UklGRiQCAABXRUJQVlA4WAoAAAAQAAAATwAATwAAQUxQSPwAAAABgGrbtrJl/+4/TvolocndoWmy6hp5BItUojvJkjuJ7wUYX8XdHU74Je2GjIiYAMumiMhrAWj+PmDd9rlI5lF64bNj4bEovv3g+eXzVEZEfBdtZJ4qQWbORmYrBly2Y0D1eSQGXKut+MdguMfjYRJav3d8eEgkYvTr7ejwioQ9qzC3T9R6rzuTQ+z80+enqAVgGbEsV0uzw+mg2fCl5JiNBtA0L0kTqKZcvhVw8R58BJHYzUA3KE2B2q8YIO9WiQlgyqBgHJLdzs4GrwY0Y+dfRL7XogHoOMBWNdA9+TUWE+nqIuEbMfZ5qqhvRBAxdCXv+0xgS2qvi6byQxxWUDggAgEAANAHAJ0BKlAAUAA+bTaYSCQjIqEj+qowgA2JZwDTbBGivA9rQ23ZpaAiT5a1krZnb22YYJyd7MDjhyN4/4KstThMzuDWhE4AAP7KsifU6urWgiehB50V1k/L+aKwv//XAru/Yj/+weVtv+zCHTNWShTXa5wvXkmqRU6cucqip3THESf/tCW+LaJ//L03lKfz/z6OXnXdrhQVtjiR+WwL1PeKR+TzFwYQTMm0/7MHGL3VCwmklnYCMbbQoHrf+HqzLQoeisz1UfCW+98+EkF4/5XWraHEKslYsws75/witJYXucOIzOneXFnSEYSB3METO9rABSJPWYmq8D1tWF324QAAAA==';
const doodle_ruler = 'data:image/webp;base64,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';
const doodle_star_left = 'data:image/webp;base64,UklGRhYCAABXRUJQVlA4WAoAAAAQAAAATwAATwAAQUxQSPAAAAABgGrbturmhjmOU4YPeK7M9AHkmEGRRN86VmT7dGoZHJNOqpgZjtiV2zciJkD979aldVCJ9K1cChFT1eavCBFz/Y0gDePQo1Ax1N8Il9xL+fN6mYR1XvBnu8xKIvMCfpd8imXLLxwnK5YWXXBQ0XRswHkSD+0K1u08Ct7ZZD2y8e7Cno+HfR3e8nmoCfiqJtIFMkkk/w7miCTFYN/PwxWFeAoPNQOfdURafkREeokUvINu4ZF0DhsOHvZ1uNJ4WHT4KOahekHGiNR9wgyRlDhEXTz8+xBL5KHm4C6PyBhIJ5HiDxgnol3BqoOHYxMOEwFWUDggAAEAADAIAJ0BKlAAUAA+bTaYSKQjIqEj+qhggA2JZwB3A6wL6r9quQAuwD0AOkzRoGz+KZVLK4tVwppKxl4GXt9jpVuCWBbmBta+8iKAAP78XNACg/2Ht1c6FwBNbaPtIUH01KkpSMYBTtkXc9/2hv/tSqpyxLC9D3UL5y78HVT9wJHmZNOWHbSjUxpQADHOdVvjRGfCxjGVdW1deqOX82yLXoKYyBH+8zSff7/8pjZ9tooj/jNL7TtkdUtqpN3j3BbTM69jDSurzpYRV3keQH34y3qrFgPbp/AIo/+gD0Ve29Qh494fY7vJYh43btTWF9PeM08jn+k3jafZlFnG7hgAAAA=';
const doodle_star_right = 'data:image/webp;base64,UklGRmIAAABXRUJQVlA4WAoAAAAQAAAATwAATwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IDIAAAAQBACdASpQAFAAPm02mUmkIyKhIUgAgA2JaQAACfGjRo0aNGjRo0Z+AAD++5zAAAAAAA==';
const doodle_eraser = 'data:image/webp;base64,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';
const doodle_plus_bottom = 'data:image/webp;base64,UklGRjQCAABXRUJQVlA4WAoAAAAQAAAATwAATwAAQUxQSDABAAABgGNt2zHnPWcmtm1sYbCB2PzTpfrrsGSt2kllO/8sgF1a2/b4ifV9ZRARE0D/KlaP1gbJuCLAtCzG8CTPDECK4IjLBABIOW7coAF0rQDWOhdeROvQ2gXA3KxgSxYcGlIzPDDQb8Db2yqG1GXi6vGRCcD90jsgMOIbWjO0havD04VSQRByko3G0pKCPgBSNBNuOQsnJmj704PCfOnVsTGKLN/AVnsUMeiVPvUA04oYQ+8dna0wwLSaSixGz98AhuogGb170P4Aa12g7PvJgqoNMC2LMfRB1Tbsp01OxGDqqgnWukAZfVQAFhNd6ftHtW8BUo4bfTxao4kmBqMlYKs9ij7Vz48YjJCAvRTiZ9wisJ1CHDUAeynEU2A7hfiyl0J83Uglzirop0BFb2+bDxEBVlA4IN4AAACwCACdASpQAFAAPm0ylUckIyIhLNTYAIANiWkAFeAfIAywYYJmkd6QFMZ7FDPqhmoTt5VeQMGustbMpuWSo9Q/vKHyE3EV34lkFMUzvAAA/vxc0AkdfnP37VBTR4/nIdEuMrTfi1x6Y4MCRh5eNDw53hIjm9e8BuK9E3Z9fZ63YK/xjPotjus66FEbhs0yJVZr140Y3c7mkzn1xs4SGbi5s7w7vfCOapOcmYqX3xSYusUUC7lNxZaELSgokL9qjAl6ztF9cwEYxbHN5rvnmH/9MW+6SgDh4X1HXDgAAAA=';
const doodle_star_top = 'data:image/webp;base64,UklGRt4AAABXRUJQVlA4WAoAAAAQAAAATwAATwAAQUxQSCIAAAABHyAkIEMWykREsEFJADQMJSlJyVnUvojof+JFyIqUaaF9VlA4IJYAAACQBQCdASpQAFAAPm0sk0YkIiGhLh6IAIANiUAagod7LfzKLxBRIRXcKKIrHjGM1YNTCjl2AAD+/K0QAABI/jtgKOlkVaSxQRcLfb+7W9bAu//sN/XZwsj67f3DYg//+ysfvAgUfLQJYblwg3bJRtJj8p0FofABznYBlV8GuTgtdYVTqYf/KG4g+aLIxwgJxdhSu7mywAA=';
const doodle_pen = 'data:image/webp;base64,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';


const DefaultIllustration: React.FC<{ type: string }> = ({ type }) => {
  const rawId = useId().replace(/:/g, '');

  if (type === 'pyq') {
    return (
      <img
        src="/assets/SVG Illustrations/pyq-papers.svg"
        alt="PYQ Papers"
        className="w-full h-full object-contain"
      />
    );
  }

  if (type === 'notes') {
    return (
      <img
        src="/assets/SVG Illustrations/study-notes.svg"
        alt="Study Notes Illustration"
        className="w-full h-full object-contain"
      />
    );
  }

  const gradId = `pyqGrad-${rawId}`;
  const paperGrad = `url(#${gradId})`;

  const renderPaperPath = () => (
    <>
      <path d="M230 50 h55 l35 35 v105 a12 12 0 0 1 -12 12 h-78 a12 12 0 0 1 -12 -12 v-128 a12 12 0 0 1 12 -12 z" fill="#fff" stroke={paperGrad} strokeWidth="6" strokeLinejoin="round"/>
      <path d="M285 50 v25 a10 10 0 0 0 10 10 h25" fill="none" stroke={paperGrad} strokeWidth="6" strokeLinejoin="round" />
      <path d="M285 50 l35 35" fill="#E91E8C" opacity="0.1" />
      <text x="240" y="110" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="30" fill={paperGrad}>
        {type === 'notes' ? 'NOTE' : 'PYQ'}
      </text>
      <path d="M240 138 h45 M240 162 h65 M240 186 h65" stroke={paperGrad} strokeWidth="5" strokeLinecap="round"/>
    </>
  );

  return (
    <svg
      className="w-full h-full block"
      viewBox="0 0 540 260"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="200" y1="70" x2="320" y2="202" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E91E8C" />
          <stop offset="50%" stopColor="#C2185B" />
          <stop offset="100%" stopColor="#8B0A50" />
        </linearGradient>
        <filter id={`paperGlow-${rawId}`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#C2185B" floodOpacity="0.15" />
        </filter>
        <style>{`
          .pyq-float { transform-box: fill-box; transform-origin: center; animation: pyqFloat 6s ease-in-out infinite; }
          .d1 { animation-duration: 6.4s; animation-delay: -0.4s; }
          .d2 { animation-duration: 7.1s; animation-delay: -2.1s; }
          .d3 { animation-duration: 5.8s; animation-delay: -1.3s; }
          .d4 { animation-duration: 6.8s; animation-delay: -3.2s; }
          .d5 { animation-duration: 5.9s; animation-delay: -4.4s; }
          .d6 { animation-duration: 7.4s; animation-delay: -0.9s; }
          .d7 { animation-duration: 6.2s; animation-delay: -2.8s; }
          .d8 { animation-duration: 6.9s; animation-delay: -5.0s; }

          @keyframes pyqFloat {
            0%, 100% { transform: translate(0, 0) rotate(-1.5deg); }
            50% { transform: translate(2px, -4px) rotate(1.5deg); }
          }

          .pyq-stack { filter: url(#paperGlow-${rawId}); }

          /* The rotation hinge is on the left edge of the paper */
          .pyq-paper { transform-origin: 218px 125px; animation: 6s cubic-bezier(0.45, 0, 0.2, 1) infinite; }

          .paper-1 { animation-name: cycle1; }
          .paper-2 { animation-name: cycle2; }
          .paper-3 { animation-name: cycle3; }

          @keyframes cycle1 {
            0% { transform: translate(0px, 0px) rotateY(0deg) rotateZ(0deg); opacity: 1; }
            13% { transform: translate(-20px, -5px) rotateY(-30deg) rotateZ(-3deg); opacity: 1; }
            16.6% { transform: translate(-35px, -8px) rotateY(-70deg) rotateZ(-6deg); opacity: 0; }
            16.7%, 66.6% { transform: translate(16px, -12px) rotateY(0deg) rotateZ(0deg); opacity: 0; }
            66.7% { transform: translate(16px, -12px) rotateY(0deg) rotateZ(0deg); opacity: 0.85; }
            83.3%, 100% { transform: translate(0px, 0px) rotateY(0deg) rotateZ(0deg); opacity: 1; }
          }

          @keyframes cycle2 {
            0%, 33.3% { transform: translate(8px, -6px); opacity: 0.95; }
            50%, 66.6% { transform: translate(0px, 0px); opacity: 1; }
            79.6% { transform: translate(-20px, -5px) rotateY(-30deg) rotateZ(-3deg); opacity: 1; }
            83.3% { transform: translate(-35px, -8px) rotateY(-70deg) rotateZ(-6deg); opacity: 0; }
            83.4%, 100% { transform: translate(16px, -12px) rotateY(0deg) rotateZ(0deg); opacity: 0; }
          }

          @keyframes cycle3 {
            0%, 16.6% { transform: translate(16px, -12px); opacity: 0; }
            16.7% { transform: translate(16px, -12px); opacity: 0.85; }
            33.3%, 66.6% { transform: translate(8px, -6px); opacity: 0.95; }
            83.3%, 100% { transform: translate(0px, 0px); opacity: 1; }
          }

          .ghost-1 { animation-name: ghost1; }
          .ghost-2 { animation-name: ghost2; }

          @keyframes ghost1 {
            0%, 16.5% { opacity: 0; }
            16.6% { transform: translate(-35px, -8px) rotateY(-70deg) rotateZ(-6deg); opacity: 1; }
            33.3%, 100% { transform: translate(16px, -12px) rotateY(0deg) rotateZ(0deg); opacity: 0.85; }
          }

          @keyframes ghost2 {
            0%, 83.2% { opacity: 0; }
            83.3% { transform: translate(-35px, -8px) rotateY(-70deg) rotateZ(-6deg); opacity: 1; }
            100% { transform: translate(16px, -12px) rotateY(0deg) rotateZ(0deg); opacity: 0.85; }
          }
            83.3% { transform: translate(-35px, -8px) rotateY(-70deg) rotateZ(-6deg); opacity: 1; }
            100% { transform: translate(20px, -16px) rotateY(0deg) rotateZ(0deg); opacity: 0.85; }
          }

          @media (prefers-reduced-motion: reduce) {
            .pyq-float, .pyq-paper { animation: none !important; }
          }
        `}</style>
      </defs>

      <rect width="540" height="260" fill="transparent" />

      <g id="background-doodles">
        <image href={doodle_notebook} x="20" y="60" width="100" height="120" className="pyq-float d1" />
        <image href={doodle_ruler} x="45" y="165" width="100" height="100" className="pyq-float d2" />
        <image href={doodle_books} x="410" y="50" width="110" height="110" className="pyq-float d3" />
        <image href={doodle_backpack} x="410" y="160" width="100" height="100" className="pyq-float d4" />
        <image href={doodle_star_left} x="130" y="50" width="40" height="40" className="pyq-float d5" />
        <image href={doodle_circle_left} x="115" y="140" width="30" height="30" className="pyq-float d6" />
        <image href={doodle_star_right} x="380" y="65" width="35" height="35" className="pyq-float d7" />
        <image href={doodle_plus_right} x="375" y="145" width="25" height="25" className="pyq-float d8" />
        <image href={doodle_eraser} x="415" y="210" width="40" height="40" className="pyq-float d1" />
        <image href={doodle_plus_bottom} x="280" y="205" width="25" height="25" className="pyq-float d2" />
        <image href={doodle_star_top} x="270" y="35" width="25" height="25" className="pyq-float d3" />
        <image href={doodle_pen} x="480" y="215" width="45" height="45" className="pyq-float d5" />
      </g>

      <g id="pyq-paper-stack" className="pyq-stack">
        <g className="pyq-paper ghost-1">{renderPaperPath()}</g>
        <g className="pyq-paper ghost-2">{renderPaperPath()}</g>

        <g className="pyq-paper paper-3">{renderPaperPath()}</g>
        <g className="pyq-paper paper-2">{renderPaperPath()}</g>
        <g className="pyq-paper paper-1">{renderPaperPath()}</g>
      </g>
    </svg>
  );
};

const MaterialCard: React.FC<MaterialCardProps> = ({ resource }) => {
  return (
    <div className="neu-raised p-[14px] rounded-xl flex flex-col h-full items-center text-center">
      <Link
        to={`/resource/${resource.id}`}
        className="w-full flex flex-col items-center text-center no-underline text-ink group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 rounded-md"
      >
        <div className="w-full h-[100px] neu-recessed text-muted-foreground rounded-md mb-[12px] flex items-center justify-center overflow-hidden shrink-0">
          {resource.thumbnailUrl ? (
            <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
          ) : (
            <DefaultIllustration type={resource.resource_type} />
          )}
        </div>
        <h3 className="text-[15px] leading-[1.25] font-bold mb-[3px] text-ink line-clamp-2 overflow-hidden w-full text-center">
          {resource.resource_type === 'pyq'
            ? `${resource.student_class} ${resource.subject} PYQ`
            : resource.resource_type === 'notes' && resource.chapters
              ? `Chapter ${resource.chapters.chapter_number}: ${resource.chapters.chapter_name}`
              : resource.title}
        </h3>
        <p className="text-[12px] mb-[14px] text-ink/70 font-bold w-full text-center">
          {resource.year || resource.subject}
        </p>
      </Link>
      <div className="w-full flex justify-center gap-[4px] md:gap-[8px] mt-auto">
        <Link
          to={`/resource/${resource.id}`}
          className="flex-1 min-w-0 p-[6px_8px] md:p-[6px_4px] flex items-center justify-center whitespace-normal text-[11px] leading-[1.15] gap-[4px] font-bold neu-raised-sm rounded-md hover:neu-raised-sm-hover no-underline text-ink text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        >
          <svg aria-hidden="true" className="hidden md:block shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={`url(#pdfGrad-${resource.id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id={`pdfGrad-${resource.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E91E8C" />
                <stop offset="50%" stopColor="#C2185B" />
                <stop offset="100%" stopColor="#8B0A50" />
              </linearGradient>
            </defs>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M8 18v-4h1.5a1 1 0 0 1 0 2H8" />
            <path d="M11 14h1.5a2 2 0 0 1 0 4H11v-4z" />
            <path d="M16 18v-4h2M16 16h1.5" />
          </svg>
          <span className="shrink-0 truncate">View</span>
        </Link>
        {resource.pdfUrl && canDownload(resource) && (
          <button
            type="button"
            onClick={(e) => handleDownload(resource.pdfUrl, resource, e)}
            className="flex-1 min-w-0 p-[6px_8px] md:p-[6px_4px] flex items-center justify-center whitespace-normal text-[11px] leading-[1.15] gap-[4px] font-bold neu-raised-sm rounded-md hover:neu-raised-sm-hover no-underline text-ink text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 cursor-pointer"
          >
            <svg aria-hidden="true" className="hidden md:block shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={`url(#dlGrad-${resource.id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id={`dlGrad-${resource.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E91E8C" />
                  <stop offset="50%" stopColor="#C2185B" />
                  <stop offset="100%" stopColor="#8B0A50" />
                </linearGradient>
              </defs>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            <span className="shrink-0 truncate">Download</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MaterialCard;
