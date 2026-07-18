import type React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)] font-body text-ink">
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
