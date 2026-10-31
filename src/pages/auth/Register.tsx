import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../../services/auth';

interface RegisterProps {
  initialPhase?: 'entry' | 'form';
}

const Register: React.FC<RegisterProps> = ({ initialPhase = 'entry' }) => {
  const [phase, setPhase] = useState<'entry' | 'form'>(initialPhase);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Email format check
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setError('');
    setPhase('form');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setResendStatus('Verification link resent to your email.');
    setTimeout(() => setResendStatus(null), 4000);
  };

  if (isSuccess) {
    return (
      <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0 flex flex-col items-center justify-center min-h-[70vh] font-sans">
        <div className="neu-card rounded-2xl p-6 sm:p-8 w-full max-w-[440px] mx-auto min-w-0 text-center flex flex-col items-center bg-white border border-gray-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] animate-fade-rise">
          {/* Email Verification Icon Badge */}
          <div className="w-16 h-16 rounded-full bg-[#FDF2F8] border border-[#FCE7F3] flex items-center justify-center mb-4 text-[#E91E8C]">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Check your email
          </h1>

          <p className="text-gray-600 text-sm leading-relaxed mb-6 font-sans">
            {email
              ? `We sent a verification link to ${email}. Open your email and tap the verification link to activate your account.`
              : 'We sent you a verification link. Open your email and tap the verification link to activate your account.'}
          </p>

          {resendStatus && (
            <div
              role="status"
              className="w-full p-2.5 mb-4 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200 font-sans"
            >
              {resendStatus}
            </div>
          )}

          <div className="w-full flex flex-col gap-3 font-sans">
            <a
              href="mailto:"
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#E91E8C] hover:bg-[#D81B7D] text-white font-medium text-sm transition-colors text-center shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span>Open Email App</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>

            <button
              type="button"
              onClick={handleResend}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
            >
              Didn't receive the email? Resend
            </button>

            <Link
              to="/onboarding"
              className="text-xs text-gray-500 hover:text-gray-700 underline mt-1"
            >
              Proceed to Onboarding (Demo / Local)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="neu-card rounded-2xl p-6 sm:p-8 w-full max-w-[440px] mx-auto min-w-0 bg-white border border-gray-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] animate-fade-rise">
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <Link to="/" className="inline-block transition-transform hover:scale-105">
            <img
              src="/assets/favicon/logo.avif"
              alt="Horizon"
              width="36"
              height="36"
              className="w-9 h-9 object-contain"
            />
          </Link>
        </div>

        {/* Headings */}
        <div className="text-center mb-6">
          {phase === 'entry' ? (
            <>
              <h1 className="font-serif text-[28px] sm:text-[32px] font-bold text-gray-900 leading-tight mb-2">
                Your learning journey{' '}
                <span className="text-[#E91E8C] italic font-serif">starts</span>{' '}
                here.
              </h1>
              <p className="font-sans text-gray-500 text-xs sm:text-sm">
                Enter your email to get started with Horizon.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-[28px] sm:text-[32px] font-bold text-gray-900 leading-tight mb-2">
                Create your account
              </h1>
              <p className="font-sans text-gray-500 text-xs sm:text-sm">
                Create a new account to access resources.
              </p>
            </>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-200 flex items-start gap-2 font-sans"
          >
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form (always mounted so inputs and form submit are always accessible) */}
        <form onSubmit={handleRegister} className="space-y-4 font-sans">
          {/* Full Name */}
          <div className={phase === 'entry' ? 'hidden' : 'block'}>
            <label htmlFor="register-name" className="block text-xs font-medium text-gray-700 mb-1.5 font-sans">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 z-10">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="register-name"
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={phase === 'form'}
                className="w-full !pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 font-sans placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/20 focus:border-[#E91E8C]"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="register-email" className="block text-xs font-medium text-gray-700 mb-1.5 font-sans">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 z-10">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                id="register-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                required
                className={`w-full !pl-10 pr-4 py-2.5 rounded-xl border text-sm text-gray-900 font-sans placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/20 focus:border-[#E91E8C] ${
                  emailError ? 'border-red-400 bg-red-50/20' : 'border-gray-200 bg-white'
                }`}
              />
            </div>
            {emailError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium font-sans">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div className={phase === 'entry' ? 'hidden' : 'block'}>
            <label htmlFor="register-password" className="block text-xs font-medium text-gray-700 mb-1.5 font-sans">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 z-10">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={phase === 'form'}
                className="w-full !pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 font-sans placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/20 focus:border-[#E91E8C]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password Requirements Checklist */}
            {password && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-[11px] font-sans">
                <p className="font-semibold text-gray-700 text-xs mb-1">Password requirements:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-gray-400'}`}>
                    <svg className={`w-3.5 h-3.5 shrink-0 ${hasMinLength ? 'text-emerald-600' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                      {hasMinLength ? (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <circle cx="10" cy="10" r="4" />
                      )}
                    </svg>
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-700' : 'text-gray-400'}`}>
                    <svg className={`w-3.5 h-3.5 shrink-0 ${hasUppercase ? 'text-emerald-600' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                      {hasUppercase ? (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <circle cx="10" cy="10" r="4" />
                      )}
                    </svg>
                    <span>Uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700' : 'text-gray-400'}`}>
                    <svg className={`w-3.5 h-3.5 shrink-0 ${hasNumber ? 'text-emerald-600' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                      {hasNumber ? (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <circle cx="10" cy="10" r="4" />
                      )}
                    </svg>
                    <span>Number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasSpecialChar ? 'text-emerald-700' : 'text-gray-400'}`}>
                    <svg className={`w-3.5 h-3.5 shrink-0 ${hasSpecialChar ? 'text-emerald-600' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                      {hasSpecialChar ? (
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <circle cx="10" cy="10" r="4" />
                      )}
                    </svg>
                    <span>Special symbol</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Submit Action */}
          {phase === 'entry' ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleEntrySubmit}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#E91E8C] hover:bg-[#D81B7D] text-white font-medium text-sm transition-all shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2 group font-sans"
              >
                <span>Continue with Email</span>
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          ) : null}

          {/* Phase 2 Submit Button */}
          <div className={`pt-2 ${phase === 'entry' ? 'hidden' : 'block'}`}>
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#E91E8C] hover:bg-[#D81B7D] disabled:opacity-60 text-white font-medium text-sm transition-all shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2 font-sans"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Registering...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </div>

          {phase === 'form' && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100 font-sans">
              <button
                type="button"
                onClick={() => setPhase('entry')}
                className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <div>
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-[#E91E8C] font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
                >
                  Login here
                </Link>
              </div>
            </div>
          )}

          {phase === 'entry' && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-400">or</span>
                </div>
              </div>

              <div className="text-center text-xs text-gray-600 font-sans">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-[#E91E8C] font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
                >
                  Login here
                </Link>
              </div>

              <p className="text-[11px] text-gray-400 text-center leading-normal pt-2 font-sans">
                By continuing, you agree to Horizon's{' '}
                <Link to="/terms" className="underline hover:text-gray-600">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Register;
