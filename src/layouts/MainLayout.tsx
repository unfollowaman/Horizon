import React, { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PageLoader from '../components/loading/PageLoader';
import ErrorBoundary from '../components/ErrorBoundary';
import RouteErrorFallback from '../components/RouteErrorFallback';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const [resetKey, setResetKey] = useState(0);

  const handleRetry = () => {
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)] font-body text-ink w-full max-w-full overflow-x-clip">
      <main className="flex-1 flex flex-col w-full max-w-full max-md:px-0 max-md:py-0 md:p-8 min-w-0">
        <ErrorBoundary
          key={`${location.pathname}-${resetKey}`}
          fallback={<RouteErrorFallback onRetry={handleRetry} />}
        >
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="p-3 sm:p-4 text-center text-muted-foreground neu-recessed mt-auto text-xs sm:text-sm overflow-hidden w-full max-w-full">
        <p className="m-0 break-words max-w-full">&copy; {new Date().getFullYear()} Horizon Educational Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
