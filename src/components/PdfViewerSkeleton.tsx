import React from 'react';
import Spinner from './loading/Spinner';

interface PdfViewerSkeletonProps {
  title?: string;
}

const PdfViewerSkeleton: React.FC<PdfViewerSkeletonProps> = ({ title }) => {
  return (
    <div className="fixed inset-0 w-full h-full bg-[var(--bg-base)] flex flex-col overflow-hidden z-50 animate-pulse" aria-hidden="true">
      {/* Top Controls Bar Skeleton */}
      <div className="w-full h-16 p-3 flex items-center justify-between border-b border-ink/10 bg-[var(--bg-base)] shrink-0">
        <div className="w-10 h-10 neu-raised rounded-full bg-ink/5 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink/40">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </div>
        <div className="h-5 font-bold text-ink/70 text-sm md:text-base max-w-[50%] truncate text-center">
          {title || 'Loading Document...'}
        </div>
        <div className="w-10 h-10 neu-raised rounded-full bg-ink/5 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink/40">
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        </div>
      </div>

      {/* Main Document Area Skeleton */}
      <div className="flex-1 w-full p-4 md:p-8 flex items-center justify-center overflow-hidden relative">
        <div className="neu-card w-full max-w-[800px] h-[calc(100vh-8rem)] rounded-2xl p-6 flex flex-col gap-4 relative">
          <div className="w-3/4 h-8 bg-ink/10 rounded-md mb-2" />
          <div className="flex-1 w-full bg-ink/5 neu-recessed rounded-xl flex flex-col gap-3 p-4 relative items-center justify-center">
            {/* Embedded Rendering Spinner & Progress Notice */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-base)]/40 backdrop-blur-xs rounded-xl p-4 gap-3 z-10">
              <Spinner size="lg" />
              <p className="text-caption font-bold tracking-wider text-ink uppercase m-0">Preparing PDF Document...</p>
            </div>
            <div className="w-full h-4 bg-ink/10 rounded" />
            <div className="w-full h-4 bg-ink/10 rounded" />
            <div className="w-5/6 h-4 bg-ink/10 rounded" />
            <div className="w-4/6 h-4 bg-ink/10 rounded" />
            <div className="w-full h-32 bg-ink/5 rounded-lg my-auto" />
            <div className="w-full h-4 bg-ink/10 rounded" />
            <div className="w-3/4 h-4 bg-ink/10 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfViewerSkeleton;
