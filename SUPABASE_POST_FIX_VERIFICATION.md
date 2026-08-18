Horizon — Post-Fix Supabase Verification

1. Executive Summary
The live application continues to fail when fetching learning resources from Supabase. The `description` fix from PR #256 was successfully merged, removed `description` from the codebase queries, and is present in the current live bundle. However, the exact same error mechanism is now triggering on a *different* nonexistent column: `pdf_url`. The live request fails with an HTTP 400 error indicating `column learning_resources.pdf_url does not exist`.

2. Fix Verification
Check| Result| Evidence
Source contains fix| Yes| Source code in `src/services/learningResourcesAPI.ts` lacks `description` in `.select()`.
"description" removed| Yes| Git log confirms merge commit `ffa000ce3ce4466acedd49aaeb2f9fc8e45e1d04`.
DB schema compatible| No| A new column (`pdf_url`) requested in the query does not exist in the actual DB schema.
Fix commit merged| Yes| `git log` shows PR #256 merged.
Production uses fix commit| Yes| The current Cloudflare site request does not contain `description`.
Live bundle contains fix| Yes| The browser executes the query without `description`.
Live request contains fix| Yes| The live HTTP GET request parameter is missing `description`.
Supabase request succeeds| No| The query still fails because of the `pdf_url` column mismatch.

3. Live Network Evidence
**Request URL:** `https://rhzftlytulgnpodxqzqr.supabase.co/rest/v1/learning_resources?select=id%2Ctitle%2Cresource_type%2Cmedium%2Ccreated_at%2Cpdf_url%2Cthumbnail_url%2Cstudent_class%2Csubject%2Cyear%2Cchapter_id%2Callow_download%2Cstorage_bucket%2Cfile_path&resource_type=eq.pyq`
**Status Code:** 400
**Response Error:**
```json
{
  "code": "42703",
  "details": null,
  "hint": null,
  "message": "column learning_resources.pdf_url does not exist"
}
```

4. Source vs Production Comparison
**Repository:** Contains `src/services/learningResourcesAPI.ts` requesting `pdf_url` but not `description`.
**Commit:** `ffa000ce3ce4466acedd49aaeb2f9fc8e45e1d04` successfully removed `description`.
**Cloudflare deployment:** Live site reflects these changes.
**Live bundle:** The Javascript bundle constructs the updated query (evident in `/assets/learningResourcesAPI-CW7aqOs4.js`).
**Browser request:** Exact query missing `description` but requesting `pdf_url` and others is sent to the Supabase endpoint.

5. Resource Test Matrix
Feature| Request| Status| Result
Library| `/rest/v1/learning_resources?select=...pdf_url...&resource_type=eq.pyq`| 400| Fails to load, returns column `pdf_url` does not exist
Study Notes| `/rest/v1/learning_resources?select=...pdf_url...&resource_type=eq.notes`| 400| Fails to load, returns column `pdf_url` does not exist
PYQs| `/rest/v1/learning_resources?select=...pdf_url...&resource_type=eq.pyq`| 400| Fails to load, returns column `pdf_url` does not exist
Filtering| Same as above| 400| Breaks downstream filtering logic
Dashboard| No content loads| 400| User-specific resource query fails
PDF resource lookup| Not directly tested| 400| Requires fetch operation which throws 400

6. Fixes 1–4 Interaction
**Fix 1 (Route-level lazy loading):** Not implicated. The app loads and components mount.
**Fix 2 (Centralized resource data fetching):** Implicated. The logic in `src/services/learningResourcesAPI.ts` constructs the flawed query strings.
**Fix 3 (Explicit Supabase column selection):** Implicated. This fix hardcoded `pdf_url` and `thumbnail_url` alongside the previously removed `description`. The issue is directly linked to these explicitly selected missing columns.
**Fix 4 (PdfViewer refactor):** Not implicated. Fails before PDF viewer gets involved.

7. Preview Build Failures
Not directly investigated from logs, but linting errors currently exist (`Unexpected any` for `auth.test.ts` and `notifications.test.ts`). These lint errors would cause strict CI pipelines to fail builds, preventing deployment.

8. Current Root Cause
**B — Fix reached production, but another invalid query remains.**
The `description` field was removed, and that fix is deployed. However, the `.select()` queries in `learningResourcesAPI.ts` still explicitly request `pdf_url` and `thumbnail_url`. A manual check of the live Supabase database response (via intercepting and setting `select=*`) shows that `pdf_url` and `thumbnail_url` do not exist on the `learning_resources` table.

9. Recommended Next Action
Remove `pdf_url` and `thumbnail_url` from all `.select()` query strings in `src/services/learningResourcesAPI.ts` to align strictly with the true database schema. Additionally, fix the `@typescript-eslint/no-explicit-any` ESLint errors in the unit tests to unblock strict CI/CD pipelines.
