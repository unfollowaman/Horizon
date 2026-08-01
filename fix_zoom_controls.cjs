const fs = require('fs');
const path = 'src/pages/resources/PdfViewer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find and remove the block
// {/* Desktop Zoom Controls (Optional, keeping as per original) */}
// <div className={styles.zoomControls}> ... </div>

const startMarker = '{/* Desktop Zoom Controls (Optional, keeping as per original) */}';
const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
    // Find the end of the div
    const endMarker = '</div>';
    let currentIndex = content.indexOf('<div className={styles.zoomControls}>', startIndex);

    // We know there are 3 inner buttons and 1 div closing it. Let's just do a regex replace for the whole thing
    content = content.replace(/\{\/\* Desktop Zoom Controls \(Optional, keeping as per original\) \*\/\}[\s\S]*?<div className=\{styles\.zoomControls\}>[\s\S]*?<\/div>/, '');
    fs.writeFileSync(path, content);
    console.log('Removed old zoom controls.');
} else {
    console.log('Could not find zoom controls block.');
}
