# INTERMITTENT PAGE LOAD RECOVERY IMPLEMENTATION REPORT

## 1. Root-Cause Gaps Addressed

Our forensic investigation and implementation addressed two critical architectural gaps causing intermittent "UNABLE TO LOAD PAGE" navigation failures:

1. **Gap A — React.lazy Internal Rejection Caching (Root Cause of Failed "Try Again"):**
   When a dynamic import fails (or retries exhaust), `React.lazy()` permanently caches the rejected promise state in memory. Simply incrementing an `ErrorBoundary` React key in `MainLayout.tsx` remounts the component tree with the exact same `React.lazy()` instance. React re-evaluates the cached rejected promise synchronously without calling `import()` again.
   - **Resolution:** Modified `handleRetry` in `MainLayout.tsx` to execute `window.location.reload()`, clearing the in-memory `React.lazy()` rejection state and creating a fresh JavaScript execution context.
   - **UI Feedback:** Enhanced `RouteErrorFallback.tsx` with an `isRetrying` state that disables the "Try Again" button on tap, displays an inline animated spinner with "Retrying..." text, and prevents duplicate tap actions.

2. **Gap B — Stale Deployment Asset Chunks:**
   Following new production deployments (e.g., Cloudflare Pages), Vite builds emit new content-hashed JavaScript chunks. Open client sessions attempting navigation request old chunk filenames that return `404 Not Found`. Retrying against missing URLs continuously fails.
   - **Resolution:** Implemented `isChunkLoadError()` classification in `src/utils/lazyWithRetry.ts` to detect chunk load failures and attached a global listener for Vite's `vite:preloadError` event.
   - **Reload Guard:** Added a `sessionStorage` reload guard (`horizon_chunk_reload_guard`) inside `retryImport()`. If retries exhaust due to a chunk load failure, an automatic page reload is triggered once to fetch updated deployment assets. If the guard is already active (meaning reload was already attempted), automatic reload is suppressed to prevent infinite reload loops and the error is passed to `ErrorBoundary`.
   - **Guard Reset:** `sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY)` is automatically executed upon successful dynamic import resolution, successful route location change in `MainLayout.tsx`, or manual "Try Again" click.

---

## 2. Files Changed & Reasons

| File Path | Description of Changes |
| :--- | :--- |
| `src/utils/lazyWithRetry.ts` | Added `isChunkLoadError()`, global `vite:preloadError` listener, and `sessionStorage` reload guard in `retryImport()`. |
| `src/layouts/MainLayout.tsx` | Updated `handleRetry` to invoke `window.location.reload()` and added `useEffect` location listener to clear chunk reload guards on route changes. |
| `src/components/RouteErrorFallback.tsx` | Added `isRetrying` state, disabled button state, "Retrying..." text, loading spinner, and duplicate tap prevention. |
| `src/utils/__tests__/lazyWithRetry.test.tsx` | Added unit tests for `isChunkLoadError`, reload guard activation, guard suppression on repeat failure, and guard cleanup. |
| `src/components/__tests__/RouteErrorFallback.test.tsx` | Added unit tests for "Try Again" loading state, button disabling, duplicate tap suppression, and callback execution. |
| `INTERMITTENT_PAGE_LOAD_RECOVERY_IMPLEMENTATION_REPORT.md` | Created comprehensive implementation report deliverable. |

---

## 3. Exact Recovery Strategy Implemented

```
[Dynamic Import Initiated by Route Navigation]
       │
       ▼
[retryImport attempts up to 3 retries with exponential backoff]
       │
       ├───► [SUCCESS] ──► Clear sessionStorage reload guard ──► Render Page
       │
       └───► [RETRIES EXHAUSTED]
                │
                ▼
      [Is Error a Stale Chunk Error?]
                │
                ├───► [YES] ──► [Is sessionStorage Guard Active?]
                │                   │
                │                   ├───► [NO] ──► Set Guard Flag ──► Trigger `window.location.reload()`
                │                   │
                │                   └───► [YES] ──► Pass Error to ErrorBoundary (Prevent Loop)
                │
                └───► [NO (e.g. Unrelated Error)] ──► Pass Error to ErrorBoundary
                                                           │
                                                           ▼
                                                [Render RouteErrorFallback]
                                                           │
                                                           ▼
                                                [User Taps "Try Again"]
                                                           │
                                                           ▼
                                                [Show Spinner "Retrying...", Disable Button]
                                                           │
                                                           ▼
                                                [Execute `window.location.reload()`]
```

---

## 4. Test Verification Results

### Vitest Test Suite Execution:
- **Command:** `npm test`
- **Result:** `PASS`
- **Test Files:** 71 passed (71 total)
- **Tests:** 412 passed (412 total)
- **Duration:** 43.29s

### Build & Typecheck Verification:
- **TypeScript Check (`tsc -b`):** `PASS` (0 errors)
- **ESLint (`npm run lint`):** `PASS` (0 warnings/errors)
- **Vite Production Build (`npm run build`):** `PASS` (Sitemap generated, static prerender completed, assets bundled cleanly)

---

## 5. Reload Loop Prevention & Safeguards

1. **SessionStorage Scoped Guard:** The `horizon_chunk_reload_guard` flag is stored in `sessionStorage` per browser tab.
2. **Single Auto-Reload Cap:** When a chunk failure occurs, the application auto-reloads at most once. If the server is offline or the chunk remains unavailable after reload, the error is caught by `ErrorBoundary` and displayed to the user without infinite reloading.
3. **Automatic Expiration & Cleanup:** The guard is cleared as soon as any route successfully loads or the user clicks "Try Again", ensuring future independent chunk issues can recover cleanly.

---

## 6. Manual Verification Guidance for Mobile Devices

1. **Transient Cellular Interruption Simulation:**
   - In Mobile Chrome DevTools, select **Network -> Offline** during navigation.
   - Observe `lazyWithRetry` retries over 3.5 seconds before showing "UNABLE TO LOAD PAGE".
   - Select **Network -> Online** and tap "Try Again". Verify the button shows "Retrying..." and reloads to the destination route.
2. **Stale Deployment Simulation:**
   - Open a feature page on mobile browser.
   - Deploy a new build to Cloudflare Pages (or purge CDN asset cache).
   - Tap a different feature card. Verify the single auto-reload fetches the new `index.html` and loads the destination page without manual intervention.
