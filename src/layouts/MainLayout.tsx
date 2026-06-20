import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface font-body text-ink">
      <header className="p-4 border-b-2 border-ink bg-paper">
        <nav className="flex gap-4 items-center">
          <h1 className="m-0 mr-auto text-h2 font-display uppercase">
            <Link to="/" className="inline-block p-2 no-underline text-ink focus-visible:outline-accent-yellow">Horizon</Link>
          </h1>
          <Link to="/" className="inline-block min-h-[44px] flex items-center p-3 font-bold hover:bg-surface focus-visible:outline-accent-yellow">Home</Link>
          <Link to="/library" className="inline-block min-h-[44px] flex items-center p-3 font-bold hover:bg-surface focus-visible:outline-accent-yellow">Library</Link>
          {/* Placeholders for future auth features */}
          <Link to="/login" className="inline-block min-h-[44px] flex items-center p-3 font-bold hover:bg-surface focus-visible:outline-accent-yellow">Login</Link>
          <Link to="/register" className="inline-block min-h-[44px] flex items-center p-3 font-bold hover:bg-surface focus-visible:outline-accent-yellow">Register</Link>
          <Link to="/dashboard" className="inline-block min-h-[44px] flex items-center p-3 font-bold hover:bg-surface focus-visible:outline-accent-yellow">Dashboard</Link>
          <Link to="/settings/notifications" className="inline-block min-h-[44px] flex items-center p-3 font-bold hover:bg-surface focus-visible:outline-accent-yellow">Settings</Link>
        </nav>
      </header>

      <main className="flex-1 p-8">
        <Outlet />
      </main>

      <footer className="p-4 border-t-2 border-ink text-center bg-paper font-bold">
        <p>&copy; {new Date().getFullYear()} Horizon Educational Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
