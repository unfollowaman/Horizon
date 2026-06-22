import type React from 'react';
import { Link } from 'react-router-dom';

const Register: React.FC = () => {
  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ccc' }}>
      <h2>Register Placeholder</h2>
      <p>User registration functionality will be implemented in the future.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <input type="text" placeholder="Full Name" disabled style={{ padding: '0.5rem' }} />
        <input type="email" placeholder="Email" disabled style={{ padding: '0.5rem' }} />
        <input type="password" placeholder="Password" disabled style={{ padding: '0.5rem' }} />
        <button disabled style={{ padding: '0.5rem', cursor: 'not-allowed' }}>Register</button>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        Already have an account? <Link to="/login">Login here</Link>.
      </p>
    </div>
  );
};

export default Register;
