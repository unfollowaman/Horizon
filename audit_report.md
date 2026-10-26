# PDF Viewer Audit Report - Phase 6

## 1. Viewer Controls
**Location:** `src/pages/resources/PdfViewer.tsx`

*   **Download button:** EXISTS. Inside the bottom-right Three-Dots Menu (Lines 654-672). Conditionally rendered via `canDownload(resource)`.
*   **Print button:** DOES NOT EXIST.
*   **"Open in new tab" button:** DOES NOT EXIST.
*   **Back button:** EXISTS. Top-left floating control (Lines 525-542).
*   **Menu button:** EXISTS. Top-right floating hamburger menu (Lines 544-554).
*   **Zoom controls:** EXISTS. Inside Three-Dots Menu (zoomIn, zoomOut) (Lines 631-644).
*   **Page navigation:** IMPLEMENTED ELSEWHERE. The viewer relies on native vertical scrolling of all rendered pages (`react-zoom-pan-pinch` wrapper).
*   **Fullscreen control:** DOES NOT EXIST. The layout itself is visually full-screen (`100dvh`).
*   **Any browser/PDF.js toolbar:** DOES NOT EXIST. Custom UI only.
*   **Any other export/save/share controls:** EXISTS. Share button using `navigator.share` (Lines 645-653).

## 2. PDF.js / react-pdf Configuration
*   **react-pdf version:** `^10.4.1` (from `package.json`)
*   **pdfjs-dist version:** `5.4.296` (from `package-lock.json`)
*   **Document configuration:** `<Document file={signedUrl} ...>` (Lines 687-693)
*   **Page configuration:** `<Page pageNumber={index + 1} scale={1} renderTextLayer={false} renderAnnotationLayer={false} />` (Lines 702-709). Text layer and annotation layer are explicitly disabled.
*   **PDF.js worker configuration:** Handled via URL import at the top of the file: `pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();` (Lines 16-19).
*   **Plugins / Custom toolbar:** Uses `react-zoom-pan-pinch` (`TransformWrapper`, `TransformComponent`) for interaction. No native PDF.js toolbars are enabled.

## 3. Download Behavior
*   **Viewer Download button:** Currently exists.
*   **Browser PDF download controls:** Not applicable (PDF is not loaded via iframe or native viewer).
*   **Right-click/context menu:** Currently NOT prevented.
*   **Ctrl+S / Cmd+S:** Currently NOT intercepted or disabled.
*   **Keyboard shortcuts:** No download shortcuts are intercepted.
*   **Direct signed URL:** Not provided in the UI, but visible in the browser's Network tab.
*   **"Open in new tab":** Not supported in the UI.
*   **Browser save functionality:** The user can "Save Page As", but this will only save the HTML and rendered `<canvas>` elements, not the original PDF file.

## 4. Print Behavior
*   **Viewer Print button:** Does not exist.
*   **Ctrl+P / Cmd+P:** Currently NOT intercepted or disabled.
*   **Browser/PDF viewer controls:** Not applicable (no native PDF viewer controls).
*   **JavaScript print functionality:** None implemented.

## 5. Open-in-New-Tab Behavior
*   **Opening the PDF URL in a new tab:** Not possible via UI.
*   **Opening the signed URL directly:** Not exposed in the DOM, but a user could copy it from the Network tab.
*   **Target="_blank":** Not used for the PDF document.
*   **window.open():** Not used for the PDF document.
*   **Any external PDF viewer:** None used.

## 6. Keyboard Shortcuts
**File:** `src/pages/resources/PdfViewer.tsx`
*   **Ctrl+S / Cmd+S:** Not intercepted.
*   **Ctrl+P / Cmd+P:** Not intercepted.
*   **Ctrl+Shift+S / Cmd+Shift+S:** Not intercepted.
*   **Escape:** Not intercepted.
*   **Other PDF-related shortcuts:** None are currently handled.

## 7. Context Menu / Drag Behavior
**File:** `src/pages/resources/PdfViewer.tsx`
*   **right-click/context menu:** NOT prevented.
*   **image dragging:** NOT prevented.
*   **PDF/page dragging:** NOT prevented natively, though `react-zoom-pan-pinch` handles some pointer events.
*   **text selection:** Naturally prevented because `renderTextLayer={false}` is set, so no DOM text elements exist for the PDF content.
*   **browser drag-and-drop behavior:** NOT prevented or intercepted.

## 8. PDF Rendering Mode
*   The PDF is rendered into `<canvas>` elements via the `react-pdf` library.
*   It is NOT rendered using an iframe, a direct `<embed>`, or the native browser PDF plugin.
*   The actual text content is absent from the DOM (`renderTextLayer={false}`), meaning users cannot highlight or copy text natively.

## 9. Signed URL Exposure
*   **Where signedUrl state is stored:** In a React state variable `const [signedUrl, setSignedUrl] = useState<string | null>(null);` (Line 28).
*   **Whether it appears in the DOM:** No. It is passed as a prop to the `react-pdf` `<Document>` component (Line 688).
*   **Whether it is passed directly to an iframe:** No.
*   **Whether it is passed to react-pdf Document:** Yes (Line 688).
*   **Whether it is written to localStorage/sessionStorage:** No.
*   **Whether it is written to IndexedDB:** No.
*   **Whether it is placed in any persistent application state:** No, it exists strictly in the component's memory lifecycle.

## 10. Phase 6 Gap Analysis
*   **A. Remove Download button:** ✗ Still needs implementation (Present in Three-Dots Menu).
*   **B. Remove Print button:** ✓ Already satisfied (Never existed).
*   **C. Remove "Open in new tab":** ✓ Already satisfied (Never existed).
*   **D. Disable common PDF download/save shortcuts:** ✗ Still needs implementation.
*   **E. Disable print shortcuts:** ✗ Still needs implementation.
*   **F. Disable/limit obvious export functionality:** ✗ Still needs implementation (Context menu and drag behaviors need to be prevented).

## 11. Security Reality Check
*   **Controls that can be removed from the UI:** The explicit Download button and potentially the Share button (if it conflicts with export restrictions).
*   **Browser behaviors that can be discouraged/intercepted:** We can intercept keydown events for save (Ctrl+S) and print (Ctrl+P), and we can disable the right-click context menu via `onContextMenu={e => e.preventDefault()}`.
*   **What CANNOT be reliably prevented:** Once the browser requests the 60-second signed URL, a sufficiently determined user with DevTools open can always intercept the URL in the Network tab and download the original file before the signature expires. Additionally, preventing screenshots is impossible in standard web browsers. Web DRM is a layered deterrent, not an absolute guarantee.
