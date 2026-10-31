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
        <div className="neu-card rounded-2xl p-6 sm:p-8 w-full max-w-[400px] mx-auto min-w-0 text-center flex flex-col items-center font-sans shadow-soft border border-gray-200/60">
          <img
            src="/assets/SVG Illustrations/confirm-email.svg"
            alt=""
            width="140"
            height="140"
            loading="lazy"
            decoding="async"
            className="w-32 h-32 mb-4 object-contain"
          />
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight mb-2">Check your email</h1>
          <p className="text-gray-600 text-sm leading-relaxed mt-2 font-sans">
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
      <div className="neu-card rounded-2xl p-6 sm:p-8 w-full max-w-[400px] mx-auto min-w-0 font-sans shadow-soft border border-gray-200/60">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-2">Register</h1>
        <p className="text-gray-600 text-sm leading-relaxed mb-6 font-sans">
          Create a new account to access resources.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4 font-sans">
          <div>
            <label htmlFor="register-name" className="sr-only">Full Name</label>
            <input
              id="register-name"
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg px-3.5 py-2.5 text-ink bg-white/90 border border-gray-300 text-sm placeholder:text-gray-400 outline-none transition-colors focus-visible:border-[#E91E8C] focus-visible:ring-2 focus-visible:ring-[#E91E8C]/20"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="sr-only">Email</label>
            <input
              id="register-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-3.5 py-2.5 text-ink bg-white/90 border border-gray-300 text-sm placeholder:text-gray-400 outline-none transition-colors focus-visible:border-[#E91E8C] focus-visible:ring-2 focus-visible:ring-[#E91E8C]/20"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="sr-only">Password</label>
            <input
              id="register-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-3.5 py-2.5 text-ink bg-white/90 border border-gray-300 text-sm placeholder:text-gray-400 outline-none transition-colors focus-visible:border-[#E91E8C] focus-visible:ring-2 focus-visible:ring-[#E91E8C]/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full mt-1 py-2.5 px-4 rounded-lg bg-[#E91E8C] hover:bg-[#D81B60] text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer"
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
              'Register'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 font-sans">
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
