import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Robots.txt Configuration & Crawlability Integration Tests', () => {
  const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
  const sitemapPath = path.resolve(process.cwd(), 'public/sitemap.xml');

  it('exists and is syntactically valid', () => {
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, 'utf8');

    expect(content).toContain('User-agent: *');
    expect(content).toContain('Sitemap: https://unfollowaman.tech/sitemap.xml');
  });

  it('intentionally disallows auth and private application routes', () => {
    const content = fs.readFileSync(robotsPath, 'utf8');

    const expectedDisallows = [
      '/dashboard',
      '/settings/',
      '/onboarding',
      '/login',
      '/register',
      '/coming-soon',
      '/view/',
    ];

    expectedDisallows.forEach((route) => {
      expect(content).toContain(`Disallow: ${route}`);
    });
  });

  it('does not disallow public indexable educational or informational routes', () => {
    const content = fs.readFileSync(robotsPath, 'utf8');
    const disallowLines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('Disallow:'))
      .map((line) => line.replace('Disallow:', '').trim());

    const publicRoutes = [
      '/',
      '/about',
      '/contact',
      '/terms',
      '/privacy-policy',
      '/attribution',
      '/library',
      '/library/class-10',
      '/library/class-10/english-medium',
      '/library/class-10/english-medium/science',
      '/notes',
      '/notes/class-10',
      '/notes/class-10/english-medium',
      '/notes/class-10/english-medium/science',
      '/syllabus',
      '/syllabus/class-10',
      '/syllabus/class-10/science',
      '/resource/1',
      '/resource/87',
    ];

    publicRoutes.forEach((publicRoute) => {
      const isBlocked = disallowLines.some((disallowed) => {
        if (disallowed === publicRoute) return true;
        if (disallowed.endsWith('/') && publicRoute.startsWith(disallowed)) return true;
        if (!disallowed.endsWith('/') && (publicRoute === disallowed || publicRoute.startsWith(disallowed + '/'))) return true;
        return false;
      });

      expect(isBlocked).toBe(false);
    });
  });

  it('ensures sitemap.xml contains no disallowed routes', () => {
    if (!fs.existsSync(sitemapPath)) return;

    const xmlContent = fs.readFileSync(sitemapPath, 'utf8');
    const disallowedRoutes = [
      '/dashboard',
      '/settings',
      '/onboarding',
      '/login',
      '/register',
      '/coming-soon',
      '/view',
    ];

    disallowedRoutes.forEach((route) => {
      expect(xmlContent).not.toContain(`<loc>https://unfollowaman.tech${route}</loc>`);
      expect(xmlContent).not.toContain(`<loc>https://unfollowaman.tech${route}/`);
    });
  });
});
