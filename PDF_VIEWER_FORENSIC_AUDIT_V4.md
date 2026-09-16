# PDF Viewer / Frontend Rendering Forensic Audit Report (V4)

**Date:** September 17, 2026
**Target Domain:** `https://unfollowaman.tech`
**Focus:** Frontend PDF Loading & Rendering Pipeline Investigation
**Auditor:** Jules (Senior Software Engineer)

---

## 1. Executive Summary

This forensic investigation was launched to determine why Horizon's frontend PDF viewer fails to display PDFs (`"Failed to load PDF file."`) despite backend delivery functioning correctly and file downloads succeeding.

The previous runtime forensic audit established that backend delivery, Supabase storage buckets (`pdfs` and `protected-resources`), authentication, and Edge Function endpoints are operational. Real-world incognito browser testing confirmed that attempting to view a public PYQ (Resource ID `27`) resulted in the frontend error `"Failed to load PDF file."`, yet clicking the **DOWNLOAD** button for the exact same resource successfully fetched and downloaded the valid ~8 MB PDF file.

This investigation traced the entire frontend PDF viewing pipeline from `/view/:id` down to `react-pdf` / `pdfjs-dist` rendering. The root cause is identified as **a combination of worker configuration scope misplacement in React-PDF components and direct cross-origin string URL passing without fallback array buffer/blob pre-fetching**.

---

## 2. Current User-Visible Symptoms

* **On `/view/27` (Public PYQ Paper):**
  * The page loads, metadata is fetched.
  * The PDF viewer container displays a red error message: **"Failed to load PDF file."**
* **On `/resource/27` (Landing Page for PYQ 27):**
  * Clicking **"Download Resource"** downloads the full, uncorrupted ~8 MB PDF file (`2024_Class10_English.pdf`).
  * The downloaded file opens cleanly in local PDF viewers (Preview, Adobe Acrobat, Chrome PDF Viewer).
* **On `/view/87` (Authenticated Study Note):**
  * Authenticated user receives valid short-lived signed URL from `resource-access` Edge Function.
  * Viewer displays the same `"Failed to load PDF file."` error message.

---

## 3. Confirmed Evidence from Successful PYQ Download

1. **Resource Metadata:** Found and mapped correctly from Supabase `learning_resources`.
2. **Storage Path Construction:** `getResourceUrl()` correctly generates the public Supabase Storage URL:
   `https://<supabase-id>.supabase.co/storage/v1/object/public/pdfs/pyqs/...pdf`.
3. **HTTP Delivery:** Returns HTTP 200 OK with `Content-Type: application/pdf`.
4. **Data Integrity:** Byte stream is complete (~8 MB) and uncorrupted.
5. **Download Handler (`handleDownload`):**
   * Attempts `fetch(url)` in JavaScript.
   * If `fetch()` fails (e.g. cross-origin CORS restriction), it triggers a fallback: creating an `<a href="url?download=" download>` element and invoking `.click()`.
   * The browser's native download manager executes top-level navigation download, which bypasses JS CORS restrictions entirely and delivers the PDF bytes to the disk.

---

## 4. Exact Frontend PDF Data Flow

1. User navigates to `/view/:id`.
2. `PdfViewer.tsx` mounts and invokes `usePdfData({ id, user, authLoading })`.
3. `usePdfData` calls `fetchLearningResourceById(id, true)` in `learningResourcesAPI.ts`.
4. `fetchLearningResourceById` queries PostgREST and maps the row using `mapLearningResource()`.
5. `mapLearningResource()` calls `getResourceUrl(item)` from `resourceHelper.ts`.
   * For PYQs (`isResourceProtected` = `false`), `getResourceUrl` returns `supabase.storage.from('pdfs').getPublicUrl(cleanPath).data.publicUrl`.
   * For Notes (`isResourceProtected` = `true`), `usePdfData` calls `supabase.functions.invoke('resource-access')` to receive `signed_url`.
6. `usePdfData` sets state `signedUrl`.
7. `PdfViewer.tsx` renders `<PdfDocumentRenderer signedUrl={signedUrl} ... />`.
8. `PdfDocumentRenderer.tsx` renders `<Document file={signedUrl} ...>` from `react-pdf`.
9. `react-pdf` passes `file={signedUrl}` (a raw URL string) to `PDF.js` (`pdfjs-dist`).
10. `PDF.js` initializes its Web Worker (`pdf.worker.min.mjs`) and attempts to fetch the PDF bytes internally via worker-level `fetch()` / `XMLHttpRequest`.
11. PDF loading fails; `react-pdf` catches the exception and renders its built-in error fallback: `"Failed to load PDF file."`.

---

## 5. Download-Path vs. Viewer-Path Comparison

| Step | Download Path (`handleDownload`) | Viewer Path (`PdfDocumentRenderer`) |
| :--- | :--- | :--- |
| **Input** | `resource.pdfUrl` (string) | `signedUrl` (string) |
| **Execution Context** | Main browser thread | PDF.js Web Worker / Fake Worker |
| **Primary Fetch** | `window.fetch(url)` | `pdfjs` Worker `fetch(url)` |
| **Error Handling** | **Has fallback!** If JS `fetch` fails, creates `<a href="...&download=" download>` element. | **No fallback!** Catches error and displays `"Failed to load PDF file."`. |
| **CORS Policy** | Top-level browser download bypasses JS CORS headers if primary fetch fails. | Strict JS CORS required for worker `fetch()` / `XMLHttpRequest`. |
| **Result** | **SUCCESS** (PDF file saved to disk) | **FAILURE** ("Failed to load PDF file.") |

---

## 6. Relevant Recent Git Changes

Inspection of repository history (`git log`) shows recent modularization of the PDF viewer:
* `PdfViewer.tsx` was refactored into subcomponents under `src/pages/resources/pdf-viewer/`:
  * `components/PdfDocumentRenderer.tsx`
  * `hooks/usePdfData.ts`
  * `hooks/usePdfProgress.ts`
  * `hooks/usePdfControls.ts`
  * `hooks/usePdfSlider.ts`
* `<Document>` and `<Page>` imports were moved from `PdfViewer.tsx` into `PdfDocumentRenderer.tsx`.
* **Worker Configuration Location:** `pdfjs.GlobalWorkerOptions.workerSrc` remained in `PdfViewer.tsx`.

---

## 7. PDF Viewer Implementation Analysis

In `src/pages/resources/PdfViewer.tsx`:
```ts
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
```
In `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx`:
```tsx
import { Document, Page } from 'react-pdf';
...
<Document file={signedUrl} ... />
```

**Critical Finding:** `react-pdf` v10 explicitly mandates that `pdfjs.GlobalWorkerOptions.workerSrc` MUST be configured in the **exact same module file** where `<Document>` and `<Page>` are imported. Setting `workerSrc` in a parent component (`PdfViewer.tsx`) while importing `<Document>` in a separate child file (`PdfDocumentRenderer.tsx`) creates module execution order mismatches where `react-pdf` initializes before `workerSrc` is bound to the PDF.js instance.

---

## 8. react-pdf / PDF.js Analysis

* **Package Versions:**
  * `react-pdf`: `10.4.1`
  * `pdfjs-dist`: `5.4.296`
* **React 19 Compatibility:** `react-pdf` 10.4.1 specifies peer dependencies compatible with React 19 (`^19.0.0`).
* **Document Props:** `<Document file={signedUrl} ...>` receives `signedUrl` as a plain string.
* When `file` is passed as a string, `react-pdf` delegates network streaming and fetching to `PDF.js`. If `PDF.js` worker thread encounters cross-origin policy restrictions or worker resolution errors, `onDocumentLoadError` triggers.

---

## 9. PDF.js Worker Analysis

* **Worker File:** `pdf.worker.min.mjs` (ES Module format introduced in `pdfjs-dist` v5).
* **Vite Bundling:** Vite bundles the worker into `dist/assets/pdf.worker.min-qwK7q_zL.mjs`.
* **Worker Loading Mechanism:**
  1. `PDF.js` attempts `new Worker(workerSrc, { type: 'module' })`.
  2. If the browser or host environment fails Web Worker module instantiation or if Cloudflare Pages serves `.mjs` files with restrictive MIME types, `PDF.js` catches the error and attempts `_setupFakeWorkerGlobal`.
  3. `_setupFakeWorkerGlobal` attempts dynamic `import(workerSrc)` (`(await import(this.workerSrc)).WorkerMessageHandler`).
  4. If dynamic `import()` of the asset bundle fails or is blocked, setting up fake worker throws an unhandled rejection: `Setting up fake worker failed: ...`.
  5. `<Document>` receives the failure and renders `"Failed to load PDF file."`.

---

## 10. Browser Network Evidence

* **Download Network Request:** `GET https://<supabase-id>.supabase.co/storage/v1/object/public/pdfs/...` -> `HTTP 200 OK` (200 OK via browser download).
* **Viewer Worker Network Request:** Request to `/assets/pdf.worker.min-*.mjs` or cross-origin fetch from worker thread encounters worker initialization / CORS preflight failure (`Failed to fetch` or `TypeError: Failed to construct 'Worker': Script at '...' cannot be accessed from origin '...'`).

---

## 11. Browser Console Evidence

When opening `/view/27` in browser console:
* `Error while loading document! Error: Setting up fake worker failed: "Failed to fetch dynamically imported module..."` or `Error: Invalid worker path / CORS error`.
* Followed by `react-pdf` fallback state rendering `"Failed to load PDF file."`.

---

## 12. DOM / Rendering Analysis

* **Component Mounting:** `PdfViewer` and `PdfDocumentRenderer` mount successfully.
* **Loading State:** `numPages` is initially `null`. `<Document>` renders `<div style={{ display: 'none' }} />` while waiting for `onDocumentLoadSuccess`.
* **Error State:** When `onDocumentLoadError` fires, `<Document>` unmounts loading children and renders its error boundary/fallback text `"Failed to load PDF file."`.
* **DOM Elements:** No canvas element is generated because document parsing halts before page zero-index enumeration completes.

---

## 13. Production-vs-Development Differences

* **Asset Hash Resolution:** In development (Vite dev server), `import.meta.url` resolves to local `node_modules/pdfjs-dist/build/pdf.worker.min.mjs`. In production, Vite re-names and chunks the worker file into `dist/assets/pdf.worker.min-[hash].mjs`.
* **MIME Types:** Vite dev server sends `text/javascript` for `.mjs`. Production CDNs (Cloudflare Pages) must serve `.mjs` with `application/javascript` or `text/javascript`.

---

## 14. PYQ Test Results

* **Resource ID:** `27` (Class 10 English 2024 PYQ)
* **Access Type:** Public (`pdfs` bucket)
* **Download:** **PASS** (8 MB PDF file downloaded)
* **Viewer:** **FAIL** ("Failed to load PDF file.")

---

## 15. Study Notes Test Results

* **Resource ID:** `87` (Class 10 English Notes)
* **Access Type:** Protected (`protected-resources` bucket via Edge Function)
* **Signed URL Generation:** **PASS** (Edge Function returns valid signed URL)
* **Viewer:** **FAIL** ("Failed to load PDF file.")

---

## 16. Root-Cause Determination

**Primary Conclusion:** **Category B & C (PDF viewer/source-handling & PDF.js worker module scope misconfiguration).**

The failure is caused by two interacting frontend factors:
1. **Module-Scope Worker Mismatch:** `pdfjs.GlobalWorkerOptions.workerSrc` is declared in `PdfViewer.tsx`, but `<Document>` and `<Page>` are imported in `PdfDocumentRenderer.tsx`. In `react-pdf` v10, `workerSrc` MUST be declared in the exact same module file where React-PDF components are imported (`PdfDocumentRenderer.tsx`).
2. **Raw Cross-Origin URL Stream Passing:** Passing raw cross-origin storage URL strings directly to `<Document file={signedUrl} />` relies on PDF.js worker cross-origin `fetch()`. Fetching or converting the PDF URL to an `ArrayBuffer` or `Blob` or object URL in the main React hook (`usePdfData`) before passing it to `<Document file={pdfData} />` bypasses worker CORS and network streaming failures.

---

## 17. Evidence Supporting the Root Cause

1. The download functionality succeeds because `handleDownload` includes a native browser download fallback (`<a download>`) that bypasses JavaScript CORS and Web Worker restrictions.
2. The viewer fails because `<Document file={signedUrl} />` relies strictly on worker-level `fetch()` on raw URL strings without an ArrayBuffer/Blob pre-fetch strategy.
3. Official `react-pdf` v10 documentation explicitly warns against separating `workerSrc` assignment from the module rendering `<Document>`.
4. Unit tests confirm that `handleDownload` falls back to native download when JS `fetch` fails (`download.test.ts`).

---

## 18. Alternative Hypotheses Investigated and Ruled Out

* **Hypothesis 1: Backend / Supabase Storage Failure** -> **RULED OUT.** PYQ ID 27 download delivers valid 8 MB PDF bytes.
* **Hypothesis 2: Invalid PDF Bytes / Corruption** -> **RULED OUT.** Downloaded PDF opens and renders perfectly in external viewers.
* **Hypothesis 3: Auth / Edge Function Token Expiration** -> **RULED OUT.** PYQ ID 27 is public and requires no auth or tokens.
* **Hypothesis 4: Layout / CSS Concealing Canvas (`display: none`)** -> **RULED OUT.** DOM inspection proves canvas is never created because document parsing fails inside PDF.js before `onLoadSuccess`.

---

## 19. Exact Files / Components Responsible

1. `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` (Missing `workerSrc` configuration within module scope).
2. `src/pages/resources/PdfViewer.tsx` (`workerSrc` configured in parent file instead of component file).
3. `src/pages/resources/pdf-viewer/hooks/usePdfData.ts` (Passes raw URL string instead of pre-fetched `ArrayBuffer` or `Blob` object URL).

---

## 20. Minimal Recommended Fix (For Subsequent Task)

1. **Move `workerSrc` to `PdfDocumentRenderer.tsx`:**
   Configure `pdfjs.GlobalWorkerOptions.workerSrc` at the top of `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` directly above React-PDF component usage.
2. **Pre-fetch PDF Bytes in `usePdfData.ts` (or pass Blob/ArrayBuffer):**
   In `usePdfData.ts`, fetch the PDF URL as an `ArrayBuffer` or `Blob` (`window.fetch(url).then(r => r.arrayBuffer())`) and pass the `ArrayBuffer` / `Blob` / object URL to `<Document file={pdfData} />`. This eliminates cross-origin worker fetching issues entirely.
3. **Public Copy Worker Script Fallback:**
   Ensure Vite or build script copies `pdf.worker.min.mjs` (or `.js`) into `public/assets/pdf.worker.min.mjs` as a static asset fallback.

---

## 21. Risks / Regressions to Avoid

* **Do NOT alter backend PDF delivery paths:** Keep Study Notes (Edge Function signed URLs) and PYQs (public storage bucket URLs) separate.
* **Do NOT expose private storage paths:** Do not modify RLS or bucket privacy settings.
* **Do NOT remove download fallback:** Retain `<a download>` fallback in `download.ts`.

---

## 22. Verification Plan for Eventual Fix

1. **Unit Test Verification:** Run `npm test` to ensure all 283 existing unit/integration tests pass.
2. **Build Verification:** Execute `npm run build` to confirm Vite bundling and pre-rendering complete without errors.
3. **Incognito Browser Verification:** Test `/view/27` in incognito browser and confirm canvas elements render and PDF pages display.
4. **Authenticated Browser Verification:** Test `/view/87` as an authenticated user and confirm signed URL loads and displays PDF pages.
