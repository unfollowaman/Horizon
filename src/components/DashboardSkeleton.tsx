import React from 'react';
import styles from '../pages/user/Dashboard.module.css';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className={`${styles.container} max-md:pt-[10px] md:-mt-[20px]`}>
      {/* Brand Header Skeleton */}
      <div className="flex flex-col items-start max-md:gap-[32px] md:gap-[12px] mb-[clamp(24px,4vw,40px)] animate-pulse">
        <div className="w-32 h-10 neu-raised rounded-full bg-ink/5" />
        <div className="w-72 h-10 bg-ink/10 rounded-xl" />
      </div>

      {/* Main Layout Grid Skeleton */}
      <div className={styles.layoutGrid}>
        {/* Column 1: Main Content Skeleton */}
        <div className={styles.colMain}>
          {/* Card 1: Continue Learning */}
          <div className="neu-card rounded-2xl p-8 md:p-10 flex flex-col justify-between items-start min-h-[300px] animate-pulse">
            <div className="w-full space-y-4">
              <div className="w-32 h-4 bg-ink/10 rounded" />
              <div className="w-64 h-8 bg-ink/10 rounded" />
              <div className="w-full max-w-xl h-4 bg-ink/10 rounded" />
            </div>
            <div className="w-40 h-12 neu-raised rounded-full bg-ink/5" />
          </div>

          {/* Card 2: Learning Progress */}
          <div className="neu-card rounded-2xl p-8 space-y-4 animate-pulse">
            <div className="w-40 h-4 bg-ink/10 rounded" />
            <div className="neu-recessed rounded-xl p-6 h-28 bg-ink/5" />
          </div>

          {/* Card 3: Recent Activity */}
          <div className="neu-card rounded-2xl p-8 space-y-4 animate-pulse">
            <div className="w-36 h-4 bg-ink/10 rounded" />
            <div className="neu-recessed rounded-xl p-8 h-24 bg-ink/5" />
          </div>
        </div>

        {/* Column 2: Sidebar Content Skeleton */}
        <div className={styles.colSidebar}>
          {/* Card 1: Profile Header */}
          <div className="neu-card rounded-2xl p-8 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 neu-raised rounded-full bg-ink/5 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="w-32 h-5 bg-ink/10 rounded" />
                <div className="w-44 h-4 bg-ink/10 rounded" />
              </div>
            </div>
          </div>

          {/* Card 2: Profile Summary */}
          <div className="neu-card rounded-2xl p-8 space-y-4 animate-pulse">
            <div className="w-36 h-4 bg-ink/10 rounded" />
            <div className="space-y-3">
              <div className="w-full h-5 bg-ink/5 rounded" />
              <div className="w-full h-5 bg-ink/5 rounded" />
              <div className="w-full h-5 bg-ink/5 rounded" />
            </div>
          </div>

          {/* Card 3: Study Statistics */}
          <div className="neu-card rounded-2xl p-8 space-y-4 animate-pulse">
            <div className="w-36 h-4 bg-ink/10 rounded" />
            <div className="grid grid-cols-3 gap-3">
              <div className="neu-recessed rounded-xl h-20 bg-ink/5" />
              <div className="neu-recessed rounded-xl h-20 bg-ink/5" />
              <div className="neu-recessed rounded-xl h-20 bg-ink/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
