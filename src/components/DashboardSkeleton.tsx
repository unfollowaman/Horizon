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
        <div className="neu-card rounded-2xl p-6 sm:p-8 space-y-6 mb-8 w-full animate-pulse">
          {/* Header: Avatar, Name + Badge, Email, Edit Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 neu-raised rounded-full bg-ink/5 shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-32 h-6 bg-ink/10 rounded" />
                  <div className="w-16 h-4 bg-ink/5 rounded-full" />
                </div>
                <div className="w-48 h-3.5 bg-ink/10 rounded" />
              </div>
            </div>
            <div className="w-28 h-10 neu-raised rounded-full bg-ink/5 shrink-0 self-start sm:self-center" />
          </div>

          {/* Divider */}
          <div className="h-px bg-black/[0.06] w-full" />

          {/* Summary Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-ink/5 shrink-0" />
              <div className="w-36 h-4 bg-ink/10 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              <div className="neu-card rounded-2xl p-4 sm:p-5 flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-ink/5 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-12 h-2.5 bg-ink/10 rounded" />
                  <div className="w-20 h-4 bg-ink/10 rounded" />
                </div>
              </div>
              <div className="neu-card rounded-2xl p-4 sm:p-5 flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-ink/5 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-16 h-2.5 bg-ink/10 rounded" />
                  <div className="w-16 h-4 bg-ink/10 rounded" />
                </div>
              </div>
              <div className="neu-card rounded-2xl p-4 sm:p-5 flex items-center gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-ink/5 shrink-0" />
                <div className="space-y-1.5 flex-1">
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
