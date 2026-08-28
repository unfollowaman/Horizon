# Task Prompt: Standardizing and Optimizing Loading, Skeleton, and Rendering Screens

## Context & Baseline Audit
In the previous audit session, we completed a full review of all 8 loading screens, skeleton components, wheel spinners, and rendering overlays across the Horizon codebase. High-resolution screenshot artifacts and an audit guide were placed under `docs/screenshots/` and `docs/screenshots/LOADING_SCREENS_AUDIT.md`.

The user has approved all proposed optimization recommendations across 3 specific categories:
1. **Category 1 (Fast-Load / Debounce):** Eliminate UI flickering for fast/cached data responses by delaying loading indicators.
2. **Category 2 (Sequential Merging):** Consolidate multi-stage loading sequences into single unified layout skeletons.
3. **Category 3 (Outright Elimination):** Remove unstyled/superfluous text fallbacks.

---

## Objective
Implement all approved loading screen standardizations, skeleton consolidations, debouncing logic, and aesthetic unification across the Horizon platform.

---

## Detailed Task Breakdown & Instructions

### 1. Category 1: Debounce Fast Loading Screens (Prevent UI Flicker)
* **`ResourceDetails` (`src/pages/resources/ResourceDetails.tsx`):**
  - Implement a ~200ms–250ms debounce before displaying the full loading card state when fetching chapter/resource metadata, OR replace the full loading screen with inline pulse placeholders matching the two-column editorial layout so content displays instantly.
* **Global Route Suspense `PageLoader` (`src/components/loading/PageLoader.tsx` & `src/layouts/MainLayout.tsx`):**
  - Wrap the `PageLoader` fallback in a delayed rendering component (e.g., `useDelayedSpinner(250)`) so fast client-side route transitions (where chunks are already cached) do not flash the spinner card.

### 2. Category 2: Consolidate Sequential Loading Chains into Unified Skeletons
* **PDF Viewer Viewer Route (`/view/:id` in `src/pages/resources/PdfViewer.tsx`):**
  - Submerge the 3-stage loading sequence (`PdfViewerSkeleton` -> `PdfLoadingScreen` dot grid -> `PdfDocumentRenderer` inline skeleton) into a single unified `PdfViewerSkeleton`.
  - The single skeleton should render the full viewer shell (top header bar and main document card area) continuously while dynamic imports, Supabase signed URLs, and PDF.js binary parsing complete.
  - Integrate the rendering progress indicator directly inside the document canvas skeleton rather than replacing the top control bar.
* **PDF Document Renderer Page Skeleton (`src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx`):**
  - Replace raw Tailwind gray boxes (`bg-gray-200`) with neumorphic recessed design tokens (`neu-recessed`) for complete visual consistency with the design system.
* **User Dashboard (`src/pages/user/Dashboard.tsx`):**
  - Submerge the two-stage loading sequence (Page spinner -> Recessed progress text box) into a unified Dashboard layout skeleton.
  - Render the main layout shell immediately with pulsing skeleton placeholders for user greeting, stat cards, and study progress blocks.

### 3. Category 3: Outright Elimination & Visual Unification
* **Onboarding Loading Fallback (`src/pages/onboarding/Onboarding.tsx`):**
  - Remove the unstyled plain text fallback (`<div ...>Loading...</div>`).
  - Replace it with `PageLoader` or render the onboarding selection card shell in a skeleton state.
* **Spinner Component Standardization:**
  - Create a reusable, standardized neumorphic loading spinner component (e.g. `src/components/loading/Spinner.tsx`) and replace scattered inline wheel spinners across `PageLoader.tsx`, `ResourceDetails.tsx`, and `Dashboard.tsx` to ensure unified color, stroke width, and animation tokens.

---

## Verification & Pre-Commit Requirements
1. Run `npm test` to ensure all existing unit tests pass cleanly without regression.
2. Verify visual rendering of updated skeleton components and debounced route transitions.
3. Run `frontend_verification_instructions` and take Playwright screenshots/videos of updated loading states.
4. Execute `pre_commit_instructions` before submitting the PR.
