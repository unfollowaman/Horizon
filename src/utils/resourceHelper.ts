import { supabase } from '../services/supabase';
import type { Resource } from '../types';

/**
 * Checks whether a resource is protected.
 * A resource is considered protected if its storage bucket is not the public 'pdfs' bucket
 * and its type is not 'pyq'.
 */
export const isResourceProtected = (resource: Partial<Resource>): boolean => {
  return resource.storage_bucket !== 'pdfs' && resource.resource_type !== 'pyq';
};

/**
 * Returns the URL for a resource.
 * If public, generates a public URL via Supabase Storage.
 * If protected, returns the raw file_path to avoid exposing an invalid public URL,
 * or the pdf_url if the file path is not set.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getResourceUrl = (item: any): string => {
  if (item.storage_bucket && item.storage_bucket !== 'pdfs' && item.resource_type !== 'pyq') {
    return item.file_path || item.pdf_url || '';
  }

  return item.file_path
    ? supabase.storage.from(item.storage_bucket || 'pdfs').getPublicUrl(item.file_path).data.publicUrl
    : (item.pdf_url || '');
};

/**
 * Normalizes a class value to its canonical database format (e.g., "Class 10" -> "10").
 */
export const normalizeClassValue = (classValue: string | null | undefined): string => {
  if (!classValue) return '';
  const trimmed = classValue.trim();
  const match = trimmed.match(/\d+/);
  return match ? match[0] : trimmed;
};
