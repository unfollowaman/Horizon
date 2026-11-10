import React from 'react';
import styles from '../pages/user/Dashboard.module.css';

const DashboardSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading student dashboard"
      className={`${styles.container} max-md:pt-[10px] md:-mt-[20px]`}
    >
      <span className="sr-only">Loading student dashboard...</span>
      <div aria-hidden="true">
        {/* Brand Header Skeleton */}
        <div className="flex flex-col items-start max-md:gap-[32px] md:gap-[12px] mb-[clamp(24px,4vw,40px)] animate-pulse">
          <div className="w-32 h-10 neu-raised rounded-full bg-ink/5" />
          <div className="w-72 h-10 bg-ink/10 rounded-xl" />
        </div>

        {/* Unified Profile Card Skeleton - Full Width */}
        <div className="neu-card rounded-2xl p-[16px] sm:p-[20px] lg:p-[24px] flex flex-col gap-[14px] sm:gap-[16px] lg:gap-[18px] mb-8 w-full animate-pulse">
          {/* Header: Avatar, Name + Badge, Email, Edit Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[12px] sm:gap-[16px]">
            <div className="flex items-center gap-[12px] sm:gap-[16px]">
              <div className="w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] neu-raised rounded-full bg-ink/5 shrink-0" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-[6px] sm:gap-[8px]">
                  <div className="w-32 h-6 bg-ink/10 rounded" />
                  <div className="w-14 h-4 bg-ink/5 rounded-full" />
                </div>
                <div className="w-44 sm:w-52 h-3.5 bg-ink/10 rounded mt-0.5" />
              </div>
            </div>
            <div className="w-full sm:w-auto shrink-0 flex justify-center sm:justify-end">
              <div className="w-[164px] sm:w-[136px] h-[36px] sm:h-[38px] neu-raised rounded-full bg-ink/5 shrink-0" />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-black/[0.06] w-full" />

          {/* Summary Section */}
          <div className="flex flex-col gap-[10px] sm:gap-[12px]">
            <div className="flex items-center gap-[8px]">
              <div className="w-[26px] h-[26px] sm:w-[28px] sm:h-[28px] rounded-lg bg-ink/5 shrink-0" />
              <div className="w-36 h-4 bg-ink/10 rounded" />
            </div>
            <div className={styles.summaryGrid}>
              <div className={`neu-card rounded-2xl px-[12px] py-[10px] sm:px-[14px] sm:py-[11px] lg:px-[16px] lg:py-[12px] flex items-center gap-[10px] sm:gap-[12px] ${styles.summaryTile}`}>
                <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-full bg-ink/5 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="w-12 h-2.5 bg-ink/10 rounded" />
                  <div className="w-20 h-4 bg-ink/10 rounded" />
                </div>
              </div>
              <div className={`neu-card rounded-2xl px-[12px] py-[10px] sm:px-[14px] sm:py-[11px] lg:px-[16px] lg:py-[12px] flex items-center gap-[10px] sm:gap-[12px] ${styles.summaryTile}`}>
                <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-full bg-ink/5 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="w-16 h-2.5 bg-ink/10 rounded" />
                  <div className="w-16 h-4 bg-ink/10 rounded" />
                </div>
              </div>
              <div className={`neu-card rounded-2xl px-[12px] py-[10px] sm:px-[14px] sm:py-[11px] lg:px-[16px] lg:py-[12px] flex items-center gap-[10px] sm:gap-[12px] ${styles.summaryTile}`}>
                <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-full bg-ink/5 shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="w-16 h-2.5 bg-ink/10 rounded" />
                  <div className="w-24 h-4 bg-ink/10 rounded" />
                </div>
              </div>
            </div>
          </div>
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
          </div>

          {/* Column 2: Sidebar Content Skeleton */}
          <div className={styles.colSidebar}>
            {/* Notification Alerts Skeleton */}
            <div className="neu-card rounded-2xl p-8 space-y-4 animate-pulse">
              <div className="w-28 h-3.5 bg-ink/10 rounded" />
              <div className="w-44 h-6 bg-ink/10 rounded" />
              <div className="w-full h-12 bg-ink/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
