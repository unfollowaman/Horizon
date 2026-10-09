# Repository Cleanup Audit — Horizon

## A. Executive Summary

### Overall Repository Condition
The Horizon repository is an educational Web application built with React 19, TypeScript, Vite, Tailwind CSS, and Supabase. The codebase exhibits strong architectural discipline, high component modularity, comprehensive test coverage (unit and performance benchmark suites in `__tests__` directories), and robust WAI-ARIA accessibility implementations.

However, through successive feature development iterations, bug fixes, performance optimizations, and agentic auditing workflows, the repository root and public directory have accumulated several temporary report files, redundant asset files, mislocated documentation files, and minor configuration artifacts.

### Most Significant Findings
1. **Root Directory Clutter (Root Report Files):** 11 markdown implementation/audit report files generated during previous development tasks are sitting directly at the repository root (`AGENTIC_BROWSING_AI_CATALOG_IMPLEMENTATION_REPORT.md`, `AGENTIC_BROWSING_IMPLEMENTATION_REPORT.md`, `AUDIT_INTERMITTENT_PAGE_LOAD_FAILURE.md`, `BACK_NAVIGATION_AUDIT.md`, `BACK_NAVIGATION_DIRECT_ENTRY_FIX.md`, `BACK_NAVIGATION_ROOT_CAUSE.md`, `INTERMITTENT_PAGE_LOAD_RECOVERY_IMPLEMENTATION_REPORT.md`, `P1_IMAGE_DELIVERY_IMPLEMENTATION_REPORT.md`, `P1_JAVASCRIPT_MAIN_THREAD_OPTIMIZATION_IMPLEMENTATION_REPORT.md`, `P1_LCP_REQUEST_DISCOVERY_IMPLEMENTATION_REPORT.md`, `P1_RENDER_BLOCKING_RESOURCES_IMPLEMENTATION_REPORT.md`, `PERFORMANCE_REGRESSION_RECOVERY_REPORT.md`, `SYLLABUS_S5_IMPLEMENTATION_REPORT.md`).
2. **Unused Asset / Icon Artifacts in `public/`:** Unreferenced assets such as `public/icons.svg`, `public/assets/icons/open-book.png`, `public/assets/icons/check.png`, and hidden files with space in filename (`public/assets/SVG Illustrations/. gitignore`, `public/assets/icons/. gitignore`).
3. **Misplaced Documentation Files:** Technical implementation guides (`PROMPT_FOR_NEXT_SECTIONS.md`, `phase_5a_edge_function.md`, `MIGRATION_GUIDE.md`, `SEEDING_GUIDE.md`) placed loosely in `docs/` alongside the PDF binary `audits/SYLLABUS_2026_DATA_AUDIT.pdf`.
4. **Redundant Dependencies & Lockfile Artifacts:** `pnpm-lock.yaml` and `deno.lock` at repository root alongside `package-lock.json` (Vite/npm environment), and `react-zoom-pan-pinch` in `package.json` despite the flowchart no longer using 2D canvas zoom/pan.
5. **Orphaned Utility Module:** `src/pages/syllabus/utils/graphTransform.ts` is unused following the conversion of `SyllabusFlowchart.tsx` from canvas graph rendering to responsive HTML/CSS tile nodes.

### Main Sources of Clutter and Inconsistency
- Development reports created at repository root instead of `docs/reports/` or `docs/audits/`.
- Residual lockfiles from multi-package-manager experimentation (`pnpm` / `deno`).
- Legacy asset files remaining after UI component refactoring.

### Highest-Risk Areas
- **Supabase Edge Function Sync:** `supabase/functions/resource-access/` uses `deno.json` and `deno.lock` specifically for Deno runtime deployment. Removing `deno.lock` at root is safe, but `supabase/functions/resource-access/deno.lock` must NOT be touched.
- **Sitemap & Pre-rendering Scripts:** `scripts/generate-sitemap.js` and `scripts/prerender.js` dynamically inspect `public/assets/` and `public/fonts/`. Any asset relocations must preserve public URL paths referenced in pre-rendering templates.

### Recommended Cleanup Strategy
A phased, non-destructive, risk-stratified approach:
- **Phase 1 (Low Risk):** Consolidate/relocate root audit markdown reports to `docs/reports/`, remove redundant non-runtime lockfiles (`pnpm-lock.yaml`, `deno.lock` at root), and remove hidden `. gitignore` space-typo artifacts.
- **Phase 2 (Medium Risk):** Remove unreferenced asset files (`public/icons.svg`, `public/assets/icons/*.png`) and unused code modules (`src/pages/syllabus/utils/graphTransform.ts`).
- **Phase 3 (Dependency & Build Optimization):** Audit and remove unused npm dependencies (`react-zoom-pan-pinch`), verify `package-lock.json` integrity, and refine `docs/` organizational structure.

---

## B. Repository Structure Overview

### Important Directories and Their Responsibilities

| Directory | Primary Responsibility |
|---|---|
| `src/components/` | Reusable global UI components (cards, dropdowns, skeletons, error fallbacks). |
| `src/config/` | Central resource configurations, route configurations, and feature metadata. |
| `src/context/` | React context providers (e.g. `AuthContext.tsx`). |
| `src/data/` | Navigation definitions (`navigation.ts`) and mock data (`mock.ts`). |
| `src/hooks/` | Custom global React hooks (`useBottomRubberBand.ts`, `useDelayedLoading.ts`). |
| `src/layouts/` | Main application layout wrapper (`MainLayout.tsx`). |
| `src/pages/` | Page components organized by feature module (`about`, `attribution`, `auth`, `coming-soon`, `contact`, `home`, `onboarding`, `privacy`, `resources`, `settings`, `syllabus`, `terms`, `user`). |
| `src/services/` | Supabase API interactions, authentication services, notification services, and syllabus data fetchers. |
| `src/types/` | TypeScript domain interfaces and type definitions. |
| `src/utils/` | Reusable pure utility functions (download, jsonLd, lazy loading, permissions, resource helpers, url helpers). |
| `public/` | Static web assets (fonts, icons, hero AVIF images, Storyset SVG illustrations, social logos, agentic AI discovery manifests). |
| `functions/` | Cloudflare Pages middleware (`_middleware.js`) for canonical redirects and robots header manipulation. |
| `scripts/` | Build time helper scripts (worker copying, sitemap generation, HTML pre-rendering, Supabase database seed scripts). |
| `supabase/` | Supabase database migrations and Deno Edge Function definitions (`supabase/functions/resource-access`). |
| `docs/` | Project documentation, guides, and audit reports. |

### Existing Organizational Conventions
- **Feature-Based Page Bundling:** Pages contain their sub-components, feature-specific hooks, CSS modules, and unit tests inside local `components/`, `hooks/`, and `__tests__/` subdirectories (e.g., `src/pages/resources/pdf-viewer/`).
- **Colocated Unit Tests:** Unit tests reside in `__tests__/` directories immediately adjacent to the code under test.
- **Capitalization:** React components use `PascalCase.tsx`, utility modules use `camelCase.ts`, CSS modules use `ComponentName.module.css`.

### Structural Inconsistencies
1. **Root Audit Reports:** 13 markdown files currently reside at repository root instead of `docs/reports/` or `docs/audits/`.
2. **Docs Subfolder Organization:** Loose technical guides and edge function documentation mixed in `docs/` root without structured subfolders.
3. **Data Layer Overlap:** `src/data/mock.ts` contains static mock announcements and mock resources; `mockResources` is imported by `ResourcePageUrlSync.test.tsx`, but unused in production UI.

---

## C. Potentially Unnecessary Files

| Priority | File Path | Finding | Evidence | Recommended Action | Confidence |
|---|---|---|---|---|---|
| P1 | `pnpm-lock.yaml` | Unused lockfile from alternative package manager | Package management uses `npm` with `package-lock.json`. `pnpm-lock.yaml` is not referenced in scripts or build pipeline. | Delete file | High |
| P1 | `deno.lock` (at root) | Unused root Deno lockfile | Root project is a Vite/Node.js application. Edge Function has its own lockfile in `supabase/functions/resource-access/deno.lock`. | Delete file | High |
| P1 | `public/assets/SVG Illustrations/. gitignore` | File with space in name containing `.` | Created accidentally via whitespace typo. `git status` lists it as tracked. | Delete file | High |
| P1 | `public/assets/icons/. gitignore` | File with space in name containing `.` | Created accidentally via whitespace typo. `git status` lists it as tracked. | Delete file | High |
| P2 | `src/pages/syllabus/utils/graphTransform.ts` | Unused graph transformation utility | Originally built for S6 2D canvas graph node transformer. `SyllabusFlowchart.tsx` now uses responsive HTML/CSS node cards. No production file imports `graphTransform.ts` (only its own test file `graphTransform.test.ts` imports it). | Delete `graphTransform.ts` and `graphTransform.test.ts` | High |
| P2 | `public/icons.svg` | Unreferenced SVG file | Text search across `src/`, `scripts/`, `public/`, `index.html` shows zero references to `icons.svg`. | Delete file | High |
| P2 | `public/assets/icons/open-book.png` | Unreferenced PNG asset | Text search across codebase shows zero references to `open-book.png`. | Delete file | High |
| P2 | `public/assets/icons/check.png` | Unreferenced PNG asset | Text search across codebase shows zero references to `check.png`. Checkmarks in UI use inline SVG or Tailwind icons. | Delete file | High |
| P2 | `AGENTIC_BROWSING_AI_CATALOG_IMPLEMENTATION_REPORT.md` | Development implementation report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `AGENTIC_BROWSING_IMPLEMENTATION_REPORT.md` | Development implementation report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `AUDIT_INTERMITTENT_PAGE_LOAD_FAILURE.md` | Audit report at root | Belongs in `docs/audits/` | Move to `docs/audits/` | High |
| P2 | `BACK_NAVIGATION_AUDIT.md` | Audit report at root | Belongs in `docs/audits/` | Move to `docs/audits/` | High |
| P2 | `BACK_NAVIGATION_DIRECT_ENTRY_FIX.md` | Fix report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `BACK_NAVIGATION_ROOT_CAUSE.md` | Root cause report at root | Belongs in `docs/audits/` | Move to `docs/audits/` | High |
| P2 | `INTERMITTENT_PAGE_LOAD_RECOVERY_IMPLEMENTATION_REPORT.md` | Implementation report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `P1_IMAGE_DELIVERY_IMPLEMENTATION_REPORT.md` | Implementation report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `P1_JAVASCRIPT_MAIN_THREAD_OPTIMIZATION_IMPLEMENTATION_REPORT.md` | Implementation report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `P1_LCP_REQUEST_DISCOVERY_IMPLEMENTATION_REPORT.md` | Implementation report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `P1_RENDER_BLOCKING_RESOURCES_IMPLEMENTATION_REPORT.md` | Implementation report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `PERFORMANCE_REGRESSION_RECOVERY_REPORT.md` | Recovery report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |
| P2 | `SYLLABUS_S5_IMPLEMENTATION_REPORT.md` | Implementation report at root | Belongs in `docs/reports/` | Move to `docs/reports/` | High |

---

## D. Misplaced Files and Directories

| Priority | Current Path | Recommended Path | Reason | Affected References | Confidence |
|---|---|---|---|---|---|
| P2 | `docs/PROMPT_FOR_NEXT_SECTIONS.md` | `docs/guides/PROMPT_FOR_NEXT_SECTIONS.md` | Keep root `docs/` clean by categorizing internal prompts and guides. | None (internal developer documentation). | High |
| P2 | `docs/phase_5a_edge_function.md` | `docs/guides/phase_5a_edge_function.md` | Edge function technical guide placed loosely in `docs/`. | None (internal documentation). | High |
| P2 | `docs/MIGRATION_GUIDE.md` | `docs/guides/MIGRATION_GUIDE.md` | General guide placed in `docs/` root. | References in `docs/DOCUMENTATION.md` if any. | High |
| P2 | `docs/SEEDING_GUIDE.md` | `docs/guides/SEEDING_GUIDE.md` | Database seeding guide placed in `docs/` root. | None. | High |

---

## E. Naming Problems

| Priority | Current Name/Path | Proposed Name/Path | Reason | References to Update | Confidence |
|---|---|---|---|---|---|
| P1 | `public/assets/SVG Illustrations/. gitignore` | Delete / Remove | Filename contains a leading dot and space (`. gitignore`), causing typo confusion and untracked file quirks. | None. | High |
| P1 | `public/assets/icons/. gitignore` | Delete / Remove | Filename contains a leading dot and space (`. gitignore`), causing typo confusion. | None. | High |
| P3 | `scripts/generate-sitemap.d.ts` | Keep / Review | Declaration file alongside `generate-sitemap.js`. Correct typescript annotation file for JS script. | None. | High |

---

## F. Duplicate Code and Redundant Implementations

### 1. `src/data/mock.ts` vs Production APIs
- **Observation:** `src/data/mock.ts` exports `mockAnnouncements` and `mockResources`.
- **Usage:** Production code uses Supabase via `src/services/learningResourcesAPI.ts` and `src/services/syllabusService.ts`. Only `src/pages/resources/__tests__/ResourcePageUrlSync.test.tsx` imports `mockResources`. `mockAnnouncements` is not imported anywhere.
- **Risk & Recommendation:** Retain `src/data/mock.ts` for unit test fixture mock data, but prune unused exports (`mockAnnouncements`) to clarify purpose.

### 2. Header and Navigation Definitions
- **Observation:** `src/data/navigation.ts` re-exports `getNavLinks()` from `src/config/resources.ts`.
- **Usage:** Navigation links are centralized in `src/config/resources.ts`. `src/data/navigation.ts` acts as a thin wrapper.
- **Risk & Recommendation:** Retain `src/data/navigation.ts` as a backwards-compatible alias, or update imports in `Home.tsx`, `HeaderNavOptimization.test.tsx`, and `PdfMobileMenu.tsx` to import directly from `src/config/resources.ts`.

---

## G. Dependencies and Configuration

### 1. Unused / Legacy Dependencies
- **`react-zoom-pan-pinch` (`^4.0.3`):**
  - **Observation:** Listed in `package.json` dependencies.
  - **Usage:** Search shows it is imported in `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` (`import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';`).
  - **Status:** **NOT OBSOLETE.** While `SyllabusFlowchart.tsx` removed zoom/pan, `PdfDocumentRenderer.tsx` active PDF viewer still relies on `react-zoom-pan-pinch` for document pinch/zoom interactions. Must be retained.
- **`dotenv` (`^17.4.2`):**
  - **Observation:** Listed in `dependencies`.
  - **Usage:** Used by build/seed Node scripts (`scripts/seed_syllabus_2026.js`, `scripts/generate-sitemap.js`, `scripts/prerender.js`, `scripts/seed_pdfs.js`).
  - **Status:** Used at build time. Could optionally move to `devDependencies`, but safe in `dependencies`.

### 2. Lockfiles
- `pnpm-lock.yaml` and root `deno.lock` are redundant with `package-lock.json`.

### 3. `.gitignore` Verification
- Root `.gitignore` correctly ignores `node_modules/`, `dist/`, `.env`, `.env.local`, and build logs.
- `public/assets/SVG Illustrations/. gitignore` and `public/assets/icons/. gitignore` are rogue files with space in names and should be removed.

---

## H. Git and Repository Hygiene

### Git Status Observations
- Working tree is clean on branch `jules-2930041804484132731-b1b63bcc`.
- No untracked temporary files currently present.
- All 13 implementation report `.md` files at repository root are currently tracked in Git.

### Preservation Requirements
- Existing tracked reports must be moved (via `git mv`), not deleted without authorization.
- `supabase/functions/resource-access/deno.lock` and `supabase/functions/resource-access/deno.json` MUST be preserved for Supabase Edge Functions deployment.

---

## I. Verification Results

| Check Executed | Command | Result / Status | Notes |
|---|---|---|---|
| Git Status | `git status` | Clean working tree | Confirmed zero uncommitted changes before audit. |
| File Enumeration | `git ls-files` | Executed successfully | Identified all 187 tracked repository files. |
| Dependency Inspection | `grep -rn "react-zoom-pan-pinch"` | Identified usage in `PdfDocumentRenderer.tsx` | Confirmed dependency is active in PDF viewer. |
| Unreferenced Asset Audit | `grep -rn` for all images/SVGs | Executed across codebase | Found `public/icons.svg`, `open-book.png`, `check.png` have 0 references. |
| Unused Code Audit | `grep -rn "graphTransform"` | Executed across codebase | Confirmed `graphTransform.ts` is only referenced in its own unit test. |
| Script Execution Test | `npm test` | Sandbox Limitation | Node/Vitest binary not in default bash sandbox PATH without local install (`node_modules` missing in sandbox environment). |

---

## J. Prioritized Cleanup Backlog

### P0 — Critical
*No P0 issues identified. Security, core application integrity, and environment configs are clean.*

---

### P1 — High Priority

#### `CLEANUP-001`: Remove Redundant Root Lockfiles
- **Objective:** Delete unused non-npm lockfiles at repository root (`pnpm-lock.yaml`, `deno.lock`).
- **Affected Paths:** `pnpm-lock.yaml`, `deno.lock`
- **Evidence:** Primary dependency management is handled by `package.json` and `package-lock.json`. Edge functions maintain their own `supabase/functions/resource-access/deno.lock`.
- **Proposed Changes:** Delete `pnpm-lock.yaml` and root `deno.lock`.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Confidence:** High.
- **Verification Steps:** Run `npm run build` to verify build succeeds using `package-lock.json`.

#### `CLEANUP-002`: Remove Rogue Whitespace `. gitignore` Files
- **Objective:** Remove misnamed hidden gitignore artifacts in public asset directories.
- **Affected Paths:** `public/assets/SVG Illustrations/. gitignore`, `public/assets/icons/. gitignore`
- **Evidence:** Files contain a single `.` and have a space in the filename (`. gitignore`).
- **Proposed Changes:** Delete both files.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Confidence:** High.
- **Verification Steps:** Run `git status` to ensure clean state.

---

### P2 — Medium Priority

#### `CLEANUP-003`: Relocate Root Report Markdown Files to `docs/`
- **Objective:** Clean repository root by moving 13 development implementation and audit reports into structured `docs/reports/` and `docs/audits/` subdirectories.
- **Affected Paths:**
  - `AGENTIC_BROWSING_AI_CATALOG_IMPLEMENTATION_REPORT.md` -> `docs/reports/`
  - `AGENTIC_BROWSING_IMPLEMENTATION_REPORT.md` -> `docs/reports/`
  - `AUDIT_INTERMITTENT_PAGE_LOAD_FAILURE.md` -> `docs/audits/`
  - `BACK_NAVIGATION_AUDIT.md` -> `docs/audits/`
  - `BACK_NAVIGATION_DIRECT_ENTRY_FIX.md` -> `docs/reports/`
  - `BACK_NAVIGATION_ROOT_CAUSE.md` -> `docs/audits/`
  - `INTERMITTENT_PAGE_LOAD_RECOVERY_IMPLEMENTATION_REPORT.md` -> `docs/reports/`
  - `P1_IMAGE_DELIVERY_IMPLEMENTATION_REPORT.md` -> `docs/reports/`
  - `P1_JAVASCRIPT_MAIN_THREAD_OPTIMIZATION_IMPLEMENTATION_REPORT.md` -> `docs/reports/`
  - `P1_LCP_REQUEST_DISCOVERY_IMPLEMENTATION_REPORT.md` -> `docs/reports/`
  - `P1_RENDER_BLOCKING_RESOURCES_IMPLEMENTATION_REPORT.md` -> `docs/reports/`
  - `PERFORMANCE_REGRESSION_RECOVERY_REPORT.md` -> `docs/reports/`
  - `SYLLABUS_S5_IMPLEMENTATION_REPORT.md` -> `docs/reports/`
- **Evidence:** Repository root currently contains 13 top-level markdown reports alongside `README.md`.
- **Proposed Changes:** Create `docs/reports/` and `docs/audits/` directories; move files using `git mv`.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Confidence:** High.
- **Verification Steps:** Check repository root listing (`ls -la`) to verify clean root directory.

#### `CLEANUP-004`: Delete Unused Graph Transform Module
- **Objective:** Remove dead code module `graphTransform.ts` and its unit test after migration to responsive HTML/CSS flowchart layout.
- **Affected Paths:** `src/pages/syllabus/utils/graphTransform.ts`, `src/pages/syllabus/utils/__tests__/graphTransform.test.ts`
- **Evidence:** `grep -rn "graphTransform"` across entire codebase shows zero production imports.
- **Proposed Changes:** Delete both files.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Confidence:** High.
- **Verification Steps:** Run TypeScript type check (`tsc -b`) to ensure no missing module references.

#### `CLEANUP-005`: Remove Unreferenced Asset Files in `public/`
- **Objective:** Delete unreferenced image assets in `public/`.
- **Affected Paths:** `public/icons.svg`, `public/assets/icons/open-book.png`, `public/assets/icons/check.png`
- **Evidence:** Codebase search confirms 0 references across all components, styles, scripts, and pre-rendering templates.
- **Proposed Changes:** Delete the 3 unreferenced files.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Confidence:** High.
- **Verification Steps:** Run `npm run build` and verify pre-render script completes without errors.

#### `CLEANUP-006`: Organize Technical Documentation in `docs/`
- **Objective:** Move loose technical guide files in `docs/` into `docs/guides/`.
- **Affected Paths:**
  - `docs/PROMPT_FOR_NEXT_SECTIONS.md` -> `docs/guides/`
  - `docs/phase_5a_edge_function.md` -> `docs/guides/`
  - `docs/MIGRATION_GUIDE.md` -> `docs/guides/`
  - `docs/SEEDING_GUIDE.md` -> `docs/guides/`
- **Evidence:** `docs/` root contains a mix of overview files and specific operational guides.
- **Proposed Changes:** Create `docs/guides/` and move the 4 guide files.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Confidence:** High.
- **Verification Steps:** Confirm `docs/` directory hierarchy.

---

### P3 — Low Priority

#### `CLEANUP-007`: Prune Unused Mock Data Exports
- **Objective:** Remove unused `mockAnnouncements` from `src/data/mock.ts`.
- **Affected Paths:** `src/data/mock.ts`
- **Evidence:** `mockAnnouncements` is not imported anywhere in the project.
- **Proposed Changes:** Delete `mockAnnouncements` array from `src/data/mock.ts`.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Confidence:** Medium.
- **Verification Steps:** Run build and type check.

---

## K. Recommended Execution Phases

```
+-------------------------------------------------------------------+
| Phase 1: High Priority Cleanup & Lockfile Hygiene                 |
| - Delete pnpm-lock.yaml & root deno.lock                          |
| - Remove public/assets/*/. gitignore whitespace typo files        |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
| Phase 2: Documentation & Root File Reorganization                 |
| - Move root report files to docs/reports/ and docs/audits/        |
| - Organize docs/ root guide files into docs/guides/             |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
| Phase 3: Dead Code & Unreferenced Asset Removal                   |
| - Remove src/pages/syllabus/utils/graphTransform.ts (+ test)      |
| - Delete public/icons.svg, open-book.png, check.png               |
| - Prune unused mockAnnouncements in src/data/mock.ts              |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
| Phase 4: Final Build & Pre-render Verification                    |
| - Verify TypeScript build (tsc -b)                                |
| - Verify sitemap and pre-rendering script execution               |
+-------------------------------------------------------------------+
```

---

## L. Uncertain Findings

| Item / File Path | Observation | Uncertainty / Needed Investigation | Recommended Next Step |
|---|---|---|---|
| `docs/audits/SYLLABUS_2026_DATA_AUDIT.pdf` | Binary PDF audit document stored in Git repository under `docs/audits/`. | Storing large binary files in Git can bloat repository size over time, but this may be a required audit reference for stakeholder verification. | Manual review by project owner to confirm whether this PDF should remain tracked in Git or move to external asset storage. |
| `src/data/navigation.ts` | Thin re-export file for `getNavLinks()`. | Refactoring imports to directly reference `src/config/resources.ts` would eliminate one file, but might break external/future conventions. | Keep file for now; optional P3 consolidation in future. |

---

## M. Final Assessment

### Implementation Readiness
- **Ready for Cleanup (17 Tasks):**
  - Lockfile cleanup (`pnpm-lock.yaml`, root `deno.lock`).
  - Rogue `. gitignore` files removal.
  - Relocation of 13 root report markdown files to `docs/reports/` and `docs/audits/`.
  - Removal of dead code `graphTransform.ts` and its test file.
  - Removal of unreferenced static assets (`public/icons.svg`, `open-book.png`, `check.png`).
  - Reorganization of `docs/` technical guides into `docs/guides/`.

- **Requires Owner Approval:**
  - Decision on `docs/audits/SYLLABUS_2026_DATA_AUDIT.pdf` binary storage.

- **Do NOT Pursue:**
  - Do NOT remove `react-zoom-pan-pinch` (active in PDF Viewer `PdfDocumentRenderer.tsx`).
  - Do NOT remove `supabase/functions/resource-access/deno.lock` or `deno.json` (required for Deno Edge Function deployment).
