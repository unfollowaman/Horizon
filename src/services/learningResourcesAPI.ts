import { supabase } from './supabase';
import type { Resource, ResourceType, Medium, LearningResourceRow, Chapter } from '../types';
import { getResourceUrl } from '../utils/resourceHelper';

// Map database row to Resource object
export const mapLearningResource = (item: LearningResourceRow): Resource => {
  let className: string | null | undefined;
  if (item.student_class) {
    const strClass = String(item.student_class);
    const trimmed = strClass.trim();
    if (/^\d+$/.test(trimmed)) {
      className = `Class ${trimmed}`;
    } else if (/^class\s+\d+$/i.test(trimmed)) {
      const numMatch = trimmed.match(/\d+/);
      if (numMatch) {
        className = `Class ${numMatch[0]}`;
      } else {
        className = trimmed;
      }
    } else {
      className = trimmed;
    }
  } else {
    className = item.student_class === null ? null : undefined;
  }

  let title = item.title ?? '';
  if (item.resource_type === 'notes') {
    const rawTitle = item.title ? String(item.title).trim() : '';
    const chapterObj = item.chapters as Chapter | null | undefined;
    const chapterNum = chapterObj?.chapter_number;

    if (rawTitle) {
      if (/^chapter\s+[^:]+:/i.test(rawTitle)) {
        title = item.title ?? '';
      } else if (chapterNum !== undefined && chapterNum !== null) {
        title = `Chapter ${chapterNum}: ${item.title}`;
      } else {
        title = item.title ?? '';
      }
    } else if (chapterObj && chapterNum !== undefined && chapterNum !== null) {
      title = `Chapter ${chapterNum}: ${chapterObj.chapter_name}`;
    }
  }

  const chapterObj = item.chapters as Chapter | null | undefined;

  const chapterSummary = item.chapter_summary || chapterObj?.chapter_summary || null;
  const topics = (item.topics || chapterObj?.topics || null) as Resource['topics'];
  const keyConcepts = (item.key_concepts || chapterObj?.key_concepts || null) as Resource['key_concepts'];
  const importantTerms = (item.important_terms || chapterObj?.important_terms || null) as Resource['important_terms'];
  const learningObjectives = (item.learning_objectives || chapterObj?.learning_objectives || null) as Resource['learning_objectives'];
  const examRelevantThemes = (item.exam_relevant_themes || chapterObj?.exam_relevant_themes || null) as Resource['exam_relevant_themes'];
  const studyGuidance = (item.study_guidance || chapterObj?.study_guidance || null) as Resource['study_guidance'];

  return {
    id: item.id,
    title: title,
    description: item.description || '',
    resource_type: item.resource_type as ResourceType,
    medium: item.medium,
    uploadDate: item.created_at || new Date().toISOString(),
    pdfUrl: getResourceUrl(item),
    thumbnailUrl: item.thumbnail_url || '',
    student_class: className,
    subject: item.subject,
    year: item.year ? item.year.toString() : undefined,
    chapter_id: item.chapter_id,
    chapters: chapterObj,
    allow_download: item.allow_download ?? undefined,
    storage_bucket: item.storage_bucket,
    file_path: item.file_path,
    chapter_summary: chapterSummary,
    topics: topics,
    key_concepts: keyConcepts,
    important_terms: importantTerms,
    learning_objectives: learningObjectives,
    exam_relevant_themes: examRelevantThemes,
    study_guidance: studyGuidance,
    total_pages: item.total_pages || null,
    total_marks: item.total_marks || null,
    duration: item.duration || null,
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
  const selectQuery = filters.includeChapters
    ? 'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance, chapters(id, chapter_number, chapter_name, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance)'
    : 'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance';

  let query = supabase.from('learning_resources').select(selectQuery);

  if (filters.resource_type) query = query.eq('resource_type', filters.resource_type);
  if (filters.student_class) query = query.eq('student_class', filters.student_class);
  if (filters.subject) query = query.eq('subject', filters.subject);
  if (filters.medium) query = query.eq('medium', filters.medium);
  if (filters.neqId) query = query.neq('id', filters.neqId);
  if (filters.limit) query = query.limit(filters.limit);

  const { data: initialData, error: initialError } = await query;

  let data: LearningResourceRow[] | null = initialData as unknown as LearningResourceRow[] | null;
  let error = initialError;

  // Fallback to legacy schema if newly added columns do not exist in database yet (PostgREST error 42703 or PGRST204)
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('column'))) {
    const legacySelect = filters.includeChapters
      ? 'id, title, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapters(id, chapter_number, chapter_name)'
      : 'id, title, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path';

    let legacyQuery = supabase.from('learning_resources').select(legacySelect);

    if (filters.resource_type) legacyQuery = legacyQuery.eq('resource_type', filters.resource_type);
    if (filters.student_class) legacyQuery = legacyQuery.eq('student_class', filters.student_class);
    if (filters.subject) legacyQuery = legacyQuery.eq('subject', filters.subject);
    if (filters.medium) legacyQuery = legacyQuery.eq('medium', filters.medium);
    if (filters.neqId) legacyQuery = legacyQuery.neq('id', filters.neqId);
    if (filters.limit) legacyQuery = legacyQuery.limit(filters.limit);

    const legacyResult = await legacyQuery;
    data = legacyResult.data as unknown as LearningResourceRow[] | null;
    error = legacyResult.error;
  }

  if (error) {
    return { data: null, error };
  }

  const mappedResources: Resource[] = data ? data.map(mapLearningResource) : [];
  return { data: mappedResources, error: null };
};

export const fetchLearningResourceById = async (id: string, includeChapters: boolean = false) => {
  const expandedSelect = includeChapters
    ? 'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance, chapters(id, chapter_number, chapter_name, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance)'
    : 'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance';

  const { data: initialData, error: initialError } = await supabase
    .from('learning_resources')
    .select(expandedSelect)
    .eq('id', id)
    .single();

  let data: LearningResourceRow | null = initialData as unknown as LearningResourceRow | null;
  let error = initialError;

  // Fallback to legacy schema if newly added columns do not exist in database yet (PostgREST error 42703 or PGRST204)
  if (error && (error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('column'))) {
    const legacySelect = includeChapters
      ? 'id, title, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapters(id, chapter_number, chapter_name)'
      : 'id, title, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path';

    const legacyResult = await supabase
      .from('learning_resources')
      .select(legacySelect)
      .eq('id', id)
      .single();

    data = legacyResult.data as unknown as LearningResourceRow | null;
    error = legacyResult.error;
  }

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
