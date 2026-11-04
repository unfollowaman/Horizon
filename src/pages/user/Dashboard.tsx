import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Dashboard.module.css';
import { RESOURCE_CATEGORIES } from '../../config/resources';
import DashboardSkeleton from '../../components/DashboardSkeleton';
import { getDefaultAvatar } from '../../utils/avatar';

const Dashboard: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Fallback for names/email
  const displayName = profile?.name || 'Student';
  const displayEmail = user?.email || 'Not set';
  const defaultAvatarPath = getDefaultAvatar(user?.id || profile?.id);

  // Helper to format created_at date to "October 2023" style
  const formatMemberSince = (createdAtString: string | undefined | null) => {
    if (!createdAtString) return 'Not set';
    try {
      const date = new Date(createdAtString);
      if (isNaN(date.getTime())) return 'Not set';
      const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch {
      return 'Not set';
    }
  };

  return (
    <div className={`${styles.container} max-md:pt-[10px] md:-mt-[20px]`}>
      {/* Brand Header */}
      <div className="flex flex-col items-start max-md:gap-[32px] md:gap-[12px] mb-[clamp(24px,4vw,40px)]">
        <Link
          to="/"
          onClick={() => window.scrollTo(0, 0)}
          className={`animate-fade-rise ${styles.heroBrandPill} neu-raised no-underline rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2`}
        >
          <img src="/assets/favicon/logo.avif" alt="Horizon Logo" className={styles.heroBrandPillImg} />
          <span className={styles.heroBrandPillText}>Horizon</span>
        </Link>
        <h1 className="text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink">Student Dashboard</h1>
      </div>

      {/* Unified Neomorphic Profile Card - Spans full width above the grid */}
      <section
        aria-label="Student Profile"
        className="neu-card rounded-2xl p-6 sm:p-8 flex flex-col gap-6 mb-8 w-full animate-fade-rise"
      >
        {/* Section A — Profile Header */}
        <div className={styles.profileHeaderSection}>
          <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
            <img
              src={profile?.avatar_url || defaultAvatarPath}
              alt={`${displayName}'s profile photo`}
              className={styles.avatar}
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h4 className="text-h2 font-bold text-ink" title={displayName}>
                  {displayName}
                </h4>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF0F6] text-[#E11584] border border-[#FCE7F3]">
                  Student
                </span>
              </div>
              <p className="text-caption text-muted-foreground break-all sm:break-normal mt-1" title={displayEmail}>
                {displayEmail}
              </p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="shrink-0 self-start sm:self-center mt-2 sm:mt-0">
            <button
              type="button"
              disabled
              title="Profile editing coming soon"
              aria-label="Edit Profile (Coming Soon)"
              className="inline-flex items-center justify-center gap-2 px-5 h-10 text-caption font-bold rounded-full neu-raised neu-raised-hover opacity-80 cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
            >
              <svg
                className="w-4 h-4 text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Subtle Horizontal Divider */}
        <hr className="border-t border-black/[0.06] my-0" aria-hidden="true" />

        {/* Section B — Profile Summary */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#E11584]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
              <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
              <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
            </svg>
            <h5 className="text-body-base font-bold text-ink">
              Profile Summary
            </h5>
          </div>

          {/* 3 Summary Items (Horizontal layout inside each tile: [Icon] [Label + Value]) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {/* 1. Class */}
            <div className="neu-card rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 text-left">
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FFF0F6] border border-[#FCE7F3] flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-[#E11584]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                  Class
                </span>
                <span className="text-base sm:text-lg font-bold text-ink block truncate">
                  {profile?.student_class || 'Not set'}
                </span>
              </div>
            </div>

            {/* 2. Study Medium - Open Book SVG */}
            <div className="neu-card rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 text-left">
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FFF0F6] border border-[#FCE7F3] flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-[#E11584]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 2v20" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                  Study Medium
                </span>
                <span className="text-base sm:text-lg font-bold text-ink block truncate">
                  {profile?.study_medium || 'Not set'}
                </span>
              </div>
            </div>

            {/* 3. Member Since */}
            <div className="neu-card rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 text-left">
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#FFF0F6] border border-[#FCE7F3] flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-[#E11584]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                  Member Since
                </span>
                <span className="text-base sm:text-lg font-bold text-ink block truncate">
                  {formatMemberSince(profile?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className={`${styles.layoutGrid} animate-fade-rise-delay`}>

        {/* Column 1: Main (Wider) Content */}
        <div className={styles.colMain}>

          {/* Card 1: Continue Learning (Hero) */}
          <div className="neu-card rounded-2xl p-8 md:p-10 flex flex-col justify-between items-start min-h-[300px]">
            <div className="w-full">
              <span className="text-label-caps text-accent uppercase tracking-wider block mb-3 font-semibold">
                Your Learning Path
              </span>
              <h3 className="text-h1 text-ink mb-4 font-bold">Continue Learning</h3>
              <p className="text-muted-foreground text-body-large max-w-xl mb-8">
                Your study journey will appear here once you begin reading Chapter Notes.
              </p>
            </div>
            <Link
              to={RESOURCE_CATEGORIES.notes.path}
              className="inline-flex items-center justify-center px-8 h-12 text-accent font-bold rounded-full neu-raised neu-raised-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
            >
              Browse Notes
            </Link>
          </div>

        </div>

        {/* Column 2: Sidebar (Narrower) Content */}
        <div className={styles.colSidebar}>

          {/* Card 3: Notification Preferences Entry Point */}
          <div className="neu-card rounded-2xl p-8 flex flex-col items-start">
            <span className="text-label-caps text-muted-foreground uppercase tracking-wider block mb-3 font-semibold">
              Notification Alerts
            </span>
            <h4 className="text-h3 font-bold text-ink mb-2">Browser Updates</h4>
            <p className="text-muted-foreground text-body-base mb-6">
              Get instant alerts for new chapter notes, PYQ releases, and syllabus updates.
            </p>
            <Link
              to="/settings/notifications"
              aria-label="Manage notification settings"
              className="w-full inline-flex items-center justify-center px-6 h-11 text-accent font-bold rounded-xl neu-raised neu-raised-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
            >
              Manage Notifications
            </Link>
          </div>

          {/* Card 5: Account Section / Sign Out */}
          <div className="neu-card rounded-2xl p-8 flex flex-col items-center">
            <span className="text-label-caps text-muted-foreground uppercase tracking-wider block mb-4 font-semibold self-start">
              Account Section
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out of your account"
              className="w-full flex items-center justify-center px-6 h-11 text-accent font-bold rounded-xl neu-raised neu-raised-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
            >
              Sign Out
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;
