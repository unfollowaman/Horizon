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

  it('includes crawlable Syllabus feature card in getAllFeatures', () => {
    const features = getAllFeatures();
    const syllabusFeature = features.find(f => f.id === 'syllabus');

    expect(syllabusFeature).toBeDefined();
    expect(syllabusFeature?.title).toBe('Syllabus');
    expect(syllabusFeature?.path).toBe('/syllabus/');
  });

  it('SYLLABUS_NAV_CONFIG is configured with trailing slash /syllabus/', () => {
    expect(SYLLABUS_NAV_CONFIG.path).toBe('/syllabus/');
  });
});
