import { subjectToSlug } from '../utils/urlHelper';

export interface ClassOption {
  id: string; // e.g. '8', '9', '10'
  name: string; // e.g. 'Class 8', 'Class 9', 'Class 10'
  slug: string; // e.g. 'class-8', 'class-9', 'class-10'
  description: string;
}

export interface SubjectOption {
  id: string; // e.g. 'mathematics'
  name: string; // e.g. 'Mathematics' or 'Hindi Course A'
  slug: string; // e.g. 'mathematics', 'hindi-course-a'
  iconName?: string;
  description?: string;
}

export const SUPPORTED_CLASSES: ClassOption[] = [
  {
    id: '8',
    name: 'Class 8',
    slug: 'class-8',
    description: 'NCERT & CBSE syllabus breakdown for Class 8 subjects.',
  },
  {
    id: '9',
    name: 'Class 9',
    slug: 'class-9',
    description: 'NCERT & NCF-SE 2026-27 framework including Kaveri, Ganga & Shardā readers.',
  },
  {
    id: '10',
    name: 'Class 10',
    slug: 'class-10',
    description: 'Complete board examination syllabus for Class 10 subjects including Hindi Course A & B.',
  },
];

export const CLASS_SUBJECTS: Record<string, string[]> = {
  '8': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Sanskrit'],
  '9': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi', 'Sanskrit'],
  '10': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi Course A', 'Hindi Course B', 'Sanskrit'],
};

/**
 * Normalizes classSlug or className to '8', '9', '10'
 */
export function normalizeClassId(classInput: string | null | undefined): string | null {
  if (!classInput) return null;
  const match = classInput.match(/\d+/);
  if (match) {
    const num = match[0];
    if (['8', '9', '10'].includes(num)) return num;
  }
  return null;
}

/**
 * Gets subjects list for class id ('8', '9', '10') or slug ('class-8', etc)
 */
export function getSubjectsForClass(classInput: string | null | undefined): SubjectOption[] {
  const classId = normalizeClassId(classInput);
  if (!classId || !CLASS_SUBJECTS[classId]) return [];

  return CLASS_SUBJECTS[classId].map((subjectName) => {
    const slug = subjectToSlug(subjectName) || subjectName.toLowerCase().replace(/\s+/g, '-');
    return {
      id: slug,
      name: subjectName,
      slug,
    };
  });
}

/**
 * Resolves a subject slug (e.g. 'hindi-course-a') to exact database subject name (e.g. 'Hindi Course A')
 */
export function resolveSubjectName(classInput: string | null | undefined, subjectSlugOrName: string | null | undefined): string | null {
  if (!subjectSlugOrName) return null;
  const subjects = getSubjectsForClass(classInput);
  if (subjects.length === 0) return null;

  const normalizedSlug = subjectToSlug(subjectSlugOrName) || subjectSlugOrName.toLowerCase().trim();

  const found = subjects.find((s) => s.slug === normalizedSlug || s.name.toLowerCase() === subjectSlugOrName.toLowerCase());
  if (found) return found.name;

  return null;
}

/**
 * Gets class object by slug or ID
 */
export function getClassBySlug(slugOrId: string | null | undefined): ClassOption | null {
  const classId = normalizeClassId(slugOrId);
  if (!classId) return null;
  return SUPPORTED_CLASSES.find((c) => c.id === classId) || null;
}
