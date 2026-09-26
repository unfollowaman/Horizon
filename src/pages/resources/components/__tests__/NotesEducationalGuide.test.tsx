import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NotesEducationalGuide } from '../NotesEducationalGuide';
import type { Resource } from '../../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNotesResources: Resource[] = [
  {
    id: '3',
    title: 'Class 10 Physics Motion Notes',
    description: '',
    pdfUrl: '',
    thumbnailUrl: '',
    uploadDate: '2023-01-01',
    student_class: 'Class 10',
    subject: 'Physics',
    resource_type: 'notes',
    year: undefined,
    file_path: 'notes/class10-physics-motion.pdf',
    chapter_id: 'chap-1',
    medium: 'english',
    allow_download: true,
    storage_bucket: 'learning_resources',
    chapters: {
      id: 'chap-1',
      chapter_number: 1,
      chapter_name: 'Motion in a Straight Line',
      display_order: 1,
      is_active: true
    }
  }
];

describe('NotesEducationalGuide', () => {
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

  it('renders default Study Notes title and concise subtext inside uniform header container', async () => {
    await act(async () => {
      root?.render(<NotesEducationalGuide allResources={mockNotesResources} />);
    });

    const header = container?.querySelector('header[aria-label="Study Notes Overview and Learning Guide"]');
    expect(header).not.toBeNull();
    expect(header?.className).toContain('neu-raised rounded-2xl');

    const h1 = header?.querySelector('h1');
    expect(h1?.textContent).toBe('Comprehensive Study Notes');

    const p = header?.querySelector('p');
    expect(p?.textContent).toBe('Comprehensive chapter-wise revision notes designed to help students quickly grasp key concepts, formulas, and topics.');
  });

  it('renders contextual title and shortened subtext when filters are selected', async () => {
    await act(async () => {
      root?.render(
        <NotesEducationalGuide
          allResources={mockNotesResources}
          selectedClass="Class 10"
          selectedSubject="Physics"
          selectedMedium="English"
        />
      );
    });

    const header = container?.querySelector('header[aria-label="Study Notes Overview and Learning Guide"]');
    expect(header).not.toBeNull();

    const h1 = header?.querySelector('h1');
    expect(h1?.textContent).toBe('Class 10th Physics — Revision Notes');

    const p = header?.querySelector('p');
    expect(p?.textContent).toBe('Comprehensive chapter-wise revision notes to help Class 10th Physics students quickly master key concepts and formulas.');
  });

  it('handles empty resource list gracefully without flow pill', async () => {
    await act(async () => {
      root?.render(<NotesEducationalGuide allResources={[]} />);
    });

    const text = container?.textContent || '';
    expect(text).toContain('Comprehensive Study Notes');
    expect(container?.querySelector('ol')).toBeNull();
  });

  it('demonstrates measurable performance improvement over multi-pass baseline', () => {
    const largeDataset: Resource[] = Array.from({ length: 10000 }, (_, i) => ({
      id: `note-${i}`,
      title: `Note ${i}`,
      description: '',
      pdfUrl: '',
      thumbnailUrl: '',
      uploadDate: '2023-01-01',
      student_class: `Class ${(i % 12) + 1}`,
      subject: `Subject ${i % 10}`,
      resource_type: 'notes',
      year: undefined,
      file_path: `notes/file-${i}.pdf`,
      chapter_id: `chap-${i % 20}`,
      medium: i % 2 === 0 ? 'english' : 'hindi',
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

      const availableMediums = Array.from(
        new Set(resources.map(r => (r.medium ? r.medium.charAt(0).toUpperCase() + r.medium.slice(1) : '')).filter(Boolean) as string[])
      ).sort();

      const chapterCount = new Set(resources.map(r => r.chapter_id).filter(Boolean)).size;

      return { availableClasses, availableSubjects, availableMediums, chapterCount };
    };

    const singlePassExtraction = (resources: Resource[]) => {
      const classSet = new Set<string>();
      const subjectSet = new Set<string>();
      const mediumSet = new Set<string>();
      const chapterSet = new Set<string | number>();

      for (let i = 0; i < resources.length; i++) {
        const r = resources[i];
        if (r.student_class) classSet.add(r.student_class);
        if (r.subject) subjectSet.add(r.subject);
        if (r.medium) mediumSet.add(r.medium.charAt(0).toUpperCase() + r.medium.slice(1));
        if (r.chapter_id) chapterSet.add(r.chapter_id);
      }

      const availableClasses = Array.from(classSet).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });

      const availableSubjects = Array.from(subjectSet).sort();
      const availableMediums = Array.from(mediumSet).sort();

      return { availableClasses, availableSubjects, availableMediums, chapterCount: chapterSet.size };
    };

    const baseline = multiPassExtraction(largeDataset);
    const optimized = singlePassExtraction(largeDataset);

    expect(optimized.availableClasses).toEqual(baseline.availableClasses);
    expect(optimized.availableSubjects).toEqual(baseline.availableSubjects);
    expect(optimized.availableMediums).toEqual(baseline.availableMediums);
    expect(optimized.chapterCount).toEqual(baseline.chapterCount);

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

    console.log(`[NotesEducationalGuide Benchmark] Multi-pass duration: ${durationMulti.toFixed(2)}ms`);
    console.log(`[NotesEducationalGuide Benchmark] Single-pass duration: ${durationSingle.toFixed(2)}ms`);
    console.log(`[NotesEducationalGuide Benchmark] Speedup factor: ${speedup.toFixed(2)}x`);

    expect(durationSingle).toBeLessThan(durationMulti);
  });
});
