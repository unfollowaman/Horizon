import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Profile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../../components/loading/PageLoader';
import { subscribeToPushNotifications } from '../../services/notifications';
import { getDefaultAvatar } from '../../utils/avatar';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Data
  const [studentClass, setStudentClass] = useState<string>('');
  const [studyMedium, setStudyMedium] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const subscribingRef = useRef(false);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (notifTimerRef.current) {
        clearTimeout(notifTimerRef.current);
        notifTimerRef.current = null;
      }
    };
  }, []);

  const fetchUserAndProfile = async () => {
    if (isMountedRef.current) {
      setLoading(true);
      setInitError(null);
    }
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        if (isMountedRef.current) navigate('/login');
        return;
      }

      const session = sessionData.session;
      if (isMountedRef.current) setUserId(session.user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at')
        .eq('id', session.user.id)
        .single();

      if (!isMountedRef.current) return;

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setInitError('Failed to load your profile. Please refresh or try again.');
        return;
      }

      if (profile) {
        if (profile.onboarding_completed) {
          navigate('/');
          return;
        }

        if (profile.student_class) setStudentClass(profile.student_class);
        if (profile.study_medium) setStudyMedium(profile.study_medium);
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);

        if (!profile.student_class) setStep(1);
        else if (!profile.study_medium) setStep(3);
        else if (!profile.avatar_url) setStep(4);
      }
    } catch (err: unknown) {
      console.error('Unexpected exception during profile initialization:', err);
      if (isMountedRef.current) {
        setInitError('Failed to load your profile. Please refresh or try again.');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndProfile();
  }, [navigate]);

  const updateProfile = async (updates: Partial<Profile>): Promise<{ success: boolean; error?: unknown }> => {
    if (!userId) return { success: false, error: 'User ID missing' };
    setSaving(true);
    if (isMountedRef.current) setFinishError(null);
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (error) {
        console.error('Error updating profile choice:', error);
        return { success: false, error };
      }
      return { success: true };
    } catch (err: unknown) {
      console.error('Unexpected exception updating profile:', err);
      return { success: false, error: err };
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const handleSelectClass = async (cls: string) => {
    if (saving) return;
    const res = await updateProfile({ student_class: cls });
    if (res.success) {
      if (isMountedRef.current) {
        setStudentClass(cls);
        setStep(3);
      }
    } else if (isMountedRef.current) {
      setFinishError('Failed to save your class selection. Please try again.');
    }
  };

  const handleSelectMedium = async (medium: string) => {
    if (saving) return;
    const res = await updateProfile({ study_medium: medium });
    if (res.success) {
      if (isMountedRef.current) {
        setStudyMedium(medium);
        setStep(4);
      }
    } else if (isMountedRef.current) {
      setFinishError('Failed to save your study medium. Please try again.');
    }
  };

  const [subscribing, setSubscribing] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const handleNext = async () => {
    if (step === 4) {
      setStep(5);
    } else if (step === 5) {
      setNotifFeedback(null);
      setStep(6);
    } else if (step === 1) {
      setStep(2);
    }
  };

  const handleEnableNotifications = async () => {
    if (subscribingRef.current) return;
    subscribingRef.current = true;
    setSubscribing(true);
    setNotifFeedback(null);
    try {
      const res = await subscribeToPushNotifications();
      if (!isMountedRef.current) return;

      if (res.success) {
        setNotifFeedback({
          type: 'success',
          text: 'Push notifications enabled successfully! You will receive real-time alerts for your class.',
        });
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => {
          notifTimerRef.current = null;
          if (isMountedRef.current) {
            subscribingRef.current = false;
            setSubscribing(false);
            setStep(6);
          }
        }, 1200);
        return;
      }

      subscribingRef.current = false;
      if (isMountedRef.current) setSubscribing(false);

      if (res.error?.code === 'PERMISSION_DENIED') {
        setNotifFeedback({
          type: 'info',
          text: 'Notification permission was denied. You can enable alerts later in browser settings.',
        });
      } else if (res.error?.code === 'UNSUPPORTED_BROWSER') {
        setNotifFeedback({
          type: 'info',
          text: 'Push notifications are not supported in this browser.',
        });
      } else {
        setNotifFeedback({
          type: 'error',
          text: 'Unable to enable notifications right now. You can manage alerts anytime in Settings.',
        });
      }
    } catch (_err) {
      subscribingRef.current = false;
      if (isMountedRef.current) {
        setSubscribing(false);
        setNotifFeedback({
          type: 'error',
          text: 'Unable to enable notifications right now. You can manage alerts anytime in Settings.',
        });
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    if (!userId || saving) return;
    setSaving(true);
    if (isMountedRef.current) setFinishError(null);
    try {
      const { error } = await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
      if (error) {
        if (isMountedRef.current) {
          setFinishError('Unable to save profile setup. Please try again.');
        }
        return;
      }
      await refreshProfile();
      if (isMountedRef.current) {
        navigate('/');
      }
    } catch (_err) {
      if (isMountedRef.current) {
        setFinishError('Unable to save profile setup. Please try again.');
      }
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = e.target;
    if (!fileInput.files || fileInput.files.length === 0 || !userId || uploading) return;
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    setUploading(true);
    if (isMountedRef.current) setFinishError(null);

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        if (isMountedRef.current) {
          setFinishError('Failed to upload profile photo. Please try again.');
        }
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const updateRes = await updateProfile({ avatar_url: data.publicUrl });
      if (updateRes.success) {
        if (isMountedRef.current) setAvatarUrl(data.publicUrl);
      } else if (isMountedRef.current) {
        setFinishError('Photo uploaded but failed to update profile. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Unexpected avatar upload exception:', err);
      if (isMountedRef.current) {
        setFinishError('Failed to upload profile photo. Please try again.');
      }
    } finally {
      fileInput.value = '';
      if (isMountedRef.current) setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <PageLoader />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] p-4 text-center">
        <div className="max-w-md w-full neu-card rounded-2xl p-6 sm:p-8 space-y-4 font-sans shadow-soft border border-gray-200/60">
          <h2 className="font-serif text-2xl font-bold text-ink">Initialization Error</h2>
          <div role="alert" className="p-3 rounded-lg text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200 font-sans">
            {initError}
          </div>
          <button
            type="button"
            onClick={fetchUserAndProfile}
            className="w-full py-2.5 px-4 bg-[#E91E8C] hover:bg-[#D81B60] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 cursor-pointer"
          >
            Retry Loading Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-ink">
      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={6}
        aria-valuetext={`Step ${step} of 6`}
        className="w-full h-1.5 bg-gray-200/70"
      >
        <div
          className="h-full bg-[#E91E8C] transition-all duration-300 ease-out"
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md neu-card rounded-2xl overflow-hidden animate-fade-rise font-sans shadow-soft border border-gray-200/60">
          <div className="px-5 py-3.5 flex justify-between items-center border-b border-gray-200/50">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="w-11 h-11 rounded-full neu-raised hover:neu-raised-hover flex items-center justify-center cursor-pointer text-ink border border-gray-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 shrink-0"
                aria-label="Go Back"
                title="Go Back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </button>
            ) : (
              <div />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-sans">
              Step {step} of 6
            </span>
          </div>

          <div className="p-6 sm:p-8 font-sans">
            {step === 1 && (
              <div className="text-center space-y-4 sm:space-y-5">
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
                  Welcome to Horizon
                </h1>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed font-sans">
                  Horizon will personalize your experience based on your choices.
                  Don't worry, you can always change this information later.
                </p>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-2.5 sm:py-3 px-4 bg-[#E91E8C] hover:bg-[#D81B60] text-white rounded-lg font-semibold text-sm sm:text-base transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 cursor-pointer"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1">
                    Select your Class
                  </h2>
                  <p className="text-gray-500 text-sm font-sans">Choose your current grade level</p>
                </div>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200 font-sans"
                  >
                    {finishError}
                  </div>
                )}

                <div className="grid gap-2.5">
                  {['Class 12', 'Class 11', 'Class 10', 'Class 9', 'Class 8'].map((cls) => (
                    <button
                      type="button"
                      key={cls}
                      onClick={() => handleSelectClass(cls)}
                      disabled={saving}
                      aria-pressed={studentClass === cls}
                      className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all cursor-pointer border text-left flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 ${
                        studentClass === cls
                          ? 'border-[#E91E8C] bg-[#E91E8C]/5 text-[#E91E8C] font-semibold shadow-xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-ink shadow-xs'
                      }`}
                    >
                      <span>{cls}</span>
                      {studentClass === cls && (
                        <span className="w-2 h-2 rounded-full bg-[#E91E8C]" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1">
                    Study Medium
                  </h2>
                  <p className="text-gray-500 text-sm font-sans">Select your preferred learning language</p>
                </div>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200 font-sans"
                  >
                    {finishError}
                  </div>
                )}

                <div className="grid gap-2.5">
                  {['English', 'Hindi'].map((medium) => (
                    <button
                      type="button"
                      key={medium}
                      onClick={() => handleSelectMedium(medium)}
                      disabled={saving}
                      aria-pressed={studyMedium === medium}
                      className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all cursor-pointer border text-left flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 ${
                        studyMedium === medium
                          ? 'border-[#E91E8C] bg-[#E91E8C]/5 text-[#E91E8C] font-semibold shadow-xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-ink shadow-xs'
                      }`}
                    >
                      <span>{medium}</span>
                      {studyMedium === medium && (
                        <span className="w-2 h-2 rounded-full bg-[#E91E8C]" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1">
                    Profile Photo
                  </h2>
                  <p className="text-gray-500 text-sm font-sans">Optional — customize your profile avatar</p>
                </div>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200 font-sans"
                  >
                    {finishError}
                  </div>
                )}

                <div className="flex flex-col items-center gap-5 pt-2">
                  <div className="relative">
                    <img
                      src={avatarUrl || getDefaultAvatar(userId)}
                      alt="Profile"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                    />
                  </div>

                  <div className="w-full flex flex-col gap-2.5 font-sans">
                    <label className="w-full py-2.5 sm:py-3 px-4 text-center rounded-lg font-semibold text-sm cursor-pointer border border-gray-300 bg-white hover:bg-gray-50 text-ink transition-colors shadow-xs focus-within:ring-2 focus-within:ring-[#E91E8C] focus-within:ring-offset-2">
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                        aria-label="Upload profile photo"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={uploading}
                      className="w-full py-2.5 sm:py-3 px-4 bg-[#E91E8C] hover:bg-[#D81B60] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 cursor-pointer"
                    >
                      {avatarUrl ? 'Continue' : 'Skip'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1">
                    Stay Updated
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed font-sans">
                    Get instant browser alerts when new chapter notes, PYQ papers, or syllabus updates are published for your class.
                  </p>
                </div>

                {notifFeedback && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`p-3 rounded-lg text-sm text-center font-medium font-sans ${
                      notifFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : notifFeedback.type === 'info'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {notifFeedback.text}
                  </div>
                )}

                <div className="w-full flex flex-col gap-2.5 font-sans pt-2">
                  {!notifFeedback || notifFeedback.type !== 'success' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        disabled={subscribing}
                        className="w-full py-2.5 sm:py-3 px-4 bg-[#E91E8C] hover:bg-[#D81B60] text-white rounded-lg font-semibold text-sm transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 cursor-pointer"
                      >
                        {subscribing ? 'Enabling Alerts...' : 'Enable Notifications'}
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={subscribing}
                        className="w-full py-2.5 sm:py-3 px-4 rounded-lg font-semibold text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 cursor-pointer"
                      >
                        {notifFeedback ? 'Continue to Review' : 'Skip for Now'}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-1">
                    Review Profile
                  </h2>
                  <p className="text-gray-500 text-sm font-sans">Confirm your study setup</p>
                </div>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-lg text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200 font-sans"
                  >
                    {finishError}
                  </div>
                )}

                <div className="bg-gray-50/80 p-4 sm:p-5 rounded-xl border border-gray-200/80 flex flex-col items-center gap-3">
                  <img
                    src={avatarUrl || getDefaultAvatar(userId)}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-xs"
                  />

                  <div className="w-full space-y-2 mt-2 font-sans">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200/60 text-sm">
                      <span className="text-gray-500 font-medium">Class</span>
                      <span className="font-semibold text-ink">{studentClass}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-sm">
                      <span className="text-gray-500 font-medium">Medium</span>
                      <span className="font-semibold text-ink">{studyMedium}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full mt-2 py-3 px-4 bg-[#E91E8C] hover:bg-[#D81B60] text-white rounded-lg font-semibold text-base transition-colors shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 cursor-pointer"
                >
                  {saving ? 'Finishing...' : 'Finish Setup'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
