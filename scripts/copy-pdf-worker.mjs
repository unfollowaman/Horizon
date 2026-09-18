import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let sourcePath = null;

// 1. Try Node module resolution using createRequire
try {
  const require = createRequire(import.meta.url);
  const resolved = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
  if (resolved && fs.existsSync(resolved)) {
    sourcePath = resolved;
  }
} catch {
  // Ignore require.resolve error and fall back to manual path checks
}

// 2. Fall back to manual node_modules path resolution from project root
if (!sourcePath) {
  const candidatePaths = [
    path.resolve(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    path.resolve(projectRoot, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      sourcePath = candidate;
      break;
    }
  }
}

if (!sourcePath) {
  console.error(`[ERROR] PDF.js worker source file could not be located in node_modules.`);
  console.error('Please ensure pdfjs-dist package is installed in node_modules.');
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
