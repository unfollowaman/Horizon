# Syllabus Feature Schema Audit & Architectural Assessment

**Author:** Jules (Software Engineer)
**Date:** March 2025
**Project:** Horizon Student Educational Platform
**Status:** Audit & Planning Only (S1 Phase)

---

## Executive Summary

This report presents a comprehensive audit of Horizon's existing Supabase database schema, backend services, security architecture, and frontend data-fetching patterns. The objective is to evaluate how to support the upcoming **Syllabus** feature (which includes a visual interactive flowchart, class/subject/chapter/topic hierarchy, optional links to notes/resources, and dynamic table-based syllabus PDF export) with maximum reuse of existing codebase infrastructure, zero regression to existing security models, and minimal database overhead.

---

## A. Existing Schema Map

The database audit identified five primary tables in the public schema relevant to educational content, user profiles, and learning progress.

### 1. `chapters`

* **Purpose:** Stores structural metadata for curriculum chapters under a class and subject.
* **Primary Key:** `id` (uuid, DEFAULT `gen_random_uuid()`)
* **Foreign Keys:** None.
* **Unique Constraints:** None explicitly declared at the database level (logical uniqueness by `(student_class, subject, chapter_number)` managed application-side).
* **Indexes:** Primary key index on `id`.
* **Important Columns:**
  * `id` (`uuid`, NOT NULL)
  * `student_class` (`text`, NULLABLE) — Stores class name or number (e.g., `'10'`, `'Class 10'`).
  * `subject` (`text`, NULLABLE) — Subject title (e.g., `'Geography'`, `'Maths'`).
  * `chapter_number` (`integer`, NOT NULL) — Sequence/index of chapter in syllabus.
  * `chapter_name` (`text`, NOT NULL) — Title of chapter.
  * `display_order` (`integer`, NOT NULL, DEFAULT `0`) — Ordering sequence for UI rendering.
  * `is_active` (`boolean`, NOT NULL, DEFAULT `true`) — Visibility toggle.
  * `created_at` (`timestamp with time zone`, DEFAULT `now()`)
  * `chapter_summary` (`text`, NULLABLE) — Educational overview of chapter.
  * `topics` (`jsonb`, NULLABLE) — Array of topic strings or subtopic objects.
  * `key_concepts` (`jsonb`, NULLABLE) — Array of key concept objects/strings.
  * `important_terms` (`jsonb`, NULLABLE) — Array of term definitions/strings.
  * `learning_objectives` (`jsonb`, NULLABLE) — Objectives list.
  * `exam_relevant_themes` (`jsonb`, NULLABLE) — Exam themes list.
  * `study_guidance` (`jsonb`, NULLABLE) — Step-by-step guidance list.
* **Existing Ordering Fields:** `display_order`, `chapter_number`.
* **Status/Visibility Fields:** `is_active` (`boolean`).
* **Reusable for Syllabus:** **Yes (Highly Reusable).** Forms the core Chapter layer for syllabus flowcharts.

---

### 2. `learning_resources`

* **Purpose:** Primary repository for all uploaded study materials (Notes, PYQs, Revision Sheets, Flashcards, MCQs).
* **Primary Key:** `id` (uuid, DEFAULT `gen_random_uuid()`)
* **Foreign Keys:**
  * `chapter_id` → `chapters.id` (`ON DELETE SET NULL`)
* **Unique Constraints:** None.
* **Indexes:** Primary key index on `id`.
* **Important Columns:**
  * `id` (`uuid`, NOT NULL)
  * `title` (`text`, NOT NULL)
  * `description` (`text`, NULLABLE)
  * `student_class` (`text`, NULLABLE)
  * `resource_type` (`resource_type` ENUM: `'notes'`, `'revision_sheets'`, `'mcq'`, `'flashcards'`, `'pyq'`, NOT NULL)
  * `medium` (`medium` ENUM: `'english'`, `'hindi'`, NOT NULL)
  * `file_path` (`text`, NULLABLE) — Internal bucket path (e.g., `'class-10/notes/ch1.pdf'`).
  * `pdf_url` (`text`, NULLABLE) — Legacy/external PDF URL fallback.
  * `thumbnail_url` (`text`, NULLABLE)
  * `subject` (`text`, NULLABLE)
  * `year` (`integer`, NULLABLE)
  * `chapter_id` (`uuid`, NULLABLE) → FK to `chapters.id`
  * `allow_download` (`boolean`, NULLABLE, DEFAULT `false`)
  * `storage_bucket` (`text`, NULLABLE, DEFAULT `'pdfs'`) — E.g., `'protected-notes'` vs `'pdfs'`.
  * `is_active` (`boolean`, NULLABLE, DEFAULT `true`)
  * `created_at` (`timestamp with time zone`, DEFAULT `now()`)
  * `chapter_summary`, `topics`, `key_concepts`, `important_terms`, `learning_objectives`, `exam_relevant_themes`, `study_guidance` (`jsonb`/`text`, NULLABLE)
* **Existing Ordering Fields:** `created_at`, `year`.
* **Status/Visibility Fields:** `is_active` (`boolean`).
* **Reusable for Syllabus:** **Yes.** Serves as the target resource linked optionally from syllabus topics/chapters.

---

### 3. `reading_progress`

* **Purpose:** Tracks individual user reading progress (percentage and last read timestamp) per resource.
* **Primary Key:** `id` (uuid, DEFAULT `gen_random_uuid()`)
* **Foreign Keys:**
  * `user_id` → `auth.users.id`
  * `resource_id` → `learning_resources.id`
* **Unique Constraints:** Typically unique per `(user_id, resource_id)`.
* **Important Columns:**
  * `id` (`uuid`, NOT NULL)
  * `user_id` (`uuid`, NOT NULL)
  * `resource_id` (`uuid`, NOT NULL)
  * `progress` (`numeric`/`integer`, NOT NULL)
  * `last_read_at` (`timestamp with time zone`, NULLABLE)
  * `created_at` (`timestamp with time zone`, DEFAULT `now()`)
* **Reusable for Syllabus:** Indirectly reusable for showing completion badges/progress on syllabus topics where resources exist.

---

### 4. `chapter_completion`

* **Purpose:** Tracks user completion status for specific chapters linked to resources.
* **Primary Key:** `id` (uuid, DEFAULT `gen_random_uuid()`)
* **Foreign Keys:**
  * `user_id` → `auth.users.id`
  * `resource_id` → `learning_resources.id`
  * `chapter_id` → `chapters.id`
* **Important Columns:**
  * `id` (`uuid`, NOT NULL)
  * `user_id` (`uuid`, NOT NULL)
  * `resource_id` (`uuid`, NOT NULL)
  * `chapter_id` (`uuid`, NOT NULL)
  * `completed_at` (`timestamp with time zone`, NULLABLE)
  * `created_at` (`timestamp with time zone`, DEFAULT `now()`)
* **Reusable for Syllabus:** **Yes.** Can directly indicate completed chapters on syllabus nodes for logged-in users.

---

### 5. `profiles`

* **Purpose:** Stores student onboarding selections and preferences.
* **Primary Key:** `id` (uuid, referencing `auth.users.id`)
* **Foreign Keys:**
  * `id` → `auth.users.id`
* **Important Columns:**
  * `id` (`uuid`, NOT NULL)
  * `student_class` (`text`, NULLABLE) — Preferred class (e.g., `'Class 10'`).
  * `study_medium` (`text`, NULLABLE) — Preferred medium (e.g., `'English'`).
  * `avatar_url` (`text`, NULLABLE)
  * `onboarding_completed` (`boolean`, NOT NULL, DEFAULT `false`)
  * `name` (`text`, NULLABLE)
  * `created_at` (`timestamp with time zone`, DEFAULT `now()`)
* **Reusable for Syllabus:** **Yes.** Used to pre-select default Class and Medium when a student opens the Syllabus feature.

---

## B. Existing Content Hierarchy

The current database and application implement the following structural content hierarchy:

```text
Class (represented as string column 'student_class', e.g., '10' or 'Class 10')
  ↓
Medium (represented as ENUM 'english' | 'hindi' on resources, string 'study_medium' on profiles)
  ↓
Subject (represented as string column 'subject', e.g., 'Geography', 'Maths')
  ↓
Chapter (table 'chapters': chapter_number, chapter_name, display_order, is_active)
  ↓
Resource / Notes PDF (table 'learning_resources': linked via chapter_id FK)
  ↓
Topics (currently stored as JSONB array 'topics' in chapters / learning_resources)
```

### Key Observations on Current Hierarchy:
1. **No Dedicated `classes` or `subjects` Tables:** Class and Subject are denormalized text values across `chapters`, `learning_resources`, and `profiles`.
2. **Medium is ENUM/String:** Medium exists as PostgreSQL ENUM `'english' | 'hindi'` on `learning_resources`, and text on `profiles`. `chapters` currently lacks an explicit `medium` column (medium is inferred via joined `learning_resources`).
3. **Topics as JSONB:** Topics are currently stored as `jsonb` array payloads inside `chapters.topics` (e.g., `["Resources and Development", "Types of Resources", "Resource Planning"]`) or as objects with `{ title, description }`. They do not currently exist as distinct relational rows with primary key IDs.

---

## C. Reusable Infrastructure

Horizon already possesses substantial backend, service, and frontend infrastructure that can be directly leveraged for the Syllabus feature:

### 1. Backend & Database Infrastructure
* **`chapters` Table Structure:** Already contains `chapter_number`, `chapter_name`, `display_order`, `is_active`, `student_class`, `subject`, and rich JSONB curriculum metadata (`topics`, `key_concepts`, `learning_objectives`).
* **`learning_resources` Linking:** `learning_resources.chapter_id` foreign key connects notes PDFs to chapters.
* **Existing Query Functions:** `fetchSyllabusChapters(studentClass, medium)` in `src/services/learningResourcesAPI.ts` already queries `learning_resources` for `resource_type = 'notes'` to aggregate available chapters by class and medium.

### 2. Utility & Normalization Logic
* **Class Normalization (`resourceHelper.ts` / `urlHelper.ts`):** `normalizeClassValue("Class 10")` → `"10"`. `slugToClass("class-10")` → `"Class 10"`. Handles varied string formats seamlessly.
* **Medium Normalization (`resourceHelper.ts` / `urlHelper.ts`):** `normalizeMediumValue("English")` → `'english'`. `mediumToSlug("English")` → `'english-medium'`.
* **Subject Slugification (`urlHelper.ts`):** `subjectToSlug("Social Science")` → `"social-science"`, `slugToSubject("social-science")` → `"Social Science"`.
* **Hierarchical URL Construction (`buildCategoryUrl`):** Builds clean canonical paths like `/notes/class-10/english-medium/geography`.

### 3. Security & Protected PDF Viewing
* **Edge Function `resource-access`:** Handles authentication, permission checks, and generation of short-lived (60s) signed URLs for protected PDFs (e.g., `protected-notes` bucket).
* **`PdfViewer` Component & Keyboard Protection:** Integrates full protected PDF viewing with `usePdfKeyboardShortcuts` (blocking `Ctrl+P`, `Ctrl+S`, print/save commands).

### 4. UI Components & Patterns
* **Selection Dropdowns:** Standardized `<Dropdown>` control supporting accessibility (`aria-expanded`, keyboard `Escape` handling).
* **Page Layout Shell:** Consistent page container sizing (`w-[min(96vw,1600px)] mx-auto`), header navigation (`ProfileButton`, circular back button), and loading state patterns (`Spinner.tsx`, skeletons).

---

## D. Missing Infrastructure

To fully support the Syllabus flowchart, dynamic topic interaction, and PDF generation, the following gaps exist:

1. **Relational Topic Representation:**
   * Currently, topics exist only as JSONB string arrays inside `chapters.topics`.
   * For the flowchart to support individual topic nodes, topic-level completion, node positioning, and optional direct resource links per topic, topics require structured relational entity representation or a defined sub-node schema.
2. **Medium Column on `chapters` Table:**
   * The `chapters` table currently lacks a `medium` column. English and Hindi chapters are implicitly differentiated via linked `learning_resources.medium`. If a chapter has no notes uploaded yet, it cannot be queried by medium without a `medium` column on `chapters`.
3. **Flowchart Visual & Spatial Layout Metadata:**
   * No data fields exist for node positions, parent-child branch connections, or layout graph coordinates required by panning/zooming canvas controls (e.g., `react-zoom-pan-pinch` or `reactflow`).
4. **Client-side PDF Generation Utility:**
   * Dynamic table-formatted syllabus PDF export requires a client-side generation engine (e.g., `@react-pdf/renderer` or `jspdf` + `jspdf-autotable`) to render syllabus tables directly in memory without storing generated PDFs in Supabase Storage.

---

## E. Recommended Architecture

### Critical Architectural Question Answer:

> **«Can Horizon's existing class/subject/chapter/resource architecture support the Syllabus feature with minimal schema additions, or do we need a dedicated syllabus data model?»**

### Comparison of Architectural Options

| Criteria | Option A: Extended Hybrid Architecture (Recommended) | Option B: Fully Dedicated Syllabus Hierarchy |
| :--- | :--- | :--- |
| **Model Structure** | Reuses `chapters` & `learning_resources`; adds `medium` to `chapters` + new `syllabus_topics` table. | Creates 4 new tables: `syllabi`, `syllabus_subjects`, `syllabus_chapters`, `syllabus_topics`. |
| **Data Redundancy** | **Zero.** Single source of truth for chapter names, numbers, and subjects across Notes and Syllabus. | **High.** Duplicates class, subject, chapter names, display orders between `chapters` and `syllabus_chapters`. |
| **Resource Linking** | Direct foreign key from `syllabus_topics.chapter_id` → `chapters.id` and optional `resource_id` → `learning_resources.id`. | Requires bridging mapping tables between `syllabus_topics` and `learning_resources`. |
| **Maintenance Overhead**| **Low.** Updating a chapter title automatically updates Notes and Syllabus views. | **High.** Admin must update chapter titles in both Notes tables and Syllabus tables. |
| **Schema Complexity** | Adds 1 column to `chapters` and 1 lightweight table (`syllabus_topics`). | Adds 4 entire tables, 8+ foreign key constraints, and 4 RLS policy sets. |

### Recommendation: Option A — Extended Hybrid Architecture

Option A leverages Horizon's existing `chapters` table as the primary Chapter entity and introduces a dedicated `syllabus_topics` table to represent subtopics in the flowchart.

#### Proposed Schema Enhancements

1. **Modify Existing `chapters` Table:**
   * Add `medium` (`medium` ENUM: `'english'`, `'hindi'`, NOT NULL, DEFAULT `'english'`).
   * Add compound index on `(student_class, medium, subject, is_active)`.

2. **Create New Table: `syllabus_topics`**

```sql
CREATE TABLE public.syllabus_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  topic_name text NOT NULL,
  description text NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  resource_id uuid NULL REFERENCES public.learning_resources(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for fast topic retrieval per chapter
CREATE INDEX idx_syllabus_topics_chapter_id ON public.syllabus_topics(chapter_id);
-- Index for finding linked resources
CREATE INDEX idx_syllabus_topics_resource_id ON public.syllabus_topics(resource_id);
```

---

## F. Resource Linking Strategy

Connecting syllabus flowchart nodes to existing notes/resources must handle three scenarios cleanly:

```text
Syllabus Node Hierarchy & Resource State:

[ Chapter Node ] (From chapters table)
       │
       ├───── [ Topic 1 Node ] ──► Linked to Resource ID 'abc-123' ──► Clickable (Navigates to /resource/:id or /view/:id)
       │
       ├───── [ Topic 2 Node ] ──► Resource ID is NULL ──────────────► Non-clickable / Info Modal only ("Notes Coming Soon")
       │
       └───── [ Topic 3 Node ] ──► Linked to Resource ID 'def-456' ──► Clickable (Navigates to /resource/:id or /view/:id)
```

### Implementation Strategy:
1. **Nullable Foreign Key (`resource_id`):** `syllabus_topics.resource_id` is an optional foreign key referencing `learning_resources.id`.
2. **Frontend Interactivity Logic:**
   * **If `resource_id` is present:** The node displays a distinct action indicator (e.g., "View Notes" badge / icon). Clicking the node opens the resource landing page (`/resource/:id`) or protected viewer (`/view/:id`).
   * **If `resource_id` is NULL:** The node displays standard topic details/descriptions in an interactive modal or tooltip with a badge stating "Content Coming Soon". No dead links or invalid navigation.
3. **Chapter-Level Fallback:** If a topic does not have a direct `resource_id`, but the parent `chapters.id` has a linked `learning_resources` item where `chapter_id = chapters.id` and `resource_type = 'notes'`, the UI can optionally offer a fallback link to the parent chapter notes PDF.

---

## G. Security & RLS Assessment

### Current Security State:
* **`learning_resources` & `chapters`:** Readable by anonymous and authenticated users via public SELECT policies. Storage paths and raw PDF files in protected buckets (`protected-notes`) are hidden from direct public download.
* **Protected File Access:** Handled exclusively via the `resource-access` Supabase Edge Function, which authenticates JWT tokens and validates resource active status before issuing 60-second signed URLs.
* **`reading_progress` & `chapter_completion`:** Protected by row-level security ensuring users can only read/write their own records (`auth.uid() = user_id`).

### Syllabus Security Impact:
* **Metadata Exposure:** Syllabus structure (classes, subjects, chapters, topics) is purely public educational metadata. Granting `SELECT` access to `syllabus_topics` for `anon` and `authenticated` roles carries **zero security risk**.
* **Protected Content Isolation:** Syllabus topic nodes will only reference public `resource_id` UUIDs. They will **never** expose `file_path`, `storage_bucket`, or signed tokens. Clicking a linked resource node routes through the standard `/resource/:id` landing page or `/view/:id` protected viewer, maintaining 100% compliance with Horizon's Phase 5 security architecture.

#### Proposed RLS Policy for `syllabus_topics`:
```sql
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;

-- Public read access for active topics
CREATE POLICY "Allow public read access for active syllabus topics"
ON public.syllabus_topics FOR SELECT
USING (is_active = true);
```

---

## H. Risks & Edge Cases

1. **Multiple Curricula / Educational Boards (CBSE vs State Boards):**
   * *Risk:* Chapter numbers and topics differ between educational boards.
   * *Mitigation:* Explicitly scope subjects and chapters to CBSE standard curriculum for initial launch, with an optional `board` string column defaulted to `'CBSE'` on `chapters`.
2. **Medium Discrepancies (English vs Hindi):**
   * *Risk:* Topic titles in Hindi medium cannot simply be translated programmatically; they require official terminology.
   * *Mitigation:* Require `medium` column on `chapters` so English and Hindi syllabi are distinct entity sets queried cleanly by selected medium.
3. **Duplicate Subject/Chapter Names Across Classes:**
   * *Risk:* "Mathematics" or "Science" exists in Class 8, Class 9, and Class 10.
   * *Mitigation:* Always filter queries compoundly by `(student_class, medium, subject)`.
4. **Topics Without Resources:**
   * *Risk:* Flowchart nodes feeling unhelpful if many lack notes.
   * *Mitigation:* Design the UI flowchart so topics display core educational summary text, key concepts, and exam importance even when no PDF is attached.
5. **Large Flowcharts & Mobile Rendering Performance:**
   * *Risk:* Rendering 30+ complex flowchart nodes with canvas transforms on mobile viewports causing lag.
   * *Mitigation:* Implement virtualized canvas or collapse/expand sub-branch nodes, paired with dynamic touch action handling (`react-zoom-pan-pinch`).
6. **Dynamic Syllabus PDF Generation:**
   * *Risk:* Attempting to upload dynamically generated PDFs to Supabase Storage would waste bucket storage and require clean-up cron jobs.
   * *Mitigation:* Generate table-formatted PDFs purely client-side in browser memory using `@react-pdf/renderer` or `jspdf-autotable` and trigger browser file download directly.

---

## I. Confirmed Facts vs. Recommendations

### Confirmed Facts (Database & Codebase Audit)
1. `chapters` and `learning_resources` tables exist in Supabase and currently store educational metadata.
2. Class, Subject, and Medium are denormalized text/ENUM columns across tables rather than normalized lookup tables.
3. Topics currently exist as `jsonb` array payloads on `chapters` and `learning_resources` tables.
4. `learning_resources.chapter_id` is a nullable foreign key referencing `chapters.id`.
5. Edge function `resource-access` controls protected PDF access via 60-second signed URLs.
6. The frontend uses `src/services/learningResourcesAPI.ts` for database fetching and `src/utils/urlHelper.ts` for hierarchical URL slug parsing.

### Recommendations (S2 Design & Future Implementation)
1. Do not create duplicate `syllabus_chapters` or `syllabus_subjects` tables; extend the existing `chapters` table by adding a `medium` column.
2. Add a lightweight `syllabus_topics` table with a nullable `resource_id` FK to allow individual topic nodes to link to existing study notes.
3. Enable public SELECT RLS on `syllabus_topics` for active topics.
4. Build the flowchart UI using `react-zoom-pan-pinch` or an SVG canvas engine, reusing existing dropdown components for Class/Subject/Medium selection.
5. Implement syllabus PDF download purely client-side without storing generated files in Supabase Storage.

---

## Recommended Next Step: S2 — Design Syllabus Database Model

With this audit complete, the exact database requirements and architectural approach are established. Proceed to **S2 — Design Syllabus Database Model** to draft the formal SQL migration scripts (`.sql`), TypeScript type definitions (`src/types/index.ts`), and Supabase API service extensions.
