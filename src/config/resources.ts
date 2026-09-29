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

export const RESOURCE_CATEGORIES: Partial<Record<ResourceType, ResourceCategoryConfig>> & {
  pyq: ResourceCategoryConfig;
  notes: ResourceCategoryConfig;
} = {
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
  path: '/syllabus/',
  isComingSoon: false,
  navLabel: 'Syllabus',
  showOnMobile: true,
  showOnDesktop: true,
};

export const SYSTEM_NAV_LINKS = [
  { label: 'Updates', path: '/coming-soon', showOnMobile: false, showOnDesktop: false },
];

export const getAllFeatures = () => {
  const syllabus = {
    title: SYLLABUS_NAV_CONFIG.title,
    desc: SYLLABUS_NAV_CONFIG.description,
    path: SYLLABUS_NAV_CONFIG.path,
    id: SYLLABUS_NAV_CONFIG.id,
  };

  const notes = RESOURCE_CATEGORIES.notes && !RESOURCE_CATEGORIES.notes.isComingSoon ? {
    title: RESOURCE_CATEGORIES.notes.title,
    desc: RESOURCE_CATEGORIES.notes.description,
    path: RESOURCE_CATEGORIES.notes.path,
    id: RESOURCE_CATEGORIES.notes.id,
  } : null;

  const pyq = RESOURCE_CATEGORIES.pyq && !RESOURCE_CATEGORIES.pyq.isComingSoon ? {
    title: RESOURCE_CATEGORIES.pyq.title,
    desc: RESOURCE_CATEGORIES.pyq.description,
    path: RESOURCE_CATEGORIES.pyq.path,
    id: RESOURCE_CATEGORIES.pyq.id,
  } : null;

  return [syllabus, notes, pyq].filter((f): f is NonNullable<typeof f> => Boolean(f));
};

export const getNavLinks = () => {
  const resourceLinks = Object.values(RESOURCE_CATEGORIES)
    .filter((cat): cat is ResourceCategoryConfig => Boolean(cat) && (cat.showOnMobile || cat.showOnDesktop))
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
