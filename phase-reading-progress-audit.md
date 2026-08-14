
# Phase: Reading Progress Audit

## 1. FRONTEND TRACE

**File:** `src/pages/user/Dashboard.tsx`
**Component:** `Dashboard`
**Query:**
```typescript
const { data: syllabusData, error: syllabusError } = await supabase
  .from('learning_resources')
  .select('chapter_id, subject')
  .eq('resource_type', 'notes')
  .eq('student_class', profile.student_class || '')
  .eq('medium', profile.study_medium || 'english')
  .not('chapter_id', 'is', null);
```

- **Table queried:** `learning_resources`
- **Filters applied:**
  - `resource_type = 'notes'`
  - `student_class = profile.student_class || ''`
  - `medium = profile.study_medium || 'english'`
  - `chapter_id is not null`
- **Subject filtering:** None applied at query level.
- **is_active filtering:** None applied at query level or in JS.

## 2. CHAPTERS TABLE

The `chapters` table contains 6 rows for Class 10.
- **Rows present:** Yes, 6 rows.
- **Class 10 rows:** Yes, all 6 have `student_class = '10'`.
- **Subjects existing:** 'History' (1 chapter), 'Political Science' (5 chapters).
- **Chapter numbers/names existing:**
  - History: Ch 1 (Chapter 1)
  - Political Science: Ch 1 (सत्ता की साझेदारी), Ch 2 (संघवाद), Ch 3 (जाति, धर्म और लैंगिक मसले), Ch 4 (राजनीतिक दल), Ch 5 (लोकतंत्र के परिणाम)
- **Active rows:** Yes, `is_active = true` for all 6.
- **student_class value:** `'10'`

## 3. COMPARE WITH LEARNING_RESOURCES

The `learning_resources` table contains 6 Notes records for Class 10:
- `student_class`: `'10'` (Matches `chapters.student_class`)
- `subject`: 'History' and 'Political Science' (Matches `chapters.subject`)
- `chapter_id`: Contains UUIDs (Matches `chapters.id`)

The uploaded Notes PDFs have valid `chapter_id` values that match the corresponding rows in the `chapters` table.

## 4. CLASS VALUE

- **learning_resources:** `'10'`
- **chapters:** `'10'`
- **profile.student_class (Frontend query filter):** `'Class 10'`

A mismatch exists between the user's profile value (`'Class 10'`) used in the query filter and the value stored in the database tables (`'10'`).

## 5. SUBJECT VALUE

Subject names match exactly between `learning_resources` and `chapters`:
- `'Political Science'`
- `'History'`

## 6. CHAPTER RELATIONSHIP

The six uploaded Notes resources have valid `chapter_id`s pointing correctly to their respective class and subject in the `chapters` table.

## 7. READING PROGRESS QUERY

The query returns no syllabus data because of **C. Incorrect class filter** (or Frontend mapping issue).
The frontend filters using `profile.student_class` which contains the string `'Class 10'`.
The database stores the `student_class` as just `'10'`.
Because of this string mismatch (`'Class 10'` vs `'10'`), the query `.eq('student_class', 'Class 10')` returns 0 rows.

## 8. RLS

RLS is not blocking the query. The user has access, but the query returns 0 rows due to the incorrect string filter for `student_class`.

## 9. EXISTING DATA

Syllabus/chapter records already exist correctly in the database. The frontend is querying them incorrectly due to a format mismatch in the class string.

## 10. FINAL DIAGNOSIS

- **Exact root cause:** The frontend queries `learning_resources.student_class` using the literal value of `profile.student_class` (which is `'Class 10'`), but the database tables (`learning_resources` and `chapters`) store the class number as just `'10'`. This causes the syllabus query to return zero results.
- **Affected table(s):** None (it's a data formatting issue between what profile holds vs what resources hold).
- **Affected column(s):** `student_class` (format mismatch)
- **Affected frontend file(s):** `src/pages/user/Dashboard.tsx`
- **Evidence:**
  - `Dashboard.tsx` displays "No syllabus data found for Class 10", confirming `profile.student_class === 'Class 10'`.
  - Database query of `learning_resources` shows `student_class: '10'` for all notes.
- **Severity:** High (breaks core syllabus progress tracking feature).
- **Recommended fix:** In `Dashboard.tsx`, sanitize/normalize `profile.student_class` before querying. For example, if it's `'Class 10'`, extract just the number `'10'` before passing it to the `.eq()` filter.

# FINAL VERDICT

C. Frontend query/mapping bug.
