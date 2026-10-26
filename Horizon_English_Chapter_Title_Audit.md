# Horizon English Chapter Title Audit

## 1. Issue Summary

For Class 10 Geography Chapter 1, Horizon maintains both Hindi (`learning_resources.id = 81`) and English (`learning_resources.id = 87`) study note resources.

- Resource ID 81 (`medium: 'hindi'`) has `title: "संसाधन और विकास"` and `chapter_id: "2779881d-4e65-41d2-8db0-b44dbf83cf74"`.
- Resource ID 87 (`medium: 'english'`) has `title: "Resources and Development"` and `chapter_id: "2779881d-4e65-41d2-8db0-b44dbf83cf74"`.
- Shared chapter record `chapters.id = "2779881d-4e65-41d2-8db0-b44dbf83cf74"` has `chapter_number: 1` and `chapter_name: "संसाधन और विकास"`.

When navigating to the English resource page `/resource/87`, all English-specific metadata, study guidance, and chapter summary render correctly in English. However, the page heading currently displays:

`CHAPTER 1: संसाधन और विकास`

instead of:

`CHAPTER 1: Resources and Development`

Meanwhile, the Hindi resource page `/resource/81` correctly continues displaying:

`CHAPTER 1: संसाधन और विकास`

## 2. Current Database Relationship

- **`learning_resources`**: Table storing individual resource metadata, resource type, medium, PDF paths, resource-level summary/guidance, and `title`.
  - Row ID 81: `medium` = `'hindi'`, `title` = `'संसाधन और विकास'`, `chapter_id` = `'2779881d-4e65-41d2-8db0-b44dbf83cf74'`.
  - Row ID 87: `medium` = `'english'`, `title` = `'Resources and Development'`, `chapter_id` = `'2779881d-4e65-41d2-8db0-b44dbf83cf74'`.
- **`chapters`**: Table storing the language-agnostic syllabus structure (Class -> Subject -> Chapter Number).
  - Row ID `'2779881d-4e65-41d2-8db0-b44dbf83cf74'`: `student_class` = `10`, `subject` = `'Geography'`, `chapter_number` = `1`, `chapter_name` = `'संसाधन और विकास'`.
- **Relationship**: Foreign key `learning_resources.chapter_id` references `chapters.id`. Both English and Hindi resources share the exact same `chapters` row because they belong to Class 10 Geography Chapter 1.
- **Why the shared chapter record matters**: The single shared `chapters` row stores `chapter_name` in Hindi (`"संसाधन और विकास"`). Any logic that retrieves `chapters.chapter_name` directly to construct titles will receive `"संसाधन और विकास"` regardless of the resource's `medium` or `title`.

## 3. Complete Code/Data Flow

1. **Route Request**:
   Path `/resource/:id` (e.g. `/resource/87`) is matched in `src/App.tsx` / `src/layouts/MainLayout.tsx` and mounts `src/pages/resources/ResourceDetails.tsx`.

2. **Resource Fetching**:
   `ResourceDetails.tsx` invokes `fetchLearningResourceById('87', true)` defined in `src/services/learningResourcesAPI.ts`.

3. **Database Query**:
   `fetchLearningResourceById` executes a Supabase PostgREST query:
   `supabase.from('learning_resources').select('..., chapters(...)').eq('id', '87').single()`
   PostgREST joins the tables and returns a raw row where `item.title = "Resources and Development"` and `item.chapters = { chapter_number: 1, chapter_name: "संसाधन और विकास" }`.

4. **Data Transformation**:
   `fetchLearningResourceById` passes the raw PostgREST result to `mapLearningResource(data)` in `src/services/learningResourcesAPI.ts`:
   ```ts
   let title = item.title;
   if (item.resource_type === 'notes' && item.chapters) {
     title = `Chapter ${item.chapters.chapter_number}: ${item.chapters.chapter_name}`;
   }
   ```
   Because `item.resource_type === 'notes'` and `item.chapters` is truthy, `mapLearningResource` unconditionally overwrites `title` with `Chapter ${item.chapters.chapter_number}: ${item.chapters.chapter_name}`, setting `title` to `"Chapter 1: संसाधन और विकास"`. The database value `item.title` (`"Resources and Development"`) is ignored and discarded.

5. **Component Rendering**:
   In `ResourceDetails.tsx`:
   - `kickerText` is computed on line 185: `resource.chapters?.chapter_number ? "CHAPTER 1" : "STUDY NOTE"`.
   - `<h1>` element on line 209 renders `{resource.title}` (`"Chapter 1: संसाधन और विकास"`).
   - `showSubtitle` on lines 193–197 checks whether `resource.title` includes `resource.chapters.chapter_name`. Since `resource.title` was forced to contain `chapter_name`, `showSubtitle` evaluates to `false`.

6. **Card & Prerender Data Flow**:
   - `src/components/MaterialCard.tsx` (line 202) has a parallel conditional formatting check: `resource.resource_type === 'notes' && resource.chapters ? Chapter ${resource.chapters.chapter_number}: ${resource.chapters.chapter_name} : resource.title`.
   - `scripts/prerender.js` (line 105) contains a duplicated `mapLearningResource` function with identical logic (`title = Chapter ${item.chapters.chapter_number}: ${item.chapters.chapter_name};`), embedding the Hindi title into generated static HTML files, `<title>` tags, and JSON-LD structured data.

## 4. Exact Root Cause

The exact root cause is a **transformation / mapping defect in `mapLearningResource`** (located in `src/services/learningResourcesAPI.ts` line 29 and `scripts/prerender.js` line 105), along with a parallel condition in `src/components/MaterialCard.tsx` (line 202).

Specifically:
`mapLearningResource` unconditionally overrides `item.title` whenever `item.resource_type === 'notes'` and `item.chapters` is attached. It constructs the title using `item.chapters.chapter_name`. Because the shared `chapters` database record holds `chapter_name = "संसाधन और विकास"` in Hindi, reading `item.chapters.chapter_name` always yields `"संसाधन और विकास"`. The English-specific title (`"Resources and Development"`) stored in `learning_resources.title` for resource ID 87 is discarded during mapping and replaced with the Hindi `chapter_name`.

## 5. Relevant Code Locations

- **`src/services/learningResourcesAPI.ts`**: `mapLearningResource` function (lines 27–31)
- **`scripts/prerender.js`**: `mapLearningResource` function (lines 104–106)
- **`src/components/MaterialCard.tsx`**: Card title formatting logic (line 202)
- **`src/pages/resources/ResourceDetails.tsx`**: Header rendering & `showSubtitle` logic (lines 185, 193–197, 208–214)
- **`src/services/__tests__/learningResourcesAPI.test.ts`**: Unit tests for `mapLearningResource` (lines 71–80, 148–167)
- **`scripts/__tests__/prerender.test.ts`**: Unit tests for static pre-rendering mapping

## 6. Medium/Language Handling

- `learning_resources.medium` stores `'hindi'` vs `'english'` for each resource record.
- Filtering by medium (English Medium, Hindi Medium, All Mediums) on `/notes` and `/library` functions correctly because queries filter directly on `learning_resources.medium`.
- Resource-level content fields (`chapter_summary`, `topics`, `key_concepts`, `important_terms`, `learning_objectives`, `exam_relevant_themes`, `study_guidance`) in `mapLearningResource` prefer `item.<field>` over `chapterObj.<field>`, which is why English metadata and study guidance render correctly on `/resource/87`.
- However, for the title field, `mapLearningResource` did not prefer `item.title` over `item.chapters.chapter_name` when `item.chapters` was present, bypassing medium-specific title handling.

## 7. Fallback Logic

- **Current Fallback Chain in `mapLearningResource`**:
  `item.resource_type === 'notes' && item.chapters` -> forced use of `item.chapters.chapter_name`
  `else` -> use `item.title`
- **Flaw**: `item.chapters.chapter_name` takes precedence over `item.title`. For shared chapters, `chapter_name` is in Hindi, overriding the medium-specific `item.title`.
- **In `ResourceDetails.tsx`**:
  `showSubtitle` evaluates `!resource.title.toLowerCase().includes(resource.chapters.chapter_name.toLowerCase())`. If `resource.title` is fixed to `"Chapter 1: Resources and Development"` while `resource.chapters.chapter_name` remains `"संसाधन और विकास"`, `showSubtitle` will evaluate to `true` and display the Hindi chapter name as a subtitle beneath the English H1. Thus, `showSubtitle` condition or rendering must also be language-aware.

## 8. SSR / SSG / Prerender Analysis

- The prerender script `scripts/prerender.js` duplicates `mapLearningResource(item)` at line 82 and contains the exact same flaw at line 105.
- During build (`npm run build`), static pre-rendering outputs HTML files into `dist/resource/87/index.html`.
- Because `scripts/prerender.js` uses the flawed logic, prerendered static HTML files currently embed `"CHAPTER 1: संसाधन और विकास"`, page `<title>` tags, and JSON-LD `@type: "EducationalResource"` `name` attributes with the Hindi title for English resource ID 87.
- A complete fix requires updating both `src/services/learningResourcesAPI.ts` and `scripts/prerender.js`.

## 9. Impact Assessment

- **Affected**:
  - Heading and page title for English Study Notes resources (e.g. `/resource/87`) linked to shared chapters with Hindi `chapter_name`s.
  - Document title (`document.title`), Schema.org JSON-LD structured data (`name`), and pre-rendered static HTML (`dist/resource/87/index.html`).
  - Material card headings (`MaterialCard.tsx`) on `/notes` and `/library` feeds when displaying English notes with shared chapters.
- **Not Affected**:
  - Hindi pages (e.g. `/resource/81`) remain 100% safe and unaffected because `item.title` is `"संसाधन और विकास"`, matching `chapter_name`.
  - Previous Year Questions (`resource_type === 'pyq'`) and other non-notes resources are unaffected.
  - English resource metadata, study guidance, chapter summary, topics, and PDF viewing permissions remain 100% safe.
  - Category and medium filtering (All Mediums, Hindi Medium, English Medium) remain 100% unaffected.

## 10. Recommended Minimal Fix

The safest minimal code-level fix involves:

1. **`src/services/learningResourcesAPI.ts` (`mapLearningResource`)**:
   Modify title determination logic for `resource_type === 'notes'`:
   - If `item.title` is present and non-empty:
     - If `item.title` already starts with `"Chapter "` (or matches `/^chapter\s+\d+/i`), use `item.title` as-is.
     - Otherwise, if `item.chapters?.chapter_number` exists, construct `Chapter ${item.chapters.chapter_number}: ${item.title}`.
     - Otherwise, use `item.title`.
   - If `item.title` is missing/empty and `item.chapters` exists, fall back to `Chapter ${item.chapters.chapter_number}: ${item.chapters.chapter_name}`.

2. **`scripts/prerender.js` (`mapLearningResource`)**:
   Apply the exact same title mapping logic to ensure pre-rendered static HTML, `<title>`, and JSON-LD match client-side rendering.

3. **`src/components/MaterialCard.tsx`**:
   Simplify card heading calculation for notes resources to use `resource.title` directly (since `mapLearningResource` will already provide the correctly formatted title), avoiding re-reading `resource.chapters.chapter_name`.

4. **`src/pages/resources/ResourceDetails.tsx` and `scripts/prerender.js`**:
   Refine `showSubtitle` condition so it does not render a language-mismatched `chapter_name` as a subtitle on English resources when `resource.title` already contains the English chapter title.

5. **Preservation Guarantees**:
   - For Hindi resource ID 81 (`title: "संसाधन और विकास"`), `mapLearningResource` outputs `"Chapter 1: ..."` with the Hindi title `"Chapter 1: संसाधन और विकास"`.
   - For English resource ID 87 (`title: "Resources and Development"`), `mapLearningResource` outputs `"Chapter 1: Resources and Development"`.
   - Fallback to `chapters.chapter_name` is preserved for any legacy notes resources where `item.title` is null/empty.

## 11. Risks / Edge Cases

- **Legacy / Unpopulated `title`**: Notes resources where `learning_resources.title` is null or empty must continue to fall back to `Chapter X: {chapters.chapter_name}` without errors.
- **Titles Already Containing "Chapter X:"**: If a database row already has `title: "Chapter 1: Resources and Development"`, formatting must avoid double-prefixing (e.g. "Chapter 1: Chapter 1: Resources and Development").
- **PYQs and Other Resource Types**: Must continue to use their existing title formatting rules.
- **Pre-rendering Integrity**: Must verify that `npm run build` generates valid HTML and passes security compliance assertions (`assertSecurityCompliance`).

## 12. Final Verdict

ROOT CAUSE CONFIRMED

The minimal fix described in Section 10 should be implemented in the NEXT step.
