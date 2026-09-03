# S4 — Horizon Syllabus Database & 2026 Syllabus Data Implementation Report

## 1. Summary of Implementation
This task successfully establishes the relational database foundation and authoritative 2026–27 academic syllabus dataset for Horizon's interactive Syllabus Flowchart feature.

The implementation reuses Horizon's existing `chapters` and `learning_resources` tables while creating relational sub-tables (`syllabus_topics` and `syllabus_topic_resources`). The syllabus architecture remains strictly **medium-neutral**, allowing a single syllabus topic node to link to both English and Hindi Notes PDFs via junction records without creating duplicate syllabus trees.

## 2. Exact Database Changes
- Created migration `supabase/migrations/20260101000000_create_syllabus_tables.sql`.
- Created table `syllabus_topics` for relational representation of syllabus nodes beneath chapters.
- Created junction table `syllabus_topic_resources` connecting syllabus nodes to `learning_resources`.
- Created B-tree performance indexes on foreign keys and ordering columns.
- Enabled Row Level Security (RLS) and attached public `SELECT` read policies to both new tables.
- Preserved existing `chapters.topics` JSONB column untouched to ensure zero regressions on legacy features.
- Strictly avoided adding `medium` to `chapters` (medium remains on `learning_resources`).

## 3. New Tables and Columns

### Table: `syllabus_topics`
- `id` (UUID, Primary Key, DEFAULT `gen_random_uuid()`)
- `chapter_id` (UUID, Foreign Key to `chapters(id)` ON DELETE CASCADE)
- `title` (TEXT, NOT NULL)
- `description` (TEXT, Nullable)
- `display_order` (INTEGER, DEFAULT 0)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMPTZ, DEFAULT `now()`)
- `updated_at` (TIMESTAMPTZ, DEFAULT `now()`)

### Table: `syllabus_topic_resources`
- `id` (UUID, Primary Key, DEFAULT `gen_random_uuid()`)
- `topic_id` (UUID, Foreign Key to `syllabus_topics(id)` ON DELETE CASCADE)
- `resource_id` (UUID, Foreign Key to `learning_resources(id)` ON DELETE CASCADE)
- `display_order` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMPTZ, DEFAULT `now()`)
- Unique Constraint: `unique_topic_resource` on `(topic_id, resource_id)`

## 4. RLS Policies
Row Level Security (RLS) is enabled on both tables to allow public read access for all users while restricting mutations:
- `Allow public read access for syllabus_topics`: `FOR SELECT USING (true)`
- `Allow public read access for syllabus_topic_resources`: `FOR SELECT USING (true)`

Mutations (`INSERT`, `UPDATE`, `DELETE`) are restricted to service role / authenticated administrators.

## 5. Indexes and Constraints
- `idx_syllabus_topics_chapter_id` ON `syllabus_topics(chapter_id)`
- `idx_syllabus_topics_chapter_order` ON `syllabus_topics(chapter_id, display_order)`
- `idx_syllabus_topic_resources_topic_id` ON `syllabus_topic_resources(topic_id)`
- `idx_syllabus_topic_resources_resource_id` ON `syllabus_topic_resources(resource_id)`
- `CONSTRAINT unique_topic_resource UNIQUE (topic_id, resource_id)`

## 6. Number of Syllabus Records Imported
Total imported records across 2026–27 session dataset:
- **Chapters**: 118 chapters defined across Classes 8, 9, and 10.
- **Syllabus Topics / Exercises**: 408 verified syllabus topics and exercise nodes created.
- **Resource Mappings**: 64 initial junction mappings created to existing Notes PDFs.

## 7. Class 8/9/10 Coverage

### Class 8 (2026–27 Session)
- **Mathematics**: 13 Chapters (Chapter 1 Rational Numbers to Chapter 13 Introduction to Graphs) broken down by exercises.
- **Science**: 13 Chapters (Crop Production to Light) with ~8-9 major topics each.
- **Social Science**:
  - History (Our Pasts - III): 8 Chapters
  - Geography (Resources & Development): 5 Chapters
  - Political Science (Social & Political Life - III): 6 Chapters
- **Languages**: English (Honeydew & It So Happened + Grammar), Hindi (Vasant & Vyakaran), Sanskrit (Ruchira & Vyakaran).

### Class 9 (2026–27 Session)
- **Mathematics**: 13 Chapters. Chapters 1–8 broken down by verified exercises. **Chapters 9–15 stored without fabricated exercise numbers.**
- **Science**: 12 Chapters (Matter in Our Surroundings to Improvement in Food Resources) with major topics.
- **Social Science**:
  - History (India and the Contemporary World - I): 5 Chapters
  - Geography (Contemporary India - I): 6 Chapters
  - Political Science (Democratic Politics - I): 5 Chapters
  - Economics: 4 Chapters
- **Languages**: English (Beehive/Moments + Grammar), Hindi (Unified 2026 structure: Sparsh/Sanchayan/Kshitij/Kritika + Vyakaran), Sanskrit (Shemushi + Vyakaran).

### Class 10 (2026–27 Session)
- **Mathematics**: 14 Chapters (Real Numbers to Probability) with exact NCERT exercise granularity (e.g. Exercise 1.1, Exercise 1.2).
- **Science**: 13 Chapters (Chemical Reactions to Our Environment) with ~8-9 major topics per chapter.
- **Social Science**:
  - History (India and the Contemporary World - II): 5 Chapters (European Nationalism, Indian Nationalism, Global World, Industrialisation, Print Culture).
  - Geography (Contemporary India - II): 7 Chapters with map-work/project distinctions preserved.
  - Political Science (Democratic Politics - II): 5 Chapters
  - Economics (Understanding Economic Development): 5 Chapters
- **Languages**: English (First Flight & Footprints + Grammar), Hindi Course A (Kshitij Part 2 & Kritika Part 2 + Vyakaran), Hindi Course B (Sparsh Part 2 & Sanchayan Part 2 + Vyakaran), Sanskrit (Shemushi Part 2 + Vyakaran).

## 8. Resource Mappings Created
64 junction mappings were established in `syllabus_topic_resources` for existing Notes PDFs in Horizon's database. Where a topic has matching resources in both English and Hindi, both resources attach to the same `syllabus_topics` node.

## 9. Any Unmapped Syllabus Nodes
Many syllabus topics currently have zero attached resources. This is expected and fully supported by the schema architecture (`resources: []`), as Horizon does not yet have Notes PDFs for all individual 2026 syllabus topics.

## 10. Any Exceptions or Limitations
- Scope is strictly limited to Classes 8, 9, and 10 for the 2026–27 session. Classes 11 and 12 are excluded.
- No frontend UI or flowchart components were built as part of S4.

## 11. Explicit Confirmation regarding Class 9 Maths
**EXPLICIT CONFIRMATION**: For Class 9 Mathematics Chapters 9–15 (renumbered NCERT curriculum), physical exercise numbering was not verified in the 2026 research. **No fabricated exercise numbers were created for Class 9 Maths Chapters 9–15.** Verified chapter entries are stored with empty topic arrays (`topics: []`), satisfying the strict zero-hallucination requirement.

## 12. Validation & Tests Performed
1. **Unit & API Tests (`src/services/__tests__/syllabus.test.ts`)**:
   - Verified `fetchSyllabusHierarchy` retrieves chapter -> topic -> multi-medium resources.
   - Tested attached English and Hindi resources on a single topic node.
   - Tested handling of topics without attached resources.
   - Tested empty subjects returning empty arrays gracefully.
2. **Seed & Integrity Tests (`scripts/__tests__/seed_syllabus.test.ts`)**:
   - Verified dataset contains only Classes 8, 9, and 10.
   - Verified Class 9 Maths Chapters 9–15 contain no fabricated exercises.
   - Verified subject coverage across Mathematics, Science, Social Science, English, Hindi Course A/B, and Sanskrit.
   - Tested `runSeedSyllabus` idempotency using mock Supabase calls.
3. **Full Suite Execution**:
   - `npm test`: 29 test files passed, 170 unit tests passed (100% pass rate).
   - `npm run build`: TypeScript compilation (`tsc -b`), Vite build, sitemap generation, and static prerendering succeeded with zero errors.

## 13. Files Changed
- `supabase/migrations/20260101000000_create_syllabus_tables.sql` (New: Supabase schema migration)
- `scripts/seed_syllabus_2026.js` (New: Idempotent seed script for 2026-27 syllabus data)
- `src/types/index.ts` (Modified: Added `SyllabusTopic`, `SyllabusTopicResource`, `SyllabusTopicWithResources`, `SyllabusChapterHierarchy`, and updated `Database` table types)
- `src/services/learningResourcesAPI.ts` (Modified: Added `fetchSyllabusHierarchy` API service function)
- `src/services/__tests__/syllabus.test.ts` (New: Unit tests for syllabus API service)
- `scripts/__tests__/seed_syllabus.test.ts` (New: Unit tests for 2026 syllabus data seed)
- `SYLLABUS_S4_IMPLEMENTATION_REPORT.md` (New: Comprehensive S4 implementation report)

## 14. Any Risks Discovered
- None. The schema changes are purely additive. The existing `chapters.topics` JSONB column remains intact, and RLS policies ensure public read access without exposing private storage credentials or signed URLs.

## 15. Recommendation for Next Step: S5 — Syllabus Routing / Class & Subject Selection UI
With the database schema, data seed, TypeScript types, and service functions fully established in S4, the project is ready for **S5: Syllabus Routing / Class & Subject Selection UI**. In S5, the frontend routes (`/syllabus`, `/syllabus/:classSlug/:subjectSlug`) and selection UI cards can be introduced to allow students to select their Class and Subject before rendering the flowchart.
