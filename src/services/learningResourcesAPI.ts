import { supabase } from './supabase';
import type { Resource, ResourceType, Medium } from '../types';
import { getResourceUrl } from '../utils/resourceHelper';

// Map database row to Resource object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapLearningResource = (item: any): Resource => {
  let className = item.student_class;
  if (className) {
    const strClass = String(className);
    const trimmed = strClass.trim();
    if (/^\d+$/.test(trimmed)) {
      className = `Class ${trimmed}`;
    } else if (/^class\s+\d+$/i.test(trimmed)) {
      const numMatch = trimmed.match(/\d+/);
      if (numMatch) {
        className = `Class ${numMatch[0]}`;
      }
    } else {
      className = trimmed;
    }
  }

  let title = item.title;
  if (item.chapters) {
    title = `Chapter ${item.chapters.chapter_number}: ${item.chapters.chapter_name}`;
  }

  return {
    id: item.id,
    title: title,
    description: item.description,
    resource_type: item.resource_type as ResourceType,
    medium: item.medium,
    uploadDate: item.created_at || new Date().toISOString(),
    pdfUrl: getResourceUrl(item),
    thumbnailUrl: item.thumbnail_url || '',
    student_class: className,
    subject: item.subject,
    year: item.year ? item.year.toString() : undefined,
    chapter_id: item.chapter_id,
    chapters: item.chapters,
    allow_download: item.allow_download ?? undefined,
    storage_bucket: item.storage_bucket,
    file_path: item.file_path,
  };
};

export interface FetchResourcesFilters {
  resource_type?: ResourceType;
  student_class?: string;
  subject?: string;
  medium?: Medium;
  includeChapters?: boolean;
  neqId?: string;
  limit?: number;
}

export const fetchLearningResources = async (filters: FetchResourcesFilters = {}) => {
  let query = supabase.from('learning_resources').select(filters.includeChapters ? 'id, title, description, resource_type, medium, created_at, pdf_url, thumbnail_url, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapters(id, chapter_number, chapter_name)' : 'id, title, description, resource_type, medium, created_at, pdf_url, thumbnail_url, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path');

  if (filters.resource_type) query = query.eq('resource_type', filters.resource_type);
  if (filters.student_class) query = query.eq('student_class', filters.student_class);
  if (filters.subject) query = query.eq('subject', filters.subject);
  if (filters.medium) query = query.eq('medium', filters.medium);
  if (filters.neqId) query = query.neq('id', filters.neqId);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  const mappedResources: Resource[] = data ? data.map(mapLearningResource) : [];
  return { data: mappedResources, error: null };
};

export const fetchLearningResourceById = async (id: string, includeChapters: boolean = false) => {
  const { data, error } = await supabase
    .from('learning_resources')
    .select(includeChapters ? 'id, title, description, resource_type, medium, created_at, pdf_url, thumbnail_url, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapters(id, chapter_number, chapter_name)' : 'id, title, description, resource_type, medium, created_at, pdf_url, thumbnail_url, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error };
  }

  const mappedResource = data ? mapLearningResource(data) : null;
  return { data: mappedResource, rawData: data, error: null };
};

export const fetchSyllabusChapters = async (studentClass: string, medium: Medium) => {
  const { data, error } = await supabase
    .from('learning_resources')
    .select('chapter_id, subject')
    .eq('resource_type', 'notes')
    .eq('student_class', studentClass)
    .eq('medium', medium)
    .not('chapter_id', 'is', null);

  return { data, error };
};
