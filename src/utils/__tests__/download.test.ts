import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleDownload } from '../download';
import * as permissions from '../permissions';
import * as resourceHelper from '../resourceHelper';
import type { Resource } from '../../types';

// Mock dependencies
vi.mock('../permissions', () => ({
  canDownload: vi.fn(),
}));

vi.mock('../resourceHelper', () => ({
  isResourceProtected: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('handleDownload', () => {
  let originalFetch: typeof window.fetch;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock window and document methods
    originalFetch = window.fetch;
    originalCreateObjectURL = window.URL.createObjectURL;
    originalRevokeObjectURL = window.URL.revokeObjectURL;

    window.fetch = vi.fn();
    window.URL.createObjectURL = vi.fn(() => 'mocked-object-url');
    window.URL.revokeObjectURL = vi.fn();

    // Mock permissions to allow download by default
    vi.spyOn(permissions, 'canDownload').mockReturnValue(true);
    vi.spyOn(resourceHelper, 'isResourceProtected').mockReturnValue(false);

    // Spy on document and element methods
    vi.spyOn(document, 'createElement');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
  });

  afterEach(() => {
    // Restore mocks
    window.fetch = originalFetch;
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('should fallback to native download if fetch fails', async () => {
    // Arrange
    const mockUrl = 'https://example.com/file.pdf';
    const mockResource: Resource = {
      id: '123',
      title: 'Test File',
      file_path: 'pdfs/file.pdf',
      resource_type: 'notes',
      subject: 'Math',
      description: 'Test Description',
      medium: 'english',
      uploadDate: '2023-01-01',
      pdfUrl: 'https://example.com/file.pdf',
      thumbnailUrl: '',
    };

    // Make fetch fail to trigger fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.fetch as any).mockRejectedValue(new Error('Network error'));

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    vi.mocked(document.createElement).mockReturnValue(mockAnchor);

    // Act
    await handleDownload(mockUrl, mockResource);

    // Assert
    // Verify fallback logic
    expect(window.fetch).toHaveBeenCalledWith(mockUrl);
    expect(document.createElement).toHaveBeenCalledWith('a');

    // Check fallback URL has download appended
    expect(mockAnchor.href).toBe(`${mockUrl}?download=`);
    expect(mockAnchor.download).toBe('file.pdf'); // filename parsed from file_path

    // Verify native fallback actions
    expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
  });

  it('should fallback to native download if fetch fails and url already has parameters', async () => {
    // Arrange
    const mockUrl = 'https://example.com/file.pdf?token=abc';
    const mockResource: Resource = {
      id: '123',
      title: 'Test File',
      file_path: 'pdfs/file.pdf',
      resource_type: 'notes',
      subject: 'Math',
      description: 'Test Description',
      medium: 'english',
      uploadDate: '2023-01-01',
      pdfUrl: 'https://example.com/file.pdf',
      thumbnailUrl: '',
    };

    // Make fetch fail to trigger fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.fetch as any).mockRejectedValue(new Error('Network error'));

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    vi.mocked(document.createElement).mockReturnValue(mockAnchor);

    // Act
    await handleDownload(mockUrl, mockResource);

    // Assert
    expect(window.fetch).toHaveBeenCalledWith(mockUrl);
    expect(mockAnchor.href).toBe(`${mockUrl}&download=`);
    expect(mockAnchor.download).toBe('file.pdf');

    expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
  });
});
