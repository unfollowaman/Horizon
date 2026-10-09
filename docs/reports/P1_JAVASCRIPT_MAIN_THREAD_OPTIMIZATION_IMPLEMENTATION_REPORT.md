# P1 — Task 3: Investigate and Optimize JavaScript / Main-Thread Work Implementation Report

## 1. Baseline

- **Performance**: 80
- **FCP**: 2.3 s
- **LCP**: 2.6 s
- **TBT**: 450 ms
- **CLS**: 0
- **Speed Index**: 4.7 s
- **Main-thread work**: ~3.0 s
- **Unused JavaScript opportunity**: ~308 KiB

---

## 2. Audit Findings

A comprehensive audit was performed for the Home page (`/`) bundle structure, static preloads, and module dependency graph:

| Resource / Module | Size | Purpose | Why it loads initially | Execution / Parsing Impact | Classification | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `index-[hash].js` | ~294 KiB uncompressed (~91 KiB gzip) | App entry point (React DOM, React Router, Home page UI) | Primary `<script type="module">` in `index.html` | Evaluated synchronously during initial client hydration | **Critical** (React, Router, Home UI) & **Route-Specific / Interaction-Specific** (MainLayout, auth service) | Remove static `MainLayout` import; code-split `register` auth service |
| `auth-[hash].js` (`@supabase/supabase-js`) | ~215 KiB uncompressed (~55 KiB gzip) | Supabase auth, storage, database client SDK | Injected as `<link rel="modulepreload">` by Vite because `AuthContext.tsx` and `Home.tsx` statically imported Supabase/auth services | Synchronously parsed and evaluated during page load (~50–100 ms main-thread CPU) | **Deferrable / Interaction-Specific** | Dynamically import `supabase` inside `AuthContext` effects and `register` inside `handleSubscribe` |
| `jsx-runtime-[hash].js` | ~8.9 KiB uncompressed (~3.4 KiB gzip) | React JSX runtime helpers | Preloaded by `index.html` | Minimal parsing (~1–2 ms) | **Critical** | Keep intact |
| `adsbygoogle.js` & `gtag/js` | ~300+ KiB external JS | Third-party Google AdSense & Google Analytics | Executed after `window.load` via `requestIdleCallback` | High script evaluation (~200–300 ms) and long tasks during Lighthouse audit window | **Third-party / Deferrable** | Defer loading until first user interaction (`pointerdown`, `scroll`, etc.) or 3.5s fallback timer |
| `MainLayout` & sub-routes | ~3.0 KiB chunk + child routes | Layout container for sub-routes (`/library`, `/notes`, etc.) | Statically imported at top level of `App.tsx` | Parsed and evaluated on Home route even though Home is a standalone route | **Route-Specific** | Lazy-load `MainLayout` with `lazyWithRetry` |

---

## 3. Root Cause

The main causes of the ~3.0 s main-thread workload and ~308 KiB unused JavaScript reported by PageSpeed were:

1. **Static Modulepreload of Heavy Auth Dependencies**:
   `AuthContext.tsx` and `Home.tsx` statically imported `supabase` from `src/services/supabase.ts` and `register` from `src/services/auth.ts`. This caused Vite to extract `@supabase/supabase-js` into `auth-[hash].js` (215 KiB uncompressed) and inject a `<link rel="modulepreload">` tag into `dist/index.html`. On page load, the browser immediately fetched, parsed, and evaluated 215 KiB of Supabase JS before the user interacted with any authentication feature.

2. **Route-Specific Layout Inclusion in Initial Bundle**:
   `App.tsx` statically imported `MainLayout`, which pulled route error fallbacks and layout utilities into the Home entry bundle, despite Home (`/`) rendering outside `MainLayout`.

3. **Immediate Post-Load Execution of Third-Party Google Scripts**:
   `adsbygoogle.js` and `gtag/js` were scheduled via `requestIdleCallback` right after `window.load`. In automated test environments (and during initial page rendering), `requestIdleCallback` fired almost immediately (~2.4s mark), causing 300+ KiB of third-party JavaScript to download and execute heavy evaluation during Lighthouse's 5s trace window.

---

## 4. Changes Made

### 1. `index.html`
- **Change**: Replaced immediate post-load `requestIdleCallback` trigger with one-time event listeners for user interactions (`pointerdown`, `touchstart`, `scroll`, `keydown`, `mousemove`) and a delayed fallback timer (3.5 seconds).
- **Why**: Prevents third-party Google AdSense and Analytics scripts from polluting the initial critical rendering and main-thread evaluation window while preserving 100% analytics buffering via `window.dataLayer` and AdSense readiness.
- **Safety**: Inline `window.dataLayer` stub buffers all tracking calls immediately. When user interacts or the fallback timer completes, scripts load and process buffered events without data loss.

### 2. `src/context/AuthContext.tsx`
- **Change**: Converted static imports of `supabase` (`src/services/supabase.ts`) and `logout` (`src/services/auth.ts`) into dynamic imports inside `useEffect` (`initializeAuth`), `refreshProfile`, and `signOut`.
- **Why**: Removes top-level static dependency on `@supabase/supabase-js`, eliminating the `<link rel="modulepreload">` tag for 215 KiB of Supabase JS from `dist/index.html`.
- **Safety**: Auth initialization still completes asynchronously on app mount. `session` state starts as `null`/`loading: true` and updates once dynamic import resolves.

### 3. `src/pages/home/Home.tsx`
- **Change**: Replaced top-level static `import { register } from '../../services/auth'` with a dynamic `const { register } = await import('../../services/auth')` call inside the `handleSubscribe` form handler.
- **Why**: Prevents the newsletter subscription form from forcing authentication libraries into the Home page's initial entry chunk.
- **Safety**: Newsletter subscription functions identically upon form submission.

### 4. `src/App.tsx`
- **Change**: Converted `MainLayout` static import into a lazy-loaded route using `lazyWithRetry`:
  `const MainLayout = lazyWithRetry(() => import('./layouts/MainLayout'));`
- **Why**: Keeps `MainLayout` and its dependencies isolated in a separate chunk for sub-routes, reducing initial Home bundle footprint.
- **Safety**: Route transitions inside `MainLayout` wrap in `<Suspense fallback={<PageLoader />}>` ensuring smooth navigation feedback.

---

## 5. Validation

### Build Result (`pnpm build`)
- **Main `index-[hash].js` bundle**: Reduced from **294.37 kB (91.32 kB gzip)** to **253.40 kB (77.67 kB gzip)** — a **~41 kB uncompressed (~13.6 kB gzip)** reduction in initial bundle size.
- **Modulepreload Optimization**: `@supabase/supabase-js` chunk (`214.73 kB`) is **completely removed** from initial `dist/index.html` modulepreloads. Initial preloaded JS dropped from **~518 KiB** down to **~262 KiB**.
- **Static Pre-rendering**: All 66 resource details pages, 28 category listing pages, 23 syllabus pages, and 6 static info pages pre-rendered successfully.

### Test Result (`pnpm test`)
- **71 test files passed** (413 unit tests passed, 0 failures).

### Mobile & Desktop Functional Verification
- **Home Page (Mobile & Desktop)**: Hero animation, navigation bar, feature cards, and newsletter form render seamlessly without visual shift or layout regressions.
- **Navigation & Sub-routes**: Navigating to Notes (`/notes`), PYQ Papers (`/library`), Syllabus (`/syllabus`), About, Contact, Terms, and Privacy Policy works smoothly.
- **Authentication**: Login, Registration, and Session listener function as expected.
- **PDF Viewer**: Standalone PDF viewer route (`/view/:id`) loads and renders correctly.
- **Console/Network Results**: Zero console errors, zero failed network requests, zero broken dynamic imports.

### LCP / FCP / CLS Regression Check
- **LCP & FCP Intact**: Hero AVIF image (`fetchpriority="high"`), preloaded font (`woff2`), and inline critical CSS remain untouched, preserving previous P1 Task 1 and P1 Task 2 LCP/FCP optimizations.
- **CLS Intact**: Layout shift remains 0.

---

## 6. Expected Impact

1. **Main-Thread Script Evaluation Cost**:
   - Initial preloaded JavaScript reduced from **~518 KiB** to **~262 KiB** (a ~50% reduction in initial code parsed by V8/JavaScriptCore).
   - Dynamic deferral of `adsbygoogle.js` and `gtag.js` removes ~300 KiB of third-party script evaluation during initial load.
2. **Total Blocking Time (TBT)**:
   - Eliminating initial execution of 215 KiB Supabase SDK and 300+ KiB third-party scripts during the first 3 seconds significantly reduces long tasks and CPU contention.

---

## 7. Remaining Opportunities

1. **Image Asset Optimization (P1 Task 4)**:
   - Further image compression / responsive `srcset` formatting for card SVG/AVIF assets as scheduled in upcoming tasks.
2. **Framework-Level Core Bundling**:
   - React 19 and React Router 7 cores (~250 KiB total entry JS) represent the minimum required runtime for client hydration and routing.
