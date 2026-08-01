import type React from 'react';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)] font-body text-ink">
      <main className="flex-1 max-md:px-0 max-md:py-[0px] md:p-8">
        <Outlet />
      </main>

      <footer className="p-[12px] text-center text-muted-foreground neu-recessed mt-auto text-sm">
        <p className="m-0">&copy; {new Date().getFullYear()} Horizon Educational Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
