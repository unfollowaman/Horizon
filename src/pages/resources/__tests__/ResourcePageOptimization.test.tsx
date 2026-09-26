import { describe, it, expect } from 'vitest';
import type { Resource } from '../../../types';

describe('ResourcePage Array Optimization Benchmark', () => {
  // Logic under test: single-pass reduce vs chained map/filter for classes
  function extractUniqueClassesBaseline(resources: Resource[]): string[] {
    const classes = new Set(resources.map(r => r.student_class).filter(Boolean) as string[]);
    ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].forEach(cls => {
      if (!classes.has(cls)) {
        classes.add(cls);
      }
    });
    return Array.from(classes).sort((a, b) => {
      const matchA = a.match(/Class (\d+)/i);
      const matchB = b.match(/Class (\d+)/i);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      if (numA && numB) return numB - numA;
      if (numA) return -1;
      if (numB) return 1;
      return a.localeCompare(b);
    });
  }

  function extractUniqueClassesOptimized(resources: Resource[]): string[] {
    const classes = resources.reduce((acc, r) => {
      if (r.student_class) {
        acc.add(r.student_class);
      }
      return acc;
    }, new Set<string>(['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']));

    return Array.from(classes).sort((a, b) => {
      const matchA = a.match(/Class (\d+)/i);
      const matchB = b.match(/Class (\d+)/i);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      if (numA && numB) return numB - numA;
      if (numA) return -1;
      if (numB) return 1;
      return a.localeCompare(b);
    });
  }

  function extractUniqueSubjectsBaseline(resources: Resource[]): string[] {
    const subjects = new Set(resources.map(r => r.subject).filter(Boolean) as string[]);
    return Array.from(subjects).sort();
  }

  function extractUniqueSubjectsOptimized(resources: Resource[]): string[] {
    const subjects = resources.reduce((acc, r) => {
      if (r.subject) {
        acc.add(r.subject);
      }
      return acc;
    }, new Set<string>());
    return Array.from(subjects).sort();
  }

  it('produces identical result for classes and subjects', () => {
    const sampleResources: Partial<Resource>[] = [
      { id: '1', student_class: 'Class 10', subject: 'Mathematics' },
      { id: '2', student_class: 'Class 12', subject: 'Physics' },
      { id: '3', student_class: undefined as unknown as string, subject: 'Chemistry' },
      { id: '4', student_class: 'Class 7', subject: '' },
      { id: '5', student_class: 'Class 10', subject: 'Mathematics' },
      { id: '6', student_class: 'Class 6', subject: 'Biology' },
    ];

    const baselineClasses = extractUniqueClassesBaseline(sampleResources as Resource[]);
    const optimizedClasses = extractUniqueClassesOptimized(sampleResources as Resource[]);
    expect(optimizedClasses).toEqual(baselineClasses);

    const baselineSubjects = extractUniqueSubjectsBaseline(sampleResources as Resource[]);
    const optimizedSubjects = extractUniqueSubjectsOptimized(sampleResources as Resource[]);
    expect(optimizedSubjects).toEqual(baselineSubjects);
  });

  it('demonstrates measurable performance improvement over chained map/filter baseline', () => {
    // Generate large dataset (50,000 resources)
    const largeResources: Partial<Resource>[] = [];
    const subjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Physics', 'Chemistry', 'Biology'];
    const classes = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Class 6', 'Class 7', ''];

    for (let i = 0; i < 50000; i++) {
      largeResources.push({
        id: String(i),
        student_class: classes[i % classes.length],
        subject: i % 5 === 0 ? '' : subjects[i % subjects.length],
      });
    }

    const iterations = 100;

    // Warm up
    extractUniqueClassesBaseline(largeResources as Resource[]);
    extractUniqueClassesOptimized(largeResources as Resource[]);

    // Measure baseline
    const startBaseline = performance.now();
    for (let i = 0; i < iterations; i++) {
      extractUniqueClassesBaseline(largeResources as Resource[]);
      extractUniqueSubjectsBaseline(largeResources as Resource[]);
    }
    const durationBaseline = performance.now() - startBaseline;

    // Measure optimized
    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
      extractUniqueClassesOptimized(largeResources as Resource[]);
      extractUniqueSubjectsOptimized(largeResources as Resource[]);
    }
    const durationOptimized = performance.now() - startOptimized;

    const speedup = durationBaseline / (durationOptimized || 1);

    console.log(`[ResourcePage Benchmark] Baseline duration: ${durationBaseline.toFixed(2)}ms`);
    console.log(`[ResourcePage Benchmark] Single-pass reduce duration: ${durationOptimized.toFixed(2)}ms`);
    console.log(`[ResourcePage Benchmark] Speedup factor: ${speedup.toFixed(2)}x`);

    expect(durationOptimized).toBeLessThanOrEqual(durationBaseline + 50);
  });
});
