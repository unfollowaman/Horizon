import React from 'react';
import { DOTS } from './renderingScreenData';

export const BackgroundLayer = React.memo(function BackgroundLayer() {
  return (
    <svg viewBox="0 0 941 1672" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="rs-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fefbfc" />
          <stop offset=".5" stopColor="#fef8fb" />
          <stop offset="1" stopColor="#fef5f9" />
        </linearGradient>
        <radialGradient id="rs-hI">
          <stop offset="0" stopColor="#ff4fa0" stopOpacity=".2" />
          <stop offset=".55" stopColor="#ff4fa0" stopOpacity=".07" />
          <stop offset="1" stopColor="#ff4fa0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rs-hR">
          <stop offset="0" stopColor="#ff4fa0" stopOpacity="0" />
          <stop offset=".6" stopColor="#ff4fa0" stopOpacity=".09" />
          <stop offset="1" stopColor="#ff4fa0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rs-halo">
          <stop offset="0" stopColor="#e91e8c" stopOpacity=".3" />
          <stop offset=".45" stopColor="#e91e8c" stopOpacity=".13" />
          <stop offset="1" stopColor="#e91e8c" stopOpacity="0" />
        </radialGradient>
        <filter id="rs-b30" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id="rs-b06">
          <feGaussianBlur stdDeviation=".6" />
        </filter>
      </defs>
      <rect width="941" height="1672" fill="url(#rs-bg)" />
      <circle cx="440" cy="400" r="340" fill="url(#rs-hI)" />
      <circle cx="470" cy="984" r="270" fill="url(#rs-hR)" />
      <ellipse cx="430" cy="420" rx="210" ry="230" fill="#ff5fa8" opacity=".14" filter="url(#rs-b30)" />
      <g filter="url(#rs-b06)">
        {DOTS.map(([cx, cy, r, hex], idx) => {
          const isGlow = parseInt(hex.slice(0, 2), 16) < 0xe0;
          if (isGlow) {
            return (
              <React.Fragment key={idx}>
                <circle cx={cx} cy={cy} r={34} fill="url(#rs-halo)" />
                <circle cx={cx} cy={cy} r={4.6} fill={`#${hex}`} />
              </React.Fragment>
            );
          }
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={Math.max(r + 0.4, 2.2)}
              fill={`#${hex}`}
            />
          );
        })}
      </g>
    </svg>
  );
});
