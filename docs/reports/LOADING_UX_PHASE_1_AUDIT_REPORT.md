# Horizon Loading UX — Phase 1: Read-Only Architecture Audit Report

## 1. Architecture Summary

Horizon is a client-side rendered Single Page Application built on React 19 and Vite, using `react-router-dom` v7 (`^7.18.0`) for client routing.

* **Routing & Component Layout:**
  - `BrowserRouter` handles client-side routing in `src/App.tsx`.
  - Non-lazy components in the initial JavaScript bundle include `Home` (`/`), `Onboarding` (`/onboarding`), `ScrollToTop`, `AuthListener`, and `AdminRoute`.
  - Heavy feature pages (`Library`, `StudyNotes`, `ResourceDetails`, `Dashboard`, `NotificationSettings`, `SyllabusPage`, `AdminNotifications`, `PdfViewer`) are lazy-loaded via `lazyWithRetry()` (`src/utils/lazyWithRetry.ts`).
  - Route nesting uses `MainLayout` (`src/layouts/MainLayout.tsx`) as the primary container shell, rendering child routes via `<Outlet />`.

* **Suspense & Fallback Boundaries:**
  1. **Standalone Outer Suspense Boundaries (`src/App.tsx`):**
     - `/onboarding`: Wrapped in `<Suspense fallback={<PageLoader />}>`.
     - `MainLayout` shell (`/` child routes): Wrapped in `<Suspense fallback={<PageLoader />}>`.
     - `/view/:id` (PDF Viewer): Wrapped in `<Suspense fallback={<RenderingScreen />}>`.
  2. **Internal Nested Suspense Boundary (`src/layouts/MainLayout.tsx`):**
     - `<Suspense fallback={<DelayedPageLoader />}>` wraps `<Outlet />` inside `MainLayout`.
     - `DelayedPageLoader` invokes `useDelayedLoading(true, 400)` to delay displaying `PageLoader` for 400ms.
  3. **Page-Level Internal Suspense Boundaries:**
     - `SyllabusPage` (`src/pages/syllabus/SyllabusPage.tsx`) wraps the heavy flowchart in `<Suspense fallback={<SyllabusSkeleton />}>`.

* **Data-Loading & Auth Mechanics:**
  - `AuthContext` (`src/context/AuthContext.tsx`) initializes Supabase auth asynchronously on app mount. `loading: boolean` starts as `true` and turns `false` after session and profile resolution.
  - Category and resource detail pages (`ResourcePage.tsx`, `ResourceDetails.tsx`, `SyllabusPage.tsx`) perform local async `useEffect` data fetching after mount, managing local `loading` state flags.

---

## 2. Loading Inventory

| Component / File | Visual Manifestation | Trigger Condition | Scope & Replacement Type | Behavioral Impact & User Perception |
| :--- | :--- | :--- | :--- | :--- |
| **`DelayedPageLoader`**<br/>`src/layouts/MainLayout.tsx` | Standard `PageLoader` (centered card + `Spinner` + "LOADING...") | Triggered during route lazy-chunk download if chunk takes > 400ms inside `MainLayout`'s `<Suspense>`. | Replaces `<Outlet />` content entirely. | During the first 400ms, it returns `null`. Inside Suspense, returning `null` unmounts the current page immediately, freezing the viewport on blank background until chunk downloads. If > 400ms, replaces viewport with full `PageLoader` card. |
| **`PageLoader`**<br/>`src/components/loading/PageLoader.tsx` | Centered Neumorphic Card with large pink `Spinner` & "LOADING..." | Outer Suspense fallbacks in `App.tsx` for `/onboarding` and initial `MainLayout` download; also rendered in `Onboarding.tsx` when `loading === true`. | Replaces full page viewport. | High visual emphasis. Necessary for initial dynamic JS chunk fetch, but visually disruptive if shown briefly. |
| **`MaterialCardSkeleton`**<br/>`src/components/MaterialCardSkeleton.tsx` | Grid of 8 animated pulse skeletons (`neu-recessed animate-pulse`) | Rendered in `ResourcePage.tsx` (`/library` and `/notes`) while `loading === true` during Supabase PostgREST query. | Occupies the resource card grid region within the page layout shell. | Excellent context-aware skeleton. Header, back button, and category dropdown filters remain interactive. |
| **`ResourceDetails` Spinner**<br/>`src/pages/resources/ResourceDetails.tsx` | Centered card + `Spinner` + "LOADING EDUCATIONAL LANDING PAGE..." | Rendered when `loading === true` during resource metadata query, guarded by `useDelayedLoading(loading, 200)`. | Replaces entire page layout inside `ResourceDetails`. | Replaces full detail page shell. Returns `null` for first 200ms, leaving screen visually unchanged before suddenly flashing a loading card if fetch exceeds 200ms. |
| **`RenderingScreen`**<br/>`src/components/RenderingScreen/RenderingScreen.tsx` | Canvas 3D dot grid, page flip stack, heading & progress bar | Route fallback for `/view/:id` in `App.tsx` AND inline state in `PdfViewer.tsx` while fetching ArrayBuffer bytes. | Full viewport overlay. | Necessary full-page progress indicator for heavy 2MB–10MB PDF download and WASM rendering pipeline. Features smooth 350ms ready hold and 250ms fade transitions. |
| **`SyllabusSkeleton`**<br/>`src/pages/syllabus/components/SyllabusSkeleton.tsx` | Animated pulse flowchart card skeletons | Rendered in `SyllabusPage.tsx` while fetching syllabus hierarchy data from Supabase or loading `SyllabusFlowchart` chunk. | Replaces flowchart region below header controls. | Excellent local skeleton. Header buttons and profile controls remain visible and functional. |
| **Submit Button Spinners**<br/>`Login.tsx`, `Register.tsx`, `Home.tsx` | Inline SVG spinner inside CTA submit button | Form submission (`loading === true`). | Non-blocking inline element inside submit button (`aria-busy="true"`). | Ideal progress feedback for mutation operations. Preserves button dimension and disables repeat clicks. |

---

## 3. Root-Cause Findings

### A. Why Unnecessary Indicators & Flashes Appear During Brief Navigation
1. **Full Page Replacement in `ResourceDetails.tsx` (`/resource/:id`):**
   When navigating from `/library` or `/notes` to a resource detail page (`/resource/:id`), `ResourceDetails.tsx` starts with `loading: true`. Its render logic states:
   ```tsx
   if (loading) {
     if (!showLoading) return null;
     return <PageLoaderCard />;
   }
   ```
   Because it returns `null` for the first 200ms (`useDelayedLoading(loading, 200)`), the page content vanishes immediately, displaying a blank main body before popping up a loading card if network latency touches 200ms.

2. **Suspense Unmounting in `MainLayout.tsx`:**
   `MainLayout.tsx` wraps its `<Outlet />` in `<Suspense fallback={<DelayedPageLoader />}>`.
   `DelayedPageLoader` uses `useDelayedLoading(true, 400)`.
   When a user clicks a route link to an un-cached or chunk-loading route:
   - React activates Suspense fallback `<DelayedPageLoader />`.
   - For 0 to 400ms, `useDelayedLoading` returns `false`, causing `DelayedPageLoader` to return `null`.
   - React Suspense unmounts the active route immediately when fallback returns `null`, causing the page body to disappear instantly and stay blank until the JS bundle arrives.

3. **Duplicated Auth Loading Waits (`AuthContext` coupling):**
   In `ResourcePage.tsx`, `useEffect` fetches resources only when `!authLoading`. If a student navigates to `/notes` before `AuthContext` finishes `getSession()` / `fetchProfile()`, `ResourcePage` stays in `loading: true` state indefinitely until `authLoading` turns `false`, unnecessarily coupling unauthenticated/public resource data fetching to auth initialization.

---

## 4. Regression Investigation (Previous Failed Attempt Analysis)

### Git History Evidence
- Commit `693cceb6fb` (*"feat: implement resilient lazy route loading and suppress spinner flash"*) introduced `useDelayedLoading` (default 250ms) and `lazyWithRetry`.
- `MainLayout.tsx` was configured with:
  ```tsx
  const DelayedPageLoader: React.FC = () => {
    const showLoading = useDelayedLoading(true, 400);
    if (!showLoading) return null;
    return <PageLoader />;
  };
  ```
- Subsequent commit `6fd9ca50` (*"fix: decouple route preloading from navigation"*) modified preloading behavior.

### Critical Technical Root Cause of Failure
The previous attempt failed **not because delaying indicators is fundamentally wrong, but because of how React Suspense handles `null` fallbacks:**

1. **React Suspense Contract:** When React enters Suspense during navigation, it immediately unmounts the previous children of the boundary and renders the `fallback` component.
2. **The `null` Fallback Flaw:** When `DelayedPageLoader` executed inside Suspense, `useDelayedLoading(true, 400)` returned `false` for 0–400ms. Consequently, `DelayedPageLoader` returned `null`.
3. **User Impact:** Returning `null` as a Suspense fallback causes React to unmount the active view immediately and render *nothing* on screen. The page appeared frozen, unresponsive, and blank.
4. **Race Condition & Lifecycle Interruption:** If the JS chunk loaded in 180ms (before 400ms expired), React resolved Suspense and mounted the new route component *while* timer state updates were scheduled. This triggered unexpected unmount/remount cycles, lost scroll positions, corrupted internal component states, and caused route transitions to "fumble".

---

## 5. Prioritized Recommendations

All proposed recommendations follow a strict minimal-risk, high-benefit order:

| Priority | Targeted Location | Action / Recommendation | Expected UX Benefit | Risk Profile |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | `src/layouts/MainLayout.tsx` | Replace `DelayedPageLoader` inside `<Suspense>` with a non-blank, top-level slim progress bar or standard non-delayed `PageLoader` fallback, OR adopt React 19 `useTransition` / standard navigation transitions where existing page stays mounted during route chunk fetching. | Eliminates blank screen unmounting and broken route transitions instantly. Previous page remains visible until new route chunk is ready. | Low |
| **P2** | `src/pages/resources/ResourceDetails.tsx` | Replace full-page blanking/spinner (`return null`) in `ResourceDetails.tsx` with a lightweight Neumorphic Page Skeleton shell that renders the back button, header controls, and skeleton content blocks immediately. | Detail page shell renders 0ms upon click; content populates smoothly when Supabase query returns. | Low |
| **P3** | `src/pages/home/Home.tsx` | Add explicit `onMouseEnter` / `onTouchStart` route chunk preloading on home page feature cards (`/syllabus`, `/library`, `/notes`). | Route JS chunks download in background before click occurs, making navigation instantaneous with zero Suspense fallback triggers. | Ultra Low |
| **P4** | `src/pages/resources/ResourcePage.tsx` | Decouple public PostgREST queries from `authLoading` state in `ResourcePage.tsx` so public study notes and PYQs fetch immediately on mount without waiting for auth session resolution. | Eliminates artificial ~100–300ms data-fetching delay for all students visiting `/notes` and `/library`. | Low |

---

## 6. Proposed File-Level Scope

The minimal set of files to be modified in Phase 2:

1. **`src/layouts/MainLayout.tsx`**: Update Suspense fallback handling to prevent `null` unmount blanking.
2. **`src/hooks/useDelayedLoading.ts`**: Safely remove or refactor hook usage so it is never used directly as a Suspense fallback.
3. **`src/pages/resources/ResourceDetails.tsx`**: Replace full-page loading spinner and 200ms `null` return with an immediate Neumorphic Detail Skeleton shell.
4. **`src/pages/home/Home.tsx`**: Ensure preloading hooks cover all feature routes (`/syllabus`, `/library`, `/notes`) on hover/touch.
5. **`src/pages/resources/ResourcePage.tsx`**: Remove unnecessary `authLoading` blocking guard on public resource requests.

---

## 7. Timing Recommendations

| Operation Type | Proposed Visual Behavior | Delay / Threshold | Rationale |
| :--- | :--- | :--- | :--- |
| **Internal Route Navigation** | Retain current page view (or render destination layout skeleton immediately) | **0 ms** (Instant shell) | Navigating should never clear the screen to blank or show a full-screen spinner if chunk/data resolves under 300ms. |
| **Category Data Fetching** (`/notes`, `/library`) | Immediate category shell + `MaterialCardSkeleton` grid | **0 ms** (Skeleton grid) | Skeletons signal exact structure without layout shift. |
| **Resource Details Fetching** (`/resource/:id`) | Immediate Detail Skeleton shell | **0 ms** (Skeleton shell) | Replaces disruptive full-card "LOADING..." message with instant header/metadata layout structure. |
| **Standalone PDF File Fetching** (`/view/:id`) | Immediate `RenderingScreen` canvas animation | **0 ms** (Progressive) | Heavy ArrayBuffer downloads (2MB–10MB) require explicit progress percentage feedback (`role="progressbar"`). |
| **Form Submissions & Auth** | Inline button spinner + `aria-busy="true"` | **0 ms** (Immediate) | Immediate feedback prevents double submissions and confirms user input. |

---

## 8. Security Assessment

All proposed UX improvements strictly observe Horizon security boundaries:

- **No Change to Protected PDF Access:** `/view/:id` and signed ArrayBuffer URL fetching via `resource-access` Edge Function remain 100% protected. Pre-rendering destination page shells or skeletons does not expose protected PDF bytes or signed storage tokens.
- **No Change to Auth & Role Guarding:** `AdminRoute` (`src/components/AdminRoute.tsx`) and `AuthContext` continue to enforce authoritative server-validated session rules before displaying sensitive user profiles or admin tools.
- **Data Mutation Integrity:** Form submission button disabling (`disabled={loading}`) and `aria-busy` feedback remain untouched.

---

## 9. Verification Plan

### Test Scenarios
1. **Home Page → Feature Page:** Tap Syllabus, Study Notes, and PYQ cards from Home. Confirm 0ms lag, no full-page spinner flash, no blank unmounts.
2. **Feature Page → Feature Page:** Navigate from `/notes` to `/library` and `/syllabus`. Confirm existing layout or skeleton renders cleanly without screen blanking.
3. **Browser Back / Forward:** Test forward and backward navigation across all routes. Confirm route rendering settles reliably without getting stuck or frozen.
4. **Direct URL Access & Refresh:** Open `/notes/class-10/science`, `/resource/123`, and `/view/123` directly in fresh tabs. Confirm proper loading and skeleton states.
5. **Repeated Rapid Taps:** Rapidly tap feature cards and back buttons. Confirm no race conditions, stale state updates, or navigation deadlocks.
6. **Network Throttling (Fast 3G & Slow 3G):** Verify that fast connections (0–150ms) show smooth, seamless transitions without spinner flashes, while slow connections cleanly display skeletons.
7. **Failed & Rejected Requests:** Simulate 500 error or offline state during resource fetching. Confirm clear error fallback banners with retry buttons appear.
8. **Viewports:** Test on 360px mobile viewport and 1440px desktop viewport.
9. **Animation-Aware Transitions:** Verify transitions where data/chunk readiness occurs before, during, and after 3D unfold reveal or unroll animations.

### Testing Limitations & Automated Verification
- *Environment Limitation Note:* `node_modules` is not pre-installed in this read-only container, and package installation is omitted in compliance with Phase 1 Audit instructions.
- *Verification Procedure for Phase 2:* Playwright end-to-end tests and Vitest unit tests will be executed in Phase 2 once approved.

---

## 10. Approval Checklist

### Required Architectural Fixes (Phase 2 Core Scope)
- [ ] **Fix Suspense Fallback in `MainLayout.tsx`:** Remove `null`-returning `DelayedPageLoader` from Suspense fallback to eliminate blank screen route unmounting.
- [ ] **Add Detail Skeleton to `ResourceDetails.tsx`:** Replace full-screen loading card with an immediate Neumorphic Detail Skeleton shell.
- [ ] **Decouple Public Resource Querying in `ResourcePage.tsx`:** Remove `authLoading` dependency for public note and PYQ fetching.
- [ ] **Expand Preloading on Home Page (`Home.tsx`):** Ensure hover/touch preloading applies to all primary feature routes.

---

## 11. Page Animation & Loading Coordination Audit

The following detailed audit covers the 5 specified page areas, examining their existing animation mechanisms, readiness criteria, indicator overlaps, desired behaviors, and safe implementation options.

---

### Page Area 1: Syllabus Landing Page (`/syllabus`)

1. **Existing Animation Mechanism & Verified Duration:**
   - **Component:** `SyllabusLanding.tsx`
   - **Mechanism:** Driven by `useUnfoldReveal` (`src/hooks/useUnfoldReveal.ts`) applying a 3D downward unfold reveal animation on mount (`perspective: 1400px`, `transform-origin: 50% 0%`, initial `rotateX(-22deg) translateY(-48px) scale(0.97)`).
   - **Duration & Timing:** `transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease-out`. Staggered via inline index delays: `Math.min(index * 120, 360)ms`. Max total animation window is **1.46s** (360ms max stagger + 1100ms transform). On completion, `onTransitionEnd` resets `will-change` to `auto`. Respects `@media (prefers-reduced-motion: reduce)`.

2. **Readiness Determination:**
   - Static class metadata (`SUPPORTED_CLASSES`) renders **0ms synchronously**.
   - Class-level chapter counts fetch asynchronously via `fetchSyllabusChapterCounts()`.

3. **Indicator Overlap Analysis:**
   - `SyllabusLanding` renders class cards immediately on mount. While `countsLoading === true`, individual class badges render a subtle `...` text placeholder *inside* card badges without unmounting or blocking the 3D unfold animation. No spinner overlap exists.

4. **Desired Behavior Matrix:**
   - **Fast (<150ms):** 3D unfold animation reveals class tiles smoothly; chapter count numbers populate seamlessly into badges during the unfold transition without any spinner or flash.
   - **Moderately Slow (150ms–800ms):** 3D unfold animation runs and settles; subtle badge placeholders (`...`) remain in place inside card badges until count data resolves, then update without layout shift.
   - **Genuinely Slow (>800ms / Timeout):** Badge placeholders remain intact; full page layout remains interactive so users can click any Class card immediately without waiting for chapter count badges.

5. **Smallest Safe Implementation Option & Risks:**
   - **Safe Option:** Keep existing architecture unchanged. Class cards render instantly; count badges update gracefully in-place.
   - **Regression Risk:** Zero risk.

---

### Page Area 2: Syllabus Class Subject Selector (`/syllabus/:classSlug`)

1. **Existing Animation Mechanism & Verified Duration:**
   - **Component:** `ClassSubjectSelector.tsx`
   - **Mechanism:** Driven by `useUnfoldReveal` (`src/hooks/useUnfoldReveal.ts`) applying a 3D downward unfold reveal animation on mount (`perspective: 1400px`, `transform-origin: 50% 0%`, initial `rotateX(-22deg) translateY(-48px) scale(0.97)`).
   - **Duration & Timing:** `transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease-out`. Staggered via inline index delays: `Math.min(index * 120, 360)ms`. Max total animation window: **1.46s**.

2. **Readiness Determination:**
   - **100% Synchronous Data:** Subject lists are derived locally via `getSubjectsForClass(classSlug)` from static configurations in `syllabusService.ts`. Destination is ready in **0ms**.

3. **Indicator Overlap Analysis:**
   - No loading indicators exist on this view.

4. **Desired Behavior Matrix:**
   - **Fast / Normal (0ms):** Unfolds 3D subject cards smoothly with zero delay, spinners, or skeletons.

5. **Smallest Safe Implementation Option & Risks:**
   - **Safe Option:** Maintain current synchronous rendering. Ensure route preloading on hover/touch makes transition instantaneous.
   - **Regression Risk:** Zero risk.

---

### Page Area 3: Syllabus Subject Flowchart (`/syllabus/:classSlug/:subjectSlug`)

1. **Existing Animation Mechanism & Verified Duration:**
   - **Component:** `SyllabusFlowchart.tsx` (rendered by `SyllabusPage.tsx`)
   - **Mechanisms:**
     - **Mount Unfold:** Chapter cards execute a 3D downward unfold reveal via `useUnfoldReveal` (`perspective: 1400px`, `transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)`).
     - **Subtopic Unroll:** Expanding chapter subtopics triggers a CSS 3D unroll animation stack (`--unroll-dur: 0.8s`, `--unroll-tilt: 70deg`, `--unroll-stagger: 70ms`).
   - **Total Animation Window:** **1.1s** for page mount unfold; **0.8s** per subtopic unroll.

2. **Readiness Determination:**
   - Destination is ready when `fetchSyllabusHierarchy(currentClassId, resolvedSubjectName)` PostgREST query resolves from Supabase.

3. **Indicator Overlap Analysis:**
   - While `loading === true`, `SyllabusPage.tsx` renders `SyllabusSkeleton` below the header controls.
   - Once data arrives, `SyllabusPage` mounts `SyllabusFlowchart`, which immediately triggers the 3D downward unfold animation. Currently, if data resolves in ~100ms, `SyllabusSkeleton` flashes briefly before swapping to `SyllabusFlowchart`.

4. **Desired Behavior Matrix:**
   - **Fast (<200ms):** If chunk and data arrive under 200ms, suppress `SyllabusSkeleton` flash and render `SyllabusFlowchart` directly into its mount 3D unfold animation.
   - **Moderately Slow (200ms–800ms):** Display `SyllabusSkeleton` below the persistent header controls; when data arrives, transition smoothly to `SyllabusFlowchart` 3D unfold.
   - **Genuinely Slow (>800ms) / Failure:** `SyllabusSkeleton` stays visible until fetch resolves or fails; if fetch fails, display accessible "Unable to Load Syllabus" error banner with explicit "Retry Loading" button.

5. **Smallest Safe Implementation Option & Risks:**
   - **Safe Option:** Preload `SyllabusFlowchart` dynamic import chunk on subject card hover/touch in `ClassSubjectSelector.tsx`. Keep `SyllabusSkeleton` constrained strictly below the header controls.
   - **Regression Risk:** Low.

---

### Page Area 4: Notes Feature Landing Page (`/notes`)

1. **Existing Animation Mechanism & Verified Duration:**
   - **Component:** `ResourcePage.tsx` (configured with `notesConfig`)
   - **Mechanism:** Driven by `useResourceUnfoldObserver` (`src/hooks/useResourceUnfoldObserver.ts`), creating a single `IntersectionObserver` per mount (threshold `0.12`, `rootMargin: "0px 0px -6% 0px"`).
   - **Duration & Timing:** Card tiles execute 3D downward unfold transitions (`transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)`) with 120ms step / 480ms capped stagger delays. Elements above the viewport settle immediately on load. Includes a 2.5s safety fallback timer.

2. **Readiness Determination:**
   - Destination page shell (header, back button, dropdown filter controls) is ready in **0ms**.
   - Card grid content is ready when `fetchLearningResources()` PostgREST query completes.

3. **Indicator Overlap Analysis:**
   - While `loading === true`, `ResourcePage` renders 8 `MaterialCardSkeleton` cards in the grid.
   - When query finishes, `loading` becomes `false`, replacing skeletons with `MaterialCard` items which then trigger `useResourceUnfoldObserver` unfold reveal.
   - *Issue Identified:* Query is currently blocked by `authLoading`, delaying fetch initiation by ~100–300ms.

4. **Desired Behavior Matrix:**
   - **Fast (<150ms):** Page layout shell renders in 0ms; public data query resolves almost instantly; card items mount and perform 3D unfold reveal without skeleton flash.
   - **Moderately Slow (150ms–800ms):** Page layout shell and category dropdown filters render immediately; card grid region displays 8 `MaterialCardSkeleton` items; when data returns, cards replace skeletons and unfold smoothly.
   - **Genuinely Slow (>800ms) / Failure:** Category filters remain fully interactive; skeleton cards pulse until data arrives; if query fails or returns empty, render "No Notes Available" empty state with "Clear Filters" button.

5. **Smallest Safe Implementation Option & Risks:**
   - **Safe Option:** Decouple public PostgREST query from `authLoading` in `ResourcePage.tsx` so fetch starts immediately on mount.
   - **Regression Risk:** Very low.

---

### Page Area 5: Previous Year Question Papers Landing Page (`/library`)

1. **Existing Animation Mechanism & Verified Duration:**
   - **Component:** `ResourcePage.tsx` (configured with `pyqConfig`)
   - **Mechanism:** Driven by `useResourceUnfoldObserver` (`src/hooks/useResourceUnfoldObserver.ts`), using `IntersectionObserver` to trigger 3D downward unfold transitions (`transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)`) with 120ms step / 480ms capped stagger delays and a 2.5s safety fallback.
   - **Duration:** **1.1s** transform duration + up to **480ms** stagger delay.

2. **Readiness Determination:**
   - Page shell (header, educational guide, dropdown filters) is ready in **0ms**.
   - Card grid content is ready when `fetchLearningResources()` PostgREST query completes.

3. **Indicator Overlap Analysis:**
   - Renders 8 `MaterialCardSkeleton` cards while `loading === true`.
   - Query is currently delayed by `authLoading`.

4. **Desired Behavior Matrix:**
   - **Fast (<150ms):** Page shell and educational guide render 0ms; PYQ card items mount and execute 3D unfold reveal without skeleton flash.
   - **Moderately Slow (150ms–800ms):** Page shell renders 0ms; 8 `MaterialCardSkeleton` items occupy grid region until query completes, then swap seamlessly to unfold cards.
   - **Genuinely Slow (>800ms) / Failure:** Header and filter dropdowns stay interactive; if query fails, display empty state card with filter reset CTA.

5. **Smallest Safe Implementation Option & Risks:**
   - **Safe Option:** Decouple public PYQ fetch from `authLoading` in `ResourcePage.tsx`. Preload `LibraryRoute` chunk on Home page feature card hover/touch.
   - **Regression Risk:** Very low.
