import { describe, it, expect } from 'vitest';
import { pyqConfig, notesConfig } from '../resourcePageConfigs';
import type { Resource, Chapter } from '../../types';

describe('resourcePageConfigs Sorting Optimizations', () => {
  it('pyqConfig.sortResources performs non-mutating sort on resources array', () => {
    const mockResources: Partial<Resource>[] = [
      { id: '1', title: 'Paper 2021', year: '2021' },
      { id: '2', title: 'Paper 2024', year: '2024' },
      { id: '3', title: 'Paper 2022', year: '2022' },
    ];

    const inputCopy = [...mockResources];
    const sorted = pyqConfig.sortResources(mockResources as Resource[]);

    // Original array must not be mutated
    expect(mockResources).toEqual(inputCopy);
    expect(sorted).not.toBe(mockResources);

    // Order should be descending by year
    expect(sorted.map(r => r.id)).toEqual(['2', '3', '1']);
  });

  it('notesConfig.sortResources performs non-mutating sort on resources array', () => {
    const createMockChapter = (id: string, chapter_number: number, chapter_name: string): Chapter => ({
      id,
      chapter_number,
      chapter_name,
      display_order: chapter_number,
      is_active: true,
    });

    const mockResources: Partial<Resource>[] = [
      { id: '1', title: 'Chapter 3 Notes', chapters: createMockChapter('c3', 3, 'Ch 3') },
      { id: '2', title: 'Chapter 1 Notes', chapters: createMockChapter('c1', 1, 'Ch 1') },
      { id: '3', title: 'Chapter 2 Notes', chapters: createMockChapter('c2', 2, 'Ch 2') },
    ];

    const inputCopy = [...mockResources];
    const sorted = notesConfig.sortResources(mockResources as Resource[]);

    // Original array must not be mutated
    expect(mockResources).toEqual(inputCopy);
    expect(sorted).not.toBe(mockResources);

    // Order should be ascending by chapter_number
    expect(sorted.map(r => r.id)).toEqual(['2', '3', '1']);
  });

  it('pyqConfig.extractThirdFilterValues extracts sorted descending years', () => {
    const mockResources: Partial<Resource>[] = [
      { id: '1', year: '2020' },
      { id: '2', year: '2024' },
      { id: '3', year: '2022' },
      { id: '4', year: undefined },
    ];

    const years = pyqConfig.extractThirdFilterValues(mockResources as Resource[]);
    expect(years).toEqual(['2024', '2022', '2020']);
  });

  it('notesConfig.extractThirdFilterValues extracts sorted uppercase mediums', () => {
    const mockResources: Partial<Resource>[] = [
      { id: '1', medium: 'hindi' },
      { id: '2', medium: 'english' },
      { id: '3', medium: undefined },
    ];

    const mediums = notesConfig.extractThirdFilterValues(mockResources as Resource[]);
    expect(mediums).toEqual(['English', 'Hindi']);
  });
});
