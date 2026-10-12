import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PdfViewer from '../PdfViewer';
import * as usePdfDataModule from '../pdf-viewer/hooks/usePdfData';
import type { Resource } from '../../../types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-pdf', () => ({
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  },
  Document: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="mock-document" className={className}>
      {children}
    </div>
  ),
  Page: ({ pageNumber }: { pageNumber: number }) => (
    <div data-testid={`mock-page-${pageNumber}`}>
      Page {pageNumber}
    </div>
  ),
}));

const mockResource: Resource = {
  id: 'note-1',
  title: 'Test Note',
  description: 'Test Description',
  pdfUrl: 'test.pdf',
  thumbnailUrl: '',
  uploadDate: '2023-01-01',
  student_class: 'Class 10',
  subject: 'Science',
  resource_type: 'notes',
  medium: 'english',
  storage_bucket: 'learning_resources',
  file_path: 'notes/test.pdf'
};

describe('PdfViewer Fallback Screens', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    }
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

  it('renders "Resource not found" screen when resource is null with explicit type="button", aria-label, and focus-visible styling', async () => {
    vi.spyOn(usePdfDataModule, 'usePdfData').mockReturnValue({
      resource: null,
      signedUrl: null,
      pdfData: null,
      pdfError: null,
      loading: false,
      fetchSignedUrl: vi.fn()
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/view/missing-id']}>
          <Routes>
            <Route path="/view/:id" element={<PdfViewer />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Resource not found');

    const goBackBtn = container?.querySelector('button[aria-label="Go back to previous page"]') as HTMLButtonElement;
    expect(goBackBtn).not.toBeNull();
    expect(goBackBtn?.getAttribute('type')).toBe('button');
    expect(goBackBtn?.textContent).toBe('Go Back');
    expect(goBackBtn?.className).toContain('focus-visible:ring-2');
    expect(goBackBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
  });

  it('renders "Login required" 401 fallback screen with explicit type="button", aria-label, and focus-visible styling on Go Back button', async () => {
    vi.spyOn(usePdfDataModule, 'usePdfData').mockReturnValue({
      resource: mockResource,
      signedUrl: null,
      pdfData: null,
      pdfError: '401_UNAUTHORIZED',
      loading: false,
      fetchSignedUrl: vi.fn()
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/view/note-1']}>
          <Routes>
            <Route path="/view/:id" element={<PdfViewer />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Login required');

    const goBackBtn = container?.querySelector('button[aria-label="Go back to previous page"]') as HTMLButtonElement;
    expect(goBackBtn).not.toBeNull();
    expect(goBackBtn?.getAttribute('type')).toBe('button');
    expect(goBackBtn?.textContent).toBe('Go Back');
    expect(goBackBtn?.className).toContain('focus-visible:ring-2');
    expect(goBackBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
  });

  it('renders "Access denied" 403 fallback screen with explicit type="button", aria-label, and focus-visible styling on Go Back button', async () => {
    vi.spyOn(usePdfDataModule, 'usePdfData').mockReturnValue({
      resource: mockResource,
      signedUrl: null,
      pdfData: null,
      pdfError: '403_FORBIDDEN',
      loading: false,
      fetchSignedUrl: vi.fn()
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/view/note-1']}>
          <Routes>
            <Route path="/view/:id" element={<PdfViewer />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(container?.textContent).toContain('Access denied');

    const goBackBtn = container?.querySelector('button[aria-label="Go back to previous page"]') as HTMLButtonElement;
    expect(goBackBtn).not.toBeNull();
    expect(goBackBtn?.getAttribute('type')).toBe('button');
    expect(goBackBtn?.textContent).toBe('Go Back');
    expect(goBackBtn?.className).toContain('focus-visible:ring-2');
    expect(goBackBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
  });

  it('renders read-only PDF viewer without download, print, or open-in-new-tab controls', async () => {
    vi.spyOn(usePdfDataModule, 'usePdfData').mockReturnValue({
      resource: mockResource,
      signedUrl: 'https://example.com/signed-note.pdf',
      pdfData: new ArrayBuffer(8),
      pdfError: null,
      loading: false,
      fetchSignedUrl: vi.fn()
    });

    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={['/view/note-1']}>
          <Routes>
            <Route path="/view/:id" element={<PdfViewer />} />
          </Routes>
        </MemoryRouter>
      );
    });

    // Check that top and bottom floating controls exist
    expect(container?.querySelector('button[aria-label="Go Back"]')).not.toBeNull();
    expect(container?.querySelector('button[aria-label="Zoom In"]')).not.toBeNull();
    expect(container?.querySelector('button[aria-label="Zoom Out"]')).not.toBeNull();
    expect(container?.querySelector('button[aria-label="Rotate Screen"]')).not.toBeNull();
    expect(container?.querySelector('button[aria-label="Share"]')).not.toBeNull();

    // Verify absence of any download, print, or open-in-new-tab controls or anchors
    const downloadBtns = container?.querySelectorAll('button[aria-label*="Download"], a[aria-label*="Download"], a[download]');
    expect(downloadBtns?.length).toBe(0);

    const printBtns = container?.querySelectorAll('button[aria-label*="Print"], a[aria-label*="Print"]');
    expect(printBtns?.length).toBe(0);

    const newTabLinks = container?.querySelectorAll('a[target="_blank"]');
    expect(newTabLinks?.length).toBe(0);
  });
});
