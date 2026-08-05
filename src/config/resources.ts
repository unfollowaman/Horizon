import type { ResourceType } from '../types';

export interface ResourceCategoryConfig {
  id: ResourceType;
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
    showOnMobile: true,
    showOnDesktop: true,
  },
  mcq: {
    id: 'mcq',
    title: 'MCQ Sets',
    description: 'Exam-oriented questions and practice material.',
    path: '/coming-soon',
    isComingSoon: true,
    navLabel: 'MCQ Sets',
    showOnMobile: true,
    showOnDesktop: true,
  },
  revision_sheets: {
    id: 'revision_sheets',
    title: 'Revision Sheets',
    description: 'Condensed sheets for quick topic overview.',
    path: '/coming-soon',
    isComingSoon: true,
    navLabel: 'Revision Sheets',
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

export const SYSTEM_NAV_LINKS = [
  { label: 'Updates', path: '/coming-soon', showOnMobile: true, showOnDesktop: true },
];

export const getAllFeatures = () => {
  const resourceFeatures = Object.values(RESOURCE_CATEGORIES).map(cat => ({
    title: cat.title,
    desc: cat.isComingSoon ? `${cat.description} (Coming Soon)` : cat.description,
    path: cat.path,
    id: cat.id
  }));
  return [
    ...resourceFeatures,
    { title: "Updates", desc: "Stay updated with newly uploaded resources. (Coming Soon)", path: "/coming-soon", id: 'updates' }
  ];
};

export const getNavLinks = () => {
  const resourceLinks = Object.values(RESOURCE_CATEGORIES).map(cat => ({
    label: cat.navLabel,
    path: cat.path,
    showOnMobile: cat.showOnMobile,
    showOnDesktop: cat.showOnDesktop,
    id: cat.id
  }));
  return [
    ...resourceLinks,
    ...SYSTEM_NAV_LINKS.map(link => ({...link, id: 'system_updates'}))
  ];
};
