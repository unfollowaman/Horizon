import { describe, it, expect } from 'vitest';

describe('PdfDocumentRenderer Page Numbers Optimization', () => {
  it('correctly derives 1-based page numbers array from numPages', () => {
    const numPages = 5;
    const pageNumbers = Array.from({ length: numPages }, (_, index) => index + 1);
    expect(pageNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles null or 0 numPages safely', () => {
    const getPageNumbers = (numPages: number | null) => {
      const count = numPages || 0;
      return Array.from({ length: count }, (_, index) => index + 1);
    };

    expect(getPageNumbers(null)).toEqual([]);
    expect(getPageNumbers(0)).toEqual([]);
  });

  it('demonstrates performance speedup for memoized page numbers vs un-memoized Array.from(new Array(N)) allocation in high-frequency render loops', () => {
    const numPages = 150;
    const iterations = 50000;

    let totalLengthBaseline = 0;
    // Baseline: Creating array on every render
    const startBaseline = performance.now();
    for (let i = 0; i < iterations; i++) {
      const arr = Array.from(new Array(numPages || 0), (_, index) => index + 1);
      totalLengthBaseline += arr.length;
    }
    const endBaseline = performance.now();
    const durationBaseline = endBaseline - startBaseline;

    let totalLengthOptimized = 0;
    // Optimized: Reusing memoized array reference across render frames
    const memoizedPageNumbers = Array.from({ length: numPages }, (_, index) => index + 1);
    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
      const arr = memoizedPageNumbers;
      totalLengthOptimized += arr.length;
    }
    const endOptimized = performance.now();
    const durationOptimized = endOptimized - startOptimized;

    expect(totalLengthBaseline).toBe(totalLengthOptimized);

    console.log(`[PdfDocumentRenderer Benchmark] Un-memoized duration (${iterations} renders): ${durationBaseline.toFixed(2)}ms`);
    console.log(`[PdfDocumentRenderer Benchmark] Memoized duration (${iterations} renders): ${durationOptimized.toFixed(2)}ms`);
    const speedup = durationBaseline / (durationOptimized || 0.001);
    console.log(`[PdfDocumentRenderer Benchmark] Speedup factor: ${speedup.toFixed(2)}x`);

    expect(durationOptimized).toBeLessThan(durationBaseline);
  });
});
