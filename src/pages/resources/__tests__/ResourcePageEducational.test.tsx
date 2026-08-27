import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ResourcePage from '../ResourcePage';
import { pyqConfig, notesConfig } from '../../../config/resourcePageConfigs';
import * as learningAPI from '../../../services/learningResourcesAPI';
import type { Resource } from '../../../types';

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
    file_path: 'pyqs/class10-science-2023.pdf',
    chapter_id: null,
    medium: 'english',
    allow_download: true,
    storage_bucket: 'learning_resources'
  },
  {
    id: '2',
    title: 'Class 10 Geography PYQ 2022',
    description: '',
    pdfUrl: '',
    thumbnailUrl: '',
    uploadDate: '2022-01-01',
    student_class: 'Class 10',
    subject: 'Geography',
    resource_type: 'pyq',
    year: '2022',
    file_path: 'pyqs/class10-geography-2022.pdf',
    chapter_id: null,
    medium: 'english',
    allow_download: true,
    storage_bucket: 'learning_resources'
  }
];

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

describe('ResourcePage Educational HTML Content & SEO Metadata', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
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
    vi.restoreAllMocks();
  });

  it('renders crawlable educational HTML section and sets SEO metadata on /library', async () => {
    vi.spyOn(learningAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockPyqResources,
      error: null
    });

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <ResourcePage config={pyqConfig} />
        </MemoryRouter>
      );
    });

    // Check SEO metadata
    expect(document.title).toBe('Previous Year Question Papers (PYQs) | Horizon - Free Student Library');
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toContain('Access free previous year question papers');

    // Check semantic HTML guide section
    const guideSection = container?.querySelector('section[aria-label="Library Overview and Exam Preparation Guide"]');
    expect(guideSection).not.toBeNull();

    const h2 = guideSection?.querySelector('h2');
    expect(h2?.textContent).toBe('Horizon Previous Year Question Papers (PYQs)');

    const paragraphs = guideSection?.querySelectorAll('p');
    expect(paragraphs && paragraphs.length).toBeGreaterThan(0);
    expect(guideSection?.textContent).toContain('The Horizon Library provides a structured repository of official previous year question papers');

    // Check dynamic data present in real HTML
    expect(guideSection?.textContent).toContain('Class 10');
    expect(guideSection?.textContent).toContain('Geography, Science');
    expect(guideSection?.textContent).toContain('2022–2023');

    // Check structured list guidelines
    const lists = guideSection?.querySelectorAll('ul');
    expect(lists && lists.length).toBe(2);

    // Check JSON-LD CollectionPage structured data
    const jsonLdScript = container?.querySelector('script[type="application/ld+json"]');
    expect(jsonLdScript).not.toBeNull();
    const jsonLdData = JSON.parse(jsonLdScript?.textContent || '{}');
    expect(jsonLdData['@context']).toBe('https://schema.org');
    expect(jsonLdData['@type']).toBe('CollectionPage');
    expect(jsonLdData.provider.name).toBe('Horizon');
  });

  it('renders crawlable educational HTML section and sets SEO metadata on /notes', async () => {
    vi.spyOn(learningAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockNotesResources,
      error: null
    });

    await act(async () => {
      root?.render(
        <MemoryRouter>
          <ResourcePage config={notesConfig} />
        </MemoryRouter>
      );
    });

    // Check SEO metadata
    expect(document.title).toBe('Comprehensive Study Notes | Horizon - Free Student Library');
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription?.getAttribute('content')).toContain('Explore free, subject-wise study notes');

    // Check semantic HTML guide section
    const guideSection = container?.querySelector('section[aria-label="Study Notes Overview and Learning Guide"]');
    expect(guideSection).not.toBeNull();

    const h2 = guideSection?.querySelector('h2');
    expect(h2?.textContent).toBe('Horizon Comprehensive Study Notes');

    // Check product behavior clarification regarding protected PDF access
    expect(guideSection?.textContent).toContain('Complete protected document access may require logging into your free Horizon account');
  });
});
