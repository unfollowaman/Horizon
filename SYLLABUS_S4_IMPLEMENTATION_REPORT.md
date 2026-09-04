# Stage 4 (S4) Syllabus Implementation Report

## Executive Summary
This report documents the re-implementation and verification of Stage 4 (S4) Syllabus foundation for the Horizon application. The implementation strictly adheres to the primary authoritative research audit document: `docs/audits/SYLLABUS_2026_DATA_AUDIT.pdf`.

---

## 1. What Was Inspected & Corrected

The previous unmerged S4 attempt contained significant dataset discrepancies and mapping flaws. The following corrections have been executed based on the 2026–27 research PDF:

- **Class 9 Mathematics Structure:** Expanded from 13 incomplete chapters to all 15 official chapters (Chapters 1–15).
- **Class 9 Mathematics Chapters 9–15 Exercise Handling:** Per explicit instructions and research audit notes, Chapters 9–15 exist as official chapter records but contain **zero fabricated exercise nodes**, as NCERT physical exercise numbering for Part II remains pending distribution.
- **Class 9 Science Structure:** Corrected to 13 complete chapters under the NCF-SE 2023 prescribed textbook *Exploration*.
- **Class 9 English Curriculum:** Replaced legacy *Beehive/Moments* structure with NCF-SE 2023 prescribed reader *Kaveri*.
- **Class 9 Hindi Curriculum:** Replaced dual legacy *Kshitij-1/Sparsh-1* structure with NCF-SE 2023 unified reader *Ganga*.
- **Class 9 Sanskrit Curriculum:** Replaced legacy *Shemushi-1* with NCF-SE 2023 reader *Shardā*.
- **Class 8 Social Science Scope:** Reconciled across 21 chapters spanning History (*Our Pasts-III*), Geography (*Resources and Development*), and Civics (*Social and Political Life-III*).
- **Class 10 Social Science & Languages:** Preserved Board evaluation vs. Project Work/Map Work distinctions (e.g., History Ch 3, Geography Ch 7, Economics Ch 5) and maintained Course A (`002`) and Course B (`085`) Hindi distinctions.

---

## 2. Database Schema Changes

The relational database architecture is defined in migration `supabase/migrations/20260101000000_create_syllabus_tables.sql`:

1. **`syllabus_topics` Table:**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `chapter_id`: `UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE`
   - `title`: `TEXT NOT NULL`
   - `description`: `TEXT`
   - `topic_type`: `TEXT NOT NULL DEFAULT 'topic'` (e.g., `'exercise'`, `'topic'`, `'grammar'`)
   - `display_order`: `INTEGER NOT NULL DEFAULT 0`
   - `is_active`: `BOOLEAN NOT NULL DEFAULT true`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

2. **`syllabus_topic_resources` Table:**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `topic_id`: `UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE`
   - `resource_id`: `UUID NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
   - UNIQUE constraint on `(topic_id, resource_id)`

3. **Security & RLS Policies:**
   - Enabled Row Level Security (RLS) on both tables with public read access policies (`FOR SELECT USING (true)`).
   - Existing `chapters.topics` JSONB column was preserved for backward compatibility.

---

## 3. Resource Mapping Strategy

A critical flaw in the previous attempt was automatically attaching generic chapter-level PDFs to every topic within that chapter.

- **Corrected Rule:** Existing `learning_resources.chapter_id` represents chapter-level ownership. Junction records in `syllabus_topic_resources` are created **only** when a resource explicitly targets a specific topic or exercise.
- Generic chapter Notes PDFs are **not** blindly copied onto every child topic.
- Topics without specific resources remain empty (0 topic-resource mappings).

---

## 4. Security & Protected PDF Data

- The Syllabus feature references `learning_resources` records via foreign keys without exposing Supabase storage paths, signed URLs, private PDF tokens, or storage bucket credentials.
- Public metadata is readable via RLS policies while protected PDF viewing continues to pass through the existing `getResourceUrl` mechanism.

---

## 5. Automated Tests & Build Verification

The automated test suite in `scripts/__tests__/seed_syllabus.test.ts` and `src/services/__tests__/learningResourcesAPI.test.ts` verifies:
- Data strictly limited to Classes 8, 9, 10 across 6 required subjects.
- Class 9 Maths Chapters 1–15 present, with Chapters 9–15 having zero exercise nodes.
- NCF-SE 2023 Class 9 language books (*Kaveri*, *Ganga*, *Shardā*).
- Class 8 Social Science (21 chapters) and Class 9 Science (13 chapters).
- Non-attachment of generic chapter PDFs to all topics.
- Idempotent seed execution and RLS policy integrity.

### Test Results
- **Vitest Suite:** 28 test files passed, 180 tests passed.
- **Production Build:** `npm run build` executed successfully without compilation errors.
