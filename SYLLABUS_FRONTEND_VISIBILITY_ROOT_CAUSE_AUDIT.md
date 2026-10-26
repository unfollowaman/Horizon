# Horizon Syllabus Frontend Visibility Root-Cause Audit Report

## 1. Executive Finding

```text
ROOT CAUSE:
PostgreSQL table-level `GRANT SELECT` privileges on `public.syllabus_topics` and `public.syllabus_topic_resources` were missing for PostgREST API roles (`anon`, `authenticated`, and `service_role`) in Production Supabase.
```

While Row Level Security (RLS) policies (`CREATE POLICY ... FOR SELECT USING (true);`) were enabled during the Stage 4 migration, PostgREST queries fail before RLS policies are evaluated because PostgreSQL rejects table access at the table permission level with Postgres Error `42501` (`permission denied for table syllabus_topics`).

---

## 2. Data-Flow Trace & Point of Failure

```text
Production Supabase Database
   │
   ├─► public.chapters (GRANT SELECT exists) ──► Accessible
   │
   ├─► public.syllabus_topics (GRANT SELECT missing) ──► ❌ Permission Denied (42501)
   │
   └─► public.syllabus_topic_resources (GRANT SELECT missing) ──► ❌ Permission Denied (42501)
        │
        ▼
fetchSyllabusHierarchy('8', 'Mathematics') [src/services/learningResourcesAPI.ts]
        │
        ├─► Executes Supabase nested select query on chapters + syllabus_topics + syllabus_topic_resources
        ├─► Receives Postgres Error Code 42501: "permission denied for table syllabus_topics"
        └─► Returns { data: null, error: PostgrestError }
        │
        ▼
SyllabusPage.tsx [src/pages/syllabus/SyllabusPage.tsx]
        │
        ├─► Handles apiError from fetchSyllabusHierarchy
        ├─► Sets state: error = "Failed to fetch syllabus data. Please try again." and chapters = []
        └─► Renders error state container ("Unable to Load Syllabus")
        │
        ▼
SyllabusHierarchyTree.tsx [src/pages/syllabus/components/SyllabusHierarchyTree.tsx]
        │
        └─► Not reached with valid chapters data; when chapters = [], displays "No Syllabus Found" fallback or error state UI
        │
        ▼
Browser Visible UI
        │
        └─► Displays "Unable to Load Syllabus" / "Failed to fetch syllabus data" error container to the end user
```

---

## 3. Empirical Evidence

Direct execution of the frontend's exact Supabase query against the production Supabase endpoint (`https://rhzftlytulgnpodxqzqr.supabase.co`) yielded the following responses:

### 3.1 Chapter Query (`chapters` Table)
Querying `chapters` table directly succeeds:
```json
{
  "count": 13,
  "sample": {
    "id": "4298c56e-cc4a-43c5-afc5-ff46729e4ba6",
    "student_class": "8",
    "subject": "Mathematics",
    "chapter_number": 1,
    "chapter_name": "Rational Numbers",
    "is_active": true
  }
}
```

### 3.2 Syllabus Topics Query (`syllabus_topics` Table)
Querying `syllabus_topics` using `anon` key fails:
```json
{
  "code": "42501",
  "details": null,
  "hint": "Grant the required privileges to the current role with: GRANT SELECT ON public.syllabus_topics TO anon;",
  "message": "permission denied for table syllabus_topics"
}
```

### 3.3 Exact Frontend Query (`fetchSyllabusHierarchy`)
Querying the joined hierarchy via Supabase client fails:
```json
{
  "code": "42501",
  "details": null,
  "hint": "Grant the required privileges to the current role with: GRANT SELECT ON public.syllabus_topics TO anon;",
  "message": "permission denied for table syllabus_topics"
}
```

---

## 4. Resource-Independence Finding

```text
CONFIRMED: The current frontend architecture and database query fully support syllabus topics with zero attached resources/PDFs.
```

1. **Database Query (`fetchSyllabusHierarchy`)**: Uses standard PostgREST nested select syntax (`syllabus_topics(*, syllabus_topic_resources(*))`). PostgREST executes a `LEFT OUTER JOIN` between `chapters`, `syllabus_topics`, and `syllabus_topic_resources`. Chapters and topics with 0 linked resources still return all topics with empty `syllabus_topic_resources: []` arrays.
2. **Service Mapping (`learningResourcesAPI.ts`)**: Iterates through `topic.syllabus_topic_resources || []`. If the array is empty, `topicResources` evaluates to `[]` and returns the topic with `resources: []`.
3. **UI Component (`SyllabusTopicNode.tsx`)**: Renders topic title, type badge, and description regardless of resource count. Link buttons are conditionally rendered only when `resources.length > 0`:
   ```tsx
   {/* Linked Learning Resources */}
   {resources.length > 0 && (
     <div className="flex items-center gap-2 flex-wrap shrink-0">
       ...
     </div>
   )}
   ```

A missing PDF or empty resource junction table does **not** hide or filter out syllabus topics.

---

## 5. RLS & Privileges Finding

```text
RLS Status: RLS policies exist on public.syllabus_topics and public.syllabus_topic_resources, but PostgREST roles lack table SELECT privileges.
```

* Migration `20260101000000_create_syllabus_tables.sql` enabled RLS and defined:
  `CREATE POLICY "Allow public read access on syllabus_topics" ON public.syllabus_topics FOR SELECT USING (true);`
* However, PostgreSQL enforces table-level privileges (`GRANT SELECT ON table TO role`) **before** checking RLS policies.
* Because `GRANT SELECT ON public.syllabus_topics TO anon, authenticated, service_role;` was not explicitly executed (or default schema privileges were revoked), PostgreSQL blocks PostgREST from accessing the table at all, returning error `42501`.

---

## 6. Environment Finding

```text
Environment Match: CONFIRMED
```

* **Production Frontend Supabase URL**: `https://rhzftlytulgnpodxqzqr.supabase.co`
* **Production Database Endpoint**: `https://rhzftlytulgnpodxqzqr.supabase.co`

The production frontend and the database where syllabus records were created share the exact same Supabase project instance.

---

## 7. S5.1 Regression Finding

```text
S5.1 Regression: NO
```

* S5.1 changes were audited in `src/services/syllabusService.ts`, `src/pages/syllabus/SyllabusPage.tsx`, and `src/utils/urlHelper.ts`.
* S5.1 correctly normalizes route params (e.g. `class-8` -> `8`, `mathematics` -> `Mathematics`).
* The values passed to `fetchSyllabusHierarchy("8", "Mathematics")` match the production database columns (`student_class = '8'`, `subject = 'Mathematics'`).
* S5.1 did not introduce any regression causing this visibility failure.

---

## 8. Recommended Fix

To resolve the production syllabus visibility failure without changing frontend code or altering data, execute the following SQL migration on the Production Supabase instance:

```sql
-- Grant SELECT privileges on syllabus tables to PostgREST roles
GRANT SELECT ON public.syllabus_topics TO anon, authenticated, service_role;
GRANT SELECT ON public.syllabus_topic_resources TO anon, authenticated, service_role;
```

Optionally, ensure future tables inherit default select privileges:
```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated, service_role;
```

---

## 9. Recommended Verification

After applying the SQL fix on Supabase:

1. **Direct API Verification**:
   Run a curl or PostgREST query against `https://rhzftlytulgnpodxqzqr.supabase.co/rest/v1/syllabus_topics?select=*` with the `apikey: <anon_key>` header to verify HTTP 200 OK and valid JSON array return.
2. **Frontend UI Verification**:
   Navigate to `/syllabus/class-8/mathematics` in the browser.
   * Verify HTTP network request to `/rest/v1/chapters` succeeds with status 200.
   * Verify all 13 Class 8 Mathematics chapters render on the page.
   * Expand Chapter 1 ("Rational Numbers") and verify Exercise 1.1 topic node displays correctly with zero resource links.
3. **Automated Integration Test**:
   Run `npm test` to verify all client and service unit/integration test suites pass.

---

## 10. Audit Directives Compliance Assertions

1. **No fixes were implemented during this task.**
2. **No code, schema, or database changes were executed.**
3. **This report represents an audit and root-cause analysis only.**
