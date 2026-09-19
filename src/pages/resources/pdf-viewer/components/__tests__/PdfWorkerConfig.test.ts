// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';

describe('PdfDocumentRenderer Worker Configuration', () => {
  it('configures PDF.js workerSrc to static /pdf.worker.min.mjs', async () => {
    if (typeof globalThis.DOMMatrix === 'undefined') {
      globalThis.DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      } as unknown as typeof DOMMatrix;
    }

    const PdfDocumentRendererModule = await import('../PdfDocumentRenderer');
    expect(PdfDocumentRendererModule).toBeDefined();

    const { pdfjs } = await import('react-pdf');
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe('/pdf.worker.min.mjs');
  });
});
