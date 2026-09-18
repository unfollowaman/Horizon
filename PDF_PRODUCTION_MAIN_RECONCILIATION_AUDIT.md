# Executive Summary

This forensic investigation reconciles the apparent contradiction between the current `origin/main` repository state (`1637bbb2620ba447b6821d43a59ff54fca30b4b6`) and the live production website (`https://unfollowaman.tech`).

The audit reveals that **live Cloudflare production IS running the exact build of `origin/main` (`1637bbb`)**. There is **zero deployment lag, zero stale asset caching, and zero CDN divergence**. The local build of commit `1637bbb` produces JS chunks (`index-B7uoCWrW.js` and `PdfViewer-BaU4Adbt.js`) that are **byte-for-byte identical** to those served by Cloudflare Pages (`https://unfollowaman.tech` and `https://06b07907.tryhorizon.pages.dev`).

The root cause of the PDF.js worker failure in production is a **bundler module-specifier resolution mismatch during Vite compilation**:
In `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx`, the code specifies:
```ts
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
```
Because `'pdfjs-dist/build/pdf.worker.min.mjs'` is a **bare package specifier** rather than a relative path (e.g. `'pdfjs-dist/build/pdf.worker.min.mjs'` vs `'./'` or `'pdfjs-dist/build/pdf.worker.min.mjs?url'`), Vite's static asset bundler fails to resolve it as a physical file on disk at build time. Vite emits a build-time warning:
> `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url) doesn't exist at build time, it will remain unchanged to be resolved at runtime.`

Consequently, Vite compiles the source into verbatim JavaScript inside `PdfViewer-BaU4Adbt.js`:
```js
cr.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", "" + import.meta.url).toString();
```
When executed in the user's browser on `https://unfollowaman.tech/view/27` (where `import.meta.url` is `https://unfollowaman.tech/assets/PdfViewer-BaU4Adbt.js`), the browser evaluates `new URL("pdfjs-dist/build/pdf.worker.min.mjs", "https://unfollowaman.tech/assets/PdfViewer-BaU4Adbt.js")`, constructing the URL:
```text
https://unfollowaman.tech/assets/pdfjs-dist/build/pdf.worker.min.mjs
```
Because no asset exists at `/assets/pdfjs-dist/build/pdf.worker.min.mjs`, Cloudflare Pages' Single Page Application (SPA) fallback intercepts the request and returns the site's `index.html` (`Content-Type: text/html; charset=utf-8`). The browser fails to parse HTML as an ES module worker, falls back to a fake worker, and fails to render the PDF.

---

# Current Contradiction

## Reality A — Reported Local Behavior vs Actual Build Evidence
Prior reports suggested that `origin/main` at `1637bbb` built a hashed worker asset in `dist/assets/` (such as `pdf.worker.min-qwK7q_zL.mjs`) and that local production preview served it successfully with HTTP 200 `application/javascript`.

**Forensic Finding on Reality A:**
A fresh build (`pnpm run build` or `npm run build`) of `origin/main` (`1637bbb`) in a clean environment produces **NO worker file in `dist/assets/`**.
Command `find dist/ -name "*worker*"` returns **empty output**.
Vite explicitly emits:
`new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url) doesn't exist at build time, it will remain unchanged to be resolved at runtime.`
If a local preview previously succeeded, it was either running against a different branch/working state with `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`, or serving a stale node_modules file via dev-server middleware that is not copied to production `dist/`.

## Reality B — Actual Live Production Behavior
When visiting `https://unfollowaman.tech/view/27`:
1. HTML loads `/assets/index-B7uoCWrW.js`.
2. `/assets/index-B7uoCWrW.js` dynamically imports `/assets/PdfViewer-BaU4Adbt.js`.
3. `/assets/PdfViewer-BaU4Adbt.js` executes `cr.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", "" + import.meta.url).toString()`.
4. Browser issues GET to `https://unfollowaman.tech/assets/pdfjs-dist/build/pdf.worker.min.mjs`.
5. Cloudflare returns HTTP 200 with `Content-Type: text/html; charset=utf-8` (SPA fallback).
6. Console logs: `Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html"`.
7. PDF fails to render.

---

# Cloudflare Production Configuration

* **Production Branch:** `main`
* **Automatic Deployments:** Enabled
* **Current Production Commit:** `1637bbb`
* **Production Status:** Successful
* **Custom Domain:** `https://unfollowaman.tech`
* **Cloudflare Preview URL:** `https://06b07907.tryhorizon.pages.dev`
* **Build Command:** `npm run build`
* **Build Output Directory:** `dist`
* **Build Cache:** Disabled
* **Build System:** Version 3

---

# Current Production Deployment Identity

A side-by-side byte comparison between `https://unfollowaman.tech` and `https://06b07907.tryhorizon.pages.dev` was performed:
* Both serve identical `index.html`.
* Both reference identical entry bundle `/assets/index-B7uoCWrW.js`.
* Both load identical PDF viewer chunk `/assets/PdfViewer-BaU4Adbt.js`.
* Both return HTTP 200 `text/html` SPA fallback for `/assets/pdfjs-dist/build/pdf.worker.min.mjs`.

The custom domain and the Cloudflare Pages deployment deployment URL point to the **exact same deployment artifact**.

---

# Actual Production HTML

GET `https://unfollowaman.tech` returns:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    ...
    <script type="module" crossorigin src="/assets/index-B7uoCWrW.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-CoYQUYu_.css">
  </head>
  <body>
    <div id="root">...</div>
  </body>
</html>
```

---

# Actual Production JavaScript Chunks

* **Entry Chunk:** `/assets/index-B7uoCWrW.js`
* **PDF Viewer Chunk:** `/assets/PdfViewer-BaU4Adbt.js`
* **CSS Chunk:** `/assets/PdfViewer-CMWhcvJC.css`

---

# Actual Production PDF Viewer Code

Inspecting `/assets/PdfViewer-BaU4Adbt.js` directly from `https://unfollowaman.tech`:
```javascript
cr.workerSrc=new URL(`pdfjs-dist/build/pdf.worker.min.mjs`,``+import.meta.url).toString();
```
This confirms that the production JS chunk contains verbatim string literal `"pdfjs-dist/build/pdf.worker.min.mjs"`.

---

# Actual Production Worker URL

The resulting worker URL calculated at runtime by the browser is:
`https://unfollowaman.tech/assets/pdfjs-dist/build/pdf.worker.min.mjs`

---

# Actual Production Worker Response

GET `https://unfollowaman.tech/assets/pdfjs-dist/build/pdf.worker.min.mjs`
* **HTTP Status:** 200 OK
* **Content-Type:** `text/html; charset=utf-8`
* **Cache-Control:** `public, max-age=0, must-revalidate`
* **Server:** `cloudflare`
* **Response Body:** Full SPA `index.html` markup.

---

# Current origin/main PDF Viewer Code

In `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` at commit `1637bbb`:
```typescript
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
```

---

# Local Production Build of 1637bbb

Executing `pnpm run build` locally on commit `1637bbb`:
1. `node scripts/generate-sitemap.js` completes.
2. `tsc -b` passes with zero errors.
3. `vite build` outputs:
   `dist/assets/index-B7uoCWrW.js` (288.37 kB)
   `dist/assets/PdfViewer-BaU4Adbt.js` (443.67 kB)
   Warning emitted:
   `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url) doesn't exist at build time, it will remain unchanged to be resolved at runtime.`
4. `node scripts/prerender.js` completes.

---

# Local Generated Worker

Running `find dist/ -name "*worker*"` yields **NO files**.
Vite does **not** copy or bundle `pdf.worker.min.mjs` into `dist/assets/` when `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` is used with a bare package specifier in Vite 8.

---

# Local Compiled Worker URL

Inspecting local build file `dist/assets/PdfViewer-BaU4Adbt.js`:
```javascript
cr.workerSrc=new URL(`pdfjs-dist/build/pdf.worker.min.mjs`,``+import.meta.url).toString();
```
The compiled worker URL expression in local `dist` is identical to live production.

---

# Local vs Production Artifact Comparison

Executing `diff -u <(curl -s https://unfollowaman.tech/assets/PdfViewer-BaU4Adbt.js) dist/assets/PdfViewer-BaU4Adbt.js`:
* **Result:** Zero diff (identical).

Executing `diff -u <(curl -s https://unfollowaman.tech/assets/index-B7uoCWrW.js) dist/assets/index-B7uoCWrW.js`:
* **Result:** Zero diff (identical).

**Conclusion:** Local `dist` produced from `1637bbb` is **100% identical** to Cloudflare production.

---

# Cloudflare Deployment vs origin/main Comparison

Cloudflare deployed commit `1637bbb` cleanly. There is no discrepancy between what Cloudflare built and what local `1637bbb` builds. Both produce the broken worker URL resolution because the source code construct `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` is not recognized by Vite bundler as an asset import for package dependencies.

---

# Cache / Stale Asset Investigation

* **Server Cache:** `cf-cache-status: DYNAMIC`, `cache-control: public, max-age=0, must-revalidate`.
* **Asset Hashes:** `index-B7uoCWrW.js` and `PdfViewer-BaU4Adbt.js` are fresh hashed assets.
* **Result:** Browser cache / Cloudflare CDN cache is **NOT** serving stale assets. The current fresh production JS file itself contains the unresolved path.

---

# Multiple Viewer / Worker Mechanism Investigation

* Only one PDF viewer implementation exists in `src/pages/resources/pdf-viewer/`.
* `PdfDocumentRenderer.tsx` sets `pdfjs.GlobalWorkerOptions.workerSrc`.
* No duplicate or alternative viewer chunks exist in production or `dist/`.

---

# Generated / Static Asset Investigation

* Build scripts (`generate-sitemap.js`, `prerender.js`) do not touch or modify JavaScript asset files in `dist/assets/`.
* No post-build script exists to copy worker files from `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` into `dist/assets/`.

---

# Jules Local Verification Reconciliation

Why did previous reports state that Jules verified a working local production preview with a hashed worker such as `dist/assets/pdf.worker.min-qwK7q_zL.mjs`?

1. **Explicit URL Import Syntax (`?url` or ESM Worker Import):** In Vite, asset bundling from `node_modules` only occurs when using Vite explicit suffix syntax such as `import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` or `import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'`.
2. When `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` was used without relative file paths or explicit Vite import query parameters, Vite treated `'pdfjs-dist/build/pdf.worker.min.mjs'` as an unbundled dynamic URL string.
3. Therefore, any test that observed a hashed worker asset like `pdf.worker.min-qwK7q_zL.mjs` was tested under code using `import workerUrl from '... ?url'` or a custom Vite config/copy plugin, whereas commit `1637bbb` currently in `origin/main` uses `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` which Vite ignores.

---

# Timeline of Worker URL Changes

1. **Commit `1637bbb`:** Merged PR #414 containing `PdfDocumentRenderer.tsx` with `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`.
2. **Vite Build Execution:** `vite build` logged warning that `'pdfjs-dist/build/pdf.worker.min.mjs'` doesn't exist as a relative file path, leaving string untouched.
3. **Cloudflare Deployment:** Cloudflare built `1637bbb` into `dist/` and deployed chunk `PdfViewer-BaU4Adbt.js`.
4. **Runtime Execution:** Client browser requests `/assets/pdfjs-dist/build/pdf.worker.min.mjs` -> Cloudflare SPA fallback returns HTML -> PDF.js fails.

---

# Root Cause

**Classification:** Category B & A Layering — **Current `main` source code uses a URL construct (`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`) that Vite bundler cannot resolve for bare node_modules package specifiers.**

Vite requires relative path specifiers (e.g., `./` or `../`) for asset resolution via `new URL(path, import.meta.url)` or explicit asset imports with `?url` (e.g., `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`). Without this, Vite passes the bare package specifier verbatim into the output bundle, causing browser relative URL resolution against `/assets/`, leading to 404/SPA HTML fallback.

---

# Confidence Level

**100% (HIGH CONFIDENCE)** — Verified by direct byte-level comparison of local build outputs against live Cloudflare production responses (`https://unfollowaman.tech/assets/PdfViewer-BaU4Adbt.js`).

---

# Evidence Table

| Layer | Expected | Actual | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **origin/main source** | Valid bundler worker import | Bare specifier in `new URL()` | ❌ Flawed | `PdfDocumentRenderer.tsx` line 7 |
| **Vite build log** | Asset emitted to `dist/assets/` | Build warning: `doesn't exist at build time` | ❌ Warning | `pnpm run build` stdout |
| **Local dist/ output** | `dist/assets/pdf.worker...` generated | 0 worker files in `dist/assets/` | ❌ Missing | `find dist/ -name "*worker*"` |
| **Local JS chunk** | Bundled worker URL | `new URL("pdfjs-dist/build/pdf.worker.min.mjs", "" + import.meta.url)` | ❌ Unresolved | `dist/assets/PdfViewer-BaU4Adbt.js` |
| **Cloudflare production** | Same as local build | `PdfViewer-BaU4Adbt.js` (0 byte diff) | 🟢 Matches | `curl https://unfollowaman.tech/assets/PdfViewer-BaU4Adbt.js` |
| **Production HTML** | Entry script `index-B7uoCWrW.js` | `index-B7uoCWrW.js` | 🟢 Matches | `curl https://unfollowaman.tech` |
| **Worker Request** | JS worker file | `/assets/pdfjs-dist/build/pdf.worker.min.mjs` | ❌ Broken URL | Browser DevTools / curl |
| **Worker HTTP Response** | 200 `application/javascript` | 200 `text/html` (SPA fallback) | ❌ HTML Fallback | `curl -sI https://unfollowaman.tech/assets/pdfjs-dist/build/pdf.worker.min.mjs` |

---

# Recommended Minimal Fix

In `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx`, replace the bare `new URL()` specifier with Vite's explicit URL import suffix for package assets:

```typescript
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
```

When Vite sees `import ... from '... ?url'`, Vite's asset plugin automatically copies `pdf.worker.min.mjs` from `node_modules/pdfjs-dist/build/` into `dist/assets/pdf.worker.min-[hash].mjs` during `vite build` and sets `pdfWorkerUrl` to the hashed asset path string `/assets/pdf.worker.min-[hash].mjs`.

---

# What Must NOT Be Changed

* Do NOT change Cloudflare build settings, branch configurations, or SPA routing rules.
* Do NOT change PDF.js version in `package.json`.
* Do NOT add manual copy scripts or public folder duplications if Vite asset imports (`?url`) resolve it cleanly.
* Do NOT modify signed URL handling or Supabase edge function access logic.

---

# Concise Conclusion

1. **What is definitely correct:** Cloudflare deployment pipeline is operating perfectly. Production is running the exact build of `origin/main` commit `1637bbb`.
2. **What is definitely wrong:** `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` uses `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`. Vite ignores bare package specifiers in `new URL()`, resulting in no worker asset being emitted into `dist/assets/`.
3. **Where the old worker path is coming from:** Browser evaluates the unresolved string `"pdfjs-dist/build/pdf.worker.min.mjs"` relative to base `/assets/`, requesting `/assets/pdfjs-dist/build/pdf.worker.min.mjs`.
4. **Which exact commit/file/artifact introduced or preserved it:** `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` introduced in commit `1637bbb`.
5. **Whether production is running the same artifact Jules tested:** Production IS running the exact build of `1637bbb`. The previous test report that claimed a hashed worker asset was generated locally was mistaken or executed against modified source code.
6. **What the smallest next remediation should be:** Change worker assignment in `PdfDocumentRenderer.tsx` to `import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` and set `pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl`.
