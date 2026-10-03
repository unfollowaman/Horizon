import { subjectToSlug } from '../utils/urlHelper';

export interface IllustrationAttribution {
  url: string;
  text: string;
}

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
    description: 'NCERT & CBSE syllabus with chapter-wise learning resources.',
  },
  {
    id: '9',
    name: 'Class 9',
    slug: 'class-9',
    description: 'NCERT & CBSE 2026–27 syllabus with structured resources.',
  },
  {
    id: '10',
    name: 'Class 10',
    slug: 'class-10',
    description: 'Complete board-exam syllabus with chapter-wise learning resources.',
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

// Internal cache for memoized subjects per class ID to avoid redundant array allocations and string transformations
const subjectsCache: Record<string, SubjectOption[]> = {};

/**
 * Gets subjects list for class id ('8', '9', '10') or slug ('class-8', etc)
 */
export function getSubjectsForClass(classInput: string | null | undefined): SubjectOption[] {
  const classId = normalizeClassId(classInput);
  if (!classId || !CLASS_SUBJECTS[classId]) return [];

  if (!subjectsCache[classId]) {
    subjectsCache[classId] = CLASS_SUBJECTS[classId].map((subjectName) => {
      const slug = subjectToSlug(subjectName) || subjectName.toLowerCase().replace(/\s+/g, '-');
      return {
        id: slug,
        name: subjectName,
        slug,
      };
    });
  }

  return subjectsCache[classId];
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

/**
 * Metadata helper for class illustration asset URL, alt text, and Storyset attribution.
 */
export function getClassIllustrationMeta(classInput: string | null | undefined): {
  url: string;
  alt: string;
  attribution: IllustrationAttribution | null;
} {
  const classId = normalizeClassId(classInput);
  if (classId === '9') {
    return {
      url: '/assets/SVG Illustrations/class-9.svg',
      alt: 'Class 9 illustration',
      attribution: {
        url: 'https://storyset.com/education',
        text: 'Education illustrations by Storyset',
      },
    };
  }
  if (classId === '10') {
    return {
      url: '/assets/SVG Illustrations/class-10.svg',
      alt: 'Class 10 illustration',
      attribution: {
        url: 'https://storyset.com/people',
        text: 'People illustrations by Storyset',
      },
    };
  }
  // Class 8 has no attribution provided yet
  return {
    url: '/assets/SVG Illustrations/class-8.svg',
    alt: 'Class 8 illustration',
    attribution: null,
  };
}

/**
 * Metadata helper for subject illustration asset URL, alt text, and Storyset attribution.
 */
export function getSubjectIllustrationMeta(subjectSlugOrName: string | null | undefined): {
  url: string;
  alt: string;
  attribution: IllustrationAttribution | null;
} {
  const lower = (subjectSlugOrName || '').toLowerCase().trim();

  if (lower.includes('social') || lower.includes('history') || lower.includes('geography')) {
    return {
      url: '/assets/SVG Illustrations/social-science.svg',
      alt: 'Social Science illustration',
      attribution: {
        url: 'https://storyset.com/nature',
        text: 'Nature illustrations by Storyset',
      },
    };
  }
  if (lower.includes('science')) {
    return {
      url: '/assets/SVG Illustrations/science.svg',
      alt: 'Science illustration',
      attribution: {
        url: 'https://storyset.com/medical',
        text: 'Medical illustrations by Storyset',
      },
    };
  }
  if (lower.includes('math')) {
    return {
      url: '/assets/SVG Illustrations/mathematics.svg',
      alt: 'Mathematics illustration',
      attribution: {
        url: 'https://storyset.com/work',
        text: 'Work illustrations by Storyset',
      },
    };
  }
  if (lower.includes('hindi')) {
    return {
      url: '/assets/SVG Illustrations/Hindi.svg',
      alt: 'Hindi illustration',
      attribution: {
        url: 'https://storyset.com/home',
        text: 'Home illustrations by Storyset',
      },
    };
  }
  if (lower.includes('english')) {
    return {
      url: '/assets/SVG Illustrations/english.svg',
      alt: 'English illustration',
      attribution: {
        url: 'https://storyset.com/people',
        text: 'People illustrations by Storyset',
      },
    };
  }
  if (lower.includes('sanskrit')) {
    return {
      url: '/assets/SVG Illustrations/sanskrit.svg',
      alt: 'Sanskrit illustration',
      attribution: {
        url: 'https://storyset.com/people',
        text: 'People illustrations by Storyset',
      },
    };
  }

  return {
    url: '/assets/SVG Illustrations/study-notes.svg',
    alt: 'Subject illustration',
    attribution: null,
  };
}
