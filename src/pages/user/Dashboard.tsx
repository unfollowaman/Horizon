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

          {/* Card 1: Profile Header */}
          <div className="neu-card rounded-2xl p-8">
            <div className={styles.profileHeaderCard}>
              <img
                src={profile?.avatar_url || defaultAvatarPath}
                alt={`${displayName}'s profile photo`}
                className={styles.avatar}
              />
              <div className={styles.userInfo}>
                <h4 className="text-heading-card font-bold text-ink truncate max-w-[240px]" title={displayName}>
                  {displayName}
                </h4>
                <p className="text-caption text-muted-foreground truncate max-w-[240px]" title={displayEmail}>
                  {displayEmail}
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled
                    title="Profile editing coming soon"
                    aria-label="Edit Profile (Coming Soon)"
                    className={`${styles.editBtn} inline-flex items-center justify-center px-4 h-9 text-caption font-bold rounded-lg neu-raised neu-raised-hover opacity-80 cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]`}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Profile Summary */}
          <div className="neu-card rounded-2xl p-6">
            <span className="text-label-caps text-muted-foreground uppercase tracking-wider block mb-3.5 font-semibold">
              Profile Summary
            </span>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2.5 border-b border-black/[0.04]">
                <span className="text-body-base text-muted-foreground font-medium">Class</span>
                <span className="text-body-base text-ink font-bold">
                  {profile?.student_class || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-black/[0.04]">
                <span className="text-body-base text-muted-foreground font-medium">Study Medium</span>
                <span className="text-body-base text-ink font-bold">
                  {profile?.study_medium || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-body-base text-muted-foreground font-medium">Member Since</span>
                <span className="text-body-base text-ink font-bold">
                  {formatMemberSince(profile?.created_at)}
                </span>
              </div>
            </div>
          </div>

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
