# Horizon — Error Boundary Architecture Audit Report

**Date:** March 2025
**Scope:** Production Stability & Error Isolation Audit
**Status:** Audit Complete — No source code changes were made during this audit task.

---

## 1. Executive Summary

A comprehensive audit of the Horizon web application codebase was conducted to evaluate its current error boundary architecture, fault containment capabilities, and crash resilience.

**Key Findings:**
1. **Zero React Error Boundaries Exist:** The codebase currently contains **0** React Error Boundaries (`componentDidCatch` / `getDerivedStateFromError` or `react-error-boundary` dependencies). React Router route-level `errorElement` properties are also omitted across all routes in `src/App.tsx`.
2. **High Vulnerability to Catastrophic Crashes:** Because React 16+ unmounts the entire component tree when an unhandled error occurs during rendering or lifecycle execution, any uncaught component/render exception (such as a null property access in dynamic data, unexpected PDF canvas rendering exception, or third-party hook crash) causes a **complete application crash (blank white screen)** for the user.
3. **Robust Handled Data & API Error States:** Expected asynchronous operational failures—such as network disconnects, Supabase query errors, authentication status missing, or HTTP 401/403/404 responses—are already well-handled via local component state (`pdfError`, `error` state flags, loading spinners, and styled neumorphic fallback views).
4. **Targeted Strategic Recommendation:** Rather than overengineering with redundant boundaries around every component, Horizon requires a **minimal 3-tier boundary strategy** (Root Level, Route Content Level, and PDF Document Renderer Level) to ensure maximum fault isolation and zero blank screen crashes with minimal architecture overhead.

---

## 2. Current Error Handling Architecture

The application handles operational/asynchronous errors well at the data fetching layer, but lacks structural React render crash protection:

* **React Entry & Setup:** `src/main.tsx` renders `<App />` directly inside `<StrictMode>` into `document.getElementById('root')`.
* **Routing:** `src/App.tsx` uses standard React Router (`BrowserRouter`, `Routes`, `Route`). Lazy-loaded routes are wrapped in `<Suspense fallback={<PageLoader />}>` or rely on `<MainLayout />` for lazy loading boundaries.
* **Layout Isolation:** `<MainLayout />` wraps most primary routes (`/library`, `/notes`, `/dashboard`, `/resource/:id`, `/login`, etc.) and renders `<Suspense fallback={<PageLoader />}><Outlet /></Suspense>`. However, React `<Suspense>` catches only pending promises during code-splitting loading; it does **NOT** catch JavaScript runtime errors thrown during rendering.
* **Operational/Data Fetching Error Handling:**
  * **Supabase API Service Calls (`src/services/learningResourcesAPI.ts`, `auth.ts`):** Operations return `{ data, error }` objects or catch errors with `try/catch` blocks, preventing raw promise rejections.
  * **PDF Viewer Logic (`src/pages/resources/PdfViewer.tsx`):** Handled auth errors (HTTP 401), authorization errors (HTTP 403), missing resources (HTTP 404), and canvas source loading failures (`onDocumentLoadError`, `onDocumentSourceError`) render styled Neumorphic fallback cards.
  * **Resource Browsing (`src/pages/resources/ResourcePage.tsx`):** Network errors during resource fetching gracefully fall back to an empty resources array and display a "No content available" illustration card.

---

## 3. Existing Error Boundaries

A repository-wide inspection was conducted using keyword searches for `ErrorBoundary`, `componentDidCatch`, `getDerivedStateFromError`, `react-error-boundary`, `onError`, and `errorElement`.

| Found Mechanism | File Location | Subtree Protected | Errors Caught | Fallback UI | Recovery | Active in Prod | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *None* | N/A | None | None | None | None | No | **Non-existent** |

*Note: Neither `package.json` nor any application source file contains error boundary classes, error boundary wrappers, or React Router `errorElement` properties.*

---

## 4. Coverage Map

The following map illustrates the current protection status across the component hierarchy:

```text
React Root (src/main.tsx) [UNPROTECTED - P0 Vulnerability]
└── AuthProvider / BrowserRouter (src/App.tsx) [UNPROTECTED]
    ├── Standalone Route: /onboarding [UNPROTECTED]
    ├── Standalone Route: / (Home) [UNPROTECTED]
    ├── MainLayout Routes (src/layouts/MainLayout.tsx) [UNPROTECTED - P1 Vulnerability]
    │   ├── Header / Footer Navigation
    │   └── Route Content (<Outlet />)
    │       ├── /library (LibraryRoute -> ResourcePage) [UNPROTECTED]
    │       ├── /notes (StudyNotesRoute -> ResourcePage) [UNPROTECTED]
    │       ├── /resource/:id (ResourceDetails) [UNPROTECTED]
    │       ├── /dashboard (Dashboard) [UNPROTECTED]
    │       ├── /settings/notifications (NotificationSettings) [UNPROTECTED]
    │       ├── /login & /register [UNPROTECTED]
    │       └── Static Pages (/about, /privacy-policy, /attribution) [UNPROTECTED]
    ├── Standalone Route: /view/:id (PdfViewer) [UNPROTECTED - P1 Vulnerability]
    │   ├── PdfTopControls & PdfMobileMenu
    │   └── PdfDocumentRenderer [UNPROTECTED - Third-Party Canvas/PDF Crash Zone]
    └── Catch-all Route: 404 Page [UNPROTECTED]
```

---

## 5. Crash-Sensitive Areas

The following application areas are particularly vulnerable to unexpected render/runtime exceptions:

1. **`PdfDocumentRenderer` (`react-pdf` & `react-zoom-pan-pinch`):**
   * **Vulnerability:** WebGL/Canvas context loss, corrupted PDF bytecode stream rendering, or unexpected event callbacks in `react-zoom-pan-pinch` can throw synchronous errors inside React lifecycle hooks or render methods.
   * **Impact:** Unmounts the entire React tree, taking down the viewer and preventing the user from clicking "Go Back" or navigating away.

2. **`ResourcePage` (`src/pages/resources/ResourcePage.tsx`):**
   * **Vulnerability:** Sorting/filtering logic operating on heterogeneous resource metadata (e.g. `parseInt` regex matching on `student_class`, null `subject`, or custom third-filter logic in `config.filterByThirdFilter`).
   * **Impact:** Unhandled render error on filter change crashes the page completely.

3. **`Dashboard` (`src/pages/user/Dashboard.tsx`):**
   * **Vulnerability:** Complex data mapping over profile completion states, bookmark lists, and progress ratios (`fetchSyllabusChapters`).
   * **Impact:** Corrupted or malformed backend user profile payload can crash the user dashboard view.

4. **`HeroPhoneAnimation` (`src/pages/home/HeroPhoneAnimation.tsx`):**
   * **Vulnerability:** Asset preloading or timer loops executing during mount/unmount transitions.
   * **Impact:** Synchronous rendering exception in the hero graphic crashes the home page.

---

## 6. Root-Level Resilience

**Current Status:** **Unresilient.**

* **Question:** Can one unexpected React rendering error take down the entire application?
* **Answer:** **Yes.** Because there is no root-level error boundary surrounding `<App />` or `<BrowserRouter>`, any uncaught React rendering error anywhere in any component unmounts the root DOM node (`#root`), leaving a completely blank page with no UI, header, navigation, or recovery mechanism.
* **Recommendation:** A lightweight, user-friendly **Root Error Boundary** wrapping the router or entire application is strictly required for production readiness.

---

## 7. Route-Level Resilience

**Current Status:** **Unisolated.**

* **Question:** Does a crash on `/library` or `/dashboard` prevent unrelated routes (`/about`, `/notes`, `/login`) from functioning?
* **Answer:** **Yes.** Currently, if `/library` crashes while rendering a card, the entire application DOM is destroyed. The user cannot use the header/footer navigation to switch to `/about` or `/login` without a manual browser URL bar refresh.
* **Recommendation:** Wrapping the `<Outlet />` inside `MainLayout.tsx` with a **Page/Route Error Boundary** ensures that if a page component crashes during render:
  1. The top header, mobile menu, and footer remain intact and functional.
  2. A localized error card ("Unable to load this page") displays inside the main layout content area with a "Try Again" or "Go Home" button.
  3. The user can seamlessly click navigation links to access other pages without needing a full browser reload.

---

## 8. PDF Viewer Assessment

The PDF Viewer (`src/pages/resources/PdfViewer.tsx`) is one of the most feature-rich views in Horizon.

### Operational/Data Error Handling (Existing & Sufficient)
* **Auth / Access Control Errors (`401_UNAUTHORIZED`, `403_FORBIDDEN`):** Properly captured by `usePdfData` hook and rendered as styled Neumorphic card views with "Log in" or "Go Back" buttons.
* **Missing Resource (`404`):** Handled with a "Resource not found" card.
* **PDF Load Retry:** `onDocumentLoadError` and `onDocumentSourceError` trigger signed URL re-fetching for protected resources.

### React Render-Boundary Deficiencies (Missing)
* **Third-Party Canvas Render Crashes:** If `react-pdf` (`<Document>` or `<Page>`) or `TransformWrapper` (`react-zoom-pan-pinch`) throws a synchronous exception during DOM canvas mounting or gesture pinch-zoom calculation, it bypasses `onDocumentLoadError` and crashes the entire React application.
* **Recommendation:** Place a dedicated feature boundary around `PdfDocumentRenderer` (or inside `PdfViewer`). If document rendering fails catastrophically at the React level, the floating top controls ("Back", "Title") remain interactive, and a localized retry card replaces the canvas area.

---

## 9. Recommended Boundaries

To achieve **maximum fault isolation with minimum architectural complexity**, we recommend exactly **3 strategic boundaries**:

| Priority | Location | Reason | Failure Scope | Recommended Fallback | Recovery | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P0** | **Root Level** (`src/main.tsx` or wrapping `<BrowserRouter>` in `App.tsx`) | Catch catastrophic application-wide render exceptions that escape all sub-boundaries. | Entire Application | Clean Neumorphic screen: "Something went wrong" with application logo. | "Reload Page" button (`window.location.reload()`). | **Low** |
| **P1** | **Route Content Level** (`src/layouts/MainLayout.tsx` wrapping `<Outlet />`) | Isolate individual page render crashes so header/footer navigation remains functional. | Single Page Content Area | In-layout Neumorphic card: "Failed to load page content". | "Retry Page" button (resetting boundary state) or "Go Home" navigation link. | **Low** |
| **P1** | **PDF Canvas Level** (`src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` or `PdfViewer.tsx`) | Isolate third-party canvas or zoom/pan library crashes while keeping PDF viewer controls active. | PDF Canvas Viewport | In-viewport card: "Unable to display PDF document". | "Retry PDF" button & active top back-navigation control. | **Low** |

---

## 10. What Should NOT Be Changed

To prevent overengineering and code churn, the following mechanisms should remain **unchanged**:

1. **Existing Asynchronous API Error Handling:** Keep `try/catch` blocks and `{ data, error }` return types in `src/services/learningResourcesAPI.ts` and `src/services/auth.ts`. Do not replace API error handling with React Error Boundaries.
2. **Existing PDF Viewer Auth/Access State Views:** Keep conditional state rendering in `PdfViewer.tsx` for `401_UNAUTHORIZED`, `403_FORBIDDEN`, and missing resource screens.
3. **Existing Form Validation & Local Error States:** Keep inline form error strings (e.g. login/register validation, newsletter submission errors).
4. **Individual Small UI Components:** Do **NOT** wrap every `MaterialCard`, `Dropdown`, `ProfilePopover`, or button in an `ErrorBoundary`. Their internal rendering is straightforward and wrapping them individually creates unnecessary boilerplate.

---

## 11. Testing Strategy

When implementation takes place, the boundaries should be validated using non-destructive, safe testing methodologies:

1. **Development Test-Only Trigger Component:**
   * Create a temporary test component `<ThrowError message="Test Crash" />` that throws `new Error()` during render.
2. **Root Boundary Validation:**
   * Temporarily place `<ThrowError />` inside `App.tsx` outside routes to verify the global fallback screen renders cleanly with the reload button.
3. **Route Boundary Validation:**
   * Temporarily place `<ThrowError />` inside `LibraryRoute.tsx` or `Dashboard.tsx`.
   * Verify that the header and footer remain rendered and interactive, and that clicking "Home" or "Notes" in the navigation successfully navigates away without requiring a page reload.
4. **PDF Viewer Boundary Validation:**
   * Temporarily place `<ThrowError />` inside `PdfDocumentRenderer.tsx`.
   * Verify top navigation bar remains functional and the canvas area displays the isolated PDF fallback card.

---

## 12. Recommended Implementation Order

To implement crash isolation safely without regression risk, follow this order:

1. **Step 1: Create Reusable `ErrorBoundary` Component:**
   * Implement a standard, flexible class-based `ErrorBoundary` (or introduce `react-error-boundary` if preferred, though a custom 30-line class component eliminates external dependencies).
   * Include props for custom `fallback` rendering and `onReset` callbacks.
2. **Step 2: Add Root-Level Error Boundary (`P0`):**
   * Wrap `<App />` in `src/main.tsx` or `<BrowserRouter>` in `src/App.tsx`.
3. **Step 3: Add Route Content Error Boundary (`P1`):**
   * Wrap `<Outlet />` inside `src/layouts/MainLayout.tsx`.
4. **Step 4: Add PDF Viewer Document Renderer Error Boundary (`P1`):**
   * Wrap `<PdfDocumentRenderer />` inside `src/pages/resources/PdfViewer.tsx`.
5. **Step 5: Verification:**
   * Test each boundary using the testing strategy described above and remove any test-only error triggers.

---

## 13. Final Recommendation

* **Do we need a root boundary?** **Yes.** It is critical to eliminate white-screen application crashes in production.
* **Do we need route-level boundaries?** **Yes.** Placing a single boundary around `<Outlet />` inside `MainLayout.tsx` provides immense resilience by keeping site navigation fully usable during page crashes.
* **Do we need a PDF-specific boundary?** **Yes.** Third-party canvas and zoom rendering in `PdfDocumentRenderer` present unique crash risks that should be isolated from viewer controls.
* **Do we need additional component-level boundaries?** **No.** Wrapping individual small UI components is unnecessary and overengineered.
* **What is the minimum implementation that meaningfully improves resilience?**
  **Exactly 3 boundaries:**
  1) Root boundary (`App.tsx`)
  2) Main layout content boundary (`MainLayout.tsx`)
  3) PDF canvas boundary (`PdfViewer.tsx`)

This 3-tier structure guarantees **100% crash containment** across the entire application with minimal architectural footprint.
