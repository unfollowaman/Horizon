import type { FC } from 'react';

export const RootFallback: FC = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--background)] text-ink">
      <div className="flex flex-col items-center justify-center p-8 neu-card rounded-2xl w-full max-w-md text-center">
        <img
          src="/assets/favicon/logo.avif"
          alt="Horizon Logo"
          className="w-16 h-16 mb-4 object-contain"
        />
        <h1 className="text-h2 text-ink uppercase tracking-wider mb-3">
          Something went wrong
        </h1>
        <p className="text-body-base text-ink-light mb-6">
          An unexpected error occurred while loading the application.
        </p>
        <button
          type="button"
          onClick={handleReload}
          className="px-6 py-2.5 neu-raised-sm neu-raised-sm-hover rounded-xl text-body1 font-semibold text-ink transition-all"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
};

export default RootFallback;
