# S2 — Syllabus Database Model Design Report

**Project:** Horizon (unfollowaman.tech)
**Author:** Jules (Senior Software Engineer)
**Date:** March 2025
**Document Status:** Blueprint Proposal (Design Only — No Migrations Executed)

---

## 1. Executive Recommendation

Based on the S1 Syllabus Schema Audit and the core product requirement for a language-agnostic flowchart hierarchy, we recommend **Option A+ (Extended Relational Syllabus Topic Model with Junction Mapping)**.

### Primary Architectural Conclusion:
1. **The Syllabus Hierarchy is Language-Agnostic:**
   $$\text{Class} \longrightarrow \text{Subject} \longrightarrow \text{Chapter} \longrightarrow \text{Topic}$$
   The curriculum structure (Class 10 Science $\rightarrow$ Chapter 1 "Chemical Reactions and Equations" $\rightarrow$ Topic 1.1 "Chemical Equations") is identical regardless of whether a student studies in English medium or Hindi medium. Therefore, **`chapters.medium` IS NOT NECESSARY AND SHOULD NOT BE ADDED**. Adding `medium` to `chapters` would artificially duplicate chapter trees (creating separate English Chapter 1 and Hindi Chapter 1), breaking single-tree flowchart rendering and creating redundant maintenance overhead.

2. **Medium Belongs Exclusively to Learning Resources:**
   Language is an attribute of learning resources (PDFs, notes, revision sheets), not the canonical syllabus node.
   - Resource A: *Chapter 1 Notes (English)* $\rightarrow$ `medium = 'english'`
   - Resource B: *Chapter 1 Notes (Hindi)* $\rightarrow$ `medium = 'hindi'`

3. **Multi-Resource Association via Junction Model (`syllabus_topic_resources`):**
   To support attaching both English and Hindi Notes (and future resources like Revision Sheets or MCQs) independently to a single canonical topic node, we introduce a lightweight join table: `syllabus_topic_resources`. This enables a single `syllabus_topic` to reference $0, 1, \text{or } N$ `learning_resources` across different mediums and resource types without requiring dummy records or structural duplication.

4. **Preservation of Existing Horizon Security:**
   Syllabus metadata tables (`chapters`, `syllabus_topics`, `syllabus_topic_resources`) will be publicly readable via RLS (`select using (true)`). Protected PDF files remain securely guarded in private Supabase Storage buckets (`protected-pdfs`), accessed strictly through Horizon's existing edge function (`resource-access`) with short-lived signed HMAC tokens.

---

## 2. Current Schema Assumptions vs. Proposed S2 Design

To ensure total clarity, the table below explicitly separates **Confirmed Existing Schema Facts** from the **Proposed S2 Database Design**.

| Entity / Concept | Confirmed Existing Facts (S1 / Production State) | Proposed S2 Design (Design Blueprint) |
| :--- | :--- | :--- |
| **`chapters` Table** | Existing table containing `id`, `student_class` (text), `subject` (text), `chapter_number` (int), `chapter_name` (text), `display_order` (int), `is_active` (bool), `chapter_summary` (text), `topics` (jsonb array of strings), etc. | **Retained as top-level chapter node.** `medium` column is **EXCLUDED**. `topics` JSONB field remains temporarily for backwards compatibility during migration. |
| **`learning_resources` Table** | Existing table containing `id`, `title`, `student_class`, `subject`, `medium` (`'english' \| 'hindi'`), `resource_type` (`'notes' \| 'pyq' \| ...`), `file_path`, `storage_bucket`, `chapter_id` (FK to `chapters.id`). | **Retained unchanged.** Remains the authoritative storage for PDF metadata and medium classification. Direct `chapter_id` FK continues to serve chapter-level notes. |
| **`syllabus_topics` Table** | **Does NOT exist.** Topic names are currently unstructured strings inside `chapters.topics` JSONB (`["1.1 Chemical Equations", "1.2 Types of Chemical Reactions"]`). | **NEW Table.** Normalized relational entity representing individual topics under a `chapter_id`. Contains `id`, `chapter_id`, `topic_number`, `topic_name`, `description`, `display_order`, `is_active`. |
| **`syllabus_topic_resources` Table**| **Does NOT exist.** Currently, `learning_resources` links only to `chapter_id`, making topic-level resource attachment impossible. | **NEW Table.** Junction table mapping `topic_id` $\leftrightarrow$ `resource_id`. Supports attaching multiple medium-specific resources (e.g., English Notes + Hindi Notes) to a single topic. |
| **Resource Access Architecture** | Storage buckets (`protected-pdfs`) are private. Protected PDF fetching uses Supabase Edge Function (`resource-access`) with timed signed URLs. | **Unchanged.** Syllabus queries only retrieve resource IDs, titles, and public thumbnails. PDF download/viewing routes request signed URLs on demand via `resource-access`. |
| **`student_class` / `subject`** | Denormalized text columns (e.g., `student_class = '10'`, `subject = 'science'`) across `chapters` and `learning_resources`. | **Unchanged for now.** Maintains zero-breakage simplicity. Class/Subject normalization is deferred as unneeded for current single-board (CBSE/NCERT) scope. |

---

## 3. Proposed Schema

The proposed schema introduces two clean relational entities (`syllabus_topics` and `syllabus_topic_resources`) while building directly on top of existing `chapters` and `learning_resources` tables.

```
                    ┌─────────────────────────┐
                    │        chapters         │
                    ├─────────────────────────┤
                    │ id (PK)                 │
                    │ student_class           │
                    │ subject                 │
                    │ chapter_number          │
                    │ chapter_name            │
                    │ display_order           │
                    │ is_active               │
                    └────────────┬────────────┘
                                 │ 1
                                 │
                                 │ N
                    ┌────────────┴────────────┐
                    │     syllabus_topics     │
                    ├─────────────────────────┤
                    │ id (PK)                 │
                    │ chapter_id (FK)         │
                    │ topic_number            │
                    │ topic_name              │
                    │ description             │
                    │ display_order           │
                    │ is_active               │
                    └────────────┬────────────┘
                                 │ 1
                                 │
                                 │ N
                    ┌────────────┴────────────┐
                    │ syllabus_topic_resources│
                    ├─────────────────────────┤
                    │ id (PK)                 │
                    │ topic_id (FK)           │
                    │ resource_id (FK)        │
                    │ display_order           │
                    └────────────┬────────────┘
                                 │ N
                                 │
                                 │ 1
                    ┌────────────┴────────────┐
                    │   learning_resources    │
                    ├─────────────────────────┤
                    │ id (PK)                 │
                    │ title                   │
                    │ resource_type           │
                    │ medium ('english'|'hindi│
                    │ storage_bucket          │
                    │ file_path               │
                    │ chapter_id (FK, opt)    │
                    └─────────────────────────┘
```

---

## 4. Table Definitions

Below are the exact SQL DDL definitions proposed for the S2 schema design. *(Note: Marked as proposed SQL only — do not execute until S3)*.

### 4.1 `chapters` Table (Existing — Unchanged)
```sql
-- PROPOSED SQL ONLY - DO NOT EXECUTE
-- The chapters table remains as defined in production:
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_class TEXT NOT NULL,
    subject TEXT NOT NULL,
    chapter_number INT NOT NULL,
    chapter_name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    chapter_summary TEXT,
    topics JSONB, -- Retained during transition phase
    key_concepts JSONB,
    important_terms JSONB,
    learning_objectives JSONB,
    exam_relevant_themes JSONB,
    study_guidance JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chapters_class_subject_number_key UNIQUE (student_class, subject, chapter_number)
);
```

### 4.2 `syllabus_topics` Table (New Entity)
Represents discrete, ordered topics belonging to a chapter in the syllabus flowchart.
```sql
-- PROPOSED SQL ONLY - DO NOT EXECUTE
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    topic_number VARCHAR(20), -- e.g., "1.1", "1.2", or NULL
    topic_name TEXT NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT syllabus_topics_chapter_topic_name_key UNIQUE (chapter_id, topic_name)
);

-- Comments for database documentation
COMMENT ON TABLE public.syllabus_topics IS 'Normalized topics representing discrete units of a chapter syllabus tree.';
COMMENT ON COLUMN public.syllabus_topics.topic_number IS 'Human-readable topic sequence number within chapter (e.g., "1.1").';
```

### 4.3 `syllabus_topic_resources` Table (New Junction Entity)
Maps learning resources (PDFs across different mediums like English or Hindi) to syllabus topics.
```sql
-- PROPOSED SQL ONLY - DO NOT EXECUTE
CREATE TABLE IF NOT EXISTS public.syllabus_topic_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.learning_resources(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT syllabus_topic_resources_topic_resource_key UNIQUE (topic_id, resource_id)
);

-- Comments for database documentation
COMMENT ON TABLE public.syllabus_topic_resources IS 'Junction table linking syllabus topics to specific learning resources (English/Hindi Notes, Revision Sheets, etc.).';
```

---

## 5. Relationships / ER-Style Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CHAPTERS                                         |
+-----------------------------------------------------------------------------------+
| PK  id               UUID                     NOT NULL DEFAULT gen_random_uuid()  |
|     student_class    TEXT                     NOT NULL                            |
|     subject          TEXT                     NOT NULL                            |
|     chapter_number   INT                      NOT NULL                            |
|     chapter_name     TEXT                     NOT NULL                            |
|     display_order    INT                      NOT NULL DEFAULT 0                  |
|     is_active        BOOLEAN                  NOT NULL DEFAULT TRUE               |
+-----------------------------------------------------------------------------------+
       | 1
       |
       | N (via chapter_id)
+-----------------------------------------------------------------------------------+
|                               SYLLABUS_TOPICS                                     |
+-----------------------------------------------------------------------------------+
| PK  id               UUID                     NOT NULL DEFAULT gen_random_uuid()  |
| FK  chapter_id       UUID                     NOT NULL REFERENCES chapters(id)    |
|     topic_number     VARCHAR(20)              NULL                                |
|     topic_name       TEXT                     NOT NULL                            |
|     description      TEXT                     NULL                                |
|     display_order    INT                      NOT NULL DEFAULT 0                  |
|     is_active        BOOLEAN                  NOT NULL DEFAULT TRUE               |
+-----------------------------------------------------------------------------------+
       | 1
       |
       | N (via topic_id)
+-----------------------------------------------------------------------------------+
|                           SYLLABUS_TOPIC_RESOURCES                                |
+-----------------------------------------------------------------------------------+
| PK  id               UUID                     NOT NULL DEFAULT gen_random_uuid()  |
| FK  topic_id         UUID                     NOT NULL REFERENCES syllabus_topics |
| FK  resource_id      UUID                     NOT NULL REFERENCES resources       |
|     display_order    INT                      NOT NULL DEFAULT 0                  |
+-----------------------------------------------------------------------------------+
       | N
       |
       | 1 (via resource_id)
+-----------------------------------------------------------------------------------+
|                              LEARNING_RESOURCES                                   |
+-----------------------------------------------------------------------------------+
| PK  id               UUID                     NOT NULL DEFAULT gen_random_uuid()  |
|     title            TEXT                     NOT NULL                            |
|     resource_type    resource_type (ENUM)     NOT NULL                            |
|     medium           medium (ENUM)            NOT NULL ('english' | 'hindi')      |
| FK  chapter_id       UUID                     NULL REFERENCES chapters(id)        |
|     storage_bucket   TEXT                     NOT NULL DEFAULT 'protected-pdfs'   |
|     file_path        TEXT                     NOT NULL                            |
+-----------------------------------------------------------------------------------+
```

---

## 6. Medium / Resource Mapping Strategy

### 6.1 Re-evaluating `chapters.medium`
In S1, extending `chapters` with `medium` was considered as an option. However, upon re-evaluation against Horizon's core product requirements, **adding `medium` to `chapters` is explicitly rejected**.

*Why `chapters.medium` is incorrect:*
1. **Tree Duplication:** If `chapters` had a `medium` column, Class 10 Science Chapter 1 would have to exist twice in the database (`medium = 'english'` and `medium = 'hindi'`).
2. **Breaks Single Flowchart rendering:** A student viewing the Class 10 Science syllabus flowchart expects a single unified tree of chapters and topics. Duplicating chapters forces the frontend to perform complex grouping/deduplication logic or render split branches.
3. **Unnecessary Medium Branching for Language Subjects:** For subjects like English Literature, Hindi Literature, or Sanskrit, medium duplication makes no logical sense.

### 6.2 The Correct Model: Resource-Level Medium
The syllabus tree is language-neutral. Medium exists exclusively on `learning_resources`.

#### Flowchart Interaction Example:
```
[Class 10 Science]
   └─ [Chapter 1: Chemical Reactions and Equations]
        ├─ [Topic 1.1: Chemical Equations]
        │     ├── Resource: "Notes - Topic 1.1 (English)" [medium: english]
        │     └── Resource: "Notes - Topic 1.1 (Hindi)"   [medium: hindi]
        │
        ├─ [Topic 1.2: Types of Chemical Reactions]
        │     └── Resource: "Notes - Topic 1.2 (English)" [medium: english]
        │
        └─ [Topic 1.3: Corrosion and Rancidity]
              (No resources mapped yet - topic node remains visible in syllabus)
```

### 6.3 Resource Selection Rules
When rendering a topic node in the UI:
1. Query `syllabus_topic_resources` join records for the topic.
2. Group returned `learning_resources` by `medium`.
3. Render available resource action chips:
   - If both English and Hindi resources exist: Display `[ English Notes ]` and `[ Hindi Notes ]` buttons.
   - If only English resource exists: Display `[ English Notes ]` button.
   - If no resources exist: Display topic title and description with an empty state indicator (e.g., "Notes coming soon").
4. **No Dummy Records:** The database contains zero records for unavailable mediums. Absence of a record simply means that medium is not currently available.

### 6.4 Chapter-Level vs. Topic-Level Resources
- **Chapter-Level Resources:** Complete chapter notes or full Question Banks that span an entire chapter connect directly to `chapters.id` via `learning_resources.chapter_id`.
- **Topic-Level Resources:** Specific topic-level notes, summaries, or flashcards connect to `syllabus_topics.id` via `syllabus_topic_resources`.
- Both levels coexist harmoniously without schema conflict.

---

## 7. JSONB Migration Strategy

Currently, `chapters.topics` contains a JSONB array of topic names (e.g. `["1.1 Chemical Equations", "1.2 Types of Chemical Reactions"]`).

### Transition Strategy (Zero Downtime / Zero Data Loss)

1. **Phase 1: Dual Read / Backwards Compatible Schema (S2 Design & S3 Migration)**
   - The `chapters.topics` JSONB column remains untouched in the database during table creation.
   - Existing legacy code reading `chapters.topics` will continue to work without disruption.

2. **Phase 2: Automated Idempotent Data Backfill (SQL Script for S3)**
   - Run a migration script that iterates over all existing `chapters` records containing non-null `topics` JSONB arrays.
   - Unnest the JSONB array and insert corresponding rows into `syllabus_topics`, preserving array index as `display_order`.
   - Use `ON CONFLICT (chapter_id, topic_name) DO NOTHING` to ensure re-run safety.

   ```sql
   -- PROPOSED SQL ONLY - DO NOT EXECUTE NOW
   INSERT INTO public.syllabus_topics (chapter_id, topic_name, display_order)
   SELECT
       c.id AS chapter_id,
       elem.val AS topic_name,
       (elem.ordinality - 1) AS display_order
   FROM public.chapters c,
   LATERAL jsonb_array_elements_text(c.topics) WITH ORDINALITY AS elem(val, ordinality)
   WHERE c.topics IS NOT NULL AND jsonb_array_length(c.topics) > 0
   ON CONFLICT (chapter_id, topic_name) DO NOTHING;
   ```

3. **Phase 3: Codebase Migration & Sunset**
   - Update frontend and service APIs to query `syllabus_topics` relational endpoints instead of reading `chapters.topics` JSONB.
   - Once all clients are updated, mark `chapters.topics` as deprecated in documentation/types.

---

## 8. Security / RLS Design

Horizon's security model strictly separates public educational metadata from protected PDF binary files.

### 8.1 RLS Policies for New Tables

#### `syllabus_topics` RLS Policy
Syllabus topics are public educational metadata and must be globally readable by both unauthenticated guests and logged-in students. Mutations are restricted to service-role/admins.
```sql
-- PROPOSED SQL ONLY - DO NOT EXECUTE
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for active syllabus_topics"
    ON public.syllabus_topics
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow full access for service_role on syllabus_topics"
    ON public.syllabus_topics
    FOR ALL
    USING (auth.role() = 'service_role');
```

#### `syllabus_topic_resources` RLS Policy
The mapping table contains no sensitive content and should be publicly readable.
```sql
-- PROPOSED SQL ONLY - DO NOT EXECUTE
ALTER TABLE public.syllabus_topic_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for syllabus_topic_resources"
    ON public.syllabus_topic_resources
    FOR SELECT
    USING (true);

CREATE POLICY "Allow full access for service_role on syllabus_topic_resources"
    ON public.syllabus_topic_resources
    FOR ALL
    USING (auth.role() = 'service_role');
```

### 8.2 PDF Access Architecture
- Queries against `syllabus_topic_resources` joining `learning_resources` will **ONLY** select public metadata: `id`, `title`, `medium`, `resource_type`, `thumbnail_url`.
- Storage bucket paths (`file_path`, `storage_bucket`) and private storage details are never exposed to public endpoints or client state.
- Opening or downloading a PDF continues to use the existing secure endpoint:
  ```
  POST /functions/v1/resource-access
  Body: { "resource_id": "...", "action": "view" }
  Response: { "signedUrl": "https://..." }
  ```

---

## 9. Indexes & Constraints

To guarantee data integrity, prevent duplicate topic nodes, and optimize relational graph queries, the following indexes and constraints are specified.

### 9.1 Primary Keys & Foreign Keys
- `syllabus_topics.id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `syllabus_topics.chapter_id`: `UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE`
- `syllabus_topic_resources.id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `syllabus_topic_resources.topic_id`: `UUID NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE`
- `syllabus_topic_resources.resource_id`: `UUID NOT NULL REFERENCES public.learning_resources(id) ON DELETE CASCADE`

### 9.2 Unique Constraints
1. **Prevent Duplicate Topics:** `UNIQUE (chapter_id, topic_name)`
   Prevents accidental creation of identical topic entries under the same chapter.
2. **Prevent Duplicate Resource Mappings:** `UNIQUE (topic_id, resource_id)`
   Prevents attaching the exact same `learning_resource` record multiple times to a topic.

### 9.3 Composite Performance Indexes
```sql
-- PROPOSED SQL ONLY - DO NOT EXECUTE
-- Fast lookup of all active topics within a chapter, ordered by display_order
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_chapter_order
ON public.syllabus_topics (chapter_id, display_order)
WHERE is_active = true;

-- Fast join resolution for topic-resource mappings
CREATE INDEX IF NOT EXISTS idx_syllabus_topic_resources_topic
ON public.syllabus_topic_resources (topic_id);

CREATE INDEX IF NOT EXISTS idx_syllabus_topic_resources_resource
ON public.syllabus_topic_resources (resource_id);
```

---

## 10. TypeScript / API Model Design

The frontend model directly mirrors the Class $\rightarrow$ Subject $\rightarrow$ Chapter $\rightarrow$ Topic hierarchy, supporting arrays of resources per topic node.

```typescript
// Proposed TypeScript definitions for src/types/syllabus.ts

import { Medium, ResourceType } from './index';

/**
 * Public minimal representation of a mapped resource attached to a topic
 */
export interface SyllabusResourceMeta {
  id: string;
  title: string;
  medium: Medium; // 'english' | 'hindi'
  resource_type: ResourceType; // 'notes' | 'revision_sheets' | etc.
  thumbnail_url?: string | null;
  allow_download?: boolean;
}

/**
 * Normalized syllabus topic node
 */
export interface SyllabusTopic {
  id: string;
  chapter_id: string;
  topic_number?: string | null; // e.g., "1.1"
  topic_name: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  resources: SyllabusResourceMeta[]; // Multiple resources across mediums
}

/**
 * Syllabus Chapter containing relational topics and chapter-level resources
 */
export interface SyllabusChapter {
  id: string;
  student_class: string;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  display_order: number;
  is_active: boolean;
  chapter_summary?: string | null;
  topics: SyllabusTopic[]; // Ordered topic nodes
  chapter_resources?: SyllabusResourceMeta[]; // Direct chapter-level resources
}

/**
 * Complete Syllabus Tree for a given Class and Subject
 */
export interface SyllabusTree {
  student_class: string;
  subject: string;
  chapters: SyllabusChapter[];
}
```

---

## 11. API / Query Requirements & PDF Generation Compatibility

### 11.1 PostgREST Relational Query Pattern
Using Supabase's native relational syntax, a single nested query fetches the entire syllabus hierarchy for a Class and Subject with high efficiency:

```typescript
// Proposed Supabase Client Query
const fetchSyllabusTree = async (studentClass: string, subject: string) => {
  const { data, error } = await supabase
    .from('chapters')
    .select(`
      id,
      student_class,
      subject,
      chapter_number,
      chapter_name,
      display_order,
      chapter_summary,
      syllabus_topics (
        id,
        topic_number,
        topic_name,
        description,
        display_order,
        syllabus_topic_resources (
          learning_resources (
            id,
            title,
            medium,
            resource_type,
            thumbnail_url,
            allow_download
          )
        )
      )
    `)
    .eq('student_class', studentClass)
    .eq('subject', subject)
    .eq('is_active', true)
    .eq('syllabus_topics.is_active', true)
    .order('chapter_number', { ascending: true })
    .order('display_order', { foreignTable: 'syllabus_topics', ascending: true });

  if (error) throw error;
  return data;
};
```

### 11.2 Flowchart vs. Database UI Coordinates
- **Layout Separation:** Database stores semantic structure (`chapter_number`, `topic_number`, `display_order`).
- **No Coordinate Storage in Database:** X/Y coordinates for flowchart rendering belong entirely in client-side layout algorithms (e.g., React Flow, dagre, or SVG tree calculators). Storing pixel coordinates in SQL creates fragile layouts that break across responsive screen sizes.

### 11.3 Dynamic Table-PDF Generation Compatibility
The data structure directly provides all required fields to dynamically render a printable/downloadable Syllabus PDF table on the client (using `jspdf-autotable` or browser print stylesheets):
- **Document Header:** `Class ${student_class} - ${subject} Syllabus`
- **Table Columns:** Chapter No. | Chapter Name | Topic No. | Topic Name & Summary | Available Resource Languages
- **Client-Side Generation:** Generated strictly on-demand in memory in the user's browser. **No generated PDF files will be stored permanently in Supabase Storage.**

---

## 12. Migration Sequence (For S3 Execution)

When approved for S3 implementation, execution will follow this strict order:

1. **Step 1: Apply SQL DDL Migration**
   - Create `syllabus_topics` table with PK, FK, and unique constraints.
   - Create `syllabus_topic_resources` junction table.
   - Create composite indexes (`idx_syllabus_topics_chapter_order`, etc.).
   - Apply RLS policies on both new tables.

2. **Step 2: Backfill Data from `chapters.topics` JSONB**
   - Run idempotent `INSERT INTO syllabus_topics ... SELECT ... jsonb_array_elements_text()` script.

3. **Step 3: Update TypeScript Interfaces & API Services**
   - Add `src/types/syllabus.ts`.
   - Create `src/services/syllabusAPI.ts` with `fetchSyllabusTree`.

4. **Step 4: Frontend Flowchart Component Integration**
   - Build flowchart components referencing `SyllabusTree`.

---

## 13. Rollback Considerations

If unexpected issues occur during deployment:
- **Zero Impact on Existing App:** The core app (`/library`, `/notes`, `/view/:id`) depends strictly on `chapters` and `learning_resources`.
- **Database Rollback:** Dropping `syllabus_topic_resources` and `syllabus_topics` completely reverts the database to its pre-S2 state without losing any chapter or resource data.
```sql
-- ROLLBACK COMMANDS (IF NEEDED IN FUTURE)
DROP TABLE IF EXISTS public.syllabus_topic_resources CASCADE;
DROP TABLE IF EXISTS public.syllabus_topics CASCADE;
```

---

## 14. Risks and Edge Cases

| Risk / Edge Case | Mitigation Strategy |
| :--- | :--- |
| **Topic Ordering Conflicts** | Enforce `display_order` integer sorting at query time. Include fallback sort by `created_at` or `topic_number`. |
| **Missing Medium Resource** | UI gracefully handles topics with 0 resources or 1 medium without breaking layout or showing blank buttons. |
| **Orphaned Topic Resources** | `ON DELETE CASCADE` foreign keys guarantee that deleting a topic or resource automatically cleans up `syllabus_topic_resources`. |
| **Duplicate Topic Creation** | Enforced by `UNIQUE (chapter_id, topic_name)` constraint. |
| **Resource Path Exposure** | PostgREST queries strictly omit `file_path` and `storage_bucket` fields from syllabus API responses. |

---

## 15. Explicit List of What Should NOT Be Changed

To prevent accidental scope creep or regressions during syllabus implementation:

1. **DO NOT** add `medium` column to `chapters` table.
2. **DO NOT** modify existing private storage buckets (`protected-pdfs`) or bucket security policies.
3. **DO NOT** modify the Edge Function (`supabase/functions/resource-access`).
4. **DO NOT** delete or drop the `chapters.topics` JSONB column in S2 or S3 (preserve for backwards compatibility).
5. **DO NOT** modify `learning_resources` table schema or existing resource mapping logic.
6. **DO NOT** introduce normalized `boards` or `curricula` tables at this time (keep scope minimal for single-board CBSE).
7. **DO NOT** store generated syllabus PDFs in Supabase Storage.

---

## 16. Final Recommendation for S3

Proceed to **S3 Implementation** following the database blueprint detailed in this report. The proposed relational design (`syllabus_topics` + `syllabus_topic_resources`) provides:
- Clean, language-neutral Class $\rightarrow$ Subject $\rightarrow$ Chapter $\rightarrow$ Topic hierarchy.
- Seamless dual-medium resource support (English/Hindi Notes) on identical topic nodes.
- Total preservation of Horizon's protected PDF security architecture.
- Full backwards compatibility with existing codebase features.
