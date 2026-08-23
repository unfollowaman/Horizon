import React from 'react';

const MaterialCardSkeleton: React.FC = () => {
  return (
    <div className="neu-raised p-[14px] rounded-xl flex flex-col h-full items-center text-center animate-pulse" aria-hidden="true">
      {/* Thumbnail Skeleton */}
      <div className="w-full h-[100px] neu-recessed rounded-md mb-[12px] shrink-0 bg-ink/5" />

      {/* Title Lines Skeleton */}
      <div className="w-full flex flex-col items-center gap-1.5 mb-[8px]">
        <div className="h-4 bg-ink/10 rounded w-4/5" />
        <div className="h-3.5 bg-ink/10 rounded w-3/5" />
      </div>

      {/* Subtitle / Year Line Skeleton */}
      <div className="h-3 bg-ink/10 rounded w-2/5 mb-[14px]" />

      {/* Action Buttons Skeleton */}
      <div className="w-full flex justify-center gap-[4px] md:gap-[8px] mt-auto">
        <div className="flex-1 h-7 neu-raised-sm rounded-md bg-ink/5" />
        <div className="flex-1 h-7 neu-raised-sm rounded-md bg-ink/5" />
      </div>
    </div>
  );
};

export default MaterialCardSkeleton;
