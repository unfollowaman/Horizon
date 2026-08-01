import fs from 'fs';
const path = 'src/pages/resources/PdfViewer.tsx';
const content = fs.readFileSync(path, 'utf-8');

if (!content.includes('className={`${styles.floatingTopLeft} neu-raised`}')) {
    console.error('Missing floating TopLeft button');
    process.exit(1);
}
if (!content.includes('className={`${styles.floatingTopRight} neu-raised`}')) {
    console.error('Missing floating TopRight button');
    process.exit(1);
}
if (!content.includes('className={`${styles.floatingBottomRight} ${styles.threeDotsWrapper}`}')) {
    console.error('Missing floating BottomRight button');
    process.exit(1);
}
console.log('Checks passed.');
