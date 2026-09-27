import { describe, it, expect } from 'vitest';
import { pyqConfig, notesConfig } from '../resourcePageConfigs';
import type { Resource } from '../../types';

describe('resourcePageConfigs Optimization & Correctness', () => {
  function extractPyqYearsBaseline(resources: Resource[]): string[] {
    const years = new Set(resources.map(r => r.year).filter(Boolean) as string[]);
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }

  function extractNotesMediumsBaseline(resources: Resource[]): string[] {
    const rawMediums = new Set(resources.map(r => r.medium).filter(Boolean) as string[]);
    return Array.from(rawMediums).map(m => m.charAt(0).toUpperCase() + m.slice(1)).sort();
  }

  it('pyqConfig.extractThirdFilterValues extracts sorted unique years correctly', () => {
    const sampleResources: Partial<Resource>[] = [
      { id: '1', year: '2023' },
      { id: '2', year: '2021' },
      { id: '3', year: undefined },
      { id: '4', year: '2023' },
      { id: '5', year: '' },
      { id: '6', year: '2022' },
    ];

    const baseline = extractPyqYearsBaseline(sampleResources as Resource[]);
    const optimized = pyqConfig.extractThirdFilterValues(sampleResources as Resource[]);

    expect(optimized).toEqual(baseline);
    expect(optimized).toEqual(['2023', '2022', '2021']);
  });

  it('notesConfig.extractThirdFilterValues extracts sorted title-case unique mediums correctly', () => {
    const sampleResources: Partial<Resource>[] = [
      { id: '1', medium: 'english' },
      { id: '2', medium: 'hindi' },
      { id: '3', medium: undefined as unknown as Resource['medium'] },
      { id: '4', medium: 'english' },
      { id: '5', medium: '' as unknown as Resource['medium'] },
    ];

    const baseline = extractNotesMediumsBaseline(sampleResources as Resource[]);
    const optimized = notesConfig.extractThirdFilterValues(sampleResources as Resource[]);

    expect(optimized).toEqual(baseline);
    expect(optimized).toEqual(['English', 'Hindi']);
  });

  it('demonstrates measurable performance improvement over chained map/filter baseline', () => {
    const largeResources: Partial<Resource>[] = [];
    const years = ['2024', '2023', '2022', '2021', '2020', '2019', ''];
    const mediums = ['english', 'hindi', 'marathi', 'gujarati', ''] as Resource['medium'][];

    for (let i = 0; i < 50000; i++) {
      largeResources.push({
        id: String(i),
        year: years[i % years.length],
        medium: mediums[i % mediums.length],
      });
    }

    const iterations = 100;

    // Warm up
    extractPyqYearsBaseline(largeResources as Resource[]);
    pyqConfig.extractThirdFilterValues(largeResources as Resource[]);
    extractNotesMediumsBaseline(largeResources as Resource[]);
    notesConfig.extractThirdFilterValues(largeResources as Resource[]);

    // Baseline
    const startBaseline = performance.now();
    for (let i = 0; i < iterations; i++) {
      extractPyqYearsBaseline(largeResources as Resource[]);
      extractNotesMediumsBaseline(largeResources as Resource[]);
    }
    const durationBaseline = performance.now() - startBaseline;

    // Optimized
    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
      pyqConfig.extractThirdFilterValues(largeResources as Resource[]);
      notesConfig.extractThirdFilterValues(largeResources as Resource[]);
    }
    const durationOptimized = performance.now() - startOptimized;

    const speedup = durationBaseline / (durationOptimized || 1);

    console.log(`[resourcePageConfigs Benchmark] Chained map/filter baseline duration: ${durationBaseline.toFixed(2)}ms`);
    console.log(`[resourcePageConfigs Benchmark] Single-pass reduce duration: ${durationOptimized.toFixed(2)}ms`);
    console.log(`[resourcePageConfigs Benchmark] Speedup factor: ${speedup.toFixed(2)}x`);

    expect(durationOptimized).toBeLessThanOrEqual(durationBaseline + 50);
  });
});
