import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const MainLayout: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h1 style={{ margin: 0, marginRight: 'auto' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>Horizon</Link>
          </h1>
          <Link to="/">Home</Link>
          <Link to="/library">Library</Link>
          {/* Placeholders for future auth features */}
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/settings/notifications">Settings</Link>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>

      <footer style={{ padding: '1rem', borderTop: '1px solid #ccc', textAlign: 'center' }}>
        <p>&copy; {new Date().getFullYear()} Horizon Educational Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
