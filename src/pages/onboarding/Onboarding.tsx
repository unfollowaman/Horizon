import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { Profile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import PageLoader from '../../components/loading/PageLoader';

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

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at')
        .eq('id', session.user.id)
        .single();

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
      setLoading(false);
    };

    fetchUserAndProfile();
  }, [navigate]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;
    setSaving(true);
    await supabase.from('profiles').update(updates).eq('id', userId);
    setSaving(false);
  };

  const handleNext = async () => {
    if (step === 2 && studentClass) {
      await updateProfile({ student_class: studentClass });
      setStep(3);
    } else if (step === 3 && studyMedium) {
      await updateProfile({ study_medium: studyMedium });
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    } else if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    if (!userId) return;
    setSaving(true);
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
    await refreshProfile();
    setSaving(false);
    navigate('/');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !userId) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    setUploading(true);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    setAvatarUrl(data.publicUrl);
    await updateProfile({ avatar_url: data.publicUrl });

    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <PageLoader />
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
        aria-valuemax={5}
        aria-valuetext={`Step ${step} of 5`}
        className="w-full h-2 bg-[var(--bg-raised)]"
      >
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md neu-card rounded-2xl overflow-hidden animate-fade-rise">
          <div className="px-5 py-3 flex justify-between items-center border-b border-[var(--bg-raised)]">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Go to previous step"
                className="text-sm font-medium hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 rounded-md"
              >
                &larr; Back
              </button>
            ) : (
              <div />
            )}
            <span className="text-sm font-medium text-gray-500">Step {step} of 5</span>
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
                <div className="grid gap-2">
                  {['Class 12', 'Class 11', 'Class 10', 'Class 9', 'Class 8'].map((cls) => (
                    <button
                      type="button"
                      key={cls}
                      onClick={() => setStudentClass(cls)}
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
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!studentClass || saving}
                  className="w-full mt-4 py-2.5 sm:py-3 px-4 text-ink rounded-full font-bold neu-raised neu-raised-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
                >
                  {saving ? 'Saving...' : 'Continue'}
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">Study Medium</h2>
                <div className="grid gap-2">
                  {['English', 'Hindi'].map((medium) => (
                    <button
                      type="button"
                      key={medium}
                      onClick={() => setStudyMedium(medium)}
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
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!studyMedium || saving}
                  className="w-full mt-4 py-2.5 sm:py-3 px-4 text-ink rounded-full font-bold neu-raised neu-raised-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
                >
                  {saving ? 'Saving...' : 'Continue'}
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-1">Profile Photo</h2>
                <p className="text-center text-gray-500 text-sm mb-4">Optional - customize your profile</p>

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
                <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">Review Profile</h2>

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
