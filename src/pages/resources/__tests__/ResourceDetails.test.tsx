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

    vi.spyOn(learningAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockRelatedResources,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResources>>);
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

    // Verify open book SVG icon (w-11 h-11) and check/done SVG icons (w-7 h-7) use w-2 h-2
    const featureSvgs = container?.querySelectorAll('.neu-raised.rounded-full > svg.text-ink, .neu-raised-sm.rounded-full > svg.text-ink');
    expect(featureSvgs && featureSvgs.length).toBeGreaterThan(0);
    featureSvgs?.forEach((svg) => {
      expect(svg.classList.contains('w-2')).toBe(true);
      expect(svg.classList.contains('h-2')).toBe(true);
      expect(svg.classList.contains('w-4')).toBe(false);
      expect(svg.classList.contains('h-4')).toBe(false);
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

  it('renders chapter-specific content for Geography chapter (Resource and Development)', async () => {
    const geoResource: Resource = {
      ...mockNoteResource,
      id: 'geo-1',
      title: 'Chapter 1: Resource and Development',
      subject: 'Geography',
      chapter_summary: 'Resources are vital for human survival and development. They are classified into biotic, abiotic, renewable, non-renewable, national, and international categories.\n\nSustainable development requires planned land utilization, soil conservation, and mitigating soil erosion caused by deforestation and overgrazing.',
      topics: [
        'Types and Classification of Resources',
        'Land Resources and Land Use Pattern in India',
        'Soil Erosion and Conservation Methods',
        'Sustainable Development Goals'
      ],
      study_guidance: [
        { title: 'Concept Mapping', description: 'Draw a flowchart classifying renewable vs non-renewable resources.' },
        { title: 'Map Practice', description: 'Locate major soil types across India on the outline map.' }
      ]
    };

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: geoResource,
      rawData: geoResource,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResourceById>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/resource/geo-1']}>
          <Routes>
            <Route path="/resource/:id" element={<ResourceDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Chapter & Resource Overview');
    expect(container?.textContent).toContain('Resources are vital for human survival and development.');
    expect(container?.textContent).toContain('Soil Erosion and Conservation Methods');
    expect(container?.textContent).toContain('Draw a flowchart classifying renewable vs non-renewable resources.');
  });

  it('renders chapter-specific content for History chapter (The Rise of Nationalism in Europe)', async () => {
    const historyResource: Resource = {
      ...mockNoteResource,
      id: 'hist-1',
      title: 'Chapter 1: The Rise of Nationalism in Europe',
      subject: 'History',
      chapter_summary: 'The 19th century witnessed the emergence of nationalism which transformed Europe from multi-national dynastic empires to modern nation-states. Key milestones include the French Revolution of 1789, Napoleonic Code, revolutions of 1848, and the unification of Italy and Germany.',
      topics: [
        'The French Revolution and the Idea of the Nation',
        'The Making of Nationalism in Europe',
        'The Age of Revolutions: 1830–1848',
        'Unification of Germany and Italy'
      ]
    };

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: historyResource,
      rawData: historyResource,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResourceById>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/resource/hist-1']}>
          <Routes>
            <Route path="/resource/:id" element={<ResourceDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Chapter 1: The Rise of Nationalism in Europe');
    expect(container?.textContent).toContain('French Revolution of 1789');
    expect(container?.textContent).toContain('Unification of Germany and Italy');
  });

  it('renders chapter-specific content for Civics chapter (Power Sharing)', async () => {
    const civicsResource: Resource = {
      ...mockNoteResource,
      id: 'civ-1',
      title: 'Chapter 1: Power Sharing',
      subject: 'Civics',
      chapter_summary: 'Power sharing is the essence of democracy. Comparing ethnic compositions in Belgium and Sri Lanka demonstrates why moral and prudential power-sharing arrangements prevent social conflict and preserve national integrity.',
      topics: [
        'Ethnic Composition in Belgium and Sri Lanka',
        'Majoritarianism in Sri Lanka vs Accommodation in Belgium',
        'Why Power Sharing is Desirable (Prudential vs Moral)',
        'Forms of Power Sharing (Horizontal, Vertical, Social, Coalition)'
      ]
    };

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: civicsResource,
      rawData: civicsResource,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResourceById>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/resource/civ-1']}>
          <Routes>
            <Route path="/resource/:id" element={<ResourceDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Chapter 1: Power Sharing');
    expect(container?.textContent).toContain('ethnic compositions in Belgium and Sri Lanka');
    expect(container?.textContent).toContain('Forms of Power Sharing');
  });

  it('renders chapter-specific content for Economics chapter (Development)', async () => {
    const ecoResource: Resource = {
      ...mockNoteResource,
      id: 'eco-1',
      title: 'Chapter 1: Development',
      subject: 'Economics',
      chapter_summary: 'Development encompasses different goals for different groups of people. Beyond income (Per Capita Income), human development depends on health indicators (BMI, Infant Mortality Rate), literacy rate, and environmental sustainability.',
      topics: [
        'What Development Promises - Different People, Different Goals',
        'Income and Other Goals',
        'National Development and Per Capita Income',
        'Human Development Index (HDI) and Sustainability'
      ]
    };

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: ecoResource,
      rawData: ecoResource,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResourceById>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/resource/eco-1']}>
          <Routes>
            <Route path="/resource/:id" element={<ResourceDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Chapter 1: Development');
    expect(container?.textContent).toContain('Human Development Index (HDI)');
  });

  it('renders Hindi-medium chapter with long Hindi title without truncation or escaping issues', async () => {
    const hindiResource: Resource = {
      ...mockNoteResource,
      id: 'hindi-geo-1',
      title: 'अध्याय 1: संसाधन एवं विकास - भारत में प्राकृतिक संसाधन और मृदा संरक्षण की विस्तृत अध्ययन सामग्री',
      medium: 'hindi',
      subject: 'भूगोल',
      chapter_summary: 'संसाधन वे सभी तत्व हैं जो मानव आवश्यकताओं की पूर्ति करते हैं। इस अध्याय में संसाधनों के वर्गीकरण (उत्पत्ति, समाप्यता, स्वामित्व और विकास के स्तर के आधार पर) और उनके सतत पोषणीय विकास का विस्तृत अध्ययन किया गया है।\n\nमृदा अपरदन को रोकने के लिए समोच्च जुताई, पट्टिका कृषि और रक्षक मेखला जैसी संरक्षण तकनीकों को समझना परीक्षा की दृष्टि से अत्यंत महत्वपूर्ण है।',
      topics: [
        'संसाधनों के प्रकार एवं उनका वर्गीकरण',
        'भारत में भू-उपयोग प्रारूप एवं संसाधन नियोजन',
        'मृदा अपरदन के कारण एवं संरक्षण के उपाय',
        'सतत पोषणीय विकास की अवधारणा'
      ],
      study_guidance: [
        { title: 'अवधारणात्मक पुनरावृत्ति', description: 'नवीकरणीय और अनवीकरणीय संसाधनों के अंतर का चार्ट बनाएं।' },
        { title: 'मानचित्र अभ्यास', description: 'भारत के रेखा मानचित्र पर जलोढ़ और काली मृदा के क्षेत्रों को चिह्नित करें।' }
      ]
    };

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: hindiResource,
      rawData: hindiResource,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResourceById>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/resource/hindi-geo-1']}>
          <Routes>
            <Route path="/resource/:id" element={<ResourceDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const h1 = container?.querySelector('h1');
    expect(h1?.textContent).toContain('संसाधन एवं विकास');
    expect(container?.textContent).toContain('संसाधनों के प्रकार एवं उनका वर्गीकरण');
    expect(container?.textContent).toContain('अवधारणात्मक पुनरावृत्ति');
    expect(container?.textContent?.toLowerCase()).toContain('hindi medium');
  });

  it('handles chapters with missing optional fields gracefully using fallback layout', async () => {
    const sparseResource: Resource = {
      ...mockNoteResource,
      id: 'sparse-1',
      title: 'Chapter 5: Consumer Rights',
      chapter_summary: null,
      topics: null,
      study_guidance: null
    };

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: sparseResource,
      rawData: sparseResource,
      error: null
    } as unknown as Awaited<ReturnType<typeof learningAPI.fetchLearningResourceById>>);

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/resource/sparse-1']}>
          <Routes>
            <Route path="/resource/:id" element={<ResourceDetails />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Validates that overview, topics, guidance fallback cleanly without crashing or displaying empty broken boxes
    expect(container?.textContent).toContain('Chapter & Resource Overview');
    expect(container?.textContent).toContain('Topics Covered & Key Concepts');
    expect(container?.textContent).toContain('Study Guidance & Preparation Tips');
    expect(container?.textContent).toContain('Fundamental definitions, laws, and core theoretical concepts.');
  });
});
