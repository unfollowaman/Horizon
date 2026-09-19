import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let sourcePath = null;

try {
  const require = createRequire(import.meta.url);
  // Resolve package manifest of pdfjs-dist directly
  const packageJsonPath = require.resolve('pdfjs-dist/package.json');
  const pdfjsDir = path.dirname(packageJsonPath);
  const workerPath = path.resolve(pdfjsDir, 'build/pdf.worker.min.mjs');

  if (fs.existsSync(workerPath)) {
    sourcePath = workerPath;
  }
} catch (error) {
  console.warn('[WARN] Could not resolve pdfjs-dist/package.json via require.resolve:', error?.message);
}

// Direct node_modules fallback if require.resolve is unavailable
if (!sourcePath) {
  const fallbackPath = path.resolve(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
  if (fs.existsSync(fallbackPath)) {
    sourcePath = fallbackPath;
  }
}

if (!sourcePath) {
  console.error('[ERROR] Could not locate installed pdf.worker.min.mjs in pdfjs-dist.');
  console.error('Please ensure pdfjs-dist package is installed.');
  process.exit(1);
}

const targetDir = path.resolve(projectRoot, 'public');
const targetPath = path.resolve(targetDir, 'pdf.worker.min.mjs');

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
