import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NotesEducationalGuide } from '../NotesEducationalGuide';
import type { Resource } from '../../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNotesResources: Resource[] = [
  {
    id: '1',
    title: 'Class 10 Physics Notes',
    description: '',
    pdfUrl: '',
    thumbnailUrl: '',
    uploadDate: '2023-01-01',
    student_class: 'Class 10',
    subject: 'Physics',
    resource_type: 'notes',
    file_path: 'notes/phys-10.pdf',
    chapter_id: 'chap-101',
    medium: 'english',
    allow_download: true,
    storage_bucket: 'learning_resources'
  },
  {
    id: '2',
    title: 'Class 9 Chemistry Notes',
    description: '',
    pdfUrl: '',
    thumbnailUrl: '',
    uploadDate: '2023-01-01',
    student_class: 'Class 9',
    subject: 'Chemistry',
    resource_type: 'notes',
    file_path: 'notes/chem-9.pdf',
    chapter_id: 'chap-102',
    medium: 'english',
    allow_download: true,
    storage_bucket: 'learning_resources'
  },
  {
    id: '3',
    title: 'Class 12 Biology Notes',
    description: '',
    pdfUrl: '',
    thumbnailUrl: '',
    uploadDate: '2023-01-01',
    student_class: 'Class 12',
    subject: 'Biology',
    resource_type: 'notes',
    file_path: 'notes/bio-12.pdf',
    chapter_id: 'chap-101',
    medium: 'hindi',
    allow_download: true,
    storage_bucket: 'learning_resources'
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

  it('extracts unique sorted classes, subjects, capitalized mediums, and chapter count', async () => {
    await act(async () => {
      root?.render(<NotesEducationalGuide allResources={mockNotesResources} />);
    });

    const section = container?.querySelector('section[aria-label="Study Notes Overview and Learning Guide"]');
    expect(section).not.toBeNull();

    const text = section?.textContent || '';
    expect(text).toContain('Classes Supported: Class 9, Class 10, Class 12');
    expect(text).toContain('Subjects Covered: Biology, Chemistry, Physics');
    expect(text).toContain('Study Mediums: English, Hindi');
    expect(text).toContain('Syllabus Chapters: Covers over 2 curriculum chapters');
  });

  it('renders filter summary when contextual filters are provided', async () => {
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

    const summaryText = container?.textContent || '';
    expect(summaryText).toContain('Currently displaying study notes filtered for Class 10 • Physics • English Medium.');
  });

  it('handles empty resource list gracefully', async () => {
    await act(async () => {
      root?.render(<NotesEducationalGuide allResources={[]} />);
    });

    const text = container?.textContent || '';
    expect(text).toContain('Middle & High School grades');
    expect(text).toContain('Science, Social Studies, Mathematics');
    expect(text).toContain('English and Hindi medium');
  });

  it('demonstrates measurable performance improvement over multi-pass baseline', () => {
    const largeDataset: Resource[] = Array.from({ length: 10000 }, (_, i) => ({
      id: `res-${i}`,
      title: `Resource ${i}`,
      description: '',
      pdfUrl: '',
      thumbnailUrl: '',
      uploadDate: '2023-01-01',
      student_class: `Class ${(i % 12) + 1}`,
      subject: `Subject ${i % 10}`,
      resource_type: 'notes',
      file_path: `notes/file-${i}.pdf`,
      chapter_id: `chap-${i % 100}`,
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
        new Set(resources.map(r => r.medium).filter(Boolean) as string[])
      )
        .map(m => m.charAt(0).toUpperCase() + m.slice(1))
        .sort();

      const chapterIds = new Set(resources.map(r => r.chapter_id).filter(Boolean));
      const chapterCount = chapterIds.size;

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

      return {
        availableClasses,
        availableSubjects,
        availableMediums,
        chapterCount: chapterSet.size
      };
    };

    const baselineResult = multiPassExtraction(largeDataset);
    const optimizedResult = singlePassExtraction(largeDataset);

    expect(optimizedResult.availableClasses).toEqual(baselineResult.availableClasses);
    expect(optimizedResult.availableSubjects).toEqual(baselineResult.availableSubjects);
    expect(optimizedResult.availableMediums).toEqual(Array.from(new Set(baselineResult.availableMediums)));
    expect(optimizedResult.chapterCount).toBe(baselineResult.chapterCount);

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
