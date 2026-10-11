# HORIZON NOTES RESOURCE FILTER AUDIT

## 1. Relevant Files

The following repository files are responsible for fetching, filtering, routing, and rendering study notes on Horizon:

| File Path | Responsibility |
| :--- | :--- |
| `src/pages/resources/StudyNotesRoute.tsx` | Route component for `/notes`. Renders `ResourcePage` configured with `notesConfig`. |
| `src/config/resourcePageConfigs.ts` | Defines `notesConfig` (title, meta, `thirdFilterType: 'medium'`, `extractThirdFilterValues`, `filterByThirdFilter`, `sortResources`). |
| `src/pages/resources/ResourcePage.tsx` | Primary layout & logic for Notes and PYQ pages. Handles state (`selectedClass`, `selectedSubject`, `selectedThirdFilter`), URL synchronization, profile fallback (`profile.study_medium`), calling `fetchLearningResources`, and executing client-side filtering. |
| `src/services/learningResourcesAPI.ts` | Interacts with Supabase database (`learning_resources` table). Implements `fetchLearningResources`, `fetchLearningResourceById`, `fetchSyllabusChapters`, and `fetchSyllabusHierarchy`. |
| `src/utils/urlHelper.ts` | Normalizes and converts filter values (class, medium, subject) to and from hierarchical URL slugs (e.g. `/notes/class-10/english-medium/sanskrit`). |
| `src/utils/resourceHelper.ts` | Helper utilities including `normalizeMediumValue` (maps medium string to `'english'` or `'hindi'`), `getResourceUrl`, and protected resource checks. |
| `src/context/AuthContext.tsx` | Provides user authentication state and student profile data (`profile.study_medium`). |
| `src/components/MaterialCard.tsx` | Renders individual resource PDF cards in grid views with thumbnail/illustration, title, subject/year badge, and links to `/resource/:id`. |
| `src/pages/resources/ResourceDetails.tsx` | Resource landing page (`/resource/:id`). Fetches single resource record by ID (`fetchLearningResourceById`) and displays educational metadata, chapter summary, topics, and PDF reader CTA (`/view/:id`). |
| `src/pages/user/hooks/useDashboardProgress.ts` | Dashboard hook calculating completed chapter progress by calling `fetchSyllabusChapters` with user's `student_class` and `study_medium`. |
| `src/types/index.ts` | TypeScript definitions for `Resource`, `LearningResource`, `ResourceType`, `Medium` (`'english' | 'hindi'`), and Supabase DB schemas. |

---

## 2. Data Flow

```
[User Navigates to /notes or /notes/class-10/...]
                     │
                     ▼
           StudyNotesRoute.tsx
                     │
                     ▼
             ResourcePage.tsx
                     │
                     ├─► 1. Resolve Active Filters (URL Slugs -> Query Params -> Profile Default)
                     │      • selectedClass: e.g. "Class 10"
                     │      • selectedSubject: e.g. "Sanskrit"
                     │      • selectedThirdFilter: e.g. "English" (from profile.study_medium or URL)
                     │
                     ├─► 2. Supabase Fetch (learningResourcesAPI.ts)
                     │      • Call fetchLearningResources({ resource_type: 'notes', includeChapters: true, medium: 'english' })
                     │      • Executes Supabase query:
                     │        supabase.from('learning_resources')
                     │                .select(...)
                     │                .eq('resource_type', 'notes')
                     │                .eq('medium', 'english')
                     │
                     ├─► 3. Database Query Execution
                     │      • Returns array of LearningResourceRow matching resource_type = 'notes' AND medium = 'english'
                     │
                     ├─► 4. Client-Side Filtering & Sorting (ResourcePage.tsx)
                     │      • Filter by Class & Subject: r.student_class === selectedClass && r.subject === selectedSubject
                     │      • Filter by Medium (notesConfig.filterByThirdFilter):
                     │        resources.filter(r => r.medium && r.medium.toLowerCase() === filterValue.toLowerCase())
                     │      • Sort by Chapter Number or Title (notesConfig.sortResources)
                     │
                     └─► 5. UI Rendering
                            • Render grid of MaterialCard components
                            • Click card -> Link to /resource/:id (ResourceDetails.tsx)
```

---

## 3. Medium Filtering Logic

The application determines resource visibility for English-medium and Hindi-medium students through a multi-tier pipeline:

### 1. Medium Source Priority
1. **URL Slug / Query Parameters**: Highest priority. E.g., `/notes/class-10/english-medium/geography` or `?medium=english-medium`.
2. **Student Profile Preference**: If no medium is specified in the URL, `ResourcePage.tsx` checks `profile?.study_medium` (from `AuthContext`). If set (e.g. `'english'` or `'hindi'`), it capitalizes the string (`'English'` or `'Hindi'`) and uses it as `selectedThirdFilter`.
3. **All Mediums Option**: If the user selects "All Mediums" from the dropdown or navigates to `/notes/class-10/all-mediums`, `selectedThirdFilter` becomes `''` (empty string).

### 2. Dual Filtering Execution (Database + Frontend)
Medium filtering is enforced in **both** the database query layer and the frontend JavaScript layer:

- **Database Query Layer (`learningResourcesAPI.ts`)**:
  When `selectedThirdFilter` is set (e.g. `'English'`), `ResourcePage.tsx` normalizes it using `normalizeMediumValue('English')` -> `'english'` and passes it in `fetchFilters.medium`.
  `fetchLearningResources` appends `.eq('medium', 'english')` to the Supabase PostgREST query:
  ```ts
  if (filters.medium) query = query.eq('medium', filters.medium);
  ```
- **Frontend JavaScript Layer (`resourcePageConfigs.ts`)**:
  `notesConfig.filterByThirdFilter` filters the array returned by Supabase:
  ```ts
  filterByThirdFilter: (resources: Resource[], filterValue: string) => {
    if (filterValue !== 'Mediums' && filterValue !== 'All Mediums') {
      return resources.filter(r => r.medium && r.medium.toLowerCase() === filterValue.toLowerCase());
    }
    return resources;
  }
  ```

### 3. Handling of `NULL` Medium Values
If a record in `learning_resources` has `medium = NULL`:
1. **Excluded in Supabase SQL Query**: PostgREST `.eq('medium', 'english')` translates to SQL `WHERE medium = 'english'`. In SQL, `NULL = 'english'` evaluates to `UNKNOWN` (false). Thus, records with `medium = NULL` are **completely filtered out at the database level** whenever a specific medium is active.
2. **Excluded in Frontend JavaScript Filter**: The frontend filter requires `r.medium` to be truthy (`r.medium && r.medium.toLowerCase() === ...`). A `null` or `undefined` value evaluates to falsy and is filtered out.
3. **Excluded in Dropdown Extraction**: `notesConfig.extractThirdFilterValues` only extracts mediums if `r.medium` is truthy (`if (r.medium) { acc.add(r.medium); }`).

---

## 4. Resource Detail Navigation

1. **Grid Card Click**: In `MaterialCard.tsx`, clicking a resource card executes navigation via `<Link to={`/resource/${resource.id}`} state={{ fromApp: true }}>`.
2. **Route Match**: Matching route in `App.tsx` renders `<ResourceDetails />`.
3. **Record Identification**: `ResourceDetails.tsx` reads `const { id } = useParams<{ id: string }>()` and calls `fetchLearningResourceById(id, true)` in `learningResourcesAPI.ts`.
4. **Database Query**:
   ```ts
   supabase.from('learning_resources')
           .select(...)
           .eq('id', id)
           .single()
   ```
5. **Medium Validation on Detail Page**:
   - `ResourceDetails.tsx` **does NOT filter or block access** based on the user's profile medium or the resource's medium. Any valid resource ID will load its detail page regardless of medium.
   - However, when fetching *Related Resources* on the sidebar, `ResourceDetails.tsx` passes `medium: mappedResource.medium || undefined` to `fetchLearningResources`.

---

## 5. Code Evidence

### Evidence A: Notes Configuration and Medium Filtering (`src/config/resourcePageConfigs.ts`)
```ts
// Lines 42-67 in src/config/resourcePageConfigs.ts
export const notesConfig: ResourcePageConfig = {
  resourceType: 'notes',
  title: 'Study Notes',
  metaTitle: 'Comprehensive Study Notes | Horizon - Free Student Library',
  metaDescription: 'Explore free, subject-wise study notes organized by syllabus chapters for Class 8 to Class 12 in English and Hindi medium. Master concepts with clear chapter outlines and revision notes.',
  includeChapters: true,
  thirdFilterType: 'medium',
  emptyMessageTitle: 'No study notes found.',
  emptyMessageSubtitle: 'Try selecting a different class, subject, or medium.',
  otherResourcesCategory: 'notes',
  getThirdFilterDesktopLabel: () => 'All Mediums',
  getThirdFilterMobileLabel: () => 'Mediums',
  extractThirdFilterValues: (resources: Resource[]) => {
    const rawMediums = resources.reduce((acc, r) => {
      if (r.medium) {
        acc.add(r.medium);
      }
      return acc;
    }, new Set<string>());
    return Array.from(rawMediums).map(m => m.charAt(0).toUpperCase() + m.slice(1)).sort();
  },
  filterByThirdFilter: (resources: Resource[], filterValue: string) => {
    if (filterValue !== 'Mediums' && filterValue !== 'All Mediums') {
      return resources.filter(r => r.medium && r.medium.toLowerCase() === filterValue.toLowerCase());
    }
    return resources;
  },
  sortResources: (resources: Resource[]) => { ... }
};
```

### Evidence B: Supabase Resource Query and Database Filtering (`src/services/learningResourcesAPI.ts`)
```ts
// Lines 100-110 in src/services/learningResourcesAPI.ts
export const fetchLearningResources = async (filters: FetchResourcesFilters = {}) => {
  const selectQuery = filters.includeChapters
    ? 'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance, chapters(id, chapter_number, chapter_name, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance)'
    : 'id, title, description, resource_type, medium, created_at, student_class, subject, year, chapter_id, allow_download, storage_bucket, file_path, chapter_summary, topics, key_concepts, important_terms, learning_objectives, exam_relevant_themes, study_guidance';

  let query = supabase.from('learning_resources').select(selectQuery);

  if (filters.resource_type) query = query.eq('resource_type', filters.resource_type);
  if (filters.student_class) query = query.eq('student_class', filters.student_class);
  if (filters.subject) query = query.eq('subject', filters.subject);
  if (filters.medium) query = query.eq('medium', filters.medium);
  if (filters.neqId) query = query.neq('id', filters.neqId);
  if (filters.limit) query = query.limit(filters.limit);

  const { data: initialData, error: initialError } = await query;
```

### Evidence C: Profile Default & URL Sync in ResourcePage (`src/pages/resources/ResourcePage.tsx`)
```ts
// Lines 180-189 in src/pages/resources/ResourcePage.tsx
const fetchFilters: Parameters<typeof fetchLearningResources>[0] = {
  resource_type: config.resourceType,
  includeChapters: config.includeChapters,
};

if (config.resourceType === 'notes' && config.thirdFilterType === 'medium' && selectedThirdFilter) {
  if (selectedThirdFilter !== 'Mediums' && selectedThirdFilter !== 'All Mediums') {
    fetchFilters.medium = normalizeMediumValue(selectedThirdFilter);
  }
}

// Lines 265-280 in src/pages/resources/ResourcePage.tsx
if (config.thirdFilterType === 'medium') {
  if (qMedium) {
    targetThirdFilter = slugToMedium(qMedium, uniqueThirdFilterValues) || '';
  } else if (pathMediumSlug && isMediumSlug(pathMediumSlug)) {
    if (pathMediumSlug === 'all-mediums') {
      targetThirdFilter = '';
    } else {
      targetThirdFilter = slugToMedium(pathMediumSlug, uniqueThirdFilterValues) || '';
    }
  } else {
    // Only default to student profile study_medium for notes resources
    if (config.resourceType === 'notes' && profile?.study_medium) {
      const profileMedium = profile.study_medium.trim();
      targetThirdFilter = profileMedium.charAt(0).toUpperCase() + profileMedium.slice(1);
    }
  }
```

### Evidence D: Frontend Post-Query Filtering (`src/pages/resources/ResourcePage.tsx`)
```ts
// Lines 319-333 in src/pages/resources/ResourcePage.tsx
const filteredResources = useMemo(() => {
  let filtered = allResources;

  if (selectedClass || selectedSubject) {
    filtered = filtered.filter(
      r => (!selectedClass || r.student_class === selectedClass) &&
           (!selectedSubject || r.subject === selectedSubject)
    );
  }

  // Pass the actual current label for "all" so `config.filterByThirdFilter` can ignore it.
  const effectiveThirdFilter = selectedThirdFilter || thirdFilterAllLabel;
  filtered = config.filterByThirdFilter(filtered, effectiveThirdFilter);

  return config.sortResources(filtered);
}, [allResources, selectedClass, selectedSubject, selectedThirdFilter, thirdFilterAllLabel, config]);
```

### Evidence E: Dashboard Progress Medium Filter Query (`src/services/learningResourcesAPI.ts`)
```ts
// Lines 181-190 in src/services/learningResourcesAPI.ts
export const fetchSyllabusChapters = async (studentClass: string, medium: Medium) => {
  const { data, error } = await supabase
    .from('learning_resources')
    .select('chapter_id, subject')
    .eq('resource_type', 'notes')
    .eq('student_class', studentClass)
    .eq('medium', medium)
    .not('chapter_id', 'is', null);

  return { data, error };
};
```

---

## 6. Sanskrit Compatibility Assessment

### Question: Would setting `medium = NULL` (or `medium = 'both'`) currently work for shared Sanskrit resources?

### Answer: **NO**.

Under the current implementation, setting `medium = NULL` (or `medium = 'both'`) on a Sanskrit note record in `learning_resources` will **FAIL** to display that note to students viewing either English medium or Hindi medium.

#### Why it fails step-by-step:

1. **Supabase Query Exclusion**:
   When an English-medium student visits `/notes` (or when `selectedThirdFilter = 'English'`), `ResourcePage.tsx` sets `fetchFilters.medium = 'english'`. `fetchLearningResources` executes `.eq('medium', 'english')`. In SQL, `WHERE medium = 'english'` rejects rows where `medium IS NULL` or `medium = 'both'`. The database returns `[]` for that resource.

2. **Frontend JavaScript Exclusion**:
   Even if `fetchLearningResources` were modified to return all records without a database medium filter, `notesConfig.filterByThirdFilter` executes:
   `resources.filter(r => r.medium && r.medium.toLowerCase() === filterValue.toLowerCase())`.
   If `r.medium` is `null`, `r.medium` is falsy and the record is discarded. If `r.medium` is `'both'`, `'both'.toLowerCase() === 'english'` evaluates to `false` and the record is discarded.

3. **Dashboard Progress Calculation Exclusion**:
   When a student views their Dashboard, `useDashboardProgress.ts` calls `fetchSyllabusChapters(normalizedClass, profile.study_medium)`. `fetchSyllabusChapters` uses `.eq('medium', medium)` in its Supabase query. Any Sanskrit note with `medium = NULL` or `'both'` would be omitted from syllabus chapter totals and progress tracking.

---

## 7. Required Changes

To support shared Class 10 Sanskrit notes (or any shared resource) visible to both English-medium and Hindi-medium students without duplicating records or PDF files, the following minimal, targeted frontend/API changes are required:

### 1. Data Contract & TypeScript Schema
- Update `Medium` type in `src/types/index.ts` to allow shared medium representation if using a string constant (e.g. `export type Medium = 'english' | 'hindi' | 'both';`) or allow `medium: Medium | null`.

### 2. Supabase Query Logic in `fetchLearningResources` (`src/services/learningResourcesAPI.ts`)
- Modify `fetchLearningResources` so that when a `medium` filter is supplied, it fetches resources matching the requested medium **OR** shared resources (`medium = 'both'` or `medium IS NULL`):
  ```ts
  if (filters.medium) {
    query = query.or(`medium.eq.${filters.medium},medium.eq.both,medium.is.null`);
  }
  ```

### 3. Frontend Filter Logic in `notesConfig` (`src/config/resourcePageConfigs.ts`)
- Update `notesConfig.filterByThirdFilter` so shared resources pass client-side filtering:
  ```ts
  filterByThirdFilter: (resources: Resource[], filterValue: string) => {
    if (filterValue !== 'Mediums' && filterValue !== 'All Mediums') {
      const lowerFilter = filterValue.toLowerCase();
      return resources.filter(
        r => !r.medium || r.medium === 'both' || r.medium.toLowerCase() === lowerFilter
      );
    }
    return resources;
  }
  ```

### 4. Dashboard Progress Query in `fetchSyllabusChapters` (`src/services/learningResourcesAPI.ts`)
- Update `fetchSyllabusChapters` to include shared medium notes in chapter count calculations:
  ```ts
  export const fetchSyllabusChapters = async (studentClass: string, medium: Medium) => {
    const { data, error } = await supabase
      .from('learning_resources')
      .select('chapter_id, subject')
      .eq('resource_type', 'notes')
      .eq('student_class', studentClass)
      .or(`medium.eq.${medium},medium.eq.both,medium.is.null`)
      .not('chapter_id', 'is', null);

    return { data, error };
  };
  ```

---

## 8. Regression Risks

| Feature / Area | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **PYQ Papers (`/library`)** | **Zero Risk** | PYQs use `pyqConfig` with `thirdFilterType: 'year'`. Medium filtering logic in `ResourcePage.tsx` is guarded by `config.resourceType === 'notes' && config.thirdFilterType === 'medium'`. |
| **Other Subjects (Science, Math, etc.)** | **Low Risk** | Non-Sanskrit notes explicitly specify `medium = 'english'` or `medium = 'hindi'`. Adding `.or(medium.eq.both,medium.is.null)` will not affect resources with explicit single-medium tags. |
| **Syllabus Hierarchy View (`/syllabus`)** | **Zero Risk** | `fetchSyllabusHierarchy` joins resources through `syllabus_topic_resources` without filtering by `medium`. Shared Sanskrit notes mapped to Sanskrit syllabus topics already render properly. |
| **Resource Details Page (`/resource/:id`)** | **Zero Risk** | `ResourceDetails` queries directly by `id` (`.eq('id', id)`). Direct page views and direct link sharing work regardless of medium value. |
| **URL Parameter & Canonical URL Generation** | **Low Risk** | `buildCategoryUrl` and `slugToMedium` handle medium slugs. Shared Sanskrit notes under `/notes/class-10/english-medium/sanskrit` or `/notes/class-10/hindi-medium/sanskrit` will generate correct canonical URLs. |

---

## 9. Verification Plan

### Test Suite 1: Automated Unit Tests
1. **`learningResourcesAPI.test.ts`**:
   - Test `fetchLearningResources({ resource_type: 'notes', medium: 'english' })` verifies `.or()` or combined medium condition is invoked on Supabase query.
   - Test `fetchSyllabusChapters('10', 'english')` includes shared Sanskrit notes (`medium = 'both'` or `NULL`).
2. **`ResourcePageOptimization.test.tsx` / `ResourcePageEducational.test.tsx`**:
   - Mock `fetchLearningResources` returning a mix of English notes (`medium: 'english'`), Hindi notes (`medium: 'hindi'`), and shared Sanskrit notes (`medium: 'both'` or `null`).
   - Verify that when `selectedThirdFilter = 'English'`, both English notes and shared Sanskrit notes appear in `filteredResources`.
   - Verify that when `selectedThirdFilter = 'Hindi'`, both Hindi notes and shared Sanskrit notes appear in `filteredResources`.
3. **`resources.test.ts` / `resourcePageConfigs.test.ts`**:
   - Test `notesConfig.filterByThirdFilter` with `'English'` filter includes `{ medium: 'both' }` and `{ medium: null }` items.

### Test Suite 2: Manual Browser Verification
1. **English-Medium Student Profile**:
   - Log in or set profile medium to "English".
   - Navigate to `/notes/class-10/sanskrit`.
   - Verify Class 10 Sanskrit notes are visible and downloadable.
2. **Hindi-Medium Student Profile**:
   - Switch profile medium to "Hindi".
   - Navigate to `/notes/class-10/sanskrit`.
   - Verify the exact same Class 10 Sanskrit notes are visible and downloadable without missing cards.
3. **Dropdown Medium Toggle**:
   - Select "English Medium" from the medium dropdown -> verify Sanskrit note remains visible.
   - Select "Hindi Medium" from the medium dropdown -> verify Sanskrit note remains visible.
   - Select "All Mediums" -> verify Sanskrit note remains visible.
4. **Detail Page Navigation & Viewer**:
   - Click "View" on a Sanskrit note card -> verifies navigation to `/resource/:id`.
   - Click "Open Full Notes" -> verifies PDF reader opens `/view/:id` without errors.
