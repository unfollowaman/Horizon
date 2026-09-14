import { describe, it, expect } from 'vitest';
import { getNavLinks, getAllFeatures, SYLLABUS_NAV_CONFIG } from '../resources';

describe('Navigation Links Configuration', () => {
  it('includes crawlable Syllabus link with trailing slash in getNavLinks', () => {
    const links = getNavLinks();
    const syllabusLink = links.find(l => l.id === 'syllabus');

    expect(syllabusLink).toBeDefined();
    expect(syllabusLink?.label).toBe('Syllabus');
    expect(syllabusLink?.path).toBe('/syllabus/');
    expect(syllabusLink?.showOnDesktop).toBe(true);
    expect(syllabusLink?.showOnMobile).toBe(true);
  });

  it('returns all visible navigation links with required fields and valid configuration in getNavLinks', () => {
    const links = getNavLinks();

    expect(links).toHaveLength(3);
    expect(links.map(l => l.id)).toEqual(['pyq', 'notes', 'syllabus']);
    expect(links.map(l => l.path)).toEqual(['/library', '/notes', '/syllabus/']);

    links.forEach(link => {
      expect(link).toHaveProperty('id');
      expect(link).toHaveProperty('label');
      expect(link).toHaveProperty('path');
      expect(typeof link.showOnMobile).toBe('boolean');
      expect(typeof link.showOnDesktop).toBe('boolean');
      expect(link.showOnMobile || link.showOnDesktop).toBe(true);
    });
  });

  it('filters out links where both showOnMobile and showOnDesktop are false in getNavLinks', () => {
    const links = getNavLinks();
    const hiddenSystemLink = links.find(l => l.id === 'system_updates');

    expect(hiddenSystemLink).toBeUndefined();
  });

  it('returns exactly 3 distinct active features in getAllFeatures', () => {
    const features = getAllFeatures();
    expect(features).toHaveLength(3);
    expect(features.map(f => f.id)).toEqual(['pyq', 'notes', 'syllabus']);
    expect(features.map(f => f.path)).toEqual(['/library', '/notes', '/syllabus/']);
  });

  it('SYLLABUS_NAV_CONFIG is configured with trailing slash /syllabus/', () => {
    expect(SYLLABUS_NAV_CONFIG.path).toBe('/syllabus/');
  });
});
