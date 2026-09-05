import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASE_URL = 'https://unfollowaman.tech';

export const STATIC_PAGES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/library', changefreq: 'daily', priority: '0.9' },
  { loc: '/notes', changefreq: 'daily', priority: '0.9' },
  { loc: '/syllabus', changefreq: 'weekly', priority: '0.9' },
  { loc: '/syllabus/class-8', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-8/mathematics', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-8/science', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-8/social-science', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-8/english', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-8/hindi', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-8/sanskrit', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-9', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-9/mathematics', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-9/science', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-9/social-science', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-9/english', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-9/hindi', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-9/sanskrit', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-10', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-10/mathematics', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-10/science', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-10/social-science', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-10/english', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-10/hindi-course-a', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-10/hindi-course-b', changefreq: 'weekly', priority: '0.8' },
  { loc: '/syllabus/class-10/sanskrit', changefreq: 'weekly', priority: '0.8' },
  { loc: '/about', changefreq: 'monthly', priority: '0.5' },
  { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
  { loc: '/terms', changefreq: 'monthly', priority: '0.3' },
  { loc: '/privacy-policy', changefreq: 'monthly', priority: '0.3' },
  { loc: '/attribution', changefreq: 'monthly', priority: '0.3' },
];

export function classToSlug(classVal) {
  if (!classVal) return null;
  const match = String(classVal).match(/\d+/);
  return match ? `class-${match[0]}` : String(classVal).toLowerCase().trim().replace(/\s+/g, '-');
}

export function mediumToSlug(mediumVal) {
  if (!mediumVal) return null;
  const lower = String(mediumVal).toLowerCase().trim();
  if (lower.startsWith('english')) return 'english-medium';
  if (lower.startsWith('hindi')) return 'hindi-medium';
  return lower.replace(/\s+/g, '-');
}

export function subjectToSlug(subjectVal) {
  if (!subjectVal) return null;
  return String(subjectVal)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function generateSitemapUrls(resources = []) {
  const urlMap = new Map();

  const addUrl = (urlPath, changefreq, priority, lastmod) => {
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
  const categoryPaths = new Set();

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

export function buildSitemapXml(urls) {
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

export async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  let resources = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase
        .from('learning_resources')
        .select('id, student_class, medium, subject, resource_type, created_at, is_active');

      if (error) {
        console.warn('Warning: Could not fetch resources from Supabase for sitemap:', error.message);
      } else if (data) {
        resources = data.filter(r => r.is_active !== false);
        console.log(`Fetched ${resources.length} active resources from Supabase.`);
      }
    } catch (err) {
      console.warn('Warning: Failed to connect to Supabase for sitemap generation:', err.message);
    }
  } else {
    console.warn('Warning: Supabase credentials not found in env. Sitemap generated with static routes only.');
  }

  const urls = generateSitemapUrls(resources);
  const xml = buildSitemapXml(urls);

  const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf-8');
  console.log(`Sitemap generated successfully at ${outputPath} with ${urls.length} total URLs.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Error generating sitemap:', err);
    process.exit(1);
  });
}
