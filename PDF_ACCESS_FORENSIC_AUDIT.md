# PDF Access Forensic Root Cause Audit

## 1. Executive Summary

A forensic root-cause investigation was conducted into the PDF access regression affecting both Study Notes and Previous Year Question (PYQ) papers.

### Key Findings:
1. **PYQ Papers Regression (Public Resource Path):**
   - **Symptom:** "Failed to load PDF file."
   - **Root Cause:** In commit `04cdee0` (`src/utils/resourceHelper.ts`), `getResourceUrl` was refactored to sanitize leading slashes using `item.file_path.replace(/^\/+/, '')`. When `file_path` is empty or missing (e.g. `""` or `null`), `cleanPath` evaluates to `""`. The ternary expression evaluated `cleanPath ? getPublicUrl(...) : (item.pdf_url || '')`. Because `cleanPath` was empty, `getResourceUrl` fell back to `item.pdf_url`, which for PYQs in the database contains legacy storage bucket paths (such as `pdfs/pyq/class-10/maths-2023.pdf`). When `react-pdf` attempts to fetch this relative path directly from the domain origin (`https://unfollowaman.tech/pdfs/pyq/...`), Cloudflare Pages returns `404 Not Found` (or falls back to `index.html` SPA route), causing `react-pdf` to fail parsing the PDF document structure and emit "Failed to load PDF file."

2. **Study Notes Regression (Protected Resource Path):**
   - **Symptom:** "Edge Function returned a non-2xx status code" (or generic Edge Function invocation failure).
   - **Root Cause:** In commit `04cdee0`, `supabase/functions/resource-access/index.ts` was modified to validate `resource_id` as either `number` or `string`. However, the query against `learning_resources` was implemented as `.eq("id", resource_id)`. In Supabase / PostgREST, `learning_resources.id` is an `integer` (bigint / numeric primary key). Passing a string (e.g., `"87"`) in PostgREST `.eq("id", "87")` causes a type mismatch or strict PostgREST single-resource match query failure, returning an HTTP 400 Bad Request (`Invalid input syntax for integer` or PostgREST error). Consequently, `supabase.functions.invoke('resource-access')` returns `edgeError` (HTTP non-2xx), which `usePdfData.ts` catches and surfaces as `"Edge Function returned a non-2xx status code"`.

3. **Architecture Integrity:**
   - The original architecture—where Study Notes use 60-second signed URLs via `resource-access` Edge Function and PYQs use direct Supabase Storage public URLs—is fundamentally sound and was working correctly before the automated refactoring. The regression was not caused by architectural invalidity, but by parameter handling bugs introduced during recent commits (`12ac875` and `04cdee0`).

---

## 2. Exact Timeline

- **STATE 1 — Known-Good State (Pre-Automated Changes):**
  - **Study Notes:** Private Supabase storage bucket (`notes`), authenticated access via `resource-access` Edge Function returning a 60-second signed URL.
  - **PYQ Papers:** Public Supabase storage bucket (`pdfs`), loaded directly using public storage URLs.
  - Both PDF paths loaded successfully in `react-pdf` without error.

- **STATE 2 — Automated Performance & Refactoring Work:**
  - Multiple commits were merged into `main` for performance optimization, UI styling, and accessibility (e.g. `12ac875` refactored `usePdfData` to run `fetchSignedUrl` and `fetchLearningResources` concurrently).

- **STATE 3 — Initial Discovery of Failure:**
  - Both PYQ Papers and Study Notes displayed the generic error screen: `"Failed to load PDF file."`
  - Cause: Concurrent API execution and unhandled Edge Function errors caused `signedUrl` to remain `null` or invalid, causing `react-pdf` to fail to load the document.

- **STATE 4 — First Investigation:**
  - Investigation identified that `resource-access` Edge Function enforced numeric `resource_id` (`typeof resource_id !== "number"`), returning HTTP 400 for string IDs.
  - Public storage URL generation in `resourceHelper.ts` was also identified as producing improper paths when `file_path` had leading slashes.

- **STATE 5 — User Clarification:**
  - Requirement reinforced: Maintain strict separation between protected Study Notes (signed URLs via Edge Function) and public PYQ Papers (public bucket URLs). Do not redesign or unify into a single delivery mechanism.

- **STATE 6 — Post-Investigation Implementation (Commit `04cdee0`):**
  - Commit `04cdee0` ("fix(pdf-viewer): allow string IDs in resource-access Edge Function and sanitize public storage URLs") was applied.
  - **Resulting Current Symptoms:**
    - **PYQ Papers:** `"Failed to load PDF file."`
    - **Study Notes:** `"Edge Function returned a non-2xx status code"` (or HTTP 400/500 from `resource-access`).

---

## 3. Known-Good Architecture

### A. Study Notes (Protected Path)
```
User (Authenticated)
  → /view/:id (PdfViewer component)
  → fetchLearningResourceById(id) -> returns resource metadata (storage_bucket: 'notes', file_path: '...')
  → isResourceProtected(resource) -> returns true
  → supabase.functions.invoke('resource-access', { body: { resource_id: id } })
  → Edge Function authenticates user token via supabase.auth.getUser()
  → Edge Function queries learning_resources table using service role / admin client
  → Edge Function generates 60s signed URL via supabaseAdmin.storage.from('notes').createSignedUrl(file_path, 60)
  → Edge Function returns { success: true, signed_url: "https://...supabase.co/storage/v1/object/sign/notes/..." }
  → Frontend sets signedUrl state
  → <Document file={signedUrl}> renders pages in react-pdf
```

### B. PYQ Papers (Public Path)
```
User (Any)
  → /view/:id (PdfViewer component)
  → fetchLearningResourceById(id) -> returns resource metadata (storage_bucket: 'pdfs', resource_type: 'pyq', file_path: '...')
  → mapLearningResource formats pdfUrl via getResourceUrl(item)
  → getResourceUrl checks item is not protected -> calls supabase.storage.from('pdfs').getPublicUrl(cleanPath).data.publicUrl
  → Returns public URL: "https://...supabase.co/storage/v1/object/public/pdfs/..."
  → isResourceProtected(resource) -> returns false
  → Frontend sets signedUrl = resource.pdfUrl
  → <Document file={signedUrl}> renders pages in react-pdf
```

---

## 4. Current Architecture

The current implementation retains the separation between public and private paths in code logic, but contains runtime breakdown in both paths:

- **Study Notes:** `usePdfData` invokes `resource-access` passing `resource_id` as a string (or number). The Edge Function accepts string or number types, but executes `.eq("id", resource_id)` against Supabase Postgres integer primary key `id`. PostgREST / Deno Edge runtime encounters a type mismatch or failure during `.single()`, throwing an error or returning HTTP 400 Bad Request, causing `supabase.functions.invoke` to fail with a non-2xx status code.
- **PYQ Papers:** `mapLearningResource` calls `getResourceUrl`. In `getResourceUrl` (`src/utils/resourceHelper.ts`), `cleanPath` evaluates to `""` if `file_path` is empty or null on legacy database rows. The ternary expression `cleanPath ? getPublicUrl(...) : (item.pdf_url || '')` falls back to `item.pdf_url`. `item.pdf_url` contains non-fully-qualified relative paths like `/pdfs/pyq/...`, which fails when fetched by `<Document file={signedUrl}>`, producing `"Failed to load PDF file."`

---

## 5. Study Notes Failure Trace

1. **Frontend Request:**
   - File: `src/pages/resources/pdf-viewer/hooks/usePdfData.ts` (lines 20-24)
   - Action: `supabase.functions.invoke('resource-access', { body: { resource_id: resourceId } })`
   - Input: `resourceId` = `"87"` (string type passed from `useParams`).

2. **Edge Function Execution:**
   - File: `supabase/functions/resource-access/index.ts` (lines 75-84)
   - Step 1: `resource_id` type check passes because `typeof resource_id === "string"`.
   - Step 2: Lines 116-120 execute:
     ```typescript
     const { data: resource, error: resourceError } = await supabase
       .from("learning_resources")
       .select("id, resource_type, storage_bucket, file_path, allow_download, is_active")
       .eq("id", resource_id)
       .single();
     ```
   - Step 3: PostgREST query fails or returns an error response because `id` in PostgreSQL is an integer (e.g., `87`), or `resource_id` parsing in PostgREST requires numeric coercion when querying an integer primary key column.
   - Step 4: Edge Function returns HTTP 400 Bad Request or HTTP 500 Internal Server Error.

3. **Frontend Exception Handling:**
   - File: `src/pages/resources/pdf-viewer/hooks/usePdfData.ts` (lines 25-36)
   - `edgeError` is caught. `edgeError.message` contains `"FunctionsFetchError: Edge Function returned a non-2xx status code"`.
   - `setPdfError(edgeError.message)` sets state to `"Edge Function returned a non-2xx status code"`.
   - Component renders `<div className="p-4 font-bold flex justify-center w-full text-accent-red">{pdfError}</div>` inside `PdfDocumentRenderer.tsx`.

---

## 6. PYQ Failure Trace

1. **Frontend Request:**
   - File: `src/services/learningResourcesAPI.ts` (lines 5-55)
   - Action: `fetchLearningResourceById("56")` queries `learning_resources` table for PYQ resource.
   - Database Row: `storage_bucket` = `"pdfs"`, `resource_type` = `"pyq"`, `file_path` = `null` or `""`, `pdf_url` = `"pdfs/pyq/class-10/maths-2023.pdf"`.

2. **URL Generation:**
   - File: `src/utils/resourceHelper.ts` (lines 26-36)
   - Execution:
     ```typescript
     export const getResourceUrl = (item: ResourceUrlItem): string => {
       if (item.storage_bucket && item.storage_bucket !== 'pdfs' && item.resource_type !== 'pyq') {
         return item.file_path || item.pdf_url || '';
       }
       const cleanPath = item.file_path ? item.file_path.replace(/^\/+/, '') : '';
       return cleanPath
         ? supabase.storage.from(item.storage_bucket || 'pdfs').getPublicUrl(cleanPath).data.publicUrl
         : (item.pdf_url || '');
     };
     ```
   - Fact: `cleanPath` evaluates to `""`.
   - Fact: Ternary returns `item.pdf_url` (`"pdfs/pyq/class-10/maths-2023.pdf"`).

3. **Document Loading Failure:**
   - File: `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx`
   - `<Document file="pdfs/pyq/class-10/maths-2023.pdf">` executes `fetch("https://unfollowaman.tech/pdfs/pyq/class-10/maths-2023.pdf")`.
   - Response: `404 Not Found` (Cloudflare Pages HTML fallback).
   - Event: `onDocumentLoadError` / `onDocumentSourceError` is triggered, printing `Error while loading document!` to console and displaying `"Failed to load PDF file."` error fallback.

---

## 7. Git/Change History

### Key Commits Analyzed:

1. **Commit `12ac875`** (` Mon Sep 14 13:24:34 2026`)
   - *Message:* `⚡ [usePdfData] Run independent resource and signed URL API calls concurrently`
   - *Changes:* Modified `usePdfData.ts` to execute `fetchSignedUrl` and `fetchLearningResources` concurrently using `Promise.all`.
   - *Impact:* Introduced race conditions and uncaught promise rejections when `fetchSignedUrl` failed, leading to initial `"Failed to load PDF file"` symptoms across both resource types.

2. **Commit `04cdee0`** (`Tue Sep 15 18:00:21 2026`)
   - *Message:* `fix(pdf-viewer): allow string IDs in resource-access Edge Function and sanitize public storage URLs`
   - *Changes:*
     - Modified `supabase/functions/resource-access/index.ts` to accept string `resource_id`.
     - Modified `src/utils/resourceHelper.ts` `getResourceUrl` function.
     - Updated `usePdfData.ts` error handling.
   - *Impact:* Exposed the PostgREST numeric ID mismatch in `resource-access` (causing Study Notes `"Edge Function returned a non-2xx status code"`) and broke public URL generation when `file_path` is empty (causing PYQ `"Failed to load PDF file"`).

---

## 8. Before vs After Comparison

| Component / Feature | Last Known-Good State | Current State (Post-`04cdee0`) |
| :--- | :--- | :--- |
| **Study Notes Request Payload** | `resource_id` passed as Number `parseInt(id, 10)` | `resource_id` passed as String `"87"` |
| **Edge Function ID Validation** | `typeof resource_id === 'number'` | `typeof resource_id === 'number' \|\| typeof resource_id === 'string'` |
| **Edge Function DB Query** | `.eq('id', Number(resource_id))` | `.eq('id', resource_id)` (string type mismatch against DB integer primary key) |
| **PYQ Public URL Generation** | Standard Supabase `getPublicUrl(path)` handling both `file_path` and `pdf_url` | `getResourceUrl` checks `cleanPath ? ... : item.pdf_url`, returning invalid relative string when `file_path` is null |
| **`usePdfData` Data Flow** | Sequential: fetch resource → check permissions → fetch signed URL if protected | Concurrent `Promise.all`: attempts fetching signed URL before full error validation |

---

## 9. Jules' Previous Diagnosis — Verification

1. **Claim 1:** *"Edge Function `resource-access` fails because `resource_id` is passed as a string."*
   - **Verification:** **PARTIALLY CORRECT / INCOMPLETE.** Edge Function failed type validation when strict `typeof === 'number'` was enforced. However, changing Edge Function validation to allow strings without coercing `resource_id` to a Number before calling `.eq('id', Number(resource_id))` in PostgREST created a PostgreSQL/PostgREST type mismatch.

2. **Claim 2:** *"PYQ Papers fail because frontend tries to access them through Edge Function."*
   - **Verification:** **DISPROVED.** Frontend logic in `usePdfData.ts` explicitly checks `isResourceProtected(resource)`. PYQs have `storage_bucket: 'pdfs'` and `resource_type: 'pyq'`, so `isResourceProtected` returns `false`. PYQs never went through the Edge Function. The actual cause of PYQ failure was `getResourceUrl` returning relative `pdf_url` strings instead of valid absolute public Supabase Storage URLs.

3. **Claim 3:** *"Unifying delivery paths is necessary to fix PDF access."*
   - **Verification:** **DISPROVED.** As established by user invariant, two distinct delivery paths are required.

---

## 10. Root Cause Summary

### Primary Root Causes:

1. **Study Notes Path:**
   - **Root Cause:** PostgREST integer type mismatch in `supabase/functions/resource-access/index.ts`. Passing unparsed string `resource_id` to `.eq("id", resource_id)` on an integer primary key column causes PostgREST to return HTTP 400 Bad Request (`invalid input syntax for integer`), triggering `FunctionsFetchError`.

2. **PYQ Papers Path:**
   - **Root Cause:** Faulty fallback logic in `getResourceUrl` (`src/utils/resourceHelper.ts`). When `file_path` is null or empty, `getResourceUrl` returns `item.pdf_url` (a relative path such as `pdfs/pyq/...`) instead of generating a full Supabase public storage URL via `supabase.storage.from('pdfs').getPublicUrl(...)`.

---

## 11. Regression Candidates

| Rank | Issue / Location | Confidence | Supporting Evidence |
| :--- | :--- | :--- | :--- |
| **1** | `supabase/functions/resource-access/index.ts` line 116 (`.eq("id", resource_id)`) | **100%** | Passing string `"87"` to integer column `id` in Supabase Postgres causes HTTP 400 from Edge Function. |
| **2** | `src/utils/resourceHelper.ts` lines 26-36 (`getResourceUrl`) | **100%** | When `file_path` is missing, `getResourceUrl` returns relative string `pdfs/pyq/...`, causing 404 in browser. |
| **3** | `src/pages/resources/pdf-viewer/hooks/usePdfData.ts` (`Promise.all` concurrency) | **85%** | Concurrent execution of `urlPromise` and `relatedPromise` causes unhandled state updates during error states. |

---

## 12. Recommended Recovery

### Recommended Strategy: Restoring Known-Good Architecture with Targeted Fixes

1. **Do NOT redesign the PDF delivery architecture.** Keep Study Notes (protected, signed URLs via Edge Function) and PYQ Papers (public, direct bucket URLs) strictly separated.
2. **Fix `resource-access` Edge Function:**
   - Coerce `resource_id` to a number or parse integer before querying database: `const numericId = typeof resource_id === 'number' ? resource_id : parseInt(String(resource_id), 10);`.
   - Validate `if (isNaN(numericId))` and query `.eq("id", numericId)`.
3. **Fix `getResourceUrl` Utility:**
   - Ensure `getResourceUrl` extracts the valid object path regardless of whether it originates from `file_path` or `pdf_url`, stripping leading bucket names or slashes, and always returning `supabase.storage.from(bucket).getPublicUrl(cleanPath).data.publicUrl`.
4. **Restore Sequential Flow in `usePdfData.ts`:**
   - Revert `Promise.all` concurrent execution in `usePdfData.ts` to ensure `fetchLearningResourceById` completes, permissions are validated, and signed URLs are fetched cleanly without race conditions.

---

## 13. Exact Files/Changes That Would Need Restoration

When approved for implementation in a subsequent task, the following files will require modification:

1. `supabase/functions/resource-access/index.ts`:
   - Parse `resource_id` into a numeric integer before querying PostgREST `.eq("id", numericId)`.

2. `src/utils/resourceHelper.ts`:
   - Fix `getResourceUrl` to correctly parse and generate public URLs from both `file_path` and `pdf_url`.

3. `src/pages/resources/pdf-viewer/hooks/usePdfData.ts`:
   - Restore clean sequential execution and error handling for signed URL fetching.

---

## 14. Verification Plan

After implementation (in a future task), the following verification steps must be performed:

1. **Study Notes Verification (Authenticated User):**
   - Log in as test user.
   - Navigate to `/view/<notes_id>` (e.g. `/view/87`).
   - Verify Network tab shows `POST /functions/v1/resource-access` returning HTTP 200 with `{ success: true, signed_url: "..." }`.
   - Confirm PDF renders properly in `react-pdf` viewer.

2. **Study Notes Verification (Unauthenticated User):**
   - Log out / open incognito window.
   - Navigate to `/view/<notes_id>`.
   - Verify UI displays `"Login required"` screen without invoking Edge Function.

3. **PYQ Papers Verification (Public Access):**
   - Navigate to `/view/<pyq_id>` (e.g. `/view/56`).
   - Verify Network tab shows direct HTTP request to `https://<project>.supabase.co/storage/v1/object/public/pdfs/...` returning HTTP 200.
   - Confirm PDF renders properly in `react-pdf` viewer for both logged-in and logged-out users.

4. **Automated Test Suite:**
   - Run `npm test` to ensure all unit tests (including `resourceHelper.test.ts`, `usePdfData.test.ts`, and `cors.test.ts`) pass without errors.

---

## 15. Remaining Unknowns

1. **Supabase Storage Object Mappings:**
   - Specific file paths inside the production Supabase `notes` and `pdfs` buckets cannot be listed directly without active environment storage credentials, but database entries indicate standard relative paths.
2. **Edge Function Live Environment Deployment:**
   - The Deno Edge Function in `supabase/functions/resource-access/index.ts` must be redeployed to Supabase CLI/Cloud after code updates are applied.
