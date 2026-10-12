import type { Resource } from '../types';

/**
 * Single source of truth for resource download permissions.
 * The frontend must completely respect learning_resources.allow_download.
 */
export const canDownload = (resource: Partial<Pick<Resource, 'allow_download' | 'resource_type'>>): boolean => {
  if (resource.resource_type === 'notes') {
    return false;
  }
  return resource.allow_download !== false;
};
