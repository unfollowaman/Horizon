const fs = require('fs');
const path = 'src/pages/resources/PdfViewer.module.css';
const content = fs.readFileSync(path, 'utf8');

if (!content.includes('.pageContainer {')) {
  console.error("Missing .pageContainer");
  process.exit(1);
}
if (!content.includes('env(safe-area-inset-top)')) {
  console.error("Missing env(safe-area-inset-top)");
  process.exit(1);
}

console.log('CSS checks passed');
