import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResourceDetails from '../ResourceDetails';
import MaterialCard from '../../../components/MaterialCard';
import * as learningAPI from '../../../services/learningResourcesAPI';
import type { Resource } from '../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNoteResource: Resource = {
  id: 'note-101',
  title: 'Chapter 1: Resource and Development',
  description: 'A comprehensive study note covering land resources, soil classification, and conservation.',
  pdfUrl: 'protected/notes/class10-geo-ch1.pdf',
  thumbnailUrl: '',
  uploadDate: '2023-01-01',
  student_class: 'Class 10',
  subject: 'Geography',
  resource_type: 'notes',
  medium: 'english',
  chapter_id: 'chap-1',
  allow_download: false,
  storage_bucket: 'learning_resources',
  file_path: 'notes/class10-geo-ch1.pdf',
  chapters: {
    id: 'chap-1',
    chapter_number: 1,
    chapter_name: 'Resource and Development',
    display_order: 1,
    is_active: true
  }
};

const mockPyqResource: Resource = {
  id: 'pyq-201',
  title: 'Class 10 Geography Board Paper 2023',
  description: 'Official board paper questions for geography practice.',
  pdfUrl: 'https://example.com/public/pyq.pdf',
  thumbnailUrl: '',
  uploadDate: '2023-02-01',
  student_class: 'Class 10',
  subject: 'Geography',
  resource_type: 'pyq',
  medium: 'english',
  year: '2023',
  allow_download: true,
  storage_bucket: 'pdfs'
};

const mockRelatedResources: Resource[] = [
  {
    id: 'note-102',
    title: 'Chapter 2: Forest and Wildlife',
    description: '',
    pdfUrl: 'protected/notes/class10-geo-ch2.pdf',
    thumbnailUrl: '',
    uploadDate: '2023-01-02',
    student_class: 'Class 10',
    subject: 'Geography',
    resource_type: 'notes',
    medium: 'english',
    chapter_id: 'chap-2',
    storage_bucket: 'learning_resources'
  }
];

describe('ResourceDetails Public Educational Landing Page', () => {
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
    vi.restoreAllMocks();
  });

  it('renders public HTML educational landing page for study notes without exposing signed URLs or iframes', async () => {
    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: mockNoteResource,
      rawData: mockNoteResource,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResourceById>>);

    vi.spyOn(learningAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockRelatedResources,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResources>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/resource/note-101']}>
          <Routes>
            <Route path="/resource/:id" element={<ResourceDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Check main title
    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('Chapter 1: Resource and Development');

    // Check metadata tags
    expect(container?.textContent).toContain('Class 10');
    expect(container?.textContent).toContain('Geography');
    expect(container?.textContent?.toLowerCase()).toContain('english medium');

    // Check Educational Overview & Topics Sections
    expect(container?.textContent).toContain('Chapter & Resource Overview');
    expect(container?.textContent).toContain('Topics Covered & Key Concepts');
    expect(container?.textContent).toContain('Study Guidance & Preparation Tips');

    // Check absence of iframe or signed URL exposure
    expect(container?.querySelector('iframe')).toBeNull();

    // Check CTA button linking to protected PDF viewer
    const ctaLink = container?.querySelector('a[href="/view/note-101"]');
    expect(ctaLink).not.toBeNull();
    expect(ctaLink?.textContent).toContain('Open Full Notes');

    // Check SEO metadata
    expect(document.title).toBe('Chapter 1: Resource and Development | Class 10 Geography | Horizon');
    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc?.getAttribute('content')).toContain('Resource and Development');

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    expect(canonicalLink?.getAttribute('href')).toContain('/resource/note-101');

    // Check JSON-LD EducationalResource structured data
    const jsonLdScript = container?.querySelector('script[type="application/ld+json"]');
    expect(jsonLdScript).not.toBeNull();
    const jsonLdData = JSON.parse(jsonLdScript?.textContent || '{}');
    expect(jsonLdData['@context']).toBe('https://schema.org');
    expect(jsonLdData['@type']).toBe('EducationalResource');
    expect(jsonLdData.name).toBe('Chapter 1: Resource and Development');
    expect(jsonLdData.educationalLevel).toBe('Class 10');
    expect(jsonLdData.about).toEqual({ '@type': 'Thing', name: 'Geography' });
    expect(jsonLdData.inLanguage).toBe('en');
    expect(jsonLdData.learningResourceType).toBe('Study Note');
    expect(jsonLdData.url).toContain('/resource/note-101');
    expect(jsonLdData.provider.name).toBe('Horizon');

    // Ensure no sensitive or protected PDF details are exposed in JSON-LD
    const jsonLdString = JSON.stringify(jsonLdData);
    expect(jsonLdString).not.toContain('protected/notes');
    expect(jsonLdString).not.toContain('file_path');
    expect(jsonLdString).not.toContain('/view/');

    // Check related resources linking to public resource landing pages
    const relatedLink = container?.querySelector('a[href="/resource/note-102"]');
    expect(relatedLink).not.toBeNull();

    // Verify open book SVG icon and check/done SVG icons use w-4 h-4
    const featureSvgs = container?.querySelectorAll('.w-11.h-11.neu-raised.rounded-full > svg.text-ink');
    expect(featureSvgs && featureSvgs.length).toBeGreaterThan(0);
    featureSvgs?.forEach((svg) => {
      expect(svg.classList.contains('w-4')).toBe(true);
      expect(svg.classList.contains('h-4')).toBe(true);
      expect(svg.classList.contains('w-5')).toBe(false);
      expect(svg.classList.contains('h-5')).toBe(false);
      expect(svg.classList.contains('w-6')).toBe(false);
      expect(svg.classList.contains('h-6')).toBe(false);
    });
  });

  it('renders public HTML educational landing page for PYQs with View Full Resource CTA', async () => {
    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: mockPyqResource,
      rawData: mockPyqResource,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResourceById>>);

    vi.spyOn(learningAPI, 'fetchLearningResources').mockResolvedValue({
      data: [],
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResources>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/resource/pyq-201']}>
          <Routes>
            <Route path="/resource/:id" element={<ResourceDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('Class 10 Geography Board Paper 2023');

    const ctaLink = container?.querySelector('a[href="/view/pyq-201"]');
    expect(ctaLink).not.toBeNull();
    expect(ctaLink?.textContent).toContain('View Full Resource');

    // Check PYQ JSON-LD
    const jsonLdScript = container?.querySelector('script[type="application/ld+json"]');
    expect(jsonLdScript).not.toBeNull();
    const jsonLdData = JSON.parse(jsonLdScript?.textContent || '{}');
    expect(jsonLdData['@type']).toBe('EducationalResource');
    expect(jsonLdData.learningResourceType).toBe('Previous Year Question Paper');
  });

  it('MaterialCard links to /resource/:id public landing page', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <MaterialCard resource={mockNoteResource} />
        </MemoryRouter>
      );
    });

    const cardLinks = container?.querySelectorAll('a[href="/resource/note-101"]');
    expect(cardLinks && cardLinks.length).toBeGreaterThanOrEqual(1);

    // Ensure no direct links to /view/ on the card
    const viewLinks = container?.querySelectorAll('a[href="/view/note-101"]');
    expect(viewLinks && viewLinks.length).toBe(0);
  });
});
