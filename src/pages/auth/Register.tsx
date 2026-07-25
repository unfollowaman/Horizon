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
      <div className="neu-card rounded-2xl p-8 max-w-[400px] mx-auto mt-8 text-center">
        <h2>Check your email</h2>
        <p style={{ marginTop: '1rem' }}>
          Your account has been created successfully. Please check your email to verify your account before signing in.
        </p>
      </div>
    );
  }

  return (
    <div className="neu-card rounded-2xl p-8 max-w-[400px] mx-auto mt-8">
      <h2>Register</h2>
      <p>Create a new account to access resources.</p>

      {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="neu-recessed rounded-full p-3 px-5 text-ink outline-none"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="neu-recessed rounded-full p-3 px-5 text-ink outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="neu-recessed rounded-full p-3 px-5 text-ink outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="neu-raised p-3 rounded-full text-ink font-bold hover:neu-raised-hover"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Already have an account? <Link to="/login">Login here</Link>.
      </p>
    </div>
  );
};

export default Register;
