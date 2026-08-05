1. **Update `src/types/index.ts`**
   - Add `allow_download?: boolean` to `Resource`.
   - Add `allow_download?: boolean | null` to `LearningResource`.
   - Add `allow_download?: boolean | null` to the `Insert` and `Update` types of `learning_resources` table.

2. **Create `src/utils/permissions.ts`**
   - Define a helper function:
     ```typescript
     import type { Resource } from '../types';
     export const canDownload = (resource: Pick<Resource, 'allow_download'>): boolean => {
       return resource.allow_download !== false;
     };
     ```
     (I will ensure `allow_download` handles PYQs correctly based on db state. If PYQs are true in db, then this works perfectly. I will make `canDownload` solely return `resource.allow_download !== false`).

3. **Verify Permissions Helper Creation**
   - Read the file `src/utils/permissions.ts` to confirm the permission helper was created correctly.

4. **Update Data Fetching Maps**
   - Update `src/pages/resources/StudyNotes.tsx` to map `allow_download: item.allow_download`.
   - Update `src/pages/resources/PdfViewer.tsx` to map `allow_download: data.allow_download` and `allow_download: item.allow_download` (for suggested).
   - Update `src/pages/resources/Library.tsx` to map `allow_download: item.allow_download`.
   - Update `src/pages/resources/ResourceDetails.tsx` to map `allow_download: data.allow_download` and `allow_download: item.allow_download` (for related).

5. **Update Dashboard.tsx if Needed**
   - Check and update `src/pages/user/Dashboard.tsx` to map `allow_download` if it maps learning resources to `Resource`.

6. **Update `src/components/MaterialCard.tsx`**
   - Import `canDownload`.
   - Wrap the Download button:
     `{resource.pdfUrl && canDownload(resource) && ( ... )}`

7. **Update `src/pages/resources/PdfViewer.tsx`**
   - Import `canDownload`.
   - Wrap the Download button inside the three-dots menu with `{canDownload(resource) && ( <button ... > )}`

8. **Protect Download Utility**
   - In `src/utils/download.ts`, rename or update `handleDownload` to `downloadResource(resource, e?)`.
   - Before proceeding with the blob download, exit immediately if `!canDownload(resource)`.

9. **Verify System Integrity**
   - Run `npm run build` and `npm run lint` to ensure no TypeScript errors and regressions are introduced.

10. **Complete Pre Commit Steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
