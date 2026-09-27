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
      navigate('/dashboard'); // Or wherever you want to redirect after login
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="neu-card rounded-2xl p-8 max-w-[400px] mx-auto mt-8">
      <h1>Login</h1>
      <p>Enter your credentials to access your account.</p>

      {error && <div role="alert" style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <label htmlFor="login-email" className="sr-only">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="neu-recessed rounded-full p-3 px-5 text-ink outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]"
        />
        <label htmlFor="login-password" className="sr-only">Password</label>
        <input
          id="login-password"
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
              <span>Logging in...</span>
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Don't have an account? <Link to="/register" className="text-[#E91E8C] font-semibold hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]">Register here</Link>.
      </p>
    </div>
  );
};

export default Login;
