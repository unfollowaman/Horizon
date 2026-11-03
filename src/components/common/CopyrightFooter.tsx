import React from 'react';

/**
 * CopyrightFooter - Redesigned Horizon Copyright Footer Component
 *
 * Implements a soft neumorphic rounded pill container featuring:
 * 1. White rounded-square badge housing Horizon's authentic magenta logo
 * 2. Thin pink/magenta vertical divider line
 * 3. Centered elegant serif typography ("© 2026 Horizon Educational Platform. All rights reserved.")
 * 4. Layered decorative flowing pink waves sweeping along the right/bottom edge behind text
 */
const CopyrightFooter: React.FC = () => {
  return (
    <footer
      role="contentinfo"
      className="w-full max-w-full px-4 sm:px-6 py-4 sm:py-5 flex justify-center mt-auto overflow-hidden select-none"
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl sm:rounded-full bg-gradient-to-r from-[#FFFDFE] via-[#FFF8FA] to-[#FFF1F6] border border-[#FCE7F3] shadow-[0_4px_20px_-2px_rgba(225,21,132,0.06),0_2px_8px_-1px_rgba(0,0,0,0.03)] px-3.5 sm:px-5 py-2.5 sm:py-3 transition-all duration-300"
      >
        {/* Layered Decorative Flowing Pink Waves (Right & Lower Background) */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 bottom-0 w-32 sm:w-56 md:w-72 pointer-events-none z-0 overflow-hidden"
        >
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 280 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            {/* Wave Layer 1: Soft Outer Wash */}
            <path
              d="M30 80C60 65 90 75 130 50C170 25 210 55 280 15V80H30Z"
              fill="#FDF2F8"
              fillOpacity="0.85"
            />
            {/* Wave Layer 2: Middle Delicate Wave */}
            <path
              d="M70 80C110 55 145 68 185 40C225 15 250 35 280 22V80H70Z"
              fill="#FCE7F3"
              fillOpacity="0.7"
            />
            {/* Wave Layer 3: Vibrant Accent Crest */}
            <path
              d="M120 80C155 60 190 70 225 45C255 25 270 38 280 32V80H120Z"
              fill="#F472B6"
              fillOpacity="0.22"
            />
            {/* Wave Layer 4: Deep Accent Flow */}
            <path
              d="M170 80C200 68 230 74 255 58C270 48 276 52 280 48V80H170Z"
              fill="#E11584"
              fillOpacity="0.12"
            />
          </svg>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 flex items-center gap-2.5 sm:gap-3.5 w-full">
          {/* Horizon Logo Badge */}
          <div className="shrink-0 flex items-center justify-center bg-white rounded-xl shadow-[0_2px_8px_rgba(225,21,132,0.08),0_1px_3px_rgba(0,0,0,0.04)] border border-[#FCE7F3]/70 p-1 sm:p-1.5 w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-200">
            <img
              src="/assets/favicon/logo.avif"
              alt="Horizon Logo"
              width="24"
              height="24"
              loading="lazy"
              decoding="async"
              className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
            />
          </div>

          {/* Vertical Pink Divider */}
          <div
            aria-hidden="true"
            className="shrink-0 w-[1.5px] h-5 sm:h-6 bg-[#E11584]/40 rounded-full"
          />

          {/* Centered Serif Copyright Text */}
          <div className="flex-1 min-w-0 flex items-center">
            <p className="m-0 font-serif text-[12.5px] sm:text-[15px] md:text-[16px] text-[#1F2937] tracking-wide leading-snug break-words sm:whitespace-nowrap">
              &copy; 2026 Horizon Educational Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default React.memo(CopyrightFooter);
