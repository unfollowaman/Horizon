# Stage 4 (S4) Syllabus Implementation Report

## Executive Summary
This report documents the re-implementation and verification of Stage 4 (S4) Syllabus foundation for the Horizon application. The implementation strictly adheres to the primary authoritative research audit document: `docs/audits/SYLLABUS_2026_DATA_AUDIT.pdf`.

---

## 1. What Was Inspected & Corrected

The previous unmerged S4 attempt contained significant dataset discrepancies and mapping flaws. The following corrections have been executed based on the 2026–27 research PDF:

- **Class 9 Mathematics Structure:** Expanded from 13 incomplete chapters to all 15 official chapters (Chapters 1–15).
- **Class 9 Mathematics Chapters 9–15 Exercise Handling:** Per explicit instructions and research audit notes, Chapters 9–15 exist as official chapter records but contain **zero fabricated exercise nodes**, as NCERT physical exercise numbering for Part II remains pending distribution.
- **Class 9 Science Structure:** Corrected to 13 complete chapters under the NCF-SE 2023 prescribed textbook *Exploration*.
- **Class 9 English Curriculum (Kaveri):** Expanded to the complete 7 prescribed literature chapters (*In the Realm of Morning*, *The Wind and the Leaves*, *The Silver Lining*, *Symphony of the Hills*, *Song of the Open Road*, *Shadows of the Banyan Tree*, *The Unbroken Wave*) plus a dedicated structured grammar section chapter (`English Grammar Syllabus`) containing all 8 official syllabus grammar subtopics marked with `topic_type = 'grammar'`.
- **Class 9 Hindi Curriculum (Ganga):** Expanded to the complete 7 prescribed unified literature chapters (*नया प्रभात*, *मिट्टी की सौगंध*, *संस्कृति के स्वर*, *समय की शिला पर*, *सच्चा मित्र*, *भारत के दीप*, *प्रकृति का संदेश*) plus a dedicated structured grammar section chapter (`हिंदी व्याकरण`) with `topic_type = 'grammar'`. Class 9 remains strictly unified as `Hindi`.
- **Class 9 Sanskrit Curriculum (Shardā):** Expanded to the complete 7 prescribed literature chapters (*मङ्गलाचरणम् एवं वन्दना*, *विद्यायाः महत्त्वम्*, *पर्यावरण-संरक्षणम्*, *सदाचारस्य शक्तिः*, *भारतस्य गौरवम्*, *वैज्ञानिकदृष्टिकोणः*, *सूक्ति-सुधा*) plus a dedicated structured grammar section chapter (`संस्कृत व्याकरणम्`) with `topic_type = 'grammar'`.
- **Class 10 Hindi Course A / Course B Separation:** Separated Class 10 Hindi into two distinct, dedicated subjects: `Hindi Course A` (15 literature chapters for *Kshitij-2* and *Kritika-2* plus Course A grammar) and `Hindi Course B` (17 literature chapters for *Sparsh-2* and *Sanchayan-2* plus Course B grammar).
- **Class 8 Social Science Scope:** Reconciled across 21 chapters spanning History (*Our Pasts-III*), Geography (*Resources and Development*), and Civics (*Social and Political Life-III*).
- **Class 10 Social Science & Board Exclusions:** Preserved Board evaluation vs. Project Work/Map Work distinctions (e.g., History Ch 3, Geography Ch 7, Economics Ch 5).

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
