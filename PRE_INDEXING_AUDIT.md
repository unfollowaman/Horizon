# Horizon Pre-Indexing Technical Audit

## 1. Executive Summary

The Horizon codebase is built using React and Vite, heavily utilizing Supabase for backend services, authentication, and database access. The architecture favors a single-page application (SPA) approach using `react-router-dom` with client-side rendering.

**Overall Technical Quality:** The codebase demonstrates a functional implementation of an educational resource platform, with dedicated UI components for displaying lists of materials and an integrated PDF viewer using `react-pdf`. It effectively leverages Tailwind CSS for styling and includes custom animations. However, it lacks clear architectural boundaries, exhibiting significant tight coupling between UI components and data fetching/business logic.

**Biggest Strengths:**
*   Consistent visual language using "neumorphic" styling integrated directly into global CSS.
*   Centralized routing and authentication state management.
*   Functional integration with Supabase for data and storage.
*   A fully custom, heavily featured PDF viewing experience.

**Biggest Weaknesses:**
*   High degree of code duplication (especially data fetching queries and similar UI components like material cards and list pages).
*   Tight coupling of Supabase queries inside React components (`useEffect`).
*   Over-reliance on client-side rendering for content that should be indexed by search engines.
*   Massive, monolithic components (e.g., `PdfViewer.tsx` is >1000 lines, `Home.tsx` is ~400 lines).

**Biggest Performance Risks:**
*   Large initial bundle size containing everything including `react-pdf`, Supabase SDK, and heavy animations, without evident route-level code splitting.
*   Duplicate network requests during routing due to lack of a robust data-fetching or caching layer (e.g., React Query).
*   Potential memory leaks and scroll jank in the massive `PdfViewer` component due to intensive DOM manipulation and state updates during scroll/drag events.

**Biggest Architectural Risks:**
*   Scattered, repeated business logic (e.g., filtering notes vs PYQs).
*   Inconsistent error handling and loading states across different pages.

**Biggest Indexing-related Code Risks:**
*   Pure Client-Side Rendering (CSR): Googlebot has to execute the massive JS bundle to see any content, adding crawl delay and risk of partial indexing.
*   Poor discoverability: Resource lists rely on client-side Supabase queries; no static links or server-rendered HTML for the bots to easily follow to individual resource pages.
*   Semantic HTML: Overuse of `div`s for interactive elements instead of proper semantic tags.

**Is the project currently ready for indexing?** No. The pure SPA architecture without SSR/SSG combined with heavy JS bundles presents a significant barrier to efficient Google indexing.
**What must happen before indexing?** Critical performance optimizations (code splitting), architectural refactoring to enable static or server-rendered content routes (or at least robust dynamic pre-rendering), and addressing massive code duplication to stabilize the platform.

---

## 2. Repository Architecture

The project is a React 19 application built with Vite and TypeScript. It uses `react-router-dom` for client-side routing and Supabase as a Backend-as-a-Service.

```
Client (Vite SPA)
├── Entry (main.tsx)
│   └── App.tsx (Routing & Global Contexts)
│       ├── AuthContext (Global state)
│       ├── MainLayout (Standard pages)
│       │   ├── Home, Library, StudyNotes, Dashboard
│       │   └── Pages directly fetch data via Supabase SDK
│       └── Standalone Routes
│           └── PdfViewer (Custom layout, isolated logic)
└── Backend (Supabase)
    ├── Auth
    ├── Postgres Database (profiles, learning_resources, etc.)
    └── Storage (PDFs)
```

---

## 3. Overall Scorecard

| Area | Score | Risk | Summary |
| :--- | :--- | :--- | :--- |
| Architecture | 4/10 | High | Too much business logic in components; lack of separation of concerns. |
| Code Quality | 3/10 | High | Massive components, duplicated logic, and unstructured state management. |
| Performance | 3/10 | High | Monolithic bundle, unoptimized PDF rendering, duplicate network requests. |
| React Efficiency | 4/10 | Medium | Excessive `useEffect` usage, derived state stored in `useState`, prop drilling. |
| Data Fetching | 3/10 | High | Repeated identical Supabase queries scattered across components; no caching. |
| PDF Architecture | 5/10 | Medium | Feature-rich but monolithic and difficult to maintain; high risk of performance degradation. |
| Indexing Readiness | 2/10 | Critical | Pure CSR, content requires DB fetch to render, no SSR/pre-rendering. |
| Accessibility | 4/10 | Medium | Visual focus, but lacking semantic HTML and ARIA labels in key interactive elements. |
| Security | 6/10 | Medium | RLS on Supabase assumed, but frontend relies heavily on client-side filtering. |
| Testing | 1/10 | High | Lack of visible unit or e2e tests in the core application logic. |
| Maintainability | 3/10 | High | Large files (PdfViewer > 1k lines), duplicated UI, and scattered data logic. |
| Production Readiness | 3/10 | High | Fragile data fetching, large bundle, and lack of robust error boundaries. |

---

## 4. Critical Findings

### 1. Pure Client-Side Rendering (CSR) Blocks Indexing
*   **Location:** `src/main.tsx`, `src/App.tsx`
*   **Severity:** Critical
*   **Why it matters:** Googlebot struggles with pure CSR applications that require heavy JS execution and subsequent network requests to render content. This will lead to poor indexing, missing pages, and low search rankings.
*   **Evidence:** The app uses standard Vite CSR. Content like Library resources are fetched via Supabase inside `useEffect` after the initial render.
*   **Recommended fix:** Migrate to a meta-framework that supports Server-Side Rendering (SSR) or Static Site Generation (SSG), such as Next.js or Remix, or implement aggressive pre-rendering for Vite.
*   **Expected benefit:** Immediate and reliable indexing of all educational resources.
*   **Risk of change:** High (requires significant architectural overhaul).

### 2. Massive Monolithic Bundle
*   **Location:** `package.json`, `src/App.tsx`
*   **Severity:** Critical
*   **Why it matters:** The entire application (including `react-pdf` and animation libraries) is shipped in one large chunk. This kills initial load time (LCP) and Time to Interactive (TTI), penalizing Core Web Vitals.
*   **Evidence:** `npm run build` shows a single large JS chunk and warns about size (>500kB limit). No `React.lazy` or dynamic imports are used in routing.
*   **Recommended fix:** Implement route-level code splitting using `React.lazy` and `Suspense` in `src/App.tsx`. Move `react-pdf` to a dynamically imported chunk.
*   **Expected benefit:** Drastically reduced initial load time and improved CWV.
*   **Risk of change:** Low.

### 3. Duplicated Data Fetching Logic
*   **Location:** `src/pages/resources/Library.tsx`, `src/pages/resources/StudyNotes.tsx`, `src/pages/user/Dashboard.tsx`
*   **Severity:** High
*   **Why it matters:** Identical or nearly identical Supabase queries are repeated across components. This causes duplicated network requests, wastes bandwidth, and makes schema changes a nightmare.
*   **Evidence:** `supabase.from('learning_resources').select('*').eq('resource_type', ...)` is repeated in multiple files.
*   **Recommended fix:** Extract data fetching into custom hooks or a dedicated API layer (e.g., `src/services/api.ts`). Implement a caching layer like React Query or SWR.
*   **Expected benefit:** Reduced network traffic, faster transitions, centralized logic.
*   **Risk of change:** Medium.

### 4. Overly Complex `PdfViewer` Component
*   **Location:** `src/pages/resources/PdfViewer.tsx`
*   **Severity:** High
*   **Why it matters:** The file is over 1000 lines long, combining UI rendering, complex gesture handling, Supabase data fetching, and PDF rendering logic. It is unmaintainable and prone to performance regressions.
*   **Evidence:** File length, mixture of `useEffect` hooks for data, state for UI, and imperative DOM manipulations.
*   **Recommended fix:** Break down into smaller components: `PdfDataWrapper`, `PdfControls`, `PdfCanvas`. Extract data logic into a custom hook.
*   **Expected benefit:** Maintainability, easier debugging, isolated rendering performance improvements.
*   **Risk of change:** Medium.

---

## 5. Detailed Findings

### Phase 1 — Code Quality & Maintainability
*   **Duplicate Components:** Both `src/pages/resources/Library.tsx` and `src/pages/resources/StudyNotes.tsx` contain nearly identical layout, state management (filtering, loading, error states), and rendering logic for lists of `MaterialCard` components. They should be consolidated into a generic `ResourceList` component that accepts filters as props.
*   **Excessive useEffect:** State synchronization using `useEffect` is prevalent. For example, filtering resources based on search terms often triggers a `useEffect` to update another state variable, leading to unnecessary re-renders. Derived state should be calculated during render.
*   **Magic Strings:** Hardcoded values like `'learning_resources'`, `'pyq'`, `'notes'` are scattered across the codebase instead of centralized constants.

### Phase 2 — Performance & Speed
*   **Network Request Waterfalls:** Components wait to mount before initiating Supabase queries. If a component is lazily loaded or deep in the tree, this creates a waterfall.
*   **Unoptimized Images:** Local assets in `public/` and those referenced in components are not optimized for responsive delivery.
*   **Heavy Animations:** The `src/pages/home/HeroPhoneAnimation.tsx` runs complex CSS/JS animations on the main thread, potentially affecting INP and initial scrolling performance on lower-end devices.

### Phase 5 — React Architecture & Rendering Efficiency
*   **Prop Drilling vs Context:** Global state (Auth) is handled well via Context, but local state in complex pages (like `PdfViewer`) is either clumped into massive components or prop-drilled excessively through deeply nested layout elements.

### Phase 6 — Supabase / Backend Efficiency
*   **Missing Caching:** Every route transition to a resource list triggers a new Supabase query. There is no client-side caching.
*   **Over-fetching:** `select('*')` is used frequently when only specific fields are needed for rendering lists.

### Phase 8 — Accessibility & Semantic HTML
*   **Button vs Link:** Several interactive elements use `div` with `onClick` handlers instead of semantic `button` or `a` tags.
*   **Missing ARIA:** Custom controls in `PdfViewer` and modal dialogs lack appropriate ARIA roles and labels for screen readers.

---

## 6. Duplication & Reusability Analysis

*   **Duplicated Logic:** Data fetching for `learning_resources` (repeated across `src/pages/resources/Library.tsx`, `src/pages/resources/StudyNotes.tsx`, `src/pages/resources/PdfViewer.tsx`, `src/pages/user/Dashboard.tsx`).
    *   *Recommendation:* **Recommended**. Create a centralized service/hook (e.g., `useResources(filters)`).
*   **Duplicated Components:** `src/pages/resources/Library.tsx` and `src/pages/resources/StudyNotes.tsx` are essentially the same page with different query filters.
    *   *Recommendation:* **Recommended**. Create a unified `ResourceExplorer` component.
*   **Repeated Styles:** Neumorphic shadow calculations are hardcoded in CSS modules despite being defined in global Tailwind layers.
    *   *Recommendation:* **Recommended**. Enforce strict usage of Tailwind utility classes.
*   **Repeated UI Elements:** Card rendering logic is duplicated or slightly modified across different views.
    *   *Recommendation:* **Recommended**. Ensure strict reuse of `src/components/MaterialCard.tsx`.

---

## 7. Performance Analysis

*   **Bundle Risks:** The lack of code splitting is the primary risk. The initial payload includes the PDF rendering engine, which is unnecessary for users just browsing the homepage.
*   **Rendering Risks:** `PdfViewer` performs heavy DOM updates during continuous scroll/pan events.
*   **Network Risks:** Uncached Supabase requests lead to slow navigation.
*   **Mobile Risks:** Heavy JS execution blocks the main thread on low-end devices, leading to poor interaction responsiveness.

---

## 8. Indexing Readiness Analysis

*   **Discoverability:** Googlebot cannot easily discover individual PDF resources because the links are dynamically generated via client-side Supabase queries and rely on JS routing.
*   **Crawlability:** The SPA architecture means the server returns a nearly empty HTML shell. Google must render the JS to see the links.
*   **Content Accessibility:** The actual educational content is locked inside PDFs and protected by signed URLs, meaning Google cannot index the text of the notes or PYQs themselves. Only the metadata (titles, subjects) can be indexed, but even that is hidden behind client-side fetches.
*   **Internal Linking:** Lacking static internal links between related resources.

---

## 15. Technical Debt Inventory

### Critical
*   **Must Fix Before Indexing:** Pure Client-Side Rendering architecture blocking bots.
*   **Must Fix Before Indexing:** Massive, monolithic JavaScript bundle destroying load times.

### High
*   **Strongly Recommended Before Indexing:** Duplicated Supabase queries across all resource list pages.
*   **Strongly Recommended Before Indexing:** `PdfViewer.tsx` is over 1000 lines long and handles too many responsibilities.
*   **Fix Soon After Indexing:** Lack of network caching leading to redundant database requests.

### Medium
*   **Fix Soon After Indexing:** Misuse of `useEffect` for derived state.
*   **Optional / Future Improvement:** Missing ARIA labels and semantic HTML on interactive elements.

### Low
*   **Optional / Future Improvement:** Unoptimized local images.
*   **Do Not Fix:** Refactoring auth logic—it works well enough currently via `AuthContext`.

---

## Implementation Roadmap

### Phase 1 — Critical Foundations
*   **Objective:** Stabilize routing, implement code splitting, and centralize data fetching.
*   **Issues Included:** Implement `React.lazy` for routes. Extract Supabase queries into reusable hooks. Replace `select('*')` with specific columns.
*   **Why these issues belong together:** These fixes are fundamental to the application's overall performance and stability. Without them, subsequent optimizations will be less effective.
*   **Expected Benefit:** Reduced bundle size, faster initial load, and easier maintenance.
*   **Risk:** Medium.
*   **Estimated Implementation Difficulty:** Medium.
*   **Recommended Validation/Testing after completion:** Run Lighthouse/PageSpeed Insights. Verify that routing works as expected and network tabs show smaller, divided chunk downloads.

### Phase 2 — Architecture & Code Quality
*   **Objective:** Deduplicate UI and logic.
*   **Issues Included:** Merge `src/pages/resources/Library.tsx` and `src/pages/resources/StudyNotes.tsx`. Clean up `useEffect` abuses. Refactor `PdfViewer.tsx` into smaller components.
*   **Why these issues belong together:** They address the primary maintainability issues in the codebase. Grouping them ensures a consistent approach to component architecture.
*   **Expected Benefit:** Drastically reduced codebase size and complexity.
*   **Risk:** Medium.
*   **Estimated Implementation Difficulty:** High.
*   **Recommended Validation/Testing after completion:** Manually test all resource list views and PDF interactions to ensure no functionality is lost during refactoring.

### Phase 3 — Indexing & Content Architecture
*   **Objective:** Ensure Googlebot can read the site.
*   **Issues Included:** Evaluate migrating to a framework with pre-rendering/SSR capabilities (e.g., Next.js, Remix, or Vite SSG). Create a static sitemap generation script.
*   **Why these issues belong together:** These are specifically targeted at solving the SEO/indexing problems identified in the audit.
*   **Expected Benefit:** Actual search engine visibility.
*   **Risk:** High.
*   **Estimated Implementation Difficulty:** High.
*   **Recommended Validation/Testing after completion:** Use Google Search Console's URL Inspection tool and check the rendered HTML output.

### Phase 4 — Performance
*   **Objective:** Optimize rendering and network efficiency.
*   **Issues Included:** Implement a client-side cache (React Query). Optimize image loading. Throttle/debounce scroll events in `PdfViewer`.
*   **Why these issues belong together:** They are secondary performance enhancements that build upon the foundational work in Phase 1.
*   **Expected Benefit:** Improved Core Web Vitals and user experience.
*   **Risk:** Low.
*   **Estimated Implementation Difficulty:** Medium.
*   **Recommended Validation/Testing after completion:** Run performance profiling in browser dev tools to ensure reduced re-renders and network traffic.

### Phase 5 — Reliability, Accessibility & Security
*   **Objective:** Polish the platform.
*   **Issues Included:** Fix semantic HTML. Add ARIA labels. Implement comprehensive error boundaries. Add basic unit/e2e tests.
*   **Why these issues belong together:** These are "fit and finish" items that improve the robustness and inclusivity of the application.
*   **Expected Benefit:** Higher robustness and inclusivity.
*   **Risk:** Low.
*   **Estimated Implementation Difficulty:** Low.
*   **Recommended Validation/Testing after completion:** Run accessibility audits (e.g., axe-core) and verify error boundaries catch exceptions gracefully.

### Phase 6 — Final Pre-Indexing Verification
*   **Objective:** Validate all changes before launching.
*   **Issues Included:** Final review against PageSpeed Insights, Google Search Console, and manual QA.
*   **Why these issues belong together:** This is the final gate before exposing the site to indexing.
*   **Expected Benefit:** Confidence in the release.
*   **Risk:** Low.
*   **Estimated Implementation Difficulty:** Low.
*   **Recommended Validation/Testing after completion:** Comprehensive manual testing and automated metric checks.
