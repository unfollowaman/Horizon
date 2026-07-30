import React from 'react';
import { Link } from 'react-router-dom';
import styles from './StudyNotes.module.css';

const StudyNotes: React.FC = () => {
  return (
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)]">
      {/* Brand header */}
      <div className="flex flex-col items-start max-md:gap-[32px] md:gap-[12px] mb-[clamp(12px,3vw,20px)]">
        <Link
          to="/"
          onClick={() => window.scrollTo(0, 0)}
          className={`animate-fade-rise ${styles.heroBrandPill} neu-raised no-underline`}
        >
          <img src="/assets/favicon/logo.png" alt="Horizon Logo" className={styles.heroBrandPillImg} />
          <span className={styles.heroBrandPillText}>Horizon</span>
        </Link>
        <h2 className="text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink">Study Notes</h2>
      </div>

      {/* Main content card */}
      <div className="neu-card rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto mt-8 animate-fade-rise">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
        <h3 className="text-h2 text-ink mb-4">Coming Soon</h3>
        <p className="text-muted-foreground text-body-large mb-8">
          This feature is coming soon. We will soon bring out comprehensive study notes for all your subjects here!
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-6 h-11 text-ink font-bold rounded-full neu-raised neu-raised-hover transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default StudyNotes;
