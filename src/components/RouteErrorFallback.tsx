import type { FC } from 'react';
import { Link } from 'react-router-dom';

export interface RouteErrorFallbackProps {
  onRetry?: () => void;
}

export const RouteErrorFallback: FC<RouteErrorFallbackProps> = ({ onRetry }) => {
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
            onClick={onRetry}
            className="px-5 py-2 neu-raised-sm neu-raised-sm-hover rounded-xl text-body1 font-semibold text-ink transition-all"
          >
            Try Again
          </button>
        )}
        <Link
          to="/"
          className="px-5 py-2 neu-raised-sm neu-raised-sm-hover rounded-xl text-body1 font-semibold text-ink no-underline transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default RouteErrorFallback;
