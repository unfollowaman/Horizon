import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { fetchSyllabusChapters } from '../../services/learningResourcesAPI';
import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { RESOURCE_CATEGORIES } from '../../config/resources';
import { normalizeClassValue, normalizeMediumValue } from '../../utils/resourceHelper';


interface ProgressData {
  allTimeCompletedChapters: number;
  syllabusTotalChapters: number;
  syllabusCompletedChapters: number;
  percentageComplete: number;
  subjectProgress: Record<string, { total: number; completed: number; percentage: number }>;
}

const Dashboard: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  useEffect(() => {
    async function fetchProgress() {
      if (!user || !profile) return;
      setIsLoadingProgress(true);

      try {
        // Fetch syllabus: all chapters for the student's class
        const normalizedClass = normalizeClassValue(profile.student_class);
        const { data: syllabusData, error: syllabusError } = await fetchSyllabusChapters(normalizedClass, normalizeMediumValue(profile.study_medium));

        if (syllabusError) throw syllabusError;

        // Fetch completed chapters for the user
        const { data: completionsData, error: completionsError } = await supabase
          .from('chapter_completion')
          .select('chapter_id')
          .eq('user_id', user.id);

        if (completionsError) throw completionsError;

        const allTimeCompletedChapters = completionsData ? completionsData.length : 0;

        if (!syllabusData || syllabusData.length === 0) {
          setProgressData({
            allTimeCompletedChapters,
            syllabusTotalChapters: 0,
            syllabusCompletedChapters: 0,
            percentageComplete: 0,
            subjectProgress: {}
          });
          setIsLoadingProgress(false);
          return;
        }

        // Create a set of unique chapters for the syllabus and group by subject
        const syllabusChapterIds = new Set<string>();
        const subjectTotals: Record<string, Set<string>> = {};

        syllabusData.forEach(resource => {
          if (resource.chapter_id) {
            syllabusChapterIds.add(resource.chapter_id);
            const subject = resource.subject || 'Other';
            if (!subjectTotals[subject]) {
              subjectTotals[subject] = new Set();
            }
            subjectTotals[subject].add(resource.chapter_id);
          }
        });

        // Check which completions are within the current syllabus
        const completedChapterIds = new Set(completionsData?.map(c => c.chapter_id) || []);

        let syllabusCompletedChapters = 0;
        const subjectCompleted: Record<string, number> = {};

        for (const subject of Object.keys(subjectTotals)) {
           subjectCompleted[subject] = 0;
           for (const chapterId of subjectTotals[subject]) {
             if (completedChapterIds.has(chapterId)) {
               syllabusCompletedChapters++;
               subjectCompleted[subject]++;
             }
           }
        }

        const syllabusTotalChapters = syllabusChapterIds.size;
        const percentageComplete = syllabusTotalChapters > 0 ? Math.round((syllabusCompletedChapters / syllabusTotalChapters) * 100) : 0;

        const subjectProgress: Record<string, { total: number; completed: number; percentage: number }> = {};
        for (const subject of Object.keys(subjectTotals)) {
           const total = subjectTotals[subject].size;
           const completed = subjectCompleted[subject];
           subjectProgress[subject] = {
             total,
             completed,
             percentage: total > 0 ? Math.round((completed / total) * 100) : 0
           };
        }

        setProgressData({
          allTimeCompletedChapters,
          syllabusTotalChapters,
          syllabusCompletedChapters,
          percentageComplete,
          subjectProgress
        });
      } catch (err) {
        console.error("Error fetching progress:", err);
      } finally {
        setIsLoadingProgress(false);
      }
    }

    fetchProgress();
  }, [user, profile]);


  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="neu-card rounded-2xl p-8 text-center max-w-md animate-fade-rise">
          <p className="font-bold text-body1 text-ink">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Fallback for names/initials
  const displayName = profile?.name || 'Student';
  const displayEmail = user?.email || 'Not set';
  const initials = profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'U';

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
          className={`animate-fade-rise ${styles.heroBrandPill} neu-raised no-underline`}
        >
          <img src="/assets/favicon/logo.avif" alt="Horizon Logo" className={styles.heroBrandPillImg} />
          <span className={styles.heroBrandPillText}>Horizon</span>
        </Link>
        <h2 className="text-[clamp(36px,5vw,56px)] leading-tight uppercase text-ink">Student Dashboard</h2>
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
              className="inline-flex items-center justify-center px-8 h-12 text-accent font-bold rounded-full neu-raised neu-raised-hover transition-all"
            >
              Browse Notes
            </Link>
          </div>

          {/* Card 2: Learning Progress */}
          <div className="neu-card rounded-2xl p-8">
            <span className="text-label-caps text-muted-foreground uppercase tracking-wider block mb-4 font-semibold">
              Learning Progress
            </span>
            {isLoadingProgress ? (
              <div className="neu-recessed rounded-xl p-6 text-center animate-pulse">
                <p className="text-muted-foreground text-body-base">Loading progress...</p>
              </div>
            ) : !profile?.student_class ? (
              <div className="neu-recessed rounded-xl p-6 text-center">
                <p className="text-muted-foreground text-body-base">
                  Set your class in your profile to track your syllabus progress.
                </p>
              </div>
            ) : !progressData || progressData.syllabusTotalChapters === 0 ? (
              <div className="neu-recessed rounded-xl p-6 text-center">
                <p className="text-muted-foreground text-body-base">
                  No syllabus data found for {profile.student_class}. Start reading notes to track progress!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Overall Progress */}
                <div className="neu-recessed rounded-xl p-6 flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <span className="text-body-large text-ink font-bold">Overall Syllabus</span>
                    <span className="text-h2 text-accent font-bold leading-none">{progressData.percentageComplete}%</span>
                  </div>
                  <div className="w-full h-3 bg-black/[0.04] rounded-full overflow-hidden shadow-inner relative">
                    <div
                      className="absolute top-0 left-0 h-full bg-accent transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${progressData.percentageComplete}%` }}
                    />
                  </div>
                  <span className="text-caption text-muted-foreground font-medium text-right">
                    {progressData.syllabusCompletedChapters} of {progressData.syllabusTotalChapters} Chapters Completed
                  </span>
                </div>

                {/* Subject-wise Progress */}
                {Object.keys(progressData.subjectProgress).length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-caption text-muted-foreground uppercase tracking-wider block font-semibold pl-2">
                      Subject-wise Progress
                    </span>
                    <div className="flex flex-col gap-3">
                      {Object.entries(progressData.subjectProgress).map(([subject, stats]) => (
                        <div key={subject} className="neu-recessed rounded-xl p-4 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-body-base text-ink font-bold">{subject}</span>
                            <span className="text-caption font-bold text-accent">{stats.percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-black/[0.04] rounded-full overflow-hidden shadow-inner relative">
                            <div
                              className="absolute top-0 left-0 h-full bg-accent transition-all duration-1000 ease-out rounded-full"
                              style={{ width: `${stats.percentage}%` }}
                            />
                          </div>
                          <span className="text-[11px] leading-tight text-muted-foreground font-medium text-right mt-1">
                            {stats.completed} / {stats.total} Chapters
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Recent Activity */}
          <div className="neu-card rounded-2xl p-8">
            <span className="text-label-caps text-muted-foreground uppercase tracking-wider block mb-4 font-semibold">
              Recent Activity
            </span>
            <div className="neu-recessed rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-body-base">
                Your recent study activity will appear here.
              </p>
            </div>
          </div>

        </div>

        {/* Column 2: Sidebar (Narrower) Content */}
        <div className={styles.colSidebar}>

          {/* Card 1: Profile Header */}
          <div className="neu-card rounded-2xl p-8">
            <div className={styles.profileHeaderCard}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className={styles.avatar} />
              ) : (
                <div className={styles.avatar}>{initials}</div>
              )}
              <div className={styles.userInfo}>
                <h4 className="text-heading-card font-bold text-ink truncate max-w-[240px]" title={displayName}>
                  {displayName}
                </h4>
                <p className="text-caption text-muted-foreground truncate max-w-[240px]" title={displayEmail}>
                  {displayEmail}
                </p>
                <div className="mt-4">
                  <button
                    disabled
                    className={`${styles.editBtn} inline-flex items-center justify-center px-4 h-9 text-caption font-bold rounded-lg neu-raised neu-raised-hover opacity-80 cursor-not-allowed transition-all`}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Profile Summary */}
          <div className="neu-card rounded-2xl p-8">
            <span className="text-label-caps text-muted-foreground uppercase tracking-wider block mb-6 font-semibold">
              Profile Summary
            </span>
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-center pb-3 border-b border-black/[0.04]">
                <span className="text-body-base text-muted-foreground font-medium">Class</span>
                <span className="text-body-base text-ink font-bold">
                  {profile?.student_class || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-black/[0.04]">
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

          {/* Card 3: Study Statistics */}
          <div className="neu-card rounded-2xl p-8">
            <span className="text-label-caps text-muted-foreground uppercase tracking-wider block mb-6 font-semibold">
              Study Statistics
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div className="neu-recessed rounded-xl p-4 text-center">
                <span className="block text-2xl font-bold text-ink mb-1">
                  {isLoadingProgress ? '--' : progressData?.allTimeCompletedChapters ?? '--'}
                </span>
                <span className="block text-[11px] leading-tight text-muted-foreground font-medium">
                  Completed Chapters
                </span>
              </div>
              <div className="neu-recessed rounded-xl p-4 text-center">
                <span className="block text-2xl font-bold text-ink mb-1">--</span>
                <span className="block text-[11px] leading-tight text-muted-foreground font-medium">
                  Current Streak
                </span>
              </div>
              <div className="neu-recessed rounded-xl p-4 text-center">
                <span className="block text-2xl font-bold text-ink mb-1">--</span>
                <span className="block text-[11px] leading-tight text-muted-foreground font-medium">
                  Study Goal
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Account Section / Sign Out */}
          <div className="neu-card rounded-2xl p-8 flex flex-col items-center">
            <span className="text-label-caps text-muted-foreground uppercase tracking-wider block mb-4 font-semibold self-start">
              Account Section
            </span>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center px-6 h-11 text-accent font-bold rounded-xl neu-raised neu-raised-hover transition-all"
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
