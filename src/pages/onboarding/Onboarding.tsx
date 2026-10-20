import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Profile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../../components/loading/PageLoader';
import { subscribeToPushNotifications } from '../../services/notifications';

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

      // Handle specific error codes returned by the service without throwing
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
        <div className="max-w-md neu-card rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-ink">Initialization Error</h2>
          <div role="alert" className="p-3 rounded-xl text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
            {initError}
          </div>
          <button
            type="button"
            onClick={fetchUserAndProfile}
            className="w-full py-2.5 px-4 text-accent rounded-full font-bold neu-raised neu-raised-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
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
        className="w-full h-2 bg-[var(--bg-raised)]"
      >
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md neu-card rounded-2xl overflow-hidden animate-fade-rise">
          <div className="px-5 py-3 flex justify-between items-center border-b border-[var(--bg-raised)]">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="w-11 h-11 neu-raised rounded-full neu-raised-hover flex items-center justify-center cursor-pointer text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 shrink-0"
                aria-label="Go Back"
                title="Go Back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
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
            <span className="text-sm font-medium text-gray-500">Step {step} of 6</span>
          </div>

          <div className="p-4 sm:p-6">
            {step === 1 && (
              <div className="text-center space-y-4 sm:space-y-6">
                <h1 className="text-2xl sm:text-3xl font-bold">Welcome to Horizon</h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Horizon will personalize your experience based on your choices.
                  Don't worry, you can always change this information later.
                </p>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-2.5 sm:py-3 px-4 text-accent rounded-full font-bold neu-raised neu-raised-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">Select your Class</h2>
                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {finishError}
                  </div>
                )}
                <div className="grid gap-2">
                  {['Class 12', 'Class 11', 'Class 10', 'Class 9', 'Class 8'].map((cls) => (
                    <button
                      type="button"
                      key={cls}
                      onClick={() => handleSelectClass(cls)}
                      disabled={saving}
                      aria-pressed={studentClass === cls}
                      className={`py-2 px-4 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 ${
                        studentClass === cls
                          ? 'neu-recessed text-accent font-bold'
                          : 'neu-raised neu-raised-hover'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">Study Medium</h2>
                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {finishError}
                  </div>
                )}
                <div className="grid gap-2">
                  {['English', 'Hindi'].map((medium) => (
                    <button
                      type="button"
                      key={medium}
                      onClick={() => handleSelectMedium(medium)}
                      disabled={saving}
                      aria-pressed={studyMedium === medium}
                      className={`py-2 px-4 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 ${
                        studyMedium === medium
                          ? 'neu-recessed text-accent font-bold'
                          : 'neu-raised neu-raised-hover'
                      }`}
                    >
                      {medium}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-1">Profile Photo</h2>
                <p className="text-center text-gray-500 text-sm mb-4">Optional - customize your profile</p>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {finishError}
                  </div>
                )}

                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-gray-100 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-md">
                        <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="w-full flex flex-col gap-2.5">
                    <label className="w-full py-2.5 sm:py-3 px-4 text-center rounded-full font-bold cursor-pointer neu-raised neu-raised-hover transition-colors focus-within:ring-2 focus-within:ring-[#E91E8C] focus-within:ring-offset-2">
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
                      className="w-full py-2.5 sm:py-3 px-4 text-ink rounded-full font-bold neu-raised neu-raised-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
                    >
                      {avatarUrl ? 'Continue' : 'Skip'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-1">Stay Updated</h2>
                <p className="text-center text-gray-500 text-sm mb-4">
                  Get instant browser alerts when new chapter notes, PYQ papers, or syllabus updates are published for your class.
                </p>

                {notifFeedback && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`p-3 rounded-xl text-sm text-center font-medium ${
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

                <div className="w-full flex flex-col gap-2.5">
                  {!notifFeedback || notifFeedback.type !== 'success' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        disabled={subscribing}
                        className="w-full py-2.5 sm:py-3 px-4 text-accent rounded-full font-bold neu-raised neu-raised-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
                      >
                        {subscribing ? 'Enabling Alerts...' : 'Enable Notifications'}
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={subscribing}
                        className="w-full py-2.5 sm:py-3 px-4 text-ink rounded-full font-bold neu-raised neu-raised-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
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
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">Review Profile</h2>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {finishError}
                  </div>
                )}

                <div className="bg-[var(--bg-raised)] p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-3 neu-recessed">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center shadow-sm">
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  <div className="w-full space-y-2 mt-2">
                    <div className="flex justify-between items-center py-1.5 border-b border-[var(--bg-base)] text-sm sm:text-base">
                      <span className="text-gray-500 font-medium">Class</span>
                      <span className="font-bold">{studentClass}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-[var(--bg-base)] text-sm sm:text-base">
                      <span className="text-gray-500 font-medium">Medium</span>
                      <span className="font-bold">{studyMedium}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="w-full mt-3 py-3 px-4 text-accent rounded-full font-bold text-base sm:text-lg neu-raised neu-raised-hover transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
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
