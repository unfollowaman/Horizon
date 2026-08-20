import type { ResourcePageConfig } from '../pages/resources/ResourcePage';
import type { Resource } from '../types';

export const pyqConfig: ResourcePageConfig = {
  resourceType: 'pyq',
  title: 'PYQ Papers',
  includeChapters: false,
  thirdFilterType: 'year',
  emptyMessageTitle: 'No previous year papers found.',
  emptyMessageSubtitle: 'Try selecting a different class, subject, or year.',
  otherResourcesCategory: 'pyq',
  showInFeedAd: true,
  getThirdFilterDesktopLabel: () => 'All Years',
  getThirdFilterMobileLabel: () => 'Years',
  extractThirdFilterValues: (resources: Resource[]) => {
    const years = new Set(resources.map(r => r.year).filter(Boolean) as string[]);
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  },
  filterByThirdFilter: (resources: Resource[], filterValue: string) => {
    if (filterValue !== 'Years' && filterValue !== 'All Years') {
      return resources.filter(r => r.year === filterValue);
    }
    return resources;
  },
  sortResources: (resources: Resource[]) => {
    // Sort descending by year
    return resources.sort((a, b) => {
      const yearA = a.year ? parseInt(a.year) : 0;
      const yearB = b.year ? parseInt(b.year) : 0;
      return yearB - yearA;
    });
  }
};

export const notesConfig: ResourcePageConfig = {
  resourceType: 'notes',
  title: 'Study Notes',
  includeChapters: true,
  thirdFilterType: 'medium',
  emptyMessageTitle: 'No study notes found.',
  emptyMessageSubtitle: 'Try selecting a different class, subject, or medium.',
  otherResourcesCategory: 'notes',
  getThirdFilterDesktopLabel: () => 'All Mediums',
  getThirdFilterMobileLabel: () => 'Mediums',
  extractThirdFilterValues: (resources: Resource[]) => {
    const rawMediums = new Set(resources.map(r => r.medium).filter(Boolean) as string[]);
    return Array.from(rawMediums).map(m => m.charAt(0).toUpperCase() + m.slice(1)).sort();
  },
  filterByThirdFilter: (resources: Resource[], filterValue: string) => {
    if (filterValue !== 'Mediums' && filterValue !== 'All Mediums') {
      return resources.filter(r => r.medium && r.medium.toLowerCase() === filterValue.toLowerCase());
    }
    return resources;
  },
  sortResources: (resources: Resource[]) => {
    // Sort by chapter number if possible, else title
    return resources.sort((a, b) => {
      if (a.chapters && b.chapters) {
        return a.chapters.chapter_number - b.chapters.chapter_number;
      }
      return a.title.localeCompare(b.title);
    });
  }
};
