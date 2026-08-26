export declare const BASE_URL: string;
export declare const STATIC_PAGES: Array<{ loc: string; changefreq: string; priority: string }>;
export declare function classToSlug(classVal: string | number | null | undefined): string | null;
export declare function mediumToSlug(mediumVal: string | null | undefined): string | null;
export declare function subjectToSlug(subjectVal: string | null | undefined): string | null;
export declare function generateSitemapUrls(resources?: Array<{
  id?: string | number;
  student_class?: string | number | null;
  medium?: string | null;
  subject?: string | null;
  resource_type?: string | null;
  created_at?: string | null;
  is_active?: boolean | null;
}>): Array<{ loc: string; changefreq: string; priority: string; lastmod?: string }>;
export declare function buildSitemapXml(urls: Array<{ loc: string; changefreq: string; priority: string; lastmod?: string }>): string;
export declare function main(): Promise<void>;
