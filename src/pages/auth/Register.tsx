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
        <div className="neu-card rounded-2xl p-6 sm:p-8 w-full max-w-[400px] mx-auto min-w-0 text-center flex flex-col items-center">
          <img
            src="/assets/SVG Illustrations/confirm-email.svg"
            alt=""
            width="160"
            height="160"
            loading="lazy"
            decoding="async"
            className="w-40 h-40 mb-4 object-contain"
          />
          <h1 className="text-h2">Check your email</h1>
          <p style={{ marginTop: '1rem' }}>
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
      <div className="neu-card rounded-2xl p-6 sm:p-8 w-full max-w-[400px] mx-auto min-w-0">
        <h1>Register</h1>
      <p>Create a new account to access resources.</p>

      {error && <div role="alert" style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <label htmlFor="register-name" className="sr-only">Full Name</label>
        <input
          id="register-name"
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="neu-recessed rounded-full p-3 px-5 text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
        />
        <label htmlFor="register-email" className="sr-only">Email</label>
        <input
          id="register-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="neu-recessed rounded-full p-3 px-5 text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
        />
        <label htmlFor="register-password" className="sr-only">Password</label>
        <input
          id="register-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="neu-recessed rounded-full p-3 px-5 text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
        />
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="neu-raised p-3 rounded-full text-ink font-bold hover:neu-raised-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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

      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Already have an account? <Link to="/login" className="text-[#E91E8C] font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]">Login here</Link>.
      </p>
    </div>
  </div>
  );
};

export default Register;
