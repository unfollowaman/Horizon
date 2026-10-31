import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Profile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../../components/loading/PageLoader';
import { subscribeToPushNotifications } from '../../services/notifications';
import { getDefaultAvatar } from '../../utils/avatar';

const AVATAR_OPTIONS = [
  '/assets/Avatars/avatar-1.svg',
  '/assets/Avatars/avatar-2.svg',
  '/assets/Avatars/avatar-3.svg',
  '/assets/Avatars/avatar-4.svg',
  '/assets/Avatars/avatar-5.svg',
  '/assets/Avatars/avatar-6.svg',
];

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

  const handleSelectAvatar = async (url: string) => {
    if (saving) return;
    const res = await updateProfile({ avatar_url: url });
    if (res.success) {
      if (isMountedRef.current) {
        setAvatarUrl(url);
      }
    } else if (isMountedRef.current) {
      setFinishError('Failed to select avatar. Please try again.');
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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <PageLoader />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4 text-center">
        <div className="max-w-md bg-white border border-gray-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 font-serif">Initialization Error</h2>
          <div role="alert" className="p-3 rounded-xl text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
            {initError}
          </div>
          <button
            type="button"
            onClick={fetchUserAndProfile}
            className="w-full py-2.5 px-4 text-white bg-[#E91E8C] hover:bg-[#D81B7D] rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
          >
            Retry Loading Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#111111]">
      {/* Top thin progress bar */}
      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={6}
        aria-valuetext={`Step ${step} of 6`}
        className="w-full h-1.5 bg-gray-200"
      >
        <div
          className="h-full bg-[#E91E8C] transition-all duration-300 ease-out"
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[440px] bg-white border border-gray-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl overflow-hidden animate-fade-rise">
          {/* Card Header with Back Button and Step Counter */}
          <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="w-11 h-11 border border-gray-200 rounded-full hover:bg-gray-50 flex items-center justify-center cursor-pointer text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 shrink-0"
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
              <div className="w-11 h-11" />
            )}

            {/* Logo in header */}
            <img
              src="/assets/favicon/logo.avif"
              alt="Horizon"
              width="28"
              height="28"
              className="w-7 h-7 object-contain opacity-80"
            />

            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Step {step} of 6
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-[#FDF2F8] border border-[#FCE7F3] flex items-center justify-center mx-auto text-[#E91E8C]">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Welcome to Horizon
                  </h1>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
                    Horizon will personalize your study notes, PYQ papers, and syllabus based on your choices. You can adjust this anytime in Settings.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-3 px-4 text-white bg-[#E91E8C] hover:bg-[#D81B7D] rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2 group"
                  >
                    <span>Continue</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Class Selection */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center mb-4">
                  <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">Select your Class</h2>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Choose your current academic grade to tailor your study materials.
                  </p>
                </div>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl text-xs sm:text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {finishError}
                  </div>
                )}

                {/* Horizontal multi-column grid of compact rectangular buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['Class 12', 'Class 11', 'Class 10', 'Class 9', 'Class 8'].map((cls) => {
                    const isSelected = studentClass === cls;
                    return (
                      <button
                        type="button"
                        key={cls}
                        onClick={() => handleSelectClass(cls)}
                        disabled={saving}
                        aria-pressed={isSelected}
                        className={`py-3.5 px-4 rounded-xl border font-medium text-sm transition-all flex items-center justify-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 ${
                          isSelected
                            ? 'border-[#E91E8C] bg-[#FDF2F8] text-[#E91E8C] font-semibold shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-800 hover:bg-gray-50/60'
                        }`}
                      >
                        <span>{cls}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Study Medium */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center mb-4">
                  <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">Study Medium</h2>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Select your preferred language for textbook notes and question papers.
                  </p>
                </div>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl text-xs sm:text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {finishError}
                  </div>
                )}

                {/* Horizontal single row of compact rectangular buttons on desktop */}
                <div className="grid grid-cols-2 gap-3.5">
                  {['English', 'Hindi'].map((medium) => {
                    const isSelected = studyMedium === medium;
                    return (
                      <button
                        type="button"
                        key={medium}
                        onClick={() => handleSelectMedium(medium)}
                        disabled={saving}
                        aria-pressed={isSelected}
                        className={`py-3.5 px-4 rounded-xl border font-medium text-sm transition-all flex items-center justify-center text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 ${
                          isSelected
                            ? 'border-[#E91E8C] bg-[#FDF2F8] text-[#E91E8C] font-semibold shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-800 hover:bg-gray-50/60'
                        }`}
                      >
                        <span>{medium}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Profile Photo */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">Profile Photo</h2>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Select an avatar or upload your own photo (optional).
                  </p>
                </div>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl text-xs sm:text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {finishError}
                  </div>
                )}

                {/* Current Active Preview */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <img
                      src={avatarUrl || getDefaultAvatar(userId)}
                      alt="Profile"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                    />
                  </div>
                  <span className="text-xs text-gray-500">Selected Avatar</span>
                </div>

                {/* Avatar Collection Grid */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Choose an Avatar</p>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_OPTIONS.map((optUrl, idx) => {
                      const isCurrent = avatarUrl === optUrl || (!avatarUrl && getDefaultAvatar(userId) === optUrl);
                      return (
                        <button
                          key={optUrl}
                          type="button"
                          onClick={() => handleSelectAvatar(optUrl)}
                          className={`p-1 rounded-xl border transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] ${
                            isCurrent
                              ? 'border-[#E91E8C] bg-[#FDF2F8] shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          title={`Avatar ${idx + 1}`}
                        >
                          <img
                            src={optUrl}
                            alt={`Avatar ${idx + 1}`}
                            className="w-full h-auto aspect-square rounded-lg object-contain"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Upload Custom Photo & Continue Controls */}
                <div className="pt-2 flex flex-col gap-2.5">
                  <label className="w-full py-2.5 px-4 text-center rounded-xl border border-gray-200 hover:bg-gray-50 font-medium text-xs sm:text-sm text-gray-700 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#E91E8C]">
                    {uploading ? 'Uploading Photo...' : 'Upload Custom Photo'}
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
                    className="w-full py-3 px-4 text-white bg-[#E91E8C] hover:bg-[#D81B7D] rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
                  >
                    <span>{avatarUrl ? 'Continue' : 'Skip'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Enable Notifications */}
            {step === 5 && (
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-[#FDF2F8] border border-[#FCE7F3] flex items-center justify-center mx-auto text-[#E91E8C]">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>

                <div>
                  <h2 className="font-serif text-2xl font-bold text-gray-900 mb-2">Stay Updated</h2>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
                    Get instant browser alerts when new chapter notes, PYQ papers, or syllabus updates are published for your class.
                  </p>
                </div>

                {notifFeedback && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`p-3 rounded-xl text-xs sm:text-sm text-center font-medium ${
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

                <div className="pt-2 flex flex-col gap-2.5">
                  {!notifFeedback || notifFeedback.type !== 'success' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleEnableNotifications}
                        disabled={subscribing}
                        className="w-full py-3 px-4 text-white bg-[#E91E8C] hover:bg-[#D81B7D] rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
                      >
                        {subscribing ? 'Enabling Alerts...' : 'Enable Notifications'}
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={subscribing}
                        className="w-full py-2.5 px-4 text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl font-medium text-xs sm:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
                      >
                        {notifFeedback ? 'Continue to Review' : 'Skip for Now'}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Step 6: Review Selections */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">Review Profile</h2>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Everything looks good! Confirm your setup to enter your dashboard.
                  </p>
                </div>

                {finishError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl text-xs sm:text-sm text-center font-medium bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {finishError}
                  </div>
                )}

                {/* Summary Card */}
                <div className="bg-gray-50 border border-gray-200/80 p-5 rounded-xl flex flex-col items-center gap-4">
                  <img
                    src={avatarUrl || getDefaultAvatar(userId)}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm"
                  />

                  <div className="w-full divide-y divide-gray-200/80 text-sm">
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Class</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{studentClass || 'Not Selected'}</span>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-[#E91E8C] text-xs hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Medium</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{studyMedium || 'Not Selected'}</span>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="text-[#E91E8C] text-xs hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Photo</span>
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="text-[#E91E8C] text-xs hover:underline"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={saving}
                    className="w-full py-3.5 px-4 text-white bg-[#E91E8C] hover:bg-[#D81B7D] rounded-xl font-medium text-sm sm:text-base transition-all shadow-sm hover:shadow disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Finishing...</span>
                      </>
                    ) : (
                      <>
                        <span>Finish Setup</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
