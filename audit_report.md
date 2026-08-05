# Horizon Frontend Audit: Download Entry Points & Permissions

This report audits the Horizon frontend to identify all download mechanisms for resources and how `learning_resources.allow_download` should become the single source of truth for download permissions.

## 1. Download Entry Points (UI elements)
- **`src/components/MaterialCard.tsx` (Lines 210-230):** Renders a "Download" button next to the "View" button for resources that have a `pdfUrl`.
- **`src/pages/resources/PdfViewer.tsx` (Lines 562-577):** Renders a floating download icon button inside the three-dots menu (Top-Right controls) when viewing a PDF.

## 2. Download URL Generation
- **`src/utils/download.ts` (Lines 34-35):** Modifies URLs to append `?download=` or `&download=` to force Content-Disposition: attachment for fallback native downloads.
- **`src/pages/resources/PdfViewer.tsx` (Line 567):** Determines if `resource.pdfUrl` is a fully qualified URL (starts with `http`); if not, it uses `supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl).data.publicUrl` to generate a public URL.

## 3. Mechanisms Triggering Downloads
- **`src/utils/download.ts`:**
  - `fetch(url)` and `window.URL.createObjectURL(blob)` (Lines 13-19): Primary method for downloading (Blob download).
  - `a.download = filename; a.click()` (Lines 23, 39, 41): Creating a temporary anchor (`<a download>`) and programmatically clicking it.
  - `fallbackUrl` with `?download=` parameter (Line 35): Used when Blob download fails.

## 4. Components Rendering PDF Controls
- **`src/pages/resources/PdfViewer.tsx`:** Renders the PDF using `react-pdf` (`<Document>`, `<Page>`), `react-zoom-pan-pinch`, and handles zoom/pan controls as well as the top floating navigation (Back, Hamburger, Three-Dots for Download).

## 5. Usage of Resource Objects (Passed Through App)
- **`src/components/MaterialCard.tsx`:** Receives `resource` via props to render titles, thumbnails, and action buttons.
- **`src/pages/resources/PdfViewer.tsx`:** Fetches the resource by ID and uses it to render the PDF and controls.
- **`src/pages/resources/ResourceDetails.tsx`:** Fetches the resource to show details.
- **`src/pages/user/Dashboard.tsx`:** Fetches recent `learning_resources`.
- **`src/pages/resources/Library.tsx`:** Fetches `learning_resources` for the library view.
- **`src/pages/resources/StudyNotes.tsx`:** Fetches `learning_resources` for notes.

## 6. `allow_download` in Database Queries & Types
- **Current State:** The `allow_download` field is **not** present in `src/types/index.ts` (neither in the `Resource` type nor the `Database` types), and no component is currently checking this flag.
- **Queries to Update:** Every location that fetches `learning_resources` needs to select `allow_download`. Most queries use `.select('*')` or `.select('*, chapters(*)')`, which will automatically include the new column once the backend schema is updated, but explicit selections must include it.
  - `Dashboard.tsx`: Need to ensure `allow_download` is fetched if individual columns are queried.
  - `Library.tsx`: Uses `.select('*')`.
  - `StudyNotes.tsx`: Uses `.select('*, chapters(*)')`.
  - `PdfViewer.tsx`: Uses `.select('*, chapters(*)')`.
  - `ResourceDetails.tsx`: Uses `.select('*')`.
- **Type Updates Needed:** `src/types/index.ts` needs to be updated to include `allow_download: boolean` in the `LearningResource` row type, `Insert`/`Update` definitions, and the custom `Resource` interface.

## 7. Ownership and Single Source of Truth
- **Files Involved:** `src/types/index.ts`, `src/components/MaterialCard.tsx`, `src/pages/resources/PdfViewer.tsx`, `src/utils/download.ts` (utilities), and all fetching components.
- **Current Ownership:** Currently, the presence of a `pdfUrl` alone acts as the gatekeeper for rendering download buttons (e.g., `{resource.pdfUrl && (<button... />)}` in `MaterialCard.tsx`).
- **Single Source of Truth Component:**
  - The single source of truth should be the database column `learning_resources.allow_download`, flowing down through the `Resource` type.
  - The UI logic in **`src/components/MaterialCard.tsx`** and **`src/pages/resources/PdfViewer.tsx`** must strictly wrap download buttons with a check for `resource.allow_download === true`.
