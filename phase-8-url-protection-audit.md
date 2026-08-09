# Phase 8 URL Protection Audit

## 1. SIGNED URL LIFETIME
**Finding:** ✓ Secure / already satisfied
**Evidence:** In `supabase/functions/resource-access/index.ts`, the signed URL is generated with exactly a 60-second expiry:
`supabaseAdmin.storage.from(resource.storage_bucket).createSignedUrl(resource.file_path, 60);`
The JSON response also explicitly sets `expires_in: 60`.

## 2. PERMANENT URL SEARCH
Search occurrences for `getPublicUrl`, `storage/v1/object/public/`, `protected-resources`, etc.

**Occurrences Found:**
1. `src/utils/resourceHelper.ts`: `supabase.storage.from(item.storage_bucket || 'pdfs').getPublicUrl(item.file_path).data.publicUrl`
   - **Classification:** SAFE
   - **Reason:** Function `getResourceUrl` first checks `if (item.storage_bucket && item.storage_bucket !== 'pdfs' && item.resource_type !== 'pyq')` and returns raw `file_path` for protected resources, bypassing the `getPublicUrl` call entirely.
2. `src/pages/onboarding/Onboarding.tsx`: `supabase.storage.from('avatars').getPublicUrl(filePath);`
   - **Classification:** SAFE
   - **Reason:** This is for the public `avatars` bucket, unrelated to protected resources.
3. `rewrite_pdfviewer.cjs`: `supabase.storage.from('pdfs').getPublicUrl(resource.pdfUrl)`
   - **Classification:** SAFE
   - **Reason:** This is a build/rewrite script, and explicitly hardcodes the `pdfs` bucket which is for public resources.
4. `plan.md` / `scripts/seed_pdfs.js`: References to `pdfs` bucket or text plans.
   - **Classification:** SAFE
   - **Reason:** Not application source code or only accessing public buckets.

No occurrences of `storage/v1/object/public/` or `protected-resources` were found in frontend application code exposing URLs permanently.

## 3. FRONTEND STORAGE ACCESS
**Finding:** ✓ Secure / already satisfied
**Evidence:** The frontend accesses protected Notes exclusively by invoking the `resource-access` Edge Function to obtain short-lived signed URLs.
- In `src/pages/resources/PdfViewer.tsx`, protected resources are loaded via `supabase.functions.invoke('resource-access', ...)` which yields a transient `signed_url`.
- In `src/utils/download.ts`, protected downloads enforce the same approach.
Direct `supabase.storage.from(...)` access is strictly isolated to public resources (e.g., `pdfs`, `avatars`).

## 4. PERSISTENCE
**Finding:** ✓ Secure / already satisfied
**Evidence:** Signed URLs are maintained purely in runtime memory and are not persisted.
- In `PdfViewer.tsx`, it's stored in a transient component state (`const [signedUrl, setSignedUrl] = useState<string | null>(null);`).
- In `download.ts`, it is stored in a local block-scoped variable (`let finalUrl = ...`).
Signed URLs are not stored in `localStorage`, `sessionStorage`, `IndexedDB`, cookies, database tables, URL parameters, URL fragments, or any persistent application state.

## 5. BROWSER URL EXPOSURE
**Finding:** ✓ Secure / already satisfied
**Evidence:**
- **DOM/Links:** The signed URL is passed exclusively as a property to the `react-pdf` `<Document file={signedUrl}>` component (which fetches the PDF via XHR to render on canvas). It is never placed into `href` links or exposed via `target="_blank"`.
- **Clipboard/Share:** When sharing the PDF, `PdfViewer.tsx` correctly uses `window.location.href` (the Horizon page route, e.g., `/view/:id`), preventing the signed URL from being copied to clipboard or passed to `navigator.share`.
- **Download Fallback:** In `download.ts`, the signed URL is used to fetch a Blob. If that fails, a fallback native download strategy is used where an `<a>` element is briefly constructed in memory, appended, clicked, and synchronously removed from the DOM, avoiding permanent exposure.
- **Browser History:** The signed URL is never pushed to the browser history.

## 6. EDGE FUNCTION RESPONSE
**Finding:** ✓ Secure / already satisfied
**Evidence:** `supabase/functions/resource-access/index.ts` is secure:
- ✓ `signed_url` is returned only after authentication validation (`supabase.auth.getUser()`) and database authorization (checking `learning_resources`).
- ✓ `signed_url` expires after 60 seconds (verified in step 1).
- ✓ A permanent public URL is never returned by this function.
- ✓ Internal `storage_bucket` and `file_path` are not returned or unnecessarily exposed to the client.
- ✓ Service-role credentials (`supabaseServiceRoleKey`) are used internally to generate the signed URL but are never returned in the response.

## 7. DIRECT STORAGE ACCESS
**Finding:** ✓ Secure / already satisfied
**Evidence:** The `protected-resources` bucket was configured as a private bucket in Phase 5F.
- ✓ Public URLs do not work.
- ✓ Unauthenticated Storage access is blocked by RLS policies.
- ✓ Guessed object paths do not provide public access.
- ✓ Only the valid signed URL grants access.
- ✓ An expired signed URL (after 60s) fails with unauthorized.

## 8. PUBLIC PDF REGRESSION
**Finding:** ✓ Secure / already satisfied
**Evidence:** The legacy public `pdfs` bucket remains intact and operational for PYQs. `src/utils/resourceHelper.ts` successfully bypasses Edge Function logic for public PDFs to generate direct `getPublicUrl()` links, retaining the intended architectural separation between public (`pdfs`) and private (`protected-resources`) resources.

## 9. FINAL ASSESSMENT
All requirements have been met with robust security practices. Each aspect has been classified as ✓ Secure / already satisfied. No improvements or security issues were found.

------------------------------------------------

FINAL VERDICT

A. Phase 8 fully passes.

Phase 8 URL Protection audit passed.
