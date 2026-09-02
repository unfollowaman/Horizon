import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

/**
 * Recursively lists all PDF files in a Supabase storage bucket concurrently.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string} path
 * @returns {Promise<Array<{name: string, path: string}>>}
 */
export async function findFiles(supabaseClient, path = '') {
  const { data, error } = await supabaseClient.storage.from('pdfs').list(path);
  if (error) {
    console.error("Error at", path, error);
    return [];
  }
  if (!data) return [];

  const allPDFs = [];
  const subfolderPromises = [];

  for (const item of data) {
    if (item.id === null) {
      const nextPath = path ? `${path}/${item.name}` : item.name;
      subfolderPromises.push(findFiles(supabaseClient, nextPath));
    } else if (item.name.endsWith('.pdf')) {
      allPDFs.push({
        name: item.name,
        path: path ? `${path}/${item.name}` : item.name
      });
    }
  }

  if (subfolderPromises.length > 0) {
    const subfolderResults = await Promise.all(subfolderPromises);
    for (const pdfs of subfolderResults) {
      allPDFs.push(...pdfs);
    }
  }

  return allPDFs;
}

export async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const allPDFs = await findFiles(supabase, '');
  console.log(`Found ${allPDFs.length} PDFs`);

  const { data: existingData, error: existingError } = await supabase.from('learning_resources').select('file_path');
  if (existingError) {
      console.error("Error fetching existing:", existingError);
      return;
  }
  const existingPaths = new Set(existingData.map(r => r.file_path));

  const toInsert = [];

  for (const pdf of allPDFs) {
    let title = pdf.name;
    let _class = "";
    let subject = "";
    let year = null;
    let resource_type = "pyq"; // PostgreSQL ENUM allowed value

    // First try matching filename format e.g. class-10-social-science-pyq-2021.pdf
    let match = pdf.name.match(/class-(\d+)-(.*?)-pyq-(\d{4})/i);

    // If filename doesn't match, parse directory path (e.g. class-10/social-science/pyqs/example.pdf)
    if (!match) {
        const pathParts = pdf.path.split('/');
        // Assuming path format: class-10/social-science/pyqs/example.pdf
        const classMatch = pathParts.find(p => p.match(/class-(\d+)/i));
        if (classMatch) {
            _class = classMatch.match(/class-(\d+)/i)[1];
            // Assuming subject is the folder after class-XX
            const classIndex = pathParts.indexOf(classMatch);
            if (classIndex !== -1 && pathParts.length > classIndex + 1) {
                subject = pathParts[classIndex + 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }
        // Try to find a year in the filename
        const yearMatch = pdf.name.match(/(\d{4})/);
        if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
        }
        title = _class && subject ? `Class ${_class} ${subject} PYQ ${year || ''}`.trim() : pdf.name;
    } else {
        _class = match[1];
        subject = match[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Title Case
        year = parseInt(match[3], 10);
        title = `Class ${_class} ${subject} PYQ ${year}`;
    }

    if (!existingPaths.has(pdf.path)) {
        toInsert.push({
            title: title,
            student_class: _class,
            subject: subject,
            resource_type: resource_type,
            medium: 'english', // PostgreSQL ENUM allowed value
            year: year,
            file_path: pdf.path,
        });
    }
  }

  if (toInsert.length > 0) {
      console.log("Inserting:", toInsert);
      const { data, error } = await supabase.from('learning_resources').insert(toInsert).select();
      if (error) {
          console.error("Insert Error:", error);
      } else {
          console.log("Successfully inserted", data.length, "rows");
      }
  } else {
      console.log("No new PDFs to insert.");
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && currentFilePath === process.argv[1]) {
  run();
}
