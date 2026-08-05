import type { Resource } from '../types';

/**
 * Single source of truth for resource download permissions.
 * The frontend must completely respect learning_resources.allow_download.
 */
export const canDownload = (resource: Pick<Resource, 'allow_download'>): boolean => {
  return resource.allow_download !== false;
};
