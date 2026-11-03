import SlimRouteLoader from '../components/loading/SlimRouteLoader';
import React, { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import RouteErrorFallback from '../components/RouteErrorFallback';
import CopyrightFooter from '../components/common/CopyrightFooter';
import { CHUNK_RELOAD_GUARD_KEY } from '../utils/lazyWithRetry';

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
          <Suspense fallback={<SlimRouteLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <CopyrightFooter />
    </div>
  );
};

export default MainLayout;
