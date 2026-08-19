import type { FC } from 'react';

export interface PdfRenderErrorFallbackProps {
  onRetry?: () => void;
  onGoBack?: () => void;
}

export const PdfRenderErrorFallback: FC<PdfRenderErrorFallbackProps> = ({ onRetry, onGoBack }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 my-auto neu-card rounded-2xl w-[calc(100%-2rem)] max-w-lg mx-auto text-center z-10">
      <h2 className="text-h2 text-ink uppercase tracking-wider mb-2">
        Unable to display document
      </h2>
      <p className="text-body text-ink-light mb-6">
        An unexpected error occurred while rendering the PDF document.
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
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="px-5 py-2 neu-raised-sm neu-raised-sm-hover rounded-xl text-body1 font-semibold text-ink transition-all"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};

export default PdfRenderErrorFallback;
