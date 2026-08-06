1. **Update `src/types/index.ts`**
   - Add `storage_bucket: string;` to `Resource` interface.
   - Add `storage_bucket: string;` to `LearningResource` type.
   - Add `storage_bucket?: string;` to `Insert` and `Update` types under `learning_resources` in the `Database` interface.
   - Verify changes with `read_file`.

2. **Create Centralized Storage Helper (`src/utils/storage.ts`)**
   - Create a file with a `getStorageUrl` function that takes a `resource` object or bucket/path, returning the correct public URL.
   - Use `supabase.storage.from(resource.storage_bucket).getPublicUrl(...)`.

3. **Verify Centralized Storage Helper**
   - Run `read_file` to confirm that `src/utils/storage.ts` was created successfully and contains the correct logic.

4. **Refactor Resource Fetching to Use Helper**
   - Update `src/pages/resources/Library.tsx`
   - Update `src/pages/resources/StudyNotes.tsx`
   - Update `src/pages/resources/ResourceDetails.tsx`
   - Update `src/pages/resources/PdfViewer.tsx`
   - Import `getStorageUrl` and pass the storage_bucket.
   - Verify changes using `cat` or `grep`.

5. **Update Mock Data (`src/data/mock.ts`)**
   - Add `storage_bucket: 'pdfs'` to each mock resource to satisfy the updated `Resource` interface.
   - Verify changes using `cat` or `grep`.

6. **Refactor `scripts/seed_pdfs.js`**
   - Update `seed_pdfs.js` to define `const bucketName = 'pdfs';` at the top and replace `from('pdfs')` with `from(bucketName)`.
   - Verify changes using `cat`.

7. **Ensure no hardcoded `from('pdfs')` remains in codebase.**
   - Run `grep -rnw . -e "from('pdfs')" -e 'from("pdfs")'` to confirm all hardcoded strings have been removed from the application.

8. **Regression Verification**
   - Execute `npm run build` and `npm run lint` to confirm no regressions were introduced.

9. **Pre-commit Steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

10. **Submit Changes**
   - Push branch and create PR if needed.
