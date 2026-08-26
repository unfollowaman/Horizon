import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResourcePage from '../ResourcePage';
import { notesConfig, pyqConfig } from '../../../config/resourcePageConfigs';
import * as learningResourcesAPI from '../../../services/learningResourcesAPI';
import type { Resource } from '../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockResources: Resource[] = [
  {
    id: 'res-101',
    title: 'Chapter 1: Resources and Development',
    description: 'Geography Chapter 1 Study Notes',
    resource_type: 'notes',
    medium: 'english',
    student_class: 'Class 10',
    subject: 'Geography',
    uploadDate: '2024-01-01',
    pdfUrl: 'https://example.com/pdf1.pdf',
    thumbnailUrl: '',
    chapters: {
      id: 'chap-1',
      chapter_number: 1,
      chapter_name: 'Resources and Development',
      display_order: 1,
      is_active: true,
    },
  },
  {
    id: 'res-102',
    title: 'Class 10 Geography PYQ 2024',
    description: 'PYQ 2024 Geography',
    resource_type: 'pyq',
    medium: 'english',
    student_class: 'Class 10',
    subject: 'Geography',
    year: '2024',
    uploadDate: '2024-01-01',
    pdfUrl: 'https://example.com/pdf2.pdf',
    thumbnailUrl: '',
  },
];

describe('ResourcePage URL Hierarchy Synchronization', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.restoreAllMocks();
    vi.spyOn(learningResourcesAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockResources,
      error: null,
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
  });

  it('initializes filter state and renders matching resources from hierarchical URL /notes/class-10/english-medium/geography', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/notes/class-10/english-medium/geography']}>
          <Routes>
            <Route path="/notes" element={<ResourcePage config={notesConfig} />} />
            <Route path="/notes/:classSlug" element={<ResourcePage config={notesConfig} />} />
            <Route path="/notes/:classSlug/:mediumSlug" element={<ResourcePage config={notesConfig} />} />
            <Route path="/notes/:classSlug/:mediumSlug/:subjectSlug" element={<ResourcePage config={notesConfig} />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Chapter 1: Resources and Development');
    expect(document.title).toContain('Class 10 Geography English Medium');
  });

  it('handles invalid URL parameter gracefully by displaying empty state when zero resources match', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/notes/class-99/english-medium/nonexistent-subject']}>
          <Routes>
            <Route path="/notes" element={<ResourcePage config={notesConfig} />} />
            <Route path="/notes/:classSlug" element={<ResourcePage config={notesConfig} />} />
            <Route path="/notes/:classSlug/:mediumSlug" element={<ResourcePage config={notesConfig} />} />
            <Route path="/notes/:classSlug/:mediumSlug/:subjectSlug" element={<ResourcePage config={notesConfig} />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain(notesConfig.emptyMessageTitle);
  });

  it('initializes filter state for library PYQs from URL /library/class-10/2024', async () => {
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/library/class-10/2024']}>
          <Routes>
            <Route path="/library" element={<ResourcePage config={pyqConfig} />} />
            <Route path="/library/:classSlug" element={<ResourcePage config={pyqConfig} />} />
            <Route path="/library/:classSlug/:mediumSlug" element={<ResourcePage config={pyqConfig} />} />
            <Route path="/library/:classSlug/:mediumSlug/:subjectSlug" element={<ResourcePage config={pyqConfig} />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Class 10 Geography PYQ');
  });
});
