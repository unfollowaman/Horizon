# PDF Access Forensic Root Cause Audit (V2)

## 1. Executive Summary

A comprehensive, evidence-based forensic investigation was conducted into the continuing PDF-access regressions affecting both Study Notes and Previous Year Question (PYQ) papers.

### Key Conclusions:
1. **PYQ Papers (Public Path) Failure:**
   - **Symptom:** `"Failed to load PDF file."`
   - **Confirmed Root Cause:** Commit `04cdee0` modified `getResourceUrl` in `src/utils/resourceHelper.ts`. When a PYQ database row has `file_path = null` or `""` and a legacy relative `pdf_url` (e.g. `"pdfs/pyq/class-10/maths-2023.pdf"`), `cleanPath` evaluates to `""`. The ternary expression falls back to `item.pdf_url`, returning the relative path directly. `<Document file="pdfs/pyq/...">` attempts a fetch against the web domain (`https://unfollowaman.tech/pdfs/pyq/...`), returning HTTP 404 (or Cloudflare HTML SPA fallback). `react-pdf` fails to parse HTML as PDF and throws a loading error.
2. **Study Notes (Protected Path) Failure:**
   - **Symptom:** `"Edge Function returned a non-2xx status code"` (or HTTP 400).
   - **Confirmed Root Cause:** Commit `04cdee0` updated `supabase/functions/resource-access/index.ts` to accept string IDs in request body validation, but left the PostgREST query as `.eq("id", resource_id)`. In Supabase PostgreSQL, `learning_resources.id` is an `integer` primary key. Passing an unparsed string (e.g., `"87"`) to PostgREST `.eq("id", "87")` causes PostgREST to return HTTP 400 Bad Request (`invalid input syntax for integer`).
3. **Architecture Validity:**
   - The dual-path delivery architecture (Study Notes = Private bucket + 60s signed URL via `resource-access`; PYQs = Public bucket + direct public Storage URL) is 100% valid and remains the target invariant.

---

## 2. Known-Good Architecture

### A. Study Notes Delivery Path (Protected)
```
Authenticated User
  → /view/:id (PdfViewer)
  → fetchLearningResourceById(id) -> returns resource metadata (storage_bucket: 'notes', file_path: '...')
  → isResourceProtected(resource) -> returns true
  → supabase.functions.invoke('resource-access', { body: { resource_id: numeric_id } })
  → Edge Function authenticates user token via supabase.auth.getUser()
  → Edge Function queries learning_resources via admin client using integer ID
  → Edge Function generates 60s signed URL via supabaseAdmin.storage.from('notes').createSignedUrl(file_path, 60)
  → Edge Function returns { success: true, signed_url: "https://...supabase.co/storage/v1/object/sign/notes/..." }
  → Frontend passes signedUrl to <Document file={signedUrl}>
  → react-pdf renders document
```

### B. PYQ Papers Delivery Path (Public)
```
Any User (Public)
  → /view/:id (PdfViewer)
  → fetchLearningResourceById(id) -> returns resource metadata (storage_bucket: 'pdfs', resource_type: 'pyq', file_path/pdf_url)
  → mapLearningResource formats pdfUrl via getResourceUrl(item)
  → getResourceUrl checks item is public -> generates absolute public URL via supabase.storage.from('pdfs').getPublicUrl(cleanPath)
  → Returns "https://...supabase.co/storage/v1/object/public/pdfs/pyq/..."
  → isResourceProtected(resource) -> returns false
  → Frontend sets signedUrl = resource.pdfUrl
  → react-pdf fetches public URL directly and renders document
```

---

## 3. Current Architecture & Breakpoints

The current codebase maintains the separation between public and private logic branches, but runtime bugs break both branches:

- **Study Notes:** `usePdfData` invokes `resource-access` passing string `"87"`. The Edge Function executes `.eq("id", "87")` against Postgres integer column `id`, causing PostgREST to return HTTP 400 Bad Request. `usePdfData` catches `FunctionsFetchError` and sets `pdfError` to `"Edge Function returned a non-2xx status code"`.
- **PYQ Papers:** `getResourceUrl` evaluates `cleanPath` as `""` when `file_path` is null. It returns relative string `"pdfs/pyq/class-10/maths-2023.pdf"`. `<Document file="...">` fetches from web origin, receives Cloudflare 404 HTML fallback, and triggers `onDocumentLoadError` with `"Failed to load PDF file."`

---

## 4. Exact Git Timeline & Commit Breakdown

1. **Known-Good State:** Both Study Notes and PYQ papers rendered correctly.
2. **Commit `12ac875`** (`Mon Sep 14 13:24:34 2026`):
   - *Message:* `⚡ [usePdfData] Run independent resource and signed URL API calls concurrently`
   - *Changes:* Changed `usePdfData.ts` to execute `fetchSignedUrl` and `fetchLearningResources` concurrently using `Promise.all`.
   - *Behavioral Impact:* Triggered race conditions where `fetchSignedUrl` was initiated before resource metadata was verified, causing uncaught promise rejections and initial generic `"Failed to load PDF file"` errors.
3. **Commit `04cdee0`** (`Tue Sep 15 18:00:21 2026`):
   - *Message:* `fix(pdf-viewer): allow string IDs in resource-access Edge Function and sanitize public storage URLs`
   - *Changes:* Modified `supabase/functions/resource-access/index.ts`, `src/utils/resourceHelper.ts`, and `usePdfData.ts`.
   - *Behavioral Impact:* Allowed string IDs in Edge Function body validation without numeric parsing (causing PostgREST HTTP 400 for Study Notes), and broke fallback public URL generation in `getResourceUrl` when `file_path` is null (causing 404 HTML response for PYQs).

---

## 5. End-to-End Request Traces

### Study Notes (Resource ID 87):
1. `usePdfData` calls `fetchSignedUrl("87")`.
2. `supabase.functions.invoke('resource-access', { body: { resource_id: "87" } })`.
3. Edge Function receives `{ resource_id: "87" }`. Type check `typeof === "string"` passes.
4. Edge Function executes `supabase.from("learning_resources").select(...).eq("id", "87").single()`.
5. PostgREST rejects string `"87"` against integer `id` primary key with HTTP 400 `invalid input syntax for integer`.
6. Edge Function returns HTTP 400 `FunctionsFetchError`.
7. `usePdfData` catches error and displays `"Edge Function returned a non-2xx status code"`.

### PYQ Papers (Resource ID 56):
1. `fetchLearningResourceById("56")` returns `{ storage_bucket: 'pdfs', resource_type: 'pyq', file_path: null, pdf_url: 'pdfs/pyq/class-10/maths-2023.pdf' }`.
2. `getResourceUrl` computes `cleanPath = ''`.
3. `cleanPath ? getPublicUrl(...) : item.pdf_url` evaluates to `'pdfs/pyq/class-10/maths-2023.pdf'`.
4. `usePdfData` sets `signedUrl = 'pdfs/pyq/class-10/maths-2023.pdf'`.
5. `<Document file="pdfs/pyq/class-10/maths-2023.pdf">` fetches `https://unfollowaman.tech/pdfs/pyq/class-10/maths-2023.pdf`.
6. Server returns HTTP 404 HTML fallback.
7. `react-pdf` fails parsing HTML as PDF and displays `"Failed to load PDF file."`

---

## 6. Comparison of Key Files

### `supabase/functions/resource-access/index.ts`
- **Known-Good:** Expected numeric `resource_id` (`typeof === 'number'`).
- **Post-`04cdee0`:** Validates `typeof resource_id === 'number' || typeof resource_id === 'string'`, but queries `.eq("id", resource_id)` without parsing `resource_id` into an integer (`parseInt`), causing PostgREST HTTP 400.

### `src/utils/resourceHelper.ts`
- **Known-Good:** Extracted storage path correctly and called `getPublicUrl(cleanPath)`.
- **Post-`04cdee0`:** Introduced `cleanPath ? getPublicUrl(...) : (item.pdf_url || '')`. When `file_path` is missing, `cleanPath` is empty and it returns the raw relative `pdf_url` string.

### `src/pages/resources/pdf-viewer/hooks/usePdfData.ts`
- **Known-Good:** Executed resource fetching, permission checking, and signed URL invocation sequentially.
- **Post-`12ac875` / `04cdee0`:** Executes API calls concurrently via `Promise.all` and maps raw Edge Function error messages directly to UI error state.

---

## 7. Verification of Previous Audit Claims

1. **Claim: PostgREST integer type mismatch on `resource_id` in Edge Function.**
   - **Status:** **CONFIRMED.** PostgreSQL `id` column is integer/bigint. Passing unparsed string `"87"` to PostgREST `.eq("id", "87")` causes HTTP 400.
2. **Claim: `getResourceUrl` returns relative URL for PYQs when `file_path` is null.**
   - **Status:** **CONFIRMED.** Ternary fallback in `getResourceUrl` returns relative string `item.pdf_url`, causing 404 HTML response from web host.
3. **Claim: `Promise.all` in `usePdfData.ts` creates race/error handling issues.**
   - **Status:** **CONFIRMED.** Concurrent execution initiates signed URL requests before resource metadata validation completes.

---

## 8. Root Cause Classification

- **Primary Root Cause (Study Notes):** Unparsed string `resource_id` passed to PostgREST integer column query `.eq("id", resource_id)` in `supabase/functions/resource-access/index.ts`.
- **Primary Root Cause (PYQ Papers):** Faulty ternary fallback in `getResourceUrl` (`src/utils/resourceHelper.ts`) returning relative `pdf_url` strings instead of absolute public Supabase Storage URLs.
- **Contributing Factor:** Concurrent `Promise.all` execution in `usePdfData.ts` causing state race conditions and uncaught promise errors.

---

## 9. Recommended Recovery Strategy & Minimal Changes Required

Do NOT alter the dual-path architecture. When an implementation task is authorized, apply the following minimal fixes:

1. **Edge Function Fix (`supabase/functions/resource-access/index.ts`):**
   - Parse `resource_id` to integer before query: `const numericId = typeof resource_id === 'number' ? resource_id : parseInt(String(resource_id), 10);`.
   - Validate `if (isNaN(numericId))` and query `.eq("id", numericId)`.
2. **URL Generator Fix (`src/utils/resourceHelper.ts`):**
   - Parse object path cleanly from either `file_path` or `pdf_url` (stripping leading bucket names and slashes) and always pass clean path to `supabase.storage.from('pdfs').getPublicUrl(cleanPath).data.publicUrl`.
3. **Frontend Hook Fix (`src/pages/resources/pdf-viewer/hooks/usePdfData.ts`):**
   - Restore clean sequential execution for resource metadata fetching, protection checking, and signed URL retrieval.

---

## 10. Verification / Test Plan (For Future Implementation Task)

1. **Study Notes (Authenticated User):** Verify `/view/87` invokes `resource-access` Edge Function with integer ID, returns 200 with signed URL, and renders PDF.
2. **Study Notes (Unauthenticated User):** Verify `/view/87` displays "Login required" card without calling Edge Function.
3. **PYQ Papers (Public Access):** Verify `/view/56` generates full `https://<project>.supabase.co/storage/v1/object/public/pdfs/...` URL and renders PDF for both logged-in and logged-out users.
4. **Automated Tests:** Execute `npm test` to confirm all unit tests pass.
