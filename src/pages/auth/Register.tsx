import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../../services/auth';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

  if (isSuccess) {
    return (
      <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="neu-card rounded-2xl p-6 sm:p-8 w-full max-w-[400px] mx-auto min-w-0 text-center flex flex-col items-center animate-fade-rise">
          <div className="neu-recessed p-3 rounded-2xl mb-4 bg-white/40">
            <img
              src="/assets/SVG Illustrations/confirm-email.svg"
              alt=""
              width="160"
              height="160"
              loading="lazy"
              decoding="async"
              className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">Check your email</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-3 leading-relaxed">
            {email
              ? `We sent a verification link to ${email}. Open your email and tap the verification link to activate your account.`
              : 'We sent you a verification link. Open your email and tap the verification link to activate your account.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[min(96vw,1600px)] mx-auto px-[clamp(16px,2vw,32px)] max-md:pt-[10px] md:-mt-[20px] pb-[clamp(24px,3vw,48px)] min-w-0 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="neu-card rounded-2xl p-6 sm:p-8 w-full max-w-[400px] mx-auto min-w-0 animate-fade-rise">
        <div className="flex flex-col items-center mb-6">
          <div className="neu-raised rounded-full w-12 h-12 flex items-center justify-center text-[#E91E8C] mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-ink tracking-tight">Register</h1>
          <p className="text-sm text-gray-500 text-center mt-1">Create a new account to access resources.</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl text-sm font-medium bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4 shrink-0 text-rose-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label htmlFor="register-name" className="sr-only">
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full neu-recessed rounded-full p-3 px-5 text-ink text-sm sm:text-base outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] transition-all placeholder:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="sr-only">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full neu-recessed rounded-full p-3 px-5 text-ink text-sm sm:text-base outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] transition-all placeholder:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="sr-only">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full neu-recessed rounded-full p-3 px-5 text-ink text-sm sm:text-base outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] transition-all placeholder:text-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full neu-raised py-3 px-5 rounded-full text-accent font-bold hover:neu-raised-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2 transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Registering...</span>
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs sm:text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[#E91E8C] font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
          >
            Login here
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Register;
