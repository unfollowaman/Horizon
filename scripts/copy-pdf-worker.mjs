import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.resolve(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const targetDir = path.resolve(projectRoot, 'public');
const targetPath = path.resolve(targetDir, 'pdf.worker.min.mjs');

if (!fs.existsSync(sourcePath)) {
  console.error(`[ERROR] PDF.js worker source file missing at: ${sourcePath}`);
  console.error('Please ensure pdfjs-dist package is installed in node_modules.');
  process.exit(1);
}

try {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`[SUCCESS] Copied PDF.js worker from ${sourcePath} to ${targetPath}`);
} catch (error) {
  console.error('[ERROR] Failed to copy PDF.js worker file:', error);
  process.exit(1);
}
