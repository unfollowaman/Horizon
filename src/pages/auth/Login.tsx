import type React from 'react';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ccc' }}>
      <h2>Login Placeholder</h2>
      <p>Authentication functionality will be implemented in the future.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <input type="email" placeholder="Email" disabled style={{ padding: '0.5rem' }} />
        <input type="password" placeholder="Password" disabled style={{ padding: '0.5rem' }} />
        <button disabled style={{ padding: '0.5rem', cursor: 'not-allowed' }}>Login</button>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Don't have an account? <Link to="/register">Register here</Link>.
      </p>
    </div>
  );
};

export default Login;
