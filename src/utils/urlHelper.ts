/**
 * Utility functions for converting between Horizon filter values (Class, Medium, Subject, Year)
 * and canonical hierarchical URL slugs.
 */

// --- Slug Formatting Helpers ---

/**
 * Converts a class value like "Class 10", "class 10", "10", or "Class 8" to "class-10", "class-8", etc.
 */
export function classToSlug(classVal: string | null | undefined): string | null {
  if (!classVal) return null;
  const match = classVal.match(/\d+/);
  if (match) {
    return `class-${match[0]}`;
  }
  return classVal.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Converts a class slug like "class-10" or "10" back to "Class 10".
 */
export function slugToClass(slug: string | null | undefined, availableClasses?: string[]): string | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();

  // Try matching against available classes first
  if (availableClasses && availableClasses.length > 0) {
    const found = availableClasses.find(c => classToSlug(c) === normalized);
    if (found) return found;
  }

  const match = normalized.match(/(?:class-)?(\d+)/);
  if (match) {
    return `Class ${match[1]}`;
  }
  return slug;
}

/**
 * Converts medium value like "English", "Hindi", "English Medium", "english" to "english-medium" or "hindi-medium".
 */
export function mediumToSlug(mediumVal: string | null | undefined): string | null {
  if (!mediumVal) return null;
  const lower = mediumVal.toLowerCase().trim();
  if (lower.startsWith('english')) return 'english-medium';
  if (lower.startsWith('hindi')) return 'hindi-medium';
  return lower.replace(/\s+/g, '-');
}

/**
 * Converts medium slug like "english-medium", "english", "hindi-medium" back to "English" or "Hindi".
 */
export function slugToMedium(slug: string | null | undefined, availableMediums?: string[]): string | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();

  if (availableMediums && availableMediums.length > 0) {
    const found = availableMediums.find(m => mediumToSlug(m) === normalized || m.toLowerCase() === normalized);
    if (found) return found;
  }

  if (normalized.startsWith('english')) return 'English';
  if (normalized.startsWith('hindi')) return 'Hindi';

  // Capitalize first letter as fallback
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Converts a subject title like "Geography", "Social Science" to "geography", "social-science".
 */
export function subjectToSlug(subjectVal: string | null | undefined): string | null {
  if (!subjectVal) return null;
  return subjectVal
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Converts a subject slug back to match an available subject title (or formatted title).
 */
export function slugToSubject(slug: string | null | undefined, availableSubjects?: string[]): string | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();

  if (availableSubjects && availableSubjects.length > 0) {
    const found = availableSubjects.find(s => subjectToSlug(s) === normalized);
    if (found) return found;
  }

  // Fallback title casing: "social-science" -> "Social Science"
  return normalized
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// --- Hierarchical URL Builder ---

export interface CategoryUrlParams {
  basePath: string; // '/notes' or '/library'
  studentClass?: string | null;
  medium?: string | null;
  subject?: string | null;
  year?: string | null;
}

/**
 * Builds canonical hierarchical URL path.
 * Example: buildCategoryUrl({ basePath: '/notes', studentClass: 'Class 10', medium: 'English', subject: 'Geography' })
 * => '/notes/class-10/english-medium/geography'
 */
export function buildCategoryUrl(params: CategoryUrlParams): string {
  const { basePath, studentClass, medium, subject, year } = params;
  const base = basePath.startsWith('/') ? basePath : `/${basePath}`;

  const cSlug = classToSlug(studentClass);

  const getValidMediumSlug = (m: string | null | undefined): string | null => {
    if (!m || m === 'Mediums' || m === 'All Mediums') return null;
    const slug = mediumToSlug(m);
    if (!slug || slug === 'all-mediums' || slug === 'mediums') return null;
    return slug;
  };

  const getValidSubjectSlug = (s: string | null | undefined): string | null => {
    if (!s || s === 'Subjects' || s === 'All Subjects') return null;
    const slug = subjectToSlug(s);
    if (!slug || slug === 'subjects' || slug === 'all-subjects') return null;
    return slug;
  };

  const mSlug = getValidMediumSlug(medium);
  const sSlug = getValidSubjectSlug(subject);
  const hasValidYear = year && year !== 'Years' && year !== 'All Years';

  if (cSlug) {
    const segments: string[] = [cSlug];
    if (mSlug) {
      segments.push(mSlug);
      if (sSlug) {
        segments.push(sSlug);
      }
    } else if (sSlug) {
      // If class and subject are present without medium
      segments.push('all-mediums', sSlug);
    }

    let path = `${base}/${segments.join('/')}`;
    if (hasValidYear) {
      path += `?year=${encodeURIComponent(year)}`;
    }
    return path;
  }

  const searchParams = new URLSearchParams();
  if (mSlug) {
    searchParams.set('medium', mSlug);
  }
  if (sSlug) {
    searchParams.set('subject', sSlug);
  }
  if (hasValidYear) {
    searchParams.set('year', year);
  }

  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Helper to check if a slug string represents a valid class slug format (e.g. "class-10" or "10").
 */
export function isClassSlug(slug: string): boolean {
  return /^class-\d+$/i.test(slug) || /^\d+$/.test(slug);
}

/**
 * Helper to check if a slug string represents a medium slug (e.g. "english-medium", "hindi-medium", "english", "hindi").
 */
export function isMediumSlug(slug: string): boolean {
  const lower = slug.toLowerCase();
  return lower.startsWith('english') || lower.startsWith('hindi') || lower === 'all-mediums';
}
