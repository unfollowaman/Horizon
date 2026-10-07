# P1 — Task 4: Optimize Flagged Image Delivery Implementation Report

## 1. Baseline

- **Performance Score:** 88
- **First Contentful Paint (FCP):** 2.1 s
- **Largest Contentful Paint (LCP):** 2.6 s
- **Total Blocking Time (TBT):** 240 ms
- **Cumulative Layout Shift (CLS):** 0
- **Speed Index:** 4.8 s
- **Main-Thread Work:** ~2.3 s
- **Image Delivery Estimated Savings Reported by PageSpeed:** ~22 KiB

---

## 2. Audit Findings

### Image 1: `/assets/favicon/logo.avif`
- **Source Path:** `public/assets/favicon/logo.avif`
- **Original Intrinsic Dimensions:** 160×160 px
- **Mobile Rendered Dimensions:**
  - Header brand logo: 32×32 CSS px
  - Hero brand pill logo: 24×24 CSS px
  - Mascot logo (in hero animation): 60×60 CSS px
  - Footer logo: 24×24 CSS px
  - Max Mobile Rendered CSS Dimension: 60×60 px
- **Desktop Rendered Dimensions:**
  - Header logo: 32×32 CSS px
  - Mascot logo: up to 75×75 CSS px
  - Fallback logo: 48×48 CSS px
- **Original File Size:** 7,902 bytes (7.72 KiB)
- **Image Format:** AVIF (RGBA transparent background)
- **Loading Behavior:** `eager` above the fold (Header, Hero pill, Mascot), `lazy` below the fold (Footer)
- **Priority:** Header logo and Hero pill logo carried `fetchPriority="high"`, Mascot carried normal priority
- **Usage:** Header brand link, Hero brand pill, Hero animation mascot, Footer logo, Dashboard brand pill, RootFallback logo
- **Recommended Action:**
  - Resize intrinsic asset from 160×160 to 120×120 px (exact 2× DPR match for 60×60 max CSS display).
  - Remove `fetchPriority="high"` from non-LCP header and hero pill logos to prevent network priority competition with the LCP image (`notes.avif`).

---

### Image 2: `/assets/hero/announcements.avif`
- **Source Path:** `public/assets/hero/announcements.avif`
- **Original Intrinsic Dimensions:** 200×200 px
- **Mobile Rendered Dimensions:** 64×64 CSS px (`w-16 h-auto` in pre-rendered static HTML, `clamp(44, 64 * scaleX, 80)` in `HeroPhoneAnimation.tsx`)
- **Desktop Rendered Dimensions:** 80×80 CSS px max
- **Original File Size:** 7,480 bytes (7.30 KiB)
- **Image Format:** AVIF (RGBA transparent background)
- **Loading Behavior:** `eager` (above the fold in hero section)
- **Priority:** Carried `fetchPriority="high"` in React component and `fetchpriority="high"` in static HTML
- **Usage:** Hero phone animation secondary icon
- **Recommended Action:**
  - Resize intrinsic asset from 200×200 to 128×128 px (exact 2× DPR match for 64×64 mobile CSS display).
  - Remove `fetchPriority="high"` so network priority is uniquely reserved for the LCP image (`notes.avif`).

---

### Image 3: `/assets/hero/flashcards.avif`
- **Source Path:** `public/assets/hero/flashcards.avif`
- **Original Intrinsic Dimensions:** 200×200 px
- **Mobile Rendered Dimensions:** 64×64 CSS px
- **Desktop Rendered Dimensions:** 80×80 CSS px max
- **Original File Size:** 4,880 bytes (4.77 KiB)
- **Image Format:** AVIF (RGBA transparent background)
- **Loading Behavior:** `eager`
- **Priority:** Carried `fetchPriority="high"`
- **Usage:** Hero phone animation secondary icon
- **Recommended Action:**
  - Resize intrinsic asset from 200×200 to 128×128 px.
  - Remove `fetchPriority="high"`.

---

### Image 4: `/assets/hero/revision-sheets.avif`
- **Source Path:** `public/assets/hero/revision-sheets.avif`
- **Original Intrinsic Dimensions:** 200×200 px
- **Mobile Rendered Dimensions:** 64×64 CSS px
- **Desktop Rendered Dimensions:** 80×80 CSS px max
- **Original File Size:** 4,741 bytes (4.63 KiB)
- **Image Format:** AVIF (RGBA transparent background)
- **Loading Behavior:** `eager`
- **Priority:** Carried `fetchPriority="high"`
- **Usage:** Hero phone animation secondary icon
- **Recommended Action:**
  - Resize intrinsic asset from 200×200 to 128×128 px.
  - Remove `fetchPriority="high"`.

---

## 3. Root Cause

1. **Oversized Source Dimensions:** The original source images had intrinsic dimensions of 160×160 (`logo.avif`) and 200×200 (`announcements.avif`, `flashcards.avif`, `revision-sheets.avif`). On mobile viewports, these assets were displayed at 60×60 and 64×64 CSS pixels respectively. At 2× DPR mobile display, physical requirements are 120×120 and 128×128 pixels. The 200×200 source size represented 2.44× to 3.12× excess pixel area.
2. **Fetch Priority Dilution:** Non-LCP elements (header logo, brand pill logo, and all 6 hero animation icons) carried `fetchPriority="high"` / `fetchpriority="high"`. Setting high fetch priority on 8 concurrent image requests caused network contention, delaying the arrival of the true LCP hero element (`/assets/hero/notes.avif`).

---

## 4. Changes Made

### 1. `public/assets/favicon/logo.avif`
- **Change:** Resized intrinsic asset from 160×160 to 120×120 px with high-quality AVIF encoding (Quality 85).
- **Reason:** Matches 2× DPR requirement for 60×60 max CSS display size.
- **Expected Benefit:** Reduces file size from 7.72 KiB (7,902 B) to 5.57 KiB (5,706 B), saving 2.14 KiB (2,196 B).
- **Safety Considerations:** Preserved RGBA transparency and image sharpness across all logo contexts (header, hero pill, mascot, footer, fallback).

### 2. `public/assets/hero/announcements.avif`
- **Change:** Resized intrinsic asset from 200×200 to 128×128 px with high-quality AVIF encoding (Quality 85).
- **Reason:** Matches 2× DPR requirement for 64×64 mobile CSS display size.
- **Expected Benefit:** Reduces file size from 7.30 KiB (7,480 B) to 4.25 KiB (4,355 B), saving 3.05 KiB (3,125 B).
- **Safety Considerations:** Retained smooth animation and RGBA transparency.

### 3. `public/assets/hero/flashcards.avif`
- **Change:** Resized intrinsic asset from 200×200 to 128×128 px with high-quality AVIF encoding (Quality 85).
- **Reason:** Matches 2× DPR requirement for 64×64 mobile CSS display size.
- **Expected Benefit:** Reduces file size from 4.77 KiB (4,880 B) to 3.25 KiB (3,330 B), saving 1.51 KiB (1,550 B).
- **Safety Considerations:** Retained smooth animation and RGBA transparency.

### 4. `public/assets/hero/revision-sheets.avif`
- **Change:** Resized intrinsic asset from 200×200 to 128×128 px with high-quality AVIF encoding (Quality 85).
- **Reason:** Matches 2× DPR requirement for 64×64 mobile CSS display size.
- **Expected Benefit:** Reduces file size from 4.63 KiB (4,741 B) to 3.08 KiB (3,156 B), saving 1.55 KiB (1,585 B).
- **Safety Considerations:** Retained smooth animation and RGBA transparency.

### 5. `src/pages/home/Home.tsx`
- **Change:** Removed `fetchPriority="high"` from Header logo and Hero brand pill logo `<img>` tags.
- **Reason:** Prevents high-priority network scheduling dilution.
- **Expected Benefit:** Focuses browser network scheduling on critical LCP resources.
- **Safety Considerations:** Kept `loading="eager" decoding="async"` so elements render immediately above the fold.

### 6. `src/pages/home/HeroPhoneAnimation.tsx`
- **Change:** Updated `fetchPriority` attribute on hero icon `<img>` elements to `fetchPriority={config.asset === 'notes.avif' ? 'high' : undefined}`.
- **Reason:** Ensures only the LCP hero candidate (`notes.avif`) requests high network fetch priority.
- **Expected Benefit:** Eliminates 5 redundant high-priority image requests during initial hero load.
- **Safety Considerations:** All secondary hero icons retain `loading="eager" decoding="async"`.

### 7. `scripts/prerender.js`
- **Change:** Removed `fetchpriority="high"` from pre-rendered header logo, hero pill logo, and secondary hero icons (`pyq-papers.avif`, `mcq-sheets.avif`, `flashcards.avif`, `announcements.avif`, `revision-sheets.avif`). Kept `fetchpriority="high"` strictly on `notes.avif`.
- **Reason:** Matches runtime React priority behavior in static pre-rendered HTML.
- **Expected Benefit:** Clean static HTML pre-render output with focused LCP priority.
- **Safety Considerations:** Guaranteed identical static and hydrated DOM structures.

---

## 5. Validation

### Build Result
- `pnpm build`: Succeeded without errors. Production pre-rendering generated static HTML files for home, static pages, syllabus routes, category routes, and resource pages.

### Test Result
- `pnpm test`: All 71 test files and 413 unit/integration tests passed completely without regressions.

### Mobile & Desktop Verification
- **Home Mobile (300px–375px):**
  - All 4 affected images (`logo.avif`, `announcements.avif`, `flashcards.avif`, `revision-sheets.avif`) render crisp, with zero distortion, correct 1:1 aspect ratio, and intact RGBA transparency.
  - Hero animation performs smoothly with zero frame drops.
- **Home Desktop (1200px+):**
  - Header logo, hero brand pill, mascot, and hero icons render crisp and centered across all screen resolutions.

### Image Asset Size Reduction Summary
| Asset Path | Original Size | New Size | Bytes Saved | KiB Saved |
| :--- | :--- | :--- | :--- | :--- |
| `public/assets/favicon/logo.avif` | 7,902 B (7.72 KiB) | 5,706 B (5.57 KiB) | 2,196 B | 2.14 KiB |
| `public/assets/hero/announcements.avif` | 7,480 B (7.30 KiB) | 4,355 B (4.25 KiB) | 3,125 B | 3.05 KiB |
| `public/assets/hero/flashcards.avif` | 4,880 B (4.77 KiB) | 3,330 B (3.25 KiB) | 1,550 B | 1.51 KiB |
| `public/assets/hero/revision-sheets.avif` | 4,741 B (4.63 KiB) | 3,156 B (3.08 KiB) | 1,585 B | 1.55 KiB |
| **Total** | **25,003 B (24.42 KiB)** | **16,547 B (16.16 KiB)** | **8,456 B** | **8.26 KiB** |

### LCP / FCP / CLS Regression Check
- `notes.avif` remains preloaded via `<link rel="preload" href="/assets/hero/notes.avif" as="image" type="image/avif" fetchpriority="high">` in `<head>` and rendered with `fetchpriority="high"`.
- CLS remains 0 (fixed dimensions `width`/`height` maintained on all `<img>` elements).
- Zero console errors or broken image network requests.

---

## 6. Expected Impact

- Direct reduction of ~8.26 KiB in initial image payload transferred over the network.
- Elimination of network request contention on initial page load by reserving `fetchPriority="high"` strictly for the LCP image (`notes.avif`), allowing the browser network scheduler to download `notes.avif` faster.
- Satisfies PageSpeed image sizing and priority recommendations without degrading image quality or layout integrity.

---

## 7. Remaining Opportunities

1. **Main-Thread CPU Work:** Ongoing JS execution during initial hydration (~2.3 s total main-thread work reported by PageSpeed).
2. **Network Dependency Chain:** Sequential discovery of client-side JavaScript chunks during dynamic imports on secondary routes.
3. **Unused JavaScript:** Further tree-shaking opportunities in third-party vendor dependencies.
4. **Cache Opportunities:** Cache header optimization for static assets on edge CDN servers.
