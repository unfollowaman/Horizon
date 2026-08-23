import React from 'react';

const PdfViewerSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full bg-[var(--bg-base)] flex flex-col overflow-hidden z-50 animate-pulse" aria-hidden="true">
      {/* Top Controls Bar Skeleton */}
      <div className="w-full h-16 p-3 flex items-center justify-between border-b border-ink/10 bg-[var(--bg-base)] shrink-0">
        <div className="w-10 h-10 neu-raised rounded-full bg-ink/5" />
        <div className="h-5 bg-ink/10 rounded w-48 max-w-[50%]" />
        <div className="w-10 h-10 neu-raised rounded-full bg-ink/5" />
      </div>

      {/* Main Document Area Skeleton */}
      <div className="flex-1 w-full p-4 md:p-8 flex items-center justify-center overflow-hidden">
        <div className="neu-card w-full max-w-[800px] h-[calc(100vh-8rem)] rounded-2xl p-6 flex flex-col gap-4">
          <div className="w-full h-8 bg-ink/10 rounded-md w-3/4 mb-2" />
          <div className="flex-1 w-full bg-ink/5 neu-recessed rounded-xl flex flex-col gap-3 p-4">
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
