import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

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
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-ink tracking-tight">Login</h1>
          <p className="text-sm text-gray-500 text-center mt-1">Enter your credentials to access your account.</p>
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

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="sr-only">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full neu-recessed rounded-full p-3 px-5 text-ink text-sm sm:text-base outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] transition-all placeholder:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="sr-only">
              Password
            </label>
            <input
              id="login-password"
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
                <span>Logging in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs sm:text-sm text-gray-500">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-[#E91E8C] font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
          >
            Register here
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Login;
