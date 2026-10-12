import { describe, it, expect } from 'vitest';
import { canDownload } from '../permissions';
import type { Resource } from '../../types';

describe('canDownload', () => {
  it('should return false for notes resources regardless of allow_download setting', () => {
    const notesResourceWithDownload: Partial<Resource> = { resource_type: 'notes', allow_download: true };
    const notesResourceWithoutDownload: Partial<Resource> = { resource_type: 'notes', allow_download: false };
    expect(canDownload(notesResourceWithDownload)).toBe(false);
    expect(canDownload(notesResourceWithoutDownload)).toBe(false);
  });

  it('should return true for PYQ resources when allow_download is true or undefined', () => {
    const pyqResource: Partial<Resource> = { resource_type: 'pyq', allow_download: true };
    const pyqUndefined: Partial<Resource> = { resource_type: 'pyq', allow_download: undefined };
    expect(canDownload(pyqResource)).toBe(true);
    expect(canDownload(pyqUndefined)).toBe(true);
  });

  it('should return false for PYQ resources when allow_download is false', () => {
    const pyqResource: Partial<Resource> = { resource_type: 'pyq', allow_download: false };
    expect(canDownload(pyqResource)).toBe(false);
  });

  it('should return true when allow_download is missing or undefined for non-notes resources', () => {
    const resource = {} as Partial<Resource>;
    expect(canDownload(resource)).toBe(true);
  });
});
