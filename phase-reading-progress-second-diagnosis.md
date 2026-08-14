# Reading Progress Audit - Phase 2

## Current Implementation

In the recent fix, we modified `Dashboard.tsx` to normalize `profile.student_class` before running the Supabase query.
File changed: `src/pages/user/Dashboard.tsx`
Normalization helper used: `normalizeClassValue` from `src/utils/resourceHelper.ts`.
Variable passed into the query: `normalizedClass` which resolves to `"10"` for a profile with `"Class 10"`.

The flow:
`profile.student_class` -> `"Class 10"`
normalization (`normalizeClassValue`) -> `"10"`
Supabase Query -> `.eq('student_class', "10")`

## Runtime Values
- `profile.student_class` is `"Class 10"`
- `normalized class` is `"10"`
- `query class filter` is `"10"`

## Exact Query
The exact query being executed in `Dashboard.tsx` is:
```typescript
        const { data: syllabusData, error: syllabusError } = await supabase
          .from('learning_resources')
          .select('chapter_id, subject')
          .eq('resource_type', 'notes')
          .eq('student_class', normalizedClass)
          .eq('medium', profile.study_medium || 'english')
          .not('chapter_id', 'is', null);
```

## Every Query Filter
- `resource_type`: expected `"notes"`, database value `"notes"`
- `student_class`: expected `"10"`, database value `"10"`
- `medium`: expected value matches `profile.study_medium || 'english'`, database value `"english"` or `"hindi"`
- `chapter_id`: expected `not null`

## Actual Database Values
Based on the database schema / context, learning_resources store medium as `english` or `hindi`.
However, `profiles` store study medium via Onboarding as `"English"` or `"Hindi"`.
Notice the case mismatch:
- `profiles.study_medium` = `"English"` (or `"Hindi"`)
- `learning_resources.medium` = `"english"` (or `"hindi"`)

## Query Result
The query results in 0 rows. This is because the `.eq('medium', profile.study_medium || 'english')` uses `"English"` (capitalized) from the profile, but the database expects `"english"` (lowercase).

## Root Cause
C. Medium mismatch.

The capitalization of the medium stored in `profiles` (e.g. `"English"`) does not match the lowercase value stored in `learning_resources` (e.g. `"english"`). This causes the syllabus query to fail, even though the `student_class` filter has been corrected.

## Evidence
- `Onboarding.tsx` sets study medium as: `['English', 'Hindi']`.
- The Supabase database stores enum for medium as `english` or `hindi` (lowercase).
- The query in `Dashboard.tsx` does not normalize the `study_medium` before passing it to the query: `.eq('medium', profile.study_medium || 'english')`.

## Recommended Fix
In `Dashboard.tsx`, we should normalize the `profile.study_medium` to lowercase before querying:
```typescript
.eq('medium', (profile.study_medium || 'english').toLowerCase())
```
