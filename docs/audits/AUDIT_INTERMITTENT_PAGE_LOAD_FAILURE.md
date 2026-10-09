# AUDIT — INTERMITTENT “UNABLE TO LOAD PAGE” NAVIGATION FAILURE

## 1. Executive Summary

**Does the previously implemented solution actually exist in the current repository?**
**YES.** Both **Layer 1 (Preload Isolation)** and **Layer 2 (Lazy-Import Retry Utility)** are fully implemented, merged, intact, and wired into all lazy route definitions in the current repository.

However, the user is still intermittently experiencing the **"UNABLE TO LOAD PAGE"** fallback screen. Our code audit reveals **two critical architectural gaps** that explain why the current solution fails to prevent or recover from the issue under specific real-world conditions:

1. **React.lazy Internal Rejection Caching (Root Cause of Try Again Failure):**
   When a dynamic import rejects during client-side navigation (or after retries exhaust/fail), `React.lazy()` permanently caches the **rejected Promise** internal to its module state. When `ErrorBoundary` catches this rejection and renders `RouteErrorFallback`, clicking **"Try Again"** merely increments `resetKey` in `MainLayout.tsx` to remount the `<Suspense>` boundary with the *same* `React.lazy()` component instance. React re-evaluates the cached rejected Promise synchronously without re-executing `lazyWithRetry` or invoking `retryImport()`. Thus, **"Try Again" is structurally incapable of recovery once React.lazy has entered a rejected state.**

2. **Deployment-Induced Chunk Invalidation & Cache Expiration (Root Cause of Dynamic Import Failures):**
   Vite builds output content-hashed JavaScript chunks (e.g., `LibraryRoute-Bx2_9a.js`). When a new build is deployed to production (e.g., Cloudflare Pages), old hashed chunks are purged or invalidated on the edge CDN. Active client sessions holding the pre-deployment single-page application (SPA) state attempt client-side navigation to route chunks that no longer exist on the server (returning 404 HTML fallback or network failure). Although `lazyWithRetry` attempts 3 retries over ~3.5 seconds, all 3 retries request the exact same missing asset path, which repeatedly yields a 404 error. The retries exhaust, the rejection reaches `ErrorBoundary`, and the user is stuck on "UNABLE TO LOAD PAGE" where "Try Again" fails indefinitely. Only a full browser refresh (or location reload) fetches the new HTML entry point with updated chunk references.

---

## 2. Original Problem Summary

Horizon previously exhibited an intermittent navigation failure, especially prevalent on mobile viewports.

When users tapped feature cards on the Home page (e.g., PYQ Papers, Notes, or Syllabus), the destination route occasionally failed to load, triggering the application ErrorBoundary fallback screen:

```
UNABLE TO LOAD PAGE
An unexpected error occurred while loading this page content.
[Try Again]  [Go Home]
```

### Observed Behaviors:
- Navigation succeeded most of the time under stable network conditions.
- The failure was intermittent and occurred noticeably more frequently on mobile connections.
- "Go Home" successfully navigated back to the Home page.
- "Try Again" did NOT provide genuine recovery; clicking it immediately re-rendered the same error fallback.
- Performing a full browser refresh immediately fixed the problem and loaded the destination page.
- Direct PDF file delivery was verified working and was ruled out as the cause.

---

## 3. Historical Solution Concept

To eliminate this intermittent failure, a two-layer architectural design was planned:

- **Layer 1 — Preload Isolation:** Prevent speculative asset preloading (`onMouseEnter`, `onTouchStart`) from polluting navigation or causing unhandled promise rejections that could crash navigation.
- **Layer 2 — Dynamic Import Retry Wrapper (`lazyWithRetry`):** Make route loading resilient against transient mobile network interruptions by wrapping `React.lazy()` dynamic imports with exponential backoff retries before bubbling errors to `ErrorBoundary`.

---

## 4. Layer 1 Audit — Preload Isolation

### Status: `VERIFIED PRESENT`

### Code Evidence: `src/pages/home/Home.tsx`

```typescript
const preloadLibrary = () => {
  import('../resources/LibraryRoute').catch(() => {});
};
const preloadStudyNotes = () => {
  import('../resources/StudyNotesRoute').catch(() => {});
};
```

```tsx
<div
  key={i}
  className={`${styles.featureCard} group animate-fade-rise ...`}
  onMouseEnter={() => {
    if (f.path === '/library') preloadLibrary();
    if (f.path === '/notes') preloadStudyNotes();
  }}
>
```

### Detailed Findings:
1. **Failure Isolation:** Preload functions explicitly append `.catch(() => {})` to swallow promise rejections. A network error during preloading will not cause an unhandled promise rejection window event.
2. **Mobile Interaction Clean-Up:** Preloading is attached exclusively to `onMouseEnter` (desktop hover). Mobile `onTouchStart` event handlers were removed, preventing touch taps from launching redundant speculative import calls right before navigation.
3. **Navigation Independence:** Navigation relies on standard React Router `<Link to={f.path}>` components. Standard route navigation functions independently whether preloading succeeds, fails, or never triggers.
4. **Unit Test Coverage:** Verified in `src/pages/home/__tests__/PreloadIsolation.test.tsx`, which tests that mouseenter preloads swallow errors and touchstart handlers do not trigger preloads.

---

## 5. Layer 2 Audit — Lazy-Import Retry Utility

### Status: `VERIFIED PRESENT`

### Code Evidence: `src/utils/lazyWithRetry.ts`

```typescript
import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

export interface LazyWithRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

export function retryImport<P extends object>(
  componentImport: () => Promise<{ default: ComponentType<P> }>,
  retriesLeft = 3,
  delay = 500,
  backoffFactor = 2
): Promise<{ default: ComponentType<P> }> {
  return componentImport().catch((error) => {
    if (retriesLeft <= 0) {
      throw error;
    }
    return new Promise<{ default: ComponentType<P> }>((resolve) => {
      setTimeout(() => {
        resolve(retryImport(componentImport, retriesLeft - 1, delay * backoffFactor, backoffFactor));
      }, delay);
    });
  });
}

export function lazyWithRetry<P extends object>(
  componentImport: () => Promise<{ default: ComponentType<P> }>,
  options: LazyWithRetryOptions = {}
): LazyExoticComponent<ComponentType<P>> {
  const { maxRetries = 3, initialDelayMs = 500, backoffFactor = 2 } = options;
  return lazy(() => retryImport(componentImport, maxRetries, initialDelayMs, backoffFactor));
}
```

### Code Evidence: `src/App.tsx` & `src/pages/syllabus/SyllabusPage.tsx`

All 17 lazy-loaded routes in `src/App.tsx` and nested components in `SyllabusPage.tsx` use `lazyWithRetry`:

```typescript
// src/App.tsx
const Library = lazyWithRetry(() => import('./pages/resources/LibraryRoute'));
const ResourceDetails = lazyWithRetry(() => import('./pages/resources/ResourceDetails'));
const Dashboard = lazyWithRetry(() => import('./pages/user/Dashboard'));
const NotificationSettings = lazyWithRetry(() => import('./pages/settings/NotificationSettings'));
const Login = lazyWithRetry(() => import('./pages/auth/Login'));
const Register = lazyWithRetry(() => import('./pages/auth/Register'));
const Onboarding = lazyWithRetry(() => import('./pages/onboarding/Onboarding'));
const About = lazyWithRetry(() => import('./pages/about/About'));
const Contact = lazyWithRetry(() => import('./pages/contact/Contact'));
const Terms = lazyWithRetry(() => import('./pages/terms/Terms'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/privacy/PrivacyPolicy'));
const Attribution = lazyWithRetry(() => import('./pages/attribution/Attribution'));
const PdfViewer = lazyWithRetry(() => import('./pages/resources/PdfViewer'));
const StudyNotes = lazyWithRetry(() => import('./pages/resources/StudyNotesRoute'));
const SyllabusPage = lazyWithRetry(() => import('./pages/syllabus/SyllabusPage'));
const ComingSoon = lazyWithRetry(() => import('./pages/coming-soon/ComingSoon'));
const RenderingScreen = lazyWithRetry(() => import('./components/RenderingScreen/RenderingScreen'));

// src/pages/syllabus/SyllabusPage.tsx
const SyllabusFlowchart = lazyWithRetry(() => import('./components/SyllabusFlowchart'));
```

### Route Coverage Table:

| Route Path | Lazy Component | Wrapper Used | Status |
| :--- | :--- | :--- | :--- |
| `/library` | `LibraryRoute` | `lazyWithRetry` | Verified |
| `/notes` | `StudyNotesRoute` | `lazyWithRetry` | Verified |
| `/syllabus` | `SyllabusPage` | `lazyWithRetry` | Verified |
| `/syllabus/*` | `SyllabusFlowchart` | `lazyWithRetry` | Verified |
| `/resource/:id` | `ResourceDetails` | `lazyWithRetry` | Verified |
| `/view/:id` | `PdfViewer` | `lazyWithRetry` | Verified |
| `/dashboard` | `Dashboard` | `lazyWithRetry` | Verified |
| `/settings/notifications` | `NotificationSettings` | `lazyWithRetry` | Verified |
| `/login` | `Login` | `lazyWithRetry` | Verified |
| `/register` | `Register` | `lazyWithRetry` | Verified |
| `/onboarding` | `Onboarding` | `lazyWithRetry` | Verified |
| `/about` | `About` | `lazyWithRetry` | Verified |
| `/contact` | `Contact` | `lazyWithRetry` | Verified |
| `/terms` | `Terms` | `lazyWithRetry` | Verified |
| `/privacy-policy` | `PrivacyPolicy` | `lazyWithRetry` | Verified |
| `/attribution` | `Attribution` | `lazyWithRetry` | Verified |
| `/coming-soon` | `ComingSoon` | `lazyWithRetry` | Verified |

### Technical Analysis of Retry Mechanism:
- **Retry Parameters:** Default `maxRetries = 3`, `initialDelayMs = 500ms`, `backoffFactor = 2`.
- **Retry Sequence Timings:** Delay 1: 500ms -> Delay 2: 1000ms -> Delay 3: 2000ms -> Rejection thrown after ~3.5 seconds.
- **Fresh Invocation:** Each retry invokes `componentImport()` anew, returning a new `Promise` from the native `import()` browser loader.
- **Limitation:** While `lazyWithRetry` handles transient cellular dropouts during initial component initialization, **it does not bypass React.lazy's internal Promise caching once all retries exhaust and the error bubbles to ErrorBoundary.**

---

## 6. ErrorBoundary & Try Again Recovery Audit

### Status: `PRESENT BUT INEFFECTIVE`

### Code Evidence: `src/layouts/MainLayout.tsx`

```tsx
const MainLayout: React.FC = () => {
  const location = useLocation();
  const [resetKey, setResetKey] = useState(0);

  const handleRetry = () => {
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="...">
      <main className="...">
        <ErrorBoundary
          key={`${location.pathname}-${resetKey}`}
          fallback={<RouteErrorFallback onRetry={handleRetry} />}
        >
          <Suspense fallback={<DelayedPageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};
```

### Critical Flaw Analysis:
1. **React.lazy Internal State:** `React.lazy(factory)` calls `factory()` when initialized. In React 18/19, `React.lazy` maintains an internal payload status (`Uninitialized` -> `Pending` -> `Resolved` or `Rejected`).
2. **Cached Rejection:** When `retryImport` exhausts its 3 retries and throws an error, React marks that `LazyComponent`'s internal status as `Rejected` and caches the rejected error object.
3. **Ineffective Reset Key:** Clicking **"Try Again"** calls `handleRetry()`, updating `resetKey`. This remounts `<ErrorBoundary>` and `<Suspense>`, but rendering `<Outlet />` mounts the exact same `LazyComponent` variable (e.g. `Library`).
4. **Immediate Re-throw:** When React evaluates the lazy component during render, it checks the cached status. Because it is already `Rejected`, React **immediately re-throws the cached rejection synchronously without executing the factory function again.**
5. **Result:** The `ErrorBoundary` catches the re-thrown error instantly in the same frame. To the user, clicking "Try Again" appears to do nothing at all.

---

## 7. Build / Deployment Audit

### Status: `STALE-CHUNK RISK CONFIRMED`

### Build Configuration: `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

### Findings:
1. **Hashed Assets:** Vite builds generate unique content hashes for dynamic imports (e.g., `dist/assets/LibraryRoute-C3f_9a1x.js`).
2. **Missing Deployment Listener:** The application lacks a global window handler or Vite runtime event listener (such as `window.addEventListener('vite:preloadError')` or a dynamic import error handler) to detect stale chunk 404 errors.
3. **Deployment Scenario:** When a developer pushes a deployment to Cloudflare Pages:
   - Server index HTML points to new asset hashes.
   - Users with an open browser session tap a feature card.
   - The browser requests `assets/LibraryRoute-OLD_HASH.js`.
   - The server responds with `404 Not Found` (or returns `index.html` as fallback content, causing a syntax error `Unexpected token '<'`).
   - `lazyWithRetry` retries 3 times against the *same missing asset path*.
   - Rejection reaches `ErrorBoundary`.
   - "Try Again" fails due to React.lazy rejection caching.
   - Only a full browser reload re-fetches `index.html` and succeeds.

---

## 8. Git / History Evidence

A forensic search of Git branches and reflogs confirms the timeline of changes:

- **Branch:** `origin/resilient-route-loading-layer-2-13446278648299325711`
- **Commit:** `693cceb6fb6789db7675247917df9d8914763530`
- **Commit Message:** `feat: implement resilient lazy route loading and suppress spinner flash`
- **Changes Merged:** Added `src/utils/lazyWithRetry.ts`, integrated `lazyWithRetry` across all routes in `src/App.tsx`, updated `MainLayout.tsx` error handling, and created unit tests.
- **Current Tree Status:** All code from commit `693cceb` is intact in the working branch. No subsequent commit deleted or modified `lazyWithRetry.ts` or reverted route definitions in `App.tsx`.

---

## 9. Current Failure Path Reconstruction

Based on the CURRENT codebase, the exact sequence leading to an unrecoverable "UNABLE TO LOAD PAGE" screen is reconstructed below:

```
[User on Home Page]
       │
       ├─► (Optional) Hover feature card ──► `preloadLibrary()` (swallows errors safely via `.catch()`)
       │
       ▼
[User taps Feature Card (e.g. /library)]
       │
       ▼
[React Router initiates client-side navigation]
       │
       ▼
[React evaluates `LibraryRoute` component wrapped in `lazyWithRetry`]
       │
       ▼
[First Attempt: `import('./pages/resources/LibraryRoute')`]
       │
       ├───► [SUCCESS] ──► Render Page Component
       │
       └───► [FAIL] (Network hiccup or Missing Stale Chunk 404)
                │
                ▼
      [retryImport executes retry 1 after 500ms]
                │
                ├───► [SUCCESS] ──► Render Page Component
                │
                └───► [FAIL]
                         │
                         ▼
               [retryImport executes retry 2 after 1000ms]
                         │
                         ├───► [SUCCESS] ──► Render Page Component
                         │
                         └───► [FAIL]
                                  │
                                  ▼
                        [retryImport executes retry 3 after 2000ms]
                                  │
                                  ├───► [SUCCESS] ──► Render Page Component
                                  │
                                  └───► [FAIL]
                                           │
                                           ▼
                                 [Retries Exhausted (after ~3.5s)]
                                           │
                                           ▼
                                 [Error thrown out of `lazyWithRetry`]
                                           │
                                           ▼
                                 [`React.lazy` internal state set to REJECTED (cached)]
                                           │
                                           ▼
                                 [`ErrorBoundary` in MainLayout catches error]
                                           │
                                           ▼
                                 [Render `RouteErrorFallback` ("UNABLE TO LOAD PAGE")]
                                           │
                                           ▼
                                 [User taps "Try Again"]
                                           │
                                           ▼
                                 [`handleRetry()` updates `resetKey`]
                                           │
                                           ▼
                                 [`MainLayout` remounts `<ErrorBoundary>` & `<Outlet />`]
                                           │
                                           ▼
                                 [React evaluates `LibraryRoute` again]
                                           │
                                           ▼
                                 [React checks cached status ──► REJECTED]
                                           │
                                           ▼
                                 [React immediately re-throws cached rejection WITHOUT calling import()]
                                           │
                                           ▼
                                 [`ErrorBoundary` catches re-thrown error instantly]
                                           │
                                           ▼
                                 [User remains stuck on "UNABLE TO LOAD PAGE"]
```

---

## 10. Root Cause & Status Classification Summary

### Classification Table:

| Component / Layer | Status | Reason / Evidence |
| :--- | :--- | :--- |
| **Layer 1 Preload Isolation** | `VERIFIED PRESENT` | `.catch(() => {})` in `Home.tsx` prevents unhandled rejections; mobile `onTouchStart` preloads removed. |
| **Layer 2 Retry Utility (`lazyWithRetry`)** | `VERIFIED PRESENT` | `lazyWithRetry` and `retryImport` implemented and applied across all 17 routes in `App.tsx`. |
| **"Try Again" Recovery Mechanism** | `PRESENT BUT INEFFECTIVE` | `resetKey` state increment remounts ErrorBoundary but cannot reset `React.lazy`'s internal cached rejection state. |
| **Stale Chunk Protection** | `NOT PRESENT` | No handler exists to trigger a window location reload when dynamic imports fail due to stale chunk 404s following new deployments. |

---

## 11. Regression Assessment

- **Was code deleted or regressed?** No. The code implemented during Layer 1 and Layer 2 is present and unmodified.
- **Why does the problem persist?** The original design assumed that `lazyWithRetry` + `ErrorBoundary` key resetting would fully solve transient and deployment-related route load failures. The fundamental structural behavior of `React.lazy` caching rejections in memory was not accounted for.

---

## 12. Exact Gaps Identified

1. **Inability of "Try Again" to clear React.lazy rejection cache:** Updating React state outside `React.lazy` does not clear its internal rejected promise cache.
2. **No window reloads on chunk missing errors:** When new deployments invalidate existing JS chunk hashes, retrying the same missing URL yields repeated 404s. A hard page reload is required to fetch the updated `index.html` containing current chunk hashes.

---

## 13. Recommended Next Actions (For Future Implementation Phase)

*Note: As instructed, no source code modifications were made during this audit.*

When the implementation phase is approved, the following targeted enhancements are recommended:

1. **Implement Auto-Reload / Force-Reload on Dynamic Import Chunk Failure:**
   In `lazyWithRetry.ts` (or via a global `window.addEventListener('vite:preloadError')`), inspect dynamic import errors. If an import fails after retries (or matches network/chunk load failure patterns like `Failed to fetch dynamically imported module`), perform a controlled window reload (`window.location.reload()`) or session cache bust to fetch current build chunks.
2. **Enhance `RouteErrorFallback` "Try Again" Handler:**
   Update `handleRetry` in `MainLayout.tsx` or `RouteErrorFallback.tsx` to execute `window.location.reload()` when recovering from route load errors, guaranteeing a fresh JavaScript execution context and module resolution.

---

## 14. Files Examined

| File Path | Purpose in Audit |
| :--- | :--- |
| `src/App.tsx` | Verified wiring of `lazyWithRetry` across all application routes. |
| `src/utils/lazyWithRetry.ts` | Examined `retryImport` and `lazyWithRetry` implementations, backoff timings, and retry limits. |
| `src/layouts/MainLayout.tsx` | Inspected `ErrorBoundary` wrapping, `resetKey` state, and `handleRetry` callback logic. |
| `src/components/RouteErrorFallback.tsx` | Verified UI fallback controls ("Try Again", "Go Home"). |
| `src/pages/home/Home.tsx` | Inspected `preloadLibrary`, `preloadStudyNotes`, `.catch()` handlers, and `onMouseEnter` event triggers. |
| `src/pages/home/__tests__/PreloadIsolation.test.tsx` | Verified unit test suite for Layer 1 preload isolation. |
| `src/utils/__tests__/lazyWithRetry.test.tsx` | Verified unit test suite for Layer 2 retry utility. |
| `vite.config.ts` & `package.json` | Verified build target and bundler settings for dynamic import chunks. |
