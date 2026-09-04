import type { ResourceType } from '../types';

export interface ResourceCategoryConfig {
  id: ResourceType | 'syllabus';
  title: string;
  description: string;
  path: string;
  isComingSoon: boolean;
  navLabel: string;
  showOnMobile: boolean;
  showOnDesktop: boolean;
}

export const RESOURCE_CATEGORIES: Record<ResourceType, ResourceCategoryConfig> = {
  pyq: {
    id: 'pyq',
    title: 'PYQ Papers',
    description: 'Past papers to help you prepare effectively.',
    path: '/library',
    isComingSoon: false,
    navLabel: 'PYQ Papers',
    showOnMobile: true,
    showOnDesktop: true,
  },
  flashcards: {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Quick-recall cards for fast revision.',
    path: '/coming-soon',
    isComingSoon: true,
    navLabel: 'Flashcards',
    showOnMobile: false,
    showOnDesktop: false,
  },
  mcq: {
    id: 'mcq',
    title: 'MCQ Sets',
    description: 'Exam-oriented questions and practice material.',
    path: '/coming-soon',
    isComingSoon: true,
    navLabel: 'MCQ Sets',
    showOnMobile: false,
    showOnDesktop: false,
  },
  revision_sheets: {
    id: 'revision_sheets',
    title: 'Revision Sheets',
    description: 'Condensed sheets for quick topic overview.',
    path: '/coming-soon',
    isComingSoon: true,
    navLabel: 'Revision Sheets',
    showOnMobile: false,
    showOnDesktop: false,
  },
  notes: {
    id: 'notes',
    title: 'Study Notes',
    description: 'Comprehensive notes for all subjects.',
    path: '/notes',
    isComingSoon: false,
    navLabel: 'Study Notes',
    showOnMobile: true,
    showOnDesktop: true,
  }
};

export const SYLLABUS_NAV_CONFIG: ResourceCategoryConfig = {
  id: 'syllabus',
  title: 'Syllabus',
  description: 'NCERT & CBSE syllabus directory and hierarchy.',
  path: '/syllabus',
  isComingSoon: false,
  navLabel: 'Syllabus',
  showOnMobile: true,
  showOnDesktop: true,
};

export const SYSTEM_NAV_LINKS = [
  { label: 'Updates', path: '/coming-soon', showOnMobile: false, showOnDesktop: false },
];

export const getAllFeatures = () => {
  const activeCategories = Object.values(RESOURCE_CATEGORIES)
    .filter(cat => !cat.isComingSoon)
    .map(cat => ({
      title: cat.title,
      desc: cat.description,
      path: cat.path,
      id: cat.id
    }));

  return [
    ...activeCategories,
    {
      title: SYLLABUS_NAV_CONFIG.title,
      desc: SYLLABUS_NAV_CONFIG.description,
      path: SYLLABUS_NAV_CONFIG.path,
      id: SYLLABUS_NAV_CONFIG.id,
    }
  ];
};

export const getNavLinks = () => {
  const resourceLinks = Object.values(RESOURCE_CATEGORIES)
    .filter(cat => cat.showOnMobile || cat.showOnDesktop)
    .map(cat => ({
      label: cat.navLabel,
      path: cat.path,
      showOnMobile: cat.showOnMobile,
      showOnDesktop: cat.showOnDesktop,
      id: cat.id
    }));

  const syllabusLink = {
    label: SYLLABUS_NAV_CONFIG.navLabel,
    path: SYLLABUS_NAV_CONFIG.path,
    showOnMobile: SYLLABUS_NAV_CONFIG.showOnMobile,
    showOnDesktop: SYLLABUS_NAV_CONFIG.showOnDesktop,
    id: SYLLABUS_NAV_CONFIG.id,
  };

  const systemLinks = SYSTEM_NAV_LINKS
    .filter(link => link.showOnMobile || link.showOnDesktop)
    .map(link => ({...link, id: 'system_updates'}));

  return [
    ...resourceLinks,
    syllabusLink,
    ...systemLinks
  ];
};
