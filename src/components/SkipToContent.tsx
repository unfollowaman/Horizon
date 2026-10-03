import type React from 'react';

interface SkipToContentProps {
  targetId?: string;
}

export const SkipToContent: React.FC<SkipToContentProps> = ({ targetId = 'main-content' }) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-[#E91E8C] focus:text-white focus:font-bold focus:text-sm focus:rounded-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 no-underline transition-all"
    >
      Skip to main content
    </a>
  );
};

export default SkipToContent;
