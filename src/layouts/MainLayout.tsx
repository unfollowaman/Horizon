import React, { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PageLoader from '../components/loading/PageLoader';
import ErrorBoundary from '../components/ErrorBoundary';
import RouteErrorFallback from '../components/RouteErrorFallback';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
import { CHUNK_RELOAD_GUARD_KEY } from '../utils/lazyWithRetry';

const DelayedPageLoader: React.FC = () => {
  const showLoading = useDelayedLoading(true, 400);
  if (!showLoading) return null;
  return <PageLoader />;
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const [resetKey, setResetKey] = useState(0);

  // Clear reload guard whenever the route location changes successfully
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);
    }
  }, [location.pathname]);

  const handleRetry = () => {
    // If a lazy component enters a rejected state, incrementing resetKey alone cannot clear
    // React.lazy's internal cached rejection. Performing a page reload guarantees a fresh JS execution context.
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);
      try {
        window.location.reload();
        return;
      } catch {
        // Fallback for test environments where window.location.reload is unmocked
      }
    }
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)] font-body text-ink w-full max-w-full overflow-x-clip">
      <main className="flex-1 flex flex-col w-full max-w-full max-md:px-0 max-md:py-0 md:p-8 min-w-0">
        <ErrorBoundary
          key={`${location.pathname}-${resetKey}`}
          fallback={<RouteErrorFallback onRetry={handleRetry} />}
        >
          <Suspense fallback={<DelayedPageLoader />}>
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
