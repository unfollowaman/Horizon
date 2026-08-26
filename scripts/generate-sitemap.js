import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { generateSitemapUrls, buildSitemapXml } from '../src/utils/sitemapGenerator.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
