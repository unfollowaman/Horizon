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

## 3. Medium Filtering Logic & Confirmed Root Causes

### Issue 1 Root Cause: Missing Medium Option in Dropdown
When a student navigated to the Notes page with a specific medium active (for instance, Hindi medium default from profile or URL), `ResourcePage.tsx` executed `fetchLearningResources({ resource_type: 'notes', medium: 'hindi' })`.
The Supabase PostgREST query fetched records matching `medium = 'hindi' OR medium IS NULL`.
Because all non-shared notes in the returned result set had `medium = 'hindi'`, no row in `allResources` contained `medium = 'english'`.
`notesConfig.extractThirdFilterValues(allResources)` extracted unique medium strings directly from `allResources`. With zero English rows returned from the filtered query, `'English'` was omitted from the dropdown options. As a result, users could not select "English Medium" from the dropdown.

**Fix Applied**:
1. Updated `notesConfig.extractThirdFilterValues` in `src/config/resourcePageConfigs.ts` to initialize the options Set with `['English', 'Hindi']`. This guarantees both standard study mediums are always available in the dropdown regardless of the active filter or returned dataset.
2. Verified `fetchLearningResources` in `src/services/learningResourcesAPI.ts` queries `.or("medium.eq.<medium>,medium.is.null")` so shared notes (`medium = NULL`) are retrieved under both English and Hindi filters.
3. Verified `notesConfig.filterByThirdFilter` in `src/config/resourcePageConfigs.ts` passes records where `!r.medium` (or `r.medium === null`), rendering shared Sanskrit notes under both English and Hindi medium selections without card duplication.

---

### Issue 2 Root Cause: Notes Resources Allowed Download Actions
`canDownload(resource)` in `src/utils/permissions.ts` previously evaluated `return resource.allow_download !== false;`.
For Notes records where `allow_download` was `null`, `undefined`, or `true`, `canDownload` evaluated to `true`.
This caused download buttons to render on:
- Grid cards (`src/components/MaterialCard.tsx`)
- Resource details landing pages (`src/pages/resources/ResourceDetails.tsx`)

**Fix Applied**:
Updated `canDownload` in `src/utils/permissions.ts` so that resources with `resource_type === 'notes'` return `false` unconditionally.
This strictly enforces read-only access for Notes resources across all UI components, while preserving download functionality for non-notes resources (such as PYQ papers where `resource_type === 'pyq'` and `allow_download !== false`).

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

## 5. Applied Fixes & Implementation Summary

### 1. Medium Dropdown Extraction Fix (`src/config/resourcePageConfigs.ts`)
```ts
extractThirdFilterValues: (resources: Resource[]) => {
  const rawMediums = resources.reduce((acc, r) => {
    if (r.medium) {
      acc.add(r.medium);
    }
    return acc;
  }, new Set<string>(['English', 'Hindi']));
  return Array.from(rawMediums).map(m => m.charAt(0).toUpperCase() + m.slice(1)).sort();
}
```

### 2. Shared Resource Query & Client Filter
- **Supabase Query Layer (`src/services/learningResourcesAPI.ts`)**:
  ```ts
  if (filters.medium) query = query.or(`medium.eq.${filters.medium},medium.is.null`);
  ```
- **Frontend Filter (`src/config/resourcePageConfigs.ts`)**:
  ```ts
  filterByThirdFilter: (resources: Resource[], filterValue: string) => {
    if (filterValue !== 'Mediums' && filterValue !== 'All Mediums') {
      const lowerFilter = filterValue.toLowerCase();
      return resources.filter(r => !r.medium || r.medium.toLowerCase() === lowerFilter);
    }
    return resources;
  }
  ```

### 3. Read-Only Download Permissions for Notes (`src/utils/permissions.ts`)
```ts
export const canDownload = (resource: Partial<Pick<Resource, 'allow_download' | 'resource_type'>>): boolean => {
  if (resource.resource_type === 'notes') {
    return false;
  }
  return resource.allow_download !== false;
};
```

---

## 6. Verification & Audit Results

### A. Automated Unit & Integration Tests

| Test Suite / File | Verified Behavior / Purpose | Result |
| :--- | :--- | :--- |
| `src/config/__tests__/resourcePageConfigs.test.ts` | Verifies `notesConfig.extractThirdFilterValues` always contains `'English'` and `'Hindi'` options even when returned resources contain only single-medium rows. Verifies `filterByThirdFilter` includes shared (`medium = null`) notes under both English and Hindi filters without duplicating cards. | **PASS** |
| `src/utils/__tests__/permissions.test.ts` | Verifies `canDownload` returns `false` for `resource_type === 'notes'` unconditionally, and returns `true` for `resource_type === 'pyq'` where `allow_download !== false`. | **PASS** |
| `src/components/__tests__/MaterialCard.test.tsx` | Verifies `MaterialCard` omits the Download button for Notes, and renders the Download button for PYQs. | **PASS** |
| `src/pages/resources/__tests__/ResourceDetails.test.tsx` | Verifies `ResourceDetails` omits the Download button for Notes, and renders the Download button for PYQs. | **PASS** |
| `src/pages/resources/__tests__/PdfViewer.test.tsx` | Verifies `PdfViewer` renders read-only canvas Controls (Zoom, Rotate, Share, Navigation) and omits any download, print, or open-in-new-tab links for Notes. | **PASS** |
| `src/services/__tests__/learningResourcesAPI.test.ts` | Verifies Supabase query builder constructs `.or("medium.eq.<medium>,medium.is.null")`. | **PASS** |

---

### B. PDF Viewer Implementation & Behavior Verification (`/view/:id`)

1. **Rendering Mechanism**:
   - Component: `src/pages/resources/PdfViewer.tsx` -> `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx`.
   - Engine: `react-pdf` (`Document` and `Page` components) powered by PDF.js worker (`/pdf.worker.min.mjs`). Pages render onto HTML5 `<canvas>` elements inside `react-zoom-pan-pinch` transform containers.
2. **Download / Print / Open-in-New-Tab Audit**:
   - **Floating Controls (`PdfBottomControls`)**: Offers Zoom In, Zoom Out, Rotate Screen, Share, and More Options toggle. Contains zero download, print, save, or open-in-new-tab actions.
   - **Mobile Menu (`PdfMobileMenu`)**: Renders internal routing links (`/`, `/syllabus`, `/notes`, `/library`, `/dashboard`) without external download actions.
   - **Canvas & Event Protection**:
     - `onContextMenu={(e) => e.preventDefault()}` on the canvas container prevents native right-click "Save image as..." and "Print...".
     - `onDragStart={(e) => e.preventDefault()}` prevents dragging canvas images.
     - `renderTextLayer={false}` and `renderAnnotationLayer={false}` prevent text selection overlays or external links.
     - `usePdfKeyboardShortcuts.ts` intercepts and blocks `Ctrl+P`/`Cmd+P` (Print) and `Ctrl+S`/`Cmd+S` (Save).
3. **Authorization & Storage Security**:
   - `usePdfData.ts` verifies `isResourceProtected(resource)` (`storage_bucket === 'protected-resources'`).
   - Authenticated session is required. `usePdfData.ts` invokes Supabase Edge Function `resource-access` with `{ resource_id }`.
   - The Edge Function validates user authorization and generates a short-lived signed URL.
   - `usePdfData.ts` fetches the PDF bytes as an `ArrayBuffer` in memory and passes it directly to `react-pdf`. No public storage bucket URL is ever exposed.

---

### C. Known Limitations

1. **Client-Side Protection Boundary**: Client-side UI controls (hiding download buttons, disabling right-click context menus, and blocking print keyboard shortcuts) eliminate supported download actions. As with all web applications rendering content in browser viewports, technical users can inspect DOM canvas frames or capture screenshots.
2. **PYQ Downloads Intact**: PYQ papers in the public `pdfs` bucket remain fully downloadable via `MaterialCard` and `ResourceDetails` download buttons.
