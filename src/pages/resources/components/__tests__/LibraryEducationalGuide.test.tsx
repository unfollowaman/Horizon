import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LibraryEducationalGuide } from '../LibraryEducationalGuide';
import type { Resource } from '../../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockPyqResources: Resource[] = [
  {
    id: '1',
    title: 'Class 10 Science PYQ 2023',
    description: '',
    pdfUrl: '',
    thumbnailUrl: '',
    uploadDate: '2023-01-01',
    student_class: 'Class 10',
    subject: 'Science',
    resource_type: 'pyq',
    year: '2023',
    file_path: 'pyqs/sci-10-2023.pdf',
    medium: 'english',
    allow_download: true,
    storage_bucket: 'learning_resources'
  },
  {
    id: '2',
    title: 'Class 9 Math PYQ 2021',
    description: '',
    pdfUrl: '',
    thumbnailUrl: '',
    uploadDate: '2021-01-01',
    student_class: 'Class 9',
    subject: 'Mathematics',
    resource_type: 'pyq',
    year: '2021',
    file_path: 'pyqs/math-9-2021.pdf',
    medium: 'english',
    allow_download: true,
    storage_bucket: 'learning_resources'
  }
];

describe('LibraryEducationalGuide', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
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

  it('extracts unique sorted classes, subjects, and year range', async () => {
    await act(async () => {
      root?.render(<LibraryEducationalGuide allResources={mockPyqResources} />);
    });

    const section = container?.querySelector('section[aria-label="Library Overview and Exam Preparation Guide"]');
    expect(section).not.toBeNull();

    const text = section?.textContent || '';
    expect(text).toContain('Classes Covered: Class 9, Class 10');
    expect(text).toContain('Subjects Available: Mathematics, Science');
    expect(text).toContain('Examination Years: 2021–2023 past exam papers');
  });

  it('renders filter summary when contextual filters are provided', async () => {
    await act(async () => {
      root?.render(
        <LibraryEducationalGuide
          allResources={mockPyqResources}
          selectedClass="Class 10"
          selectedSubject="Science"
          selectedYear="2023"
        />
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Currently displaying previous year question papers filtered for Class 10 • Science • Year 2023.');
  });

  it('handles empty resource list gracefully', async () => {
    await act(async () => {
      root?.render(<LibraryEducationalGuide allResources={[]} />);
    });

    const text = container?.textContent || '';
    expect(text).toContain('Secondary & Higher Secondary grades');
    expect(text).toContain('Mathematics, Science, Social Sciences');
  });

  it('demonstrates measurable performance improvement over multi-pass baseline', () => {
    const largeDataset: Resource[] = Array.from({ length: 10000 }, (_, i) => ({
      id: `pyq-${i}`,
      title: `PYQ ${i}`,
      description: '',
      pdfUrl: '',
      thumbnailUrl: '',
      uploadDate: '2023-01-01',
      student_class: `Class ${(i % 12) + 1}`,
      subject: `Subject ${i % 10}`,
      resource_type: 'pyq',
      year: `${2015 + (i % 10)}`,
      file_path: `pyqs/file-${i}.pdf`,
      medium: 'english',
      allow_download: true,
      storage_bucket: 'learning_resources'
    }));

    const multiPassExtraction = (resources: Resource[]) => {
      const availableClasses = Array.from(
        new Set(resources.map(r => r.student_class).filter(Boolean) as string[])
      ).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });

      const availableSubjects = Array.from(
        new Set(resources.map(r => r.subject).filter(Boolean) as string[])
      ).sort();

      const years = resources
        .map(r => (r.year ? parseInt(r.year, 10) : NaN))
        .filter(y => !isNaN(y));
      let yearRange: string | null = null;
      if (years.length > 0) {
        const min = Math.min(...years);
        const max = Math.max(...years);
        yearRange = min === max ? `${min}` : `${min}–${max}`;
      }

      return { availableClasses, availableSubjects, yearRange };
    };

    const singlePassExtraction = (resources: Resource[]) => {
      const classSet = new Set<string>();
      const subjectSet = new Set<string>();
      let minYear = Infinity;
      let maxYear = -Infinity;
      let hasValidYear = false;

      for (let i = 0; i < resources.length; i++) {
        const r = resources[i];
        if (r.student_class) classSet.add(r.student_class);
        if (r.subject) subjectSet.add(r.subject);
        if (r.year) {
          const y = parseInt(r.year, 10);
          if (!isNaN(y)) {
            if (y < minYear) minYear = y;
            if (y > maxYear) maxYear = y;
            hasValidYear = true;
          }
        }
      }

      const availableClasses = Array.from(classSet).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });

      const availableSubjects = Array.from(subjectSet).sort();

      let yearRange: string | null = null;
      if (hasValidYear) {
        yearRange = minYear === maxYear ? `${minYear}` : `${minYear}–${maxYear}`;
      }

      return { availableClasses, availableSubjects, yearRange };
    };

    const baseline = multiPassExtraction(largeDataset);
    const optimized = singlePassExtraction(largeDataset);

    expect(optimized.availableClasses).toEqual(baseline.availableClasses);
    expect(optimized.availableSubjects).toEqual(baseline.availableSubjects);
    expect(optimized.yearRange).toEqual(baseline.yearRange);

    for (let i = 0; i < 5; i++) {
      multiPassExtraction(largeDataset);
      singlePassExtraction(largeDataset);
    }

    const iterations = 50;

    const startMulti = performance.now();
    for (let i = 0; i < iterations; i++) {
      multiPassExtraction(largeDataset);
    }
    const durationMulti = performance.now() - startMulti;

    const startSingle = performance.now();
    for (let i = 0; i < iterations; i++) {
      singlePassExtraction(largeDataset);
    }
    const durationSingle = performance.now() - startSingle;

    const speedup = durationMulti / durationSingle;

    console.log(`[LibraryEducationalGuide Benchmark] Multi-pass duration: ${durationMulti.toFixed(2)}ms`);
    console.log(`[LibraryEducationalGuide Benchmark] Single-pass duration: ${durationSingle.toFixed(2)}ms`);
    console.log(`[LibraryEducationalGuide Benchmark] Speedup factor: ${speedup.toFixed(2)}x`);

    expect(durationSingle).toBeLessThan(durationMulti);
  });
});
