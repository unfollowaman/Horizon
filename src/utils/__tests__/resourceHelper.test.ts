import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isResourceProtected,
  getResourceUrl,
  normalizeClassValue,
  normalizeMediumValue
} from '../resourceHelper';
import { supabase } from '../../services/supabase';

vi.mock('../../services/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn(),
      }),
    },
  },
}));

describe('resourceHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isResourceProtected', () => {
    it('returns true if storage_bucket is not pdfs and resource_type is not pyq', () => {
      expect(isResourceProtected({ storage_bucket: 'other', resource_type: 'notes' })).toBe(true);
    });

    it('returns false if storage_bucket is pdfs', () => {
      expect(isResourceProtected({ storage_bucket: 'pdfs', resource_type: 'notes' })).toBe(false);
    });

    it('returns false if resource_type is pyq', () => {
      expect(isResourceProtected({ storage_bucket: 'other', resource_type: 'pyq' })).toBe(false);
    });

    it('returns false if both storage_bucket is pdfs and resource_type is pyq', () => {
      expect(isResourceProtected({ storage_bucket: 'pdfs', resource_type: 'pyq' })).toBe(false);
    });

    it('returns true if resource is empty (storage_bucket undefined, resource_type undefined)', () => {
      expect(isResourceProtected({})).toBe(true);
    });

    it('returns true if storage_bucket is undefined and resource_type is not pyq', () => {
      expect(isResourceProtected({ resource_type: 'notes' })).toBe(true);
    });

    it('returns false if storage_bucket is undefined and resource_type is pyq', () => {
      expect(isResourceProtected({ resource_type: 'pyq' })).toBe(false);
    });

    it('returns true if resource_type is undefined and storage_bucket is not pdfs', () => {
      expect(isResourceProtected({ storage_bucket: 'other' })).toBe(true);
    });

    it('returns false if resource_type is undefined and storage_bucket is pdfs', () => {
      expect(isResourceProtected({ storage_bucket: 'pdfs' })).toBe(false);
    });
  });

  describe('getResourceUrl', () => {
    it('returns file_path for protected resources', () => {
      const item = {
        storage_bucket: 'other',
        resource_type: 'notes',
        file_path: 'path/to/file.pdf',
        pdf_url: 'https://example.com/file.pdf'
      };
      expect(getResourceUrl(item)).toBe('path/to/file.pdf');
    });

    it('returns pdf_url for protected resources if file_path is empty', () => {
      const item = {
        storage_bucket: 'other',
        resource_type: 'notes',
        file_path: '',
        pdf_url: 'https://example.com/file.pdf'
      };
      expect(getResourceUrl(item)).toBe('https://example.com/file.pdf');
    });

    it('returns empty string for protected resources if both file_path and pdf_url are empty', () => {
      const item = {
        storage_bucket: 'other',
        resource_type: 'notes',
        file_path: '',
        pdf_url: ''
      };
      expect(getResourceUrl(item)).toBe('');
    });

    it('generates public URL via Supabase Storage for public resources with file_path', () => {
      const item = {
        storage_bucket: 'pdfs',
        resource_type: 'notes',
        file_path: 'public/path.pdf',
      };

      const getPublicUrlMock = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://supabase.com/public/path.pdf' }
      });
      const fromMock = vi.mocked(supabase.storage.from).mockReturnValue({
        getPublicUrl: getPublicUrlMock,
      } as unknown as ReturnType<typeof supabase.storage.from>);

      expect(getResourceUrl(item)).toBe('https://supabase.com/public/path.pdf');
      expect(fromMock).toHaveBeenCalledWith('pdfs');
      expect(getPublicUrlMock).toHaveBeenCalledWith('public/path.pdf');
    });

    it('strips leading slashes and bucket prefix from legacy relative pdf_url for public resources', () => {
      const item = {
        storage_bucket: 'pdfs',
        resource_type: 'pyq',
        file_path: null,
        pdf_url: 'pdfs/pyq/class-10/maths-2023.pdf',
      };

      const getPublicUrlMock = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://supabase.co/storage/v1/object/public/pdfs/pyq/class-10/maths-2023.pdf' }
      });
      const fromMock = vi.mocked(supabase.storage.from).mockReturnValue({
        getPublicUrl: getPublicUrlMock,
      } as unknown as ReturnType<typeof supabase.storage.from>);

      expect(getResourceUrl(item)).toBe('https://supabase.co/storage/v1/object/public/pdfs/pyq/class-10/maths-2023.pdf');
      expect(fromMock).toHaveBeenCalledWith('pdfs');
      expect(getPublicUrlMock).toHaveBeenCalledWith('pyq/class-10/maths-2023.pdf');
    });

    it('returns pdf_url directly if it is already an absolute URL', () => {
      const item = {
        storage_bucket: 'pdfs',
        resource_type: 'pyq',
        file_path: '',
        pdf_url: 'https://example.com/file.pdf'
      };
      expect(getResourceUrl(item)).toBe('https://example.com/file.pdf');
    });

    it('returns empty string for public resources if neither file_path nor pdf_url are set', () => {
      const item = {
        storage_bucket: 'pdfs',
        resource_type: 'notes',
        file_path: '',
        pdf_url: ''
      };
      expect(getResourceUrl(item)).toBe('');
    });
  });

  describe('normalizeClassValue', () => {
    it('returns empty string for null or undefined', () => {
      expect(normalizeClassValue(null)).toBe('');
      expect(normalizeClassValue(undefined)).toBe('');
    });

    it('extracts number from class string', () => {
      expect(normalizeClassValue('Class 10')).toBe('10');
      expect(normalizeClassValue('12th Grade')).toBe('12');
    });

    it('returns trimmed string if no number found', () => {
      expect(normalizeClassValue(' KG ')).toBe('KG');
    });
  });

  describe('normalizeMediumValue', () => {
    it('returns english as default for null or undefined', () => {
      expect(normalizeMediumValue(null)).toBe('english');
      expect(normalizeMediumValue(undefined)).toBe('english');
    });

    it('returns hindi for hindi input', () => {
      expect(normalizeMediumValue('Hindi')).toBe('hindi');
      expect(normalizeMediumValue(' HINDI ')).toBe('hindi');
    });

    it('returns english for english input', () => {
      expect(normalizeMediumValue('English')).toBe('english');
      expect(normalizeMediumValue(' ENGLISH ')).toBe('english');
    });

    it('returns english as fallback for other inputs', () => {
      expect(normalizeMediumValue('Marathi')).toBe('english');
    });
  });
});
