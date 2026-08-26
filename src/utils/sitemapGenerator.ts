export interface StaticPage {
  loc: string;
  changefreq: string;
  priority: string;
}

export interface SitemapResource {
  id: string | number;
  student_class?: string | number | null;
  medium?: string | null;
  subject?: string | null;
  resource_type?: string | null;
  created_at?: string | null;
  is_active?: boolean | null;
}

export interface SitemapUrlEntry {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

export const BASE_URL = 'https://unfollowaman.tech';

export const STATIC_PAGES: StaticPage[] = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/library', changefreq: 'daily', priority: '0.9' },
  { loc: '/notes', changefreq: 'daily', priority: '0.9' },
  { loc: '/about', changefreq: 'monthly', priority: '0.5' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
  { loc: '/terms', changefreq: 'monthly', priority: '0.3' },
  { loc: '/privacy-policy', changefreq: 'monthly', priority: '0.3' },
  { loc: '/attribution', changefreq: 'monthly', priority: '0.3' },
];

export function classToSlug(classVal: string | number | null | undefined): string | null {
  if (!classVal) return null;
  const match = String(classVal).match(/\d+/);
  return match ? `class-${match[0]}` : String(classVal).toLowerCase().trim().replace(/\s+/g, '-');
}

export function mediumToSlug(mediumVal: string | null | undefined): string | null {
  if (!mediumVal) return null;
  const lower = String(mediumVal).toLowerCase().trim();
  if (lower.startsWith('english')) return 'english-medium';
  if (lower.startsWith('hindi')) return 'hindi-medium';
  return lower.replace(/\s+/g, '-');
}

export function subjectToSlug(subjectVal: string | null | undefined): string | null {
  if (!subjectVal) return null;
  return String(subjectVal)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function generateSitemapUrls(resources: SitemapResource[] = []): SitemapUrlEntry[] {
  const urlMap = new Map<string, SitemapUrlEntry>();

  const addUrl = (urlPath: string, changefreq: string, priority: string, lastmod?: string) => {
    const cleanPath = urlPath === '/' ? '/' : (urlPath.startsWith('/') ? urlPath : `/${urlPath}`);
    const fullUrl = `${BASE_URL}${cleanPath === '/' ? '' : cleanPath}`;

    if (!urlMap.has(fullUrl)) {
      urlMap.set(fullUrl, { loc: fullUrl, changefreq, priority, lastmod });
    }
  };

  // 1. Static Pages
  STATIC_PAGES.forEach(page => {
    addUrl(page.loc, page.changefreq, page.priority);
  });

  // 2. Resource Landing Pages & Hierarchical Category URLs
  const categoryPaths = new Set<string>();

  resources.forEach(resource => {
    if (!resource.id) return;

    const lastmod = resource.created_at ? new Date(resource.created_at).toISOString().split('T')[0] : undefined;
    addUrl(`/resource/${resource.id}`, 'weekly', '0.7', lastmod);

    const basePath = resource.resource_type === 'notes' ? '/notes' : '/library';
    const cSlug = classToSlug(resource.student_class);
    const mSlug = mediumToSlug(resource.medium);
    const sSlug = subjectToSlug(resource.subject);

    if (cSlug) {
      categoryPaths.add(`${basePath}/${cSlug}`);
      if (mSlug) {
        categoryPaths.add(`${basePath}/${cSlug}/${mSlug}`);
        if (sSlug) {
          categoryPaths.add(`${basePath}/${cSlug}/${mSlug}/${sSlug}`);
        }
      } else if (sSlug) {
        categoryPaths.add(`${basePath}/${cSlug}/all-mediums/${sSlug}`);
      }
    }
  });

  categoryPaths.forEach(path => {
    addUrl(path, 'daily', '0.8');
  });

  return Array.from(urlMap.values());
}

export function buildSitemapXml(urls: SitemapUrlEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  urls.forEach(urlObj => {
    xml += '  <url>\n';
    xml += `    <loc>${urlObj.loc}</loc>\n`;
    if (urlObj.lastmod) {
      xml += `    <lastmod>${urlObj.lastmod}</lastmod>\n`;
    }
    xml += `    <changefreq>${urlObj.changefreq}</changefreq>\n`;
    xml += `    <priority>${urlObj.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';
  return xml;
}
