# Horizon Audit: Student Medium vs Notes/PDF Medium Filtering

**Document Title:** Horizon Technical Audit — Student Medium vs. Study Notes/PDF Medium Filtering
**Date:** March 2026
**Auditor:** Jules (Senior Software Engineer)
**Status:** Complete Audit Report (No Code Changes Applied)

---

## 1. Executive Summary

During signup and onboarding, every Horizon student selects their preferred study medium (**Hindi Medium** or **English Medium**). This choice is persisted in the database under `profiles.study_medium` and made globally available to the frontend via `AuthContext`.

Simultaneously, every study note / PDF resource stored in the `learning_resources` database table is tagged with its medium in the `medium` ENUM column (`'english'` or `'hindi'`).

**The Problem:** When an authenticated student navigates to the Study Notes page (`/notes`), the application displays notes from **both Hindi Medium and English Medium**.

**Confirmed Root Cause:** The hypothesis is **100% confirmed**. The database and application state already contain both pieces of information:
1. The authenticated student's selected medium (`profiles.study_medium`).
2. The medium associated with each note/PDF (`learning_resources.medium`).

However, the notes page container (`ResourcePage.tsx`) does **not** consume `useAuth()` or read `profile.study_medium`. It queries Supabase via `fetchLearningResources({ resource_type: 'notes', includeChapters: true })` without passing any medium filter parameter, and defaults the frontend filter state to `"All Mediums"`. Consequently, both English and Hindi notes are retrieved from Supabase and rendered together on the student's screen.

---

## 2. Current Architecture & Data Flow

Below is the complete end-to-end data flow tracing student medium capture, storage, state management, resource queries, and UI rendering:

```
+-----------------------------------------------------------------------------------+
| 1. Student Signup & Onboarding                                                    |
|    - Register.tsx -> auth.ts (supabase.auth.signUp)                               |
|    - Onboarding.tsx Step 3 -> updates profiles.study_medium = 'English' | 'Hindi'  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. Auth & Session Management                                                      |
|    - AuthContext.tsx fetches profile from 'profiles' table on app load             |
|    - Exposes user profile via useAuth() custom hook (profile.study_medium)        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. Study Notes Page Request (/notes)                                              |
|    - StudyNotesRoute.tsx -> renders ResourcePage with notesConfig                 |
|    - ResourcePage.tsx fires useEffect: fetchLearningResources({ resource_type }) |
|    - MISSING: ResourcePage DOES NOT consume useAuth() or profile.study_medium!   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 4. Database Query (learningResourcesAPI.ts)                                       |
|    - fetchLearningResources({ resource_type: 'notes', includeChapters: true })    |
|    - Executes: SELECT * FROM learning_resources WHERE resource_type = 'notes'     |
|    - NO MEDIUM FILTER APPLIED AT DATABASE LEVEL                                    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 5. Frontend Filtering & Rendering (ResourcePage.tsx + resourcePageConfigs.ts)      |
|    - URL route /notes has no medium slug -> selectedThirdFilter = ''              |
|    - effectiveThirdFilter = 'All Mediums'                                         |
|    - filterByThirdFilter returns ALL resources (Hindi + English)                  |
|    - Both mediums rendered in grid                                                |
+-----------------------------------------------------------------------------------+
```

---

## 3. Student Medium Storage

1. **Capture Flow:**
   - **Signup:** `src/pages/auth/Register.tsx` creates the user account using `register(email, password, name)` via `supabase.auth.signUp()`.
   - **Onboarding:** `src/pages/onboarding/Onboarding.tsx` prompts the student in Step 3 for their "Study Medium" with options `'English'` and `'Hindi'`.
   - When selected, `Onboarding.tsx` executes:
     ```typescript
     await supabase.from('profiles').update({ study_medium: studyMedium }).eq('id', userId);
     ```

2. **Database Object:**
   - **Table:** `public.profiles`
   - **Column:** `study_medium`
   - **Data Type:** `text` (Nullable)
   - **Stored Values:** `'English'` or `'Hindi'` (Title Case string).

3. **Client State Representation & Accessibility:**
   - On session startup and auth change, `AuthContext.tsx` queries:
     ```typescript
     supabase
       .from('profiles')
       .select('id, student_class, study_medium, avatar_url, onboarding_completed, name, created_at')
       .eq('id', sessionUser.id)
       .single();
     ```
   - Stored in context state as `profile` and made globally accessible via `useAuth()`.
   - `profile.study_medium` is reliably populated for all onboarded authenticated students.
   - Helper utility `src/utils/resourceHelper.ts` provides `normalizeMediumValue(profile?.study_medium)`, converting `'English'` -> `'english'` and `'Hindi'` -> `'hindi'` (returning `'english'` as a fallback if null).

---

## 4. Notes/PDF Medium Storage

1. **Database Object:**
   - **Table:** `public.learning_resources`
   - **Column:** `medium`
   - **Data Type:** PostgreSQL ENUM `medium` (`'english'`, `'hindi'`).
   - **Constraint:** `NOT NULL` on `learning_resources`.

2. **Resource-Level vs. Chapter-Level Association:**
   - The `chapters` table represents medium-neutral syllabus chapters (e.g. Chapter 1: Chemical Reactions).
   - The `learning_resources` table stores individual PDF note files.
   - The `medium` column is stored **directly** on each row of `learning_resources`.
   - Multiple medium versions of the same chapter exist as distinct rows in `learning_resources` sharing the same `chapter_id` but with different `medium` values (e.g. `medium = 'english'` for English notes, `medium = 'hindi'` for Hindi notes).

---

## 5. Notes Retrieval Flow

1. **Route & Entry Point:**
   - Path `/notes` is served by `src/pages/resources/StudyNotesRoute.tsx`, which renders `<ResourcePage config={notesConfig} />`.

2. **Data Fetching Implementation:**
   - Inside `src/pages/resources/ResourcePage.tsx` (lines 172–187):
     ```typescript
     useEffect(() => {
       const fetchResources = async () => {
         setLoading(true);
         const { data, error } = await fetchLearningResources({
           resource_type: config.resourceType,
           includeChapters: config.includeChapters
         });

         if (error) {
           console.error('Error fetching resources:', error);
           setAllResources([]);
         } else if (data) {
           setAllResources(data);
         }
         setLoading(false);
       };

       fetchResources();
     }, [config.resourceType, config.includeChapters]);
     ```

3. **API Query Layer:**
   - In `src/services/learningResourcesAPI.ts`, `fetchLearningResources` accepts a filter interface:
     ```typescript
     export interface FetchResourcesFilters {
       resource_type?: ResourceType;
       student_class?: string;
       subject?: string;
       medium?: Medium; // <--- API capability ALREADY EXISTS
       includeChapters?: boolean;
       neqId?: string;
       limit?: number;
     }
     ```
   - When `filters.medium` is provided, `fetchLearningResources` attaches `.eq('medium', filters.medium)` to the Supabase PostgREST query.
   - **Gap:** `ResourcePage.tsx` **never** passes `filters.medium` or `filters.student_class` when fetching notes. It requests all notes indiscriminately.

---

## 6. Frontend Categorization & Filtering Flow

1. **URL Synchronization:**
   - `ResourcePage.tsx` parses URL parameters (`/notes/:classSlug/:mediumSlug/:subjectSlug` or query string `?medium=...`) via `useParams()` and `useLocation()`.
   - If the route is simply `/notes` (no medium specified in URL), `selectedThirdFilter` is set to `""`.

2. **In-Memory Filtering Logic:**
   - In `ResourcePage.tsx` (lines 280–294):
     ```typescript
     const filteredResources = useMemo(() => {
       let filtered = allResources;

       if (selectedClass) {
         filtered = filtered.filter(r => r.student_class === selectedClass);
       }
       if (selectedSubject) {
         filtered = filtered.filter(r => r.subject === selectedSubject);
       }

       const effectiveThirdFilter = selectedThirdFilter || thirdFilterAllLabel;
       filtered = config.filterByThirdFilter(filtered, effectiveThirdFilter);

       return config.sortResources(filtered);
     }, [allResources, selectedClass, selectedSubject, selectedThirdFilter, thirdFilterAllLabel, config]);
     ```

3. **Configuration Filtering (`notesConfig` in `src/config/resourcePageConfigs.ts`):**
   ```typescript
   getThirdFilterDesktopLabel: () => 'All Mediums',
   getThirdFilterMobileLabel: () => 'Mediums',
   filterByThirdFilter: (resources: Resource[], filterValue: string) => {
     if (filterValue !== 'Mediums' && filterValue !== 'All Mediums') {
       return resources.filter(r => r.medium && r.medium.toLowerCase() === filterValue.toLowerCase());
     }
     return resources; // <--- Returns ALL resources when filterValue is 'All Mediums' or 'Mediums'
   }
   ```

4. **Why Both Mediums Render:**
   - When an authenticated student opens `/notes`, `selectedThirdFilter` is empty (`""`).
   - `effectiveThirdFilter` resolves to `'All Mediums'`.
   - `filterByThirdFilter` checks `if (filterValue !== 'Mediums' && filterValue !== 'All Mediums')` — which evaluates to `false`.
   - It executes `return resources;`, keeping both English and Hindi notes in the array rendered by `filteredResources.map(...)`.

---

## 7. Root Cause Analysis

The root cause is a **missing integration in the frontend page layer (`ResourcePage.tsx`) between user authentication state (`useAuth()`) and resource filtering/fetching**.

Specifically:
1. **Unused Auth Context:** `ResourcePage.tsx` does not import or call `useAuth()`. It operates completely agnostically of whether a user is logged in or what their `profile.study_medium` preference is.
2. **Missing Default Filter Initialization:** When a student visits `/notes` without explicit URL filter overrides, `ResourcePage.tsx` defaults `selectedThirdFilter` to `""` (All Mediums) rather than defaulting to the student's saved `profile.study_medium`.
3. **Unfiltered API Fetch:** `ResourcePage.tsx` calls `fetchLearningResources({ resource_type: 'notes' })` without passing the student's `student_class` or `medium` to Supabase, pulling the full catalog of resources into browser memory across all mediums.

---

## 8. Evidence & Code References

| Aspect | File / Location | Code Reference | Description |
| :--- | :--- | :--- | :--- |
| **Student Medium DB Column** | `public.profiles` | Column `study_medium text` | Stores student preference (`'English'` or `'Hindi'`). |
| **Notes Medium DB Column** | `public.learning_resources` | Column `medium public.medium` | Stores resource language (`'english'` or `'hindi'`). |
| **Onboarding Selection** | `src/pages/onboarding/Onboarding.tsx` (L71) | `await updateProfile({ study_medium: studyMedium });` | Persists user medium selection to Supabase. |
| **Auth State Provision** | `src/context/AuthContext.tsx` (L37) | `.select('..., study_medium, ...')` | Loads student profile into React context. |
| **Unused Medium Filter API** | `src/services/learningResourcesAPI.ts` (L106) | `if (filters.medium) query = query.eq('medium', filters.medium);` | API supports medium filtering, but caller does not pass `filters.medium`. |
| **Notes Page Route** | `src/pages/resources/StudyNotesRoute.tsx` | `<ResourcePage config={notesConfig} />` | Entry route for notes. |
| **Resource Fetch Call** | `src/pages/resources/ResourcePage.tsx` (L174) | `fetchLearningResources({ resource_type: config.resourceType, includeChapters: config.includeChapters })` | Fetches ALL resources without user medium context. |
| **Filter Config Pass-Through** | `src/config/resourcePageConfigs.ts` (L59) | `if (filterValue !== 'Mediums' && filterValue !== 'All Mediums')` | Bypasses filtering when filter string is "All Mediums". |

---

## 9. Critical Questions Answered

### 1. Does the database already know the student's selected medium?
**YES.** The `profiles` table contains the `study_medium` column (populated as `'English'` or `'Hindi'`).

### 2. Does the database already know the medium of each notes/PDF resource?
**YES.** The `learning_resources` table contains the `medium` ENUM column (populated as `'english'` or `'hindi'`).

### 3. Can the system technically match student medium → notes medium today?
**YES.** Both values exist in the database, `AuthContext` provides `profile.study_medium`, `normalizeMediumValue()` formats it, and `fetchLearningResources({ medium })` already supports PostgREST filtering by medium.

### 4. Where exactly is that relationship currently lost, ignored, or not applied?
The relationship is lost in **`src/pages/resources/ResourcePage.tsx`**. The page component does not inspect `useAuth()` or `profile.study_medium`, nor does it pass `profile.study_medium` to `fetchLearningResources` or set it as the default state for `selectedThirdFilter`.

### 5. Is the problem caused by data modeling, retrieval/query logic, backend logic, frontend filtering, or some combination?
It is a **combination of query parameter omission and frontend state initialization**:
- **Query logic:** `fetchLearningResources` is called without `medium` or `student_class` parameters.
- **Frontend state:** `ResourcePage` does not read `profile.study_medium` from `useAuth()` to initialize `selectedThirdFilter` or pre-filter displayed items when no explicit URL parameters are present.

### 6. Is there already an existing filtering mechanism that is simply incomplete or unused?
**YES.**
- `fetchLearningResources` in `learningResourcesAPI.ts` already has built-in support for `filters.medium`.
- `notesConfig.filterByThirdFilter` in `resourcePageConfigs.ts` already has string-matching filter logic.
- `useDashboardProgress.ts` already uses `normalizeMediumValue(profile.study_medium)` successfully for progress tracking.

### 7. What exact code path currently causes both Hindi and English notes to be displayed?
1. Student visits `/notes`.
2. `StudyNotesRoute` renders `ResourcePage` with `notesConfig`.
3. `ResourcePage` triggers `fetchLearningResources({ resource_type: 'notes', includeChapters: true })`.
4. Supabase returns all notes rows (`medium = 'english'` and `medium = 'hindi'`).
5. URL has no medium slug, so `selectedThirdFilter` defaults to `""`.
6. `effectiveThirdFilter` resolves to `'All Mediums'`.
7. `notesConfig.filterByThirdFilter(resources, 'All Mediums')` returns all resources without filtering.
8. `ResourcePage` renders the complete unfiltered array in the grid.

---

## 10. Confirmed Findings vs. Hypotheses

| Hypothesis / Assumption | Audit Outcome | Explanation / Finding |
| :--- | :--- | :--- |
| **Hypothesis 1:** The system knows student medium and note medium, but filtering layer doesn't use them together. | **CONFIRMED** | Both DB fields exist and are populated. The page layer fails to bridge user profile state with resource filtering. |
| **Hypothesis 2:** Student medium data might be missing or uncaptured. | **REJECTED** | Medium selection is required in Step 3 of Onboarding and correctly saved to `profiles.study_medium`. |
| **Hypothesis 3:** Notes resources might lack medium tags. | **REJECTED** | `learning_resources.medium` is a NOT NULL ENUM column correctly set for every record. |
| **Hypothesis 4:** RLS policies block medium filtering. | **REJECTED** | RLS allows public SELECT on `learning_resources`. The issue is entirely client-query/state wiring. |

---

## 11. Recommended Fix Direction (Architectural Blueprint)

*Note: As per scope instructions, no application or database changes have been implemented.*

To resolve this issue cleanly in a future update, the following changes should logically occur:

1. **Incorporate `useAuth` in `ResourcePage.tsx`:**
   - Import `useAuth` from `../../context/AuthContext`.
   - Access `const { profile } = useAuth()`.

2. **Smart Default Filter Initialization:**
   - When no explicit URL slug (`params.mediumSlug` or `?medium=`) is provided on route load, initialize or set `selectedThirdFilter` to the student's normalized medium (`profile.study_medium`).
   - If the student is unauthenticated or has no set medium, fall back to "All Mediums" or "English".

3. **URL Parameter Precedence:**
   - Ensure explicit URL navigation (e.g. `/notes/class-10/hindi-medium`) overrides the user's default profile preference, allowing students to intentionally browse materials outside their primary medium if desired.

4. **Optional Query Optimization at API Layer:**
   - Optionally pass `medium: normalizedUserMedium` into `fetchLearningResources` when fetching notes for authenticated students to reduce payload size over the wire.

---

## 12. Potential Edge Cases

1. **Unauthenticated / Guest Users:**
   - Guest users visiting `/notes` have `profile = null`. The page must gracefully fall back to showing `"All Mediums"` (or default to `"English"`) without throwing errors.

2. **Students Browsing Other Mediums Intentionally:**
   - A Hindi medium student may click the dropdown to select `"English Medium"` or visit a direct link `/notes/class-10/english-medium`. The URL filter must override the student's profile default.

3. **Syllabus Progress Alignment:**
   - `useDashboardProgress.ts` already filters progress by `normalizeMediumValue(profile.study_medium)`. Ensuring notes filtering matches this logic will create a 100% consistent user experience between the Dashboard and the Notes Library.

---

## 13. Files & Database Objects Involved

### Database Objects:
- `public.profiles` (`study_medium` column)
- `public.learning_resources` (`medium` ENUM column)

### Codebase Files:
- `src/pages/resources/ResourcePage.tsx` (Page container)
- `src/config/resourcePageConfigs.ts` (Notes filter configuration)
- `src/services/learningResourcesAPI.ts` (Fetch API service)
- `src/context/AuthContext.tsx` (User profile context)
- `src/utils/resourceHelper.ts` (`normalizeMediumValue` utility)
