import { describe, it, expect } from 'vitest';
import { canDownload } from '../permissions';
import type { Resource } from '../../types';

describe('canDownload', () => {
  it('should return true when allow_download is true', () => {
    const resource: Pick<Resource, 'allow_download'> = { allow_download: true };
    expect(canDownload(resource)).toBe(true);
  });

  it('should return false when allow_download is false', () => {
    const resource: Pick<Resource, 'allow_download'> = { allow_download: false };
    expect(canDownload(resource)).toBe(false);
  });

  it('should return true when allow_download is undefined', () => {
    const resource: Pick<Resource, 'allow_download'> = { allow_download: undefined };
    expect(canDownload(resource)).toBe(true);
  });

  it('should return true when allow_download is missing', () => {
    const resource = {} as Pick<Resource, 'allow_download'>;
    expect(canDownload(resource)).toBe(true);
  });
});
