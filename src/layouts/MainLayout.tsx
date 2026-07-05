import type React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { navLinks } from '../data/navigation';

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)] font-body text-ink">
      <header className="p-4 bg-[var(--bg-raised)] shadow-[8px_10px_20px_rgba(0,0,0,0.05),_2px_3px_6px_rgba(0,0,0,0.03)] z-10 relative border-b border-[var(--border-subtle)]">
        <nav className="flex gap-4 items-center flex-wrap">
          <h1 className="m-0 mr-auto text-h2 font-display uppercase">
            <Link to="/" className="inline-block p-2 no-underline text-ink focus-visible:outline-accent-yellow">Horizon</Link>
          </h1>
          <Link to="/" className="inline-block min-h-[44px] flex items-center px-4 py-2 font-bold neu-raised hover:neu-raised-hover rounded-full no-underline text-ink">Home</Link>
          {navLinks.filter(link => link.showOnDesktop).map((link, index) => (
            <Link key={index} to={link.path} className="inline-block min-h-[44px] flex items-center px-4 py-2 font-bold neu-raised hover:neu-raised-hover rounded-full no-underline text-ink">{link.label}</Link>
          ))}
          {/* Placeholders for future auth features */}
          <Link to="/login" className="inline-block min-h-[44px] flex items-center px-4 py-2 font-bold neu-raised hover:neu-raised-hover rounded-full no-underline text-ink">Login</Link>
          <Link to="/register" className="inline-block min-h-[44px] flex items-center px-4 py-2 font-bold neu-raised hover:neu-raised-hover rounded-full no-underline text-ink">Register</Link>
          <Link to="/dashboard" className="inline-block min-h-[44px] flex items-center px-4 py-2 font-bold neu-raised hover:neu-raised-hover rounded-full no-underline text-ink">Dashboard</Link>
          <Link to="/settings/notifications" className="inline-block min-h-[44px] flex items-center px-4 py-2 font-bold neu-raised hover:neu-raised-hover rounded-full no-underline text-ink">Settings</Link>
        </nav>
      </header>

      <main className="flex-1 p-8">
        <Outlet />
      </main>

      <footer className="p-6 text-center text-muted-foreground neu-recessed mt-auto">
        <p>&copy; {new Date().getFullYear()} Horizon Educational Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
