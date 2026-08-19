import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ErrorBoundary } from '../../../../../components/ErrorBoundary';
import { PdfRenderErrorFallback } from '../PdfRenderErrorFallback';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FaultyPdfDocumentRenderer: React.FC<{ shouldCrash?: boolean }> = ({ shouldCrash }) => {
  if (shouldCrash) {
    throw new Error('Simulated react-pdf document render failure');
  }
  return <div data-testid="pdf-renderer">Pdf Document Canvas Content</div>;
};

const TestPdfViewerShell: React.FC<{ initialCrash?: boolean }> = ({ initialCrash = true }) => {
  const [resetKey, setResetKey] = useState(0);
  const [shouldCrash, setShouldCrash] = useState(initialCrash);
  const [wentBack, setWentBack] = useState(false);

  return (
    <div>
      <header data-testid="pdf-top-controls">
        <button type="button" data-testid="back-button" onClick={() => setWentBack(true)}>
          Back
        </button>
        <h1>Resource Title</h1>
      </header>
      {wentBack && <div data-testid="navigated-back">Went back successfully</div>}
      <ErrorBoundary
        key={resetKey}
        fallback={
          <PdfRenderErrorFallback
            onRetry={() => {
              setShouldCrash(false);
              setResetKey((prev) => prev + 1);
            }}
            onGoBack={() => setWentBack(true)}
          />
        }
      >
        <FaultyPdfDocumentRenderer shouldCrash={shouldCrash} />
      </ErrorBoundary>
    </div>
  );
};

describe('PdfDocumentRenderer ErrorBoundary Integration', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('renders PDF renderer normally when no error occurs', () => {
    act(() => {
      root?.render(<TestPdfViewerShell initialCrash={false} />);
    });

    expect(container?.querySelector('[data-testid="pdf-renderer"]')).not.toBeNull();
    expect(container?.textContent).toContain('Pdf Document Canvas Content');
  });

  it('catches renderer crash, displays PdfRenderErrorFallback, and keeps top controls functional', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root?.render(<TestPdfViewerShell initialCrash={true} />);
    });

    expect(container?.textContent).toContain('Unable to display document');
    expect(container?.textContent).toContain('An unexpected error occurred while rendering the PDF document.');

    // Verify top controls remain usable
    expect(container?.querySelector('[data-testid="pdf-top-controls"]')).not.toBeNull();
    expect(container?.textContent).toContain('Resource Title');

    const backButton = container?.querySelector('[data-testid="back-button"]') as HTMLButtonElement;
    expect(backButton).not.toBeNull();

    act(() => {
      backButton.click();
    });

    expect(container?.querySelector('[data-testid="navigated-back"]')).not.toBeNull();

    consoleSpy.mockRestore();
  });

  it('re-mounts PDF renderer when Try Again is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      root?.render(<TestPdfViewerShell initialCrash={true} />);
    });

    expect(container?.textContent).toContain('Unable to display document');

    const tryAgainButton = Array.from(container?.querySelectorAll('button') || []).find(
      (btn) => btn.textContent === 'Try Again'
    );
    expect(tryAgainButton).toBeDefined();

    act(() => {
      tryAgainButton?.click();
    });

    expect(container?.textContent).not.toContain('Unable to display document');
    expect(container?.textContent).toContain('Pdf Document Canvas Content');

    consoleSpy.mockRestore();
  });
});
