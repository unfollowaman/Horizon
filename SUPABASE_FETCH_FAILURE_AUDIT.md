# Horizon — Supabase Fetch Failure Audit

## 1. Executive Summary
The deployed Horizon application is unable to fetch its Supabase-backed content. Previously we hypothesized this was due to missing environment variables during the Cloudflare Pages build. However, after confirming the variables are present in Cloudflare and triggering a new build, the site still fails to load Supabase data.

A live inspection using Playwright reveals that Supabase requests *are* being sent, but they are failing with HTTP 400 Bad Request. The specific error returned by the Supabase API is:
`{"code":"42703","details":null,"hint":null,"message":"column learning_resources.description does not exist"}`

This confirms that the root cause is a schema mismatch introduced in a recent commit (Fix 3), where the `select` queries were changed to explicitly request columns, and it erroneously included a `description` column which does not exist in the `learning_resources` table.

## 2. Exact Failure
1. **Browser**: User navigates to `https://unfollowaman.tech/library` (or any other resource page).
2. **Horizon frontend**: The application attempts to fetch resources using `fetchLearningResources` (or `fetchLearningResourceById`).
3. **Execution**: The query executed is:
   `https://rhzftlytulgnpodxqzqr.supabase.co/rest/v1/learning_resources?select=id%2Ctitle%2Cdescription%2Cresource_type%2Cmedium%2Ccreated_at%2Cpdf_url%2Cthumbnail_url%2Cstudent_class%2Csubject%2Cyear%2Cchapter_id%2Callow_download%2Cstorage_bucket%2Cfile_path&resource_type=eq.pyq`
4. **Result**: The Supabase PostgREST API responds with HTTP 400 Bad Request, returning:
   `{"code":"42703","details":null,"hint":null,"message":"column learning_resources.description does not exist"}`

## 3. Root Cause
**Querying a Nonexistent Column (`description`)**

During the "select(*)" cleanup (Fix 3), the codebase was updated to request explicit columns from the `learning_resources` table. The updated queries in `src/services/learningResourcesAPI.ts` included `description` in the comma-separated `select()` list:
`'id, title, description, resource_type, medium, created_at, pdf_url, thumbnail_url, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path'`

However, the `description` column does not actually exist in the `learning_resources` table in the Supabase database schema. Because PostgREST expects all requested columns to exist, it rejects the entire query with a 400 error.

## 4. Root-Cause Matrix

| Area | Checked | Result | Evidence | Likely? |
| :--- | :--- | :--- | :--- | :--- |
| Supabase URL | Yes | Works | Requests are going to `rhzftlytulgnpodxqzqr.supabase.co` | No |
| Public API key | Yes | Works | Requests are authenticated and reach PostgREST | No |
| Deployment env vars | Yes | Works | Client initializes and sends requests | No |
| Domain transition | Yes | Irrelevant | Live site exhibits code-level query error | No |
| Supabase client | Yes | Works | Requests are being sent | No |
| Resource data layer | Yes | Broken | `fetchLearningResources` constructs invalid query | **Yes** |
| "select" changes | Yes | Broken | Fix 3 explicitly added `description` to `.select()` | **Yes** |
| Route splitting | Yes | Works | Frontend chunks load successfully | No |
| PdfViewer changes | Yes | N/A | Fails before PDF loads | No |
| Authentication | Yes | Works | N/A to this specific metadata fetch failure | No |
| RLS | Yes | N/A | Error is 400 (Bad Request), not 401/403 (Auth/RLS) | No |
| Database API | Yes | Works | API responds correctly with schema error | No |
| Storage | Yes | N/A | Fails before reaching storage logic | No |
| Browser/network | Yes | Works | Network traffic successfully round-trips to Supabase | No |
| Deployment | Yes | Works | Code executed matches `main` branch | No |

## 5. Evidence
*   **Live Site Playwright Test**: A Playwright script hitting the live URL (`https://unfollowaman.tech/library`) intercepts the API request:
    `GET https://rhzftlytulgnpodxqzqr.supabase.co/rest/v1/learning_resources?select=id%2Ctitle%2Cdescription...`
*   **Supabase Response**: The response to the above request is HTTP 400:
    `{"code":"42703","details":null,"hint":null,"message":"column learning_resources.description does not exist"}`
*   **Codebase Verification**: Checking `src/services/learningResourcesAPI.ts` shows `description` hardcoded in the `select` statements:
    ```typescript
    export const fetchLearningResources = async (filters: FetchResourcesFilters = {}) => {
      let query = supabase.from('learning_resources').select(filters.includeChapters ? 'id, title, description, resource_type, ...' : 'id, title, description, ...');
      // ...
    ```

## 6. Timeline
*   **Fix 3**: Explicit `.select()` column strings were introduced to replace `.select('*')`. The author mistakenly assumed a `description` column existed or mistakenly mapped `item.description` in the frontend logic.
*   **Current failure**: Every single resource-fetching hook utilizing `learningResourcesAPI.ts` now fails uniformly across the application because of this invalid column request.

## 7. Recommended Fix
**Remove `description` from the `.select()` queries.**

In `src/services/learningResourcesAPI.ts`, update both `fetchLearningResources` and `fetchLearningResourceById` to remove the word `description, ` from the `.select(...)` strings.

*Before*:
`'id, title, description, resource_type, ...'`
*After*:
`'id, title, resource_type, ...'`

(Optional but recommended: remove `description: item.description` from the `mapLearningResource` mapper as well, although it shouldn't cause an error on its own, just evaluates to `undefined`).

**Risk**: Low.
**Regression Risk**: UI components might have relied on a `description` field that was never populated anyway, so rendering `undefined` shouldn't break the UI, but it's safe to verify.

## 8. Verification Plan
1.  Apply the fix to `src/services/learningResourcesAPI.ts`.
2.  Run `npm run test` and `npm run build` locally.
3.  Deploy the code to Cloudflare Pages.
4.  Navigate to `https://unfollowaman.tech/library` and verify that the resource cards load correctly and no 400 errors are present in the network tab.
