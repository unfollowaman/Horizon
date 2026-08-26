import { describe, it, expect } from 'vitest';
import {
  generateSitemapUrls,
  buildSitemapXml,
  classToSlug,
  mediumToSlug,
  subjectToSlug,
  STATIC_PAGES,
  type SitemapResource,
  type SitemapUrlEntry
} from '../sitemapGenerator';

describe('Sitemap Generator Unit Tests', () => {
  describe('Slug conversion helpers', () => {
    it('correctly converts class strings to slugs', () => {
      expect(classToSlug('Class 10')).toBe('class-10');
      expect(classToSlug('10')).toBe('class-10');
      expect(classToSlug('Class 8')).toBe('class-8');
      expect(classToSlug(null)).toBeNull();
    });

    it('correctly converts medium strings to slugs', () => {
      expect(mediumToSlug('English')).toBe('english-medium');
      expect(mediumToSlug('English Medium')).toBe('english-medium');
      expect(mediumToSlug('Hindi')).toBe('hindi-medium');
      expect(mediumToSlug(null)).toBeNull();
    });

    it('correctly converts subject strings to slugs', () => {
      expect(subjectToSlug('Geography')).toBe('geography');
      expect(subjectToSlug('Social Science')).toBe('social-science');
      expect(subjectToSlug('Political Science')).toBe('political-science');
      expect(subjectToSlug(null)).toBeNull();
    });
  });

  describe('generateSitemapUrls', () => {
    it('includes all main static pages', () => {
      const urls = generateSitemapUrls([]);
      const locs = urls.map((u: SitemapUrlEntry) => u.loc);

      expect(locs).toContain('https://unfollowaman.tech');
      expect(locs).toContain('https://unfollowaman.tech/about');
      expect(locs).toContain('https://unfollowaman.tech/contact');
      expect(locs).toContain('https://unfollowaman.tech/terms');
      expect(locs).toContain('https://unfollowaman.tech/privacy-policy');
      expect(locs).toContain('https://unfollowaman.tech/attribution');
      expect(locs).toContain('https://unfollowaman.tech/library');
      expect(locs).toContain('https://unfollowaman.tech/notes');
      expect(urls.length).toBe(STATIC_PAGES.length);
    });

    it('generates hierarchical category URLs and public resource landing pages from resources', () => {
      const mockResources: SitemapResource[] = [
        {
          id: '101',
          student_class: '10',
          medium: 'hindi',
          subject: 'History',
          resource_type: 'notes',
          created_at: '2026-08-01T10:00:00Z'
        },
        {
          id: '102',
          student_class: '10',
          medium: 'english',
          subject: 'Social Science',
          resource_type: 'pyq',
          created_at: '2026-08-02T10:00:00Z'
        }
      ];

      const urls = generateSitemapUrls(mockResources);
      const locs = urls.map((u: SitemapUrlEntry) => u.loc);

      // Public resource landing pages
      expect(locs).toContain('https://unfollowaman.tech/resource/101');
      expect(locs).toContain('https://unfollowaman.tech/resource/102');

      // Notes category URLs
      expect(locs).toContain('https://unfollowaman.tech/notes/class-10');
      expect(locs).toContain('https://unfollowaman.tech/notes/class-10/hindi-medium');
      expect(locs).toContain('https://unfollowaman.tech/notes/class-10/hindi-medium/history');

      // PYQ / Library category URLs
      expect(locs).toContain('https://unfollowaman.tech/library/class-10');
      expect(locs).toContain('https://unfollowaman.tech/library/class-10/english-medium');
      expect(locs).toContain('https://unfollowaman.tech/library/class-10/english-medium/social-science');

      // Ensure protected /view/:id URLs are NOT included
      expect(locs.some((url: string) => url.includes('/view/'))).toBe(false);
      expect(locs.some((url: string) => url.includes('/dashboard'))).toBe(false);
      expect(locs.some((url: string) => url.includes('.pdf'))).toBe(false);
    });

    it('does not generate unrepresented hypothetical category URLs', () => {
      const mockResources: SitemapResource[] = [
        {
          id: '201',
          student_class: '10',
          medium: 'hindi',
          subject: 'History',
          resource_type: 'notes'
        }
      ];

      const urls = generateSitemapUrls(mockResources);
      const locs = urls.map((u: SitemapUrlEntry) => u.loc);

      expect(locs).not.toContain('https://unfollowaman.tech/notes/class-10/sanskrit-medium/physics');
    });
  });

  describe('buildSitemapXml', () => {
    it('produces valid XML string with urlset tags', () => {
      const sampleUrls: SitemapUrlEntry[] = [
        { loc: 'https://unfollowaman.tech/', changefreq: 'weekly', priority: '1.0' },
        { loc: 'https://unfollowaman.tech/resource/101', lastmod: '2026-08-01', changefreq: 'weekly', priority: '0.7' }
      ];

      const xml = buildSitemapXml(sampleUrls);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<loc>https://unfollowaman.tech/</loc>');
      expect(xml).toContain('<loc>https://unfollowaman.tech/resource/101</loc>');
      expect(xml).toContain('<lastmod>2026-08-01</lastmod>');
      expect(xml).toContain('</urlset>');
    });
  });
});
