import { describe, it, expect } from 'vitest';
import {
  mapLearningResource,
  generateResourceHtml,
  assertSecurityCompliance,
  escapeHtml,
} from '../prerender.js';

describe('prerender script unit tests', () => {
  const sampleTemplateHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Horizon</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

  const sampleNoteResourceRow = {
    id: '56',
    title: 'Cell Biology Notes',
    description: 'Detailed study note covering cellular structure and organelles.',
    student_class: '10',
    subject: 'Science',
    medium: 'english',
    resource_type: 'notes',
    created_at: '2025-01-01T00:00:00.000Z',
    file_path: 'notes/science/class-10/cell-biology.pdf',
    storage_bucket: 'protected-resources',
    chapter_summary: 'Cellular biology explores structural units of life.',
    topics: ['Mitochondria', 'Nucleus', 'Cell Membrane'],
    study_guidance: ['Review cell organelle functions.', 'Draw plant cell diagram.'],
    chapters: {
      chapter_number: 1,
      chapter_name: 'Fundamental Unit of Life',
    },
  };

  const samplePyqResourceRow = {
    id: '57',
    title: 'Class 12 History PYQ 2024',
    description: null,
    student_class: 'Class 12',
    subject: 'History',
    medium: 'hindi',
    resource_type: 'pyq',
    year: 2024,
    created_at: '2025-01-02T00:00:00.000Z',
    file_path: 'pyq/history/class-12/2024.pdf',
    storage_bucket: 'protected-resources',
    total_pages: 8,
    total_marks: 80,
    duration: '3 Hours',
  };

  it('maps raw database row to Resource structure correctly', () => {
    const mappedNote = mapLearningResource(sampleNoteResourceRow);
    expect(mappedNote.id).toBe('56');
    expect(mappedNote.title).toBe('Chapter 1: Fundamental Unit of Life');
    expect(mappedNote.student_class).toBe('Class 10');
    expect(mappedNote.description).toBe('Detailed study note covering cellular structure and organelles.');
    expect(mappedNote.topics).toEqual(['Mitochondria', 'Nucleus', 'Cell Membrane']);
  });

  it('generates rich static HTML for study notes without leaking protected info', () => {
    const mappedNote = mapLearningResource(sampleNoteResourceRow);
    const html = generateResourceHtml(mappedNote, sampleTemplateHtml, []);

    expect(html).toContain('<title>Chapter 1: Fundamental Unit of Life | Class 10 Science | Horizon</title>');
    expect(html).toContain('<meta name="description" content="Detailed study note covering cellular structure and organelles.">');
    expect(html).toContain('<link rel="canonical" href="https://unfollowaman.tech/resource/56">');
    expect(html).toContain('"@type": "EducationalResource"');
    expect(html).toContain('Chapter 1: Fundamental Unit of Life');
    expect(html).toContain('Class 10');
    expect(html).toContain('Science');
    expect(html).toContain('ENGLISH MEDIUM');
    expect(html).toContain('Cellular biology explores structural units of life.');
    expect(html).toContain('Mitochondria');
    expect(html).toContain('Nucleus');
    expect(html).toContain('Review cell organelle functions.');
    expect(html).toContain('href="/view/56"');

    // Security check
    expect(html).not.toContain('protected-resources');
    expect(html).not.toContain('notes/science/class-10/cell-biology.pdf');
    expect(html).not.toContain('.pdf?');
    expect(html).not.toContain('token=');
  });

  it('generates rich static HTML for PYQ papers correctly', () => {
    const mappedPyq = mapLearningResource(samplePyqResourceRow);
    const html = generateResourceHtml(mappedPyq, sampleTemplateHtml, []);

    expect(html).toContain('<title>Class 12 History PYQ 2024 | Class 12 History | Horizon</title>');
    expect(html).toContain('Class 12 History PYQ 2024');
    expect(html).toContain('HINDI MEDIUM');
    expect(html).toContain('80');
    expect(html).toContain('3 Hours');
    expect(html).toContain('Paper Overview');
    expect(html).toContain('How to Use This Paper');
  });

  it('throws security error if storage path or forbidden URL pattern is present', () => {
    const mappedNote = mapLearningResource(sampleNoteResourceRow);

    expect(() => {
      assertSecurityCompliance('<div>https://storage/v1/object/public/file.pdf</div>', sampleNoteResourceRow);
    }).toThrow('SECURITY VIOLATION');

    expect(() => {
      assertSecurityCompliance(`<div>${sampleNoteResourceRow.file_path}</div>`, sampleNoteResourceRow);
    }).toThrow('SECURITY VIOLATION');

    expect(() => {
      assertSecurityCompliance(`<div>${sampleNoteResourceRow.storage_bucket}</div>`, sampleNoteResourceRow);
    }).toThrow('SECURITY VIOLATION');
  });

  it('escapes html entities safely', () => {
    expect(escapeHtml('Science & Technology <Class 10>')).toBe('Science &amp; Technology &lt;Class 10&gt;');
  });
});
