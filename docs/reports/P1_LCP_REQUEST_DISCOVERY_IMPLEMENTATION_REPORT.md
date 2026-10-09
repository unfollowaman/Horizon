# P1 — Task 1: LCP Request Discovery Implementation Report

## 1. Baseline
* **Page Tested:** Home page (`/`)
* **Performance Score:** ~62
* **First Contentful Paint (FCP):** 4.8 s
* **Largest Contentful Paint (LCP):** 7.3 s
* **Total Blocking Time (TBT):** 50 ms
* **Cumulative Layout Shift (CLS):** 0.015

## 2. LCP Diagnosis
* **Actual LCP Element:** Hero image `/assets/hero/notes.avif` (rendered in `HeroPhoneAnimation` and pre-rendered in static HTML) alongside Hero heading `<h1>` ("Resources for every learner.").
* **Resource URL:** `https://unfollowaman.tech/assets/hero/notes.avif`
* **Discovery Mechanism:** Initial HTML `<link rel="preload" href="/assets/hero/notes.avif" as="image" type="image/avif">` in `<head>` and static `<img src="/assets/hero/notes.avif">` element in pre-rendered `<body>`.
* **Discovery Delay:** Discovery was hindered because non-critical 3rd-party analytics and advertisement scripts (`adsbygoogle.js` and `gtag.js`) were positioned high in `<head>` above document script bundles and resource preload declarations, forcing the browser network fetcher to contend bandwidth during early TCP/TLS setup on mobile 3G/4G profiles.
* **Network Delay:** The preload link for `/assets/hero/notes.avif` in `index.html` was missing `fetchpriority="high"`, causing browsers to assign medium/low fetch priority to the LCP image.
* **Render Delay:** Initial React JSX for `HeroPhoneAnimation.tsx` lacked initial inline `style` (`transform: translate(...)`, `opacity: 1`) matching pre-rendered HTML, causing client-side React hydration to momentarily reset element inline styles before `requestAnimationFrame` executed `applyState(t)`.
* **Dependency / Request Chain:** Initial HTML Document (`/`) -> Preloaded Image Tag (`/assets/hero/notes.avif`) -> Client React Hydration (`/assets/index-*.js`).

## 3. Root Cause
1. **Third-Party Script Placement in `<head>`:** Non-critical scripts (`adsbygoogle.js` and `gtag.js`) placed in `<head>` preceded critical 1st-party script modules and resource preloads, competing for network sockets and main-thread processing during the initial HTML parser discovery pass.
2. **Missing Preload Priority:** The `<link rel="preload" href="/assets/hero/notes.avif">` tag in `index.html` was missing `fetchpriority="high"`.
3. **Hydration Style Mismatch:** `HeroPhoneAnimation.tsx` did not render initial inline `style` matching the static pre-rendered position (`transform: translate(92px, 160px) translate(-50%, -50%)`, `opacity: 1`), causing style resets during client-side React hydration.

## 4. Changes Made

### `index.html`
* **What changed:**
  1. Added `fetchpriority="high"` to `<link rel="preload" href="/assets/hero/notes.avif" as="image" type="image/avif">`.
  2. Moved non-critical third-party scripts (`adsbygoogle.js` and `gtag.js`) from `<head>` to the end of `<body>` after the main module script.
* **Why it changed:** Ensures the browser preload scanner prioritizes downloading the 1st-party LCP image immediately without competing for early network sockets against third-party ad/analytics domains.
* **Why it is safe:** Asynchronous analytics and ad loading function identically at the end of `<body>` without blocking FCP/LCP.

### `src/pages/home/HeroPhoneAnimation.tsx`
* **What changed:** Added initial inline `style` (`transform: translate(${config.grid.x * renderScaleX}px, ${config.grid.y}px) translate(-50%, -50%)`, `opacity: 1`) to icon container divs in React JSX.
* **Why it changed:** Aligns initial React client JSX rendering with pre-rendered static HTML, maintaining continuous image visibility during client-side hydration without waiting for `requestAnimationFrame`.
* **Why it is safe:** Preserves existing animation behavior, component structure, and responsiveness while eliminating hydration style flicker.

## 5. Validation
* **Build Result:** Production build succeeded via `pnpm build` (`tsc -b`, `vite build`, `scripts/prerender.js`).
* **Mobile Verification:** Verified with Playwright mobile and desktop viewports (`verify_lcp_hero.py`). Video recorded to `/home/jules/verification/videos/` and screenshot saved to `/home/jules/verification/screenshots/verification.png`.
* **Desktop Verification:** Confirmed desktop layout renders header logo, navigation, hero title, and phone animation without visual regressions.
* **Duplicate-Request Check:** Verified that `notes.avif` path is identical across `index.html`, `prerender.js`, and `HeroPhoneAnimation.tsx` (`/assets/hero/notes.avif`), ensuring no duplicate image fetches occur.
* **Functional Regression Check:** All 71 test suites (412 unit and integration tests) passed cleanly (`pnpm test`).

## 6. Expected Impact
* **Unblocked Preload Scanner:** Removing third-party scripts from `<head>` allows the browser's preload scanner to discover `/assets/hero/notes.avif` and critical font assets in the very first TCP packets.
* **High Priority Network Fetch:** `fetchpriority="high"` ensures browser network schedulers prioritize `notes.avif` above secondary assets.
* **Instant Hydration Render:** Aligned inline styles prevent client hydration from hiding or resetting the LCP element before JS execution finishes.

## 7. Remaining Concerns
* Mobile 3G network latency in Lighthouse environments may still be affected by initial JS bundle download size (~294 kB for `index-*.js`). Future performance tasks can evaluate further code-splitting of non-critical route modules.
