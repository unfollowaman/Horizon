import type React from 'react';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  return (
    <div className="neu-card rounded-2xl p-8 max-w-[400px] mx-auto mt-8">
      <h2>Login Placeholder</h2>
      <p>Authentication functionality will be implemented in the future.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <input type="email" placeholder="Email" disabled className="neu-recessed rounded-full p-3 px-5 text-ink outline-none" />
        <input type="password" placeholder="Password" disabled className="neu-recessed rounded-full p-3 px-5 text-ink outline-none" />
        <button disabled className="neu-raised p-3 rounded-full text-ink font-bold opacity-50 cursor-not-allowed">Login</button>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Don't have an account? <Link to="/register">Register here</Link>.
      </p>
    </div>
  );
};

export default Login;
