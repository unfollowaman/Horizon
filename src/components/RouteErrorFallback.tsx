import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';

export interface RouteErrorFallbackProps {
  onRetry?: () => void;
}

export const RouteErrorFallback: FC<RouteErrorFallbackProps> = ({ onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryClick = () => {
    if (isRetrying) return;
    setIsRetrying(true);
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 my-8 neu-card rounded-2xl w-[calc(100%-2rem)] max-w-md mx-auto text-center">
      <h2 className="text-h2 text-ink uppercase tracking-wider mb-2">
        Unable to load page
      </h2>
      <p className="text-body text-ink-light mb-6">
        An unexpected error occurred while loading this page content.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {onRetry && (
          <button
            type="button"
            onClick={handleRetryClick}
            disabled={isRetrying}
            aria-busy={isRetrying}
            className="px-5 py-2 neu-raised-sm neu-raised-sm-hover rounded-xl text-body1 font-semibold text-ink transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <>
                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Retrying...</span>
              </>
            ) : (
              'Try Again'
            )}
          </button>
        )}
        <Link
          to="/"
          className="px-5 py-2 neu-raised-sm neu-raised-sm-hover rounded-xl text-body1 font-semibold text-ink no-underline transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default RouteErrorFallback;
