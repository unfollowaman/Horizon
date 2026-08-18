# Magic Strings & Constants Audit

## 1. Executive Summary

A comprehensive audit of the repository's magic strings reveals that previous refactoring efforts (such as the centralized `learningResourcesAPI.ts` and the shared `ResourcePage.tsx` architecture) have successfully addressed most of the severe magic-string problems. The codebase already utilizes a strong TypeScript type layer (`src/types/index.ts`) and centralized configuration (`src/config/resources.ts`).

- **Total candidate strings analyzed:** ~25 unique identifiers.
- **Genuine centralization candidates:** ~2 (Storage bucket `'pdfs'` and runtime enum objects for `ResourceType`).
- **Strings that should remain local:** Most database table and column names (e.g., `'learning_resources'`, `'chapter_id'`), as they are already strictly confined to the data API layer.
- **Recommended overall approach:** Introduce a minimal set of runtime constants only for storage buckets and potentially routes. Avoid creating constants for database tables/columns, as the API layer already acts as the single source of truth.

## 2. Candidate Inventory

| String/Identifier | Occurrences | Files | Meaning | Classification | Recommendation |
| ----------------- | ----------: | ----- | ------- | -------------- | -------------- |
| `'learning_resources'` | ~15 | `learningResourcesAPI.ts`, `types/index.ts`, `mock.ts` | DB Table | Keep local (Data Layer) | Do not centralize; it's already confined to the API/Types. |
| `'pdfs'` | ~8 | `resourceHelper.ts`, `resourceHelper.test.ts` | Storage Bucket | Centralize | Create a shared constant, as it governs public/private access. |
| `'pyq'`, `'notes'` | ~20 | `resourceHelper.ts`, `usePdfProgress.ts`, `resources.ts` | Resource Types | Type / Constant | `ResourceType` type exists; need a runtime constant for logic checks. |
| `'/library'`, `'/notes'`, `'/dashboard'` | ~10 | `App.tsx`, `Login.tsx`, `AuthListener.tsx` | Routes | Keep local / Centralize | Borderline. Centralizing main routes prevents redirect loops, but over-abstracting React Router paths can be verbose. |
| `'chapter_id'`, `'student_class'`, etc. | ~30 | `learningResourcesAPI.ts`, `Dashboard.tsx` | DB Columns | Keep local | Already abstracted by mapping functions; do not extract to standalone constants. |

## 3. Known Resource Identifiers

### `learning_resources`
This table identifier is heavily isolated. It appears almost exclusively in `src/services/learningResourcesAPI.ts` (for data fetching) and `src/types/index.ts` (for the Supabase database schema). Centralizing it to a generic `const LEARNING_RESOURCES_TABLE = 'learning_resources'` would add unnecessary indirection since the API file itself is the designated boundary for this concept.

### `pyq` and `notes`
These resource identifiers are already defined as a TypeScript union (`ResourceType`) in `src/types/index.ts`. However, they still exist as hardcoded string literals in runtime logic:
- `src/utils/resourceHelper.ts`: `resource.resource_type !== 'pyq'`
- `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts`: `resource.resource_type !== 'notes'`
While the type provides compile-time safety, providing a runtime constant object (e.g., `RESOURCE_TYPES.PYQ`) could prevent typos during runtime checks.

## 4. Storage Identifiers

The string `'pdfs'` is hardcoded multiple times inside `src/utils/resourceHelper.ts` to determine fallback bucket behavior and access controls.
- **Recommendation:** Centralize. A constant like `DEFAULT_STORAGE_BUCKET = 'pdfs'` should be created. If multiple buckets exist, a `STORAGE_BUCKETS` object would be appropriate.

## 5. Route Identifiers

Strings like `'/library'`, `'/notes'`, `'/dashboard'`, and `'/login'` are scattered across `App.tsx`, `AuthListener.tsx`, and component `navigate()` calls.
- **Recommendation:** Keep local for standard links, but consider centralizing structural auth-redirect routes (`'/login'`, `'/dashboard'`, `'/onboarding'`) to prevent mismatch between the AuthListener and component fallbacks. The resource paths are already mostly centralized in `src/config/resources.ts`.

## 6. Database Identifiers

Column names like `student_class`, `subject`, `resource_type`, `chapter_id`, `is_active`, and `allow_download` are properly confined. `learningResourcesAPI.ts` abstracts these into the `Resource` domain object (`mapLearningResource`).
- **Recommendation:** Do not create constants for column names. The existing type-safe mapping layer provides better guarantees than floating string constants.

## 7. Type vs Runtime Constant Analysis

The repository uses a compile-time union type for resources (`export type ResourceType = 'notes' | 'revision_sheets' | 'mcq' | 'flashcards' | 'pyq';`).
This is excellent for typing props and API responses. However, because TypeScript unions disappear at runtime, developers still hardcode `'pyq'` in `if` statements.
- **Recommendation:** Introduce a runtime constant object that explicitly mirrors the type.
```ts
export const RESOURCE_TYPES = {
  PYQ: 'pyq',
  NOTES: 'notes',
  REVISION_SHEETS: 'revision_sheets',
  MCQ: 'mcq',
  FLASHCARDS: 'flashcards',
} as const;
```

## 8. Existing Constants Architecture

The repository currently utilizes `src/config/resources.ts` and `src/types/index.ts` to manage static configurations. It does not have a dedicated `constants/` folder. Creating one just for a few variables is overkill.

## 9. Proposed Minimal Architecture

Instead of creating a massive new directory structure, leverage the existing patterns:

1. **`src/config/constants.ts`** (New - for application-wide primitives)
```ts
export const STORAGE_BUCKETS = {
  DEFAULT_PDFS: 'pdfs',
} as const;

export const RESOURCE_TYPES = {
  PYQ: 'pyq',
  NOTES: 'notes',
  REVISION_SHEETS: 'revision_sheets',
  MCQ: 'mcq',
  FLASHCARDS: 'flashcards',
} as const;
```
2. **Routes:** Auth and redirect routes can be placed in `src/config/constants.ts` or left local.

## 10. Risk Assessment

- **Implementation Risk:** Low. Replacing literal strings with constant references is safe.
- **Regression Risk:** Low, but typos in the constant values could break PDF fetching or protected resource logic.
- **Supabase/API Risk:** High if `learning_resources` or column mappings are modified incorrectly. Keeping database identifiers local to the API mitigates this.
- **Testing Requirements:** Need to ensure all unit tests (e.g., `resourceHelper.test.ts`) are updated to use the constants or strictly assert the actual values.

## 11. Implementation Plan

1. **Create `src/config/constants.ts`**: Define `STORAGE_BUCKETS` and `RESOURCE_TYPES`.
2. **Update `src/utils/resourceHelper.ts`**: Replace `'pdfs'` and `'pyq'` with the respective constants.
3. **Update `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts`**: Replace `'notes'` with `RESOURCE_TYPES.NOTES`.
4. **Update `src/config/resources.ts`**: Refactor `RESOURCE_CATEGORIES` keys to use `RESOURCE_TYPES` values if possible, ensuring consistency.
5. **Update Test Files**: Refactor `resourceHelper.test.ts` to reflect the centralized constants.
6. **Leave API Layer Untouched**: Keep `learningResourcesAPI.ts` and `types/index.ts` as the primary source of truth for database columns and schemas.

---

### Final Answers to Specific Questions

1. **How many genuine magic-string problems remain?**
   Very few. The codebase is already quite healthy. The main ones are `'pdfs'`, `'pyq'`, and `'notes'` inside runtime conditional checks.
2. **Where is `learning_resources` currently used?**
   In `learningResourcesAPI.ts` and `types/index.ts`. It is well-confined.
3. **Where are `pyq` and `notes` currently used?**
   In `src/config/resources.ts`, `resourceHelper.ts`, `usePdfProgress.ts`, and test files.
4. **Which identifiers genuinely deserve centralization?**
   The storage bucket (`'pdfs'`) and runtime validations for resource types.
5. **Which should remain local?**
   Database table names, database column names, and generic UI text.
6. **Which should become TypeScript types/unions instead?**
   `ResourceType` is already a union! We need the runtime equivalent (a const object) to avoid string hardcoding in logic checks.
7. **Does the current ResourcePage architecture already solve part of the problem?**
   Yes. The `ResourcePageConfig` handles category filtering, preventing `'pyq'` and `'notes'` from infecting React UI components.
8. **Where should the constants live?**
   In a new `src/config/constants.ts` file, keeping it alongside existing configurations.
9. **What is the smallest safe implementation?**
   Adding just `STORAGE_BUCKETS` and `RESOURCE_TYPES` to `src/config/constants.ts`.
10. **Any Supabase/API regression risks?**
    Yes, which is why database identifiers (`learning_resources`, column names) must remain untouched. Altering them risks breaking `select()` queries and mapped types.
