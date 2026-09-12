# Horizon — Google Indexing / Crawlability Audit

## 1. Executive Summary

This read-only audit investigates the Google Search Console (GSC) report indicating approximately **98 affected URLs** sitting in the **"Discovered - currently not indexed"** state for Horizon (`https://unfollowaman.tech`).

### Primary Root Cause Findings
1. **Sitemap Trailing Slash Mismatch & HTTP 308 Redirect Loop (P0)**:
   - `scripts/generate-sitemap.js` generates 99 URLs without trailing slashes (e.g., `https://unfollowaman.tech/resource/87`, `https://unfollowaman.tech/library/class-10`).
   - Cloudflare Pages serves pre-rendered static HTML via directory structure (`dist/resource/87/index.html`), causing Cloudflare Edge to issue a **308 Permanent Redirect** for all 99 non-trailing slash URLs to their trailing slash equivalent (`/resource/87/`).
   - Consequently, **80.5% (99 out of 123)** of all URLs submitted in `sitemap.xml` return a `308 Permanent Redirect` on initial fetch rather than a direct `200 OK`. Googlebot discovers these URLs via sitemap, encounters a redirect on first attempt, and deprioritizes crawling until redirect chains are resolved or crawl budget permits.
2. **Canonical Tag vs URL Mismatch (P1)**:
   - Pre-rendered HTML files contain canonical tags without trailing slashes (e.g., `<link rel="canonical" href="https://unfollowaman.tech/resource/87">`).
   - When Googlebot requests `https://unfollowaman.tech/resource/87/` (which returns HTTP 200 OK), the canonical tag points back to `https://unfollowaman.tech/resource/87` (which returns HTTP 308).
   - This creates a **canonical circular dependency** between the serving URL and canonical tag, confusing Google's canonicalization algorithm.
3. **Internal Links Missing Trailing Slashes (P1)**:
   - Pre-rendered HTML contains internal `<a href="...">` links formatted without trailing slashes (e.g., `<a href="/resource/27">`). Every internal click traversed by Googlebot requires an HTTP 308 redirect hop.
4. **23 Syllabus Routes Un-prerendered in Initial HTML (P1)**:
   - 23 `/syllabus` routes are listed in `sitemap.xml`, but `scripts/prerender.js` does NOT pre-render syllabus routes. Raw HTTP responses for `/syllabus/...` return an unrendered SPA shell (`<div id="root"></div>` without syllabus text or internal links), leaving Googlebot unable to discover or index syllabus content without executing JavaScript.

---

## 2. Current GSC Situation

### "Discovered - currently not indexed" vs "Crawled - currently not indexed"

It is critical to distinguish between these two Google Search Console statuses:

- **"Crawled - currently not indexed"**: Googlebot fetched and rendered the page, received 200 OK HTML, but decided not to index it due to thin content, duplicate content, low quality, or soft 404s.
- **"Discovered - currently not indexed"**: Google has discovered the URLs (typically via `sitemap.xml` or incoming links) but **has NOT yet crawled or fetched the HTML content**.

### Why This Distinction Matters for Horizon
1. Googlebot has **not evaluated or rejected** Horizon's educational content quality.
2. The issue is **crawl queue prioritization and discovery efficiency**, NOT content rejection, penalties, or quality demotions.
3. Because 99 out of 123 URLs in `sitemap.xml` return HTTP 308 redirects upon initial fetch, Googlebot encounters unnecessary HTTP redirect hops on initial discovery, consuming crawl budget and causing URLs to linger in the "Discovered" queue.

---

## 3. Site Architecture Relevant to Crawling

- **Framework & Runtime**: React 19, TypeScript, Vite, TailwindCSS, Supabase (`@supabase/supabase-js`).
- **Hosting / Deployment**: Hosted on Cloudflare Pages (`https://unfollowaman.tech`).
- **Routing**: Client-side routing via React Router DOM (`src/App.tsx`).
- **Pre-rendering Mechanism**: Build-time static pre-rendering via `scripts/prerender.js` running after `vite build`. It injects static semantic HTML and Schema.org JSON-LD into `dist/resource/<id>/index.html`, `dist/library/.../index.html`, `dist/notes/.../index.html`, and static info pages.
- **Cloudflare Directory Routing**: Cloudflare Pages maps clean URLs ending in slashes (`/resource/87/`) directly to static `index.html` files (`dist/resource/87/index.html`). Non-trailing slash requests (`/resource/87`) are redirected via **308 Permanent Redirect** to `/resource/87/`.
- **Protected PDF Isolation**: Public educational landing pages (`/resource/:id`) return pre-rendered HTML with summaries and schema metadata. Protected PDF viewing occurs under `/view/:id` and Edge Functions (`resource-access`), which are strictly disallowed in `robots.txt` (`Disallow: /view/`) and omitted from sitemaps.

---

## 4. Phase 1 — Technical Accessibility

### Findings
- **HTTP Status Codes**: All pre-rendered endpoints return HTTP 200 OK when requested with a trailing slash (`/resource/87/`, `/library/class-10/`).
- **Redirects**: Requesting non-trailing slash URLs (`/resource/87`, `/library`, `/about`) triggers an HTTP 308 redirect from Cloudflare Pages to the trailing-slash variant.
- **Indexability Directives**: Public pages contain no `noindex` or `nofollow` directives. `robots.txt` correctly allows crawling on `/library`, `/notes`, `/resource`, `/syllabus`, `/about`, `/contact`, `/terms`, `/privacy-policy`, and `/attribution`.
- **Protected Endpoints**: `/dashboard`, `/settings/`, `/onboarding`, `/login`, `/register`, `/coming-soon`, and `/view/` are properly blocked in `robots.txt`.

### Evidence
```bash
$ curl -s -I -A "Googlebot" https://unfollowaman.tech/resource/87
HTTP/2 308
location: /resource/87/

$ curl -s -I -A "Googlebot" https://unfollowaman.tech/resource/87/
HTTP/2 200
content-type: text/html; charset=utf-8
```

### Affected Routes
- 66 Resource Landing Pages (`/resource/:id`)
- 19 Library Category Pages (`/library/...`)
- 9 Study Notes Category Pages (`/notes/...`)
- 5 Static Information Pages (`/about`, `/contact`, `/terms`, `/privacy-policy`, `/attribution`)

### Severity
**P0 - Critical**: 80.5% of sitemap URLs require a redirect hop, directly delaying crawl processing by Googlebot.

### Recommendations
1. Update `scripts/generate-sitemap.js` and `scripts/prerender.js` to standardize all generated URLs with trailing slashes.
2. Standardize canonical tags in pre-rendered HTML to match the trailing slash URL format.

---

## 5. Phase 2 — Internal Linking

### Findings
1. **Homepage Internal Links**: Initial raw HTML of `https://unfollowaman.tech/` contains crawlable `<a href="...">` links to `/library`, `/notes`, `/about`, `/contact`, `/terms`, `/privacy-policy`, and `/attribution`. However, these hrefs lack trailing slashes, causing Googlebot to hit 308 redirects on internal navigation.
2. **Library & Category Internal Links**: Raw HTML of `/library/` contains direct `<a href="/resource/39">` links to resources. They are crawlable without JavaScript execution, but also lack trailing slashes.
3. **Syllabus Internal Linking Gap**: The homepage and header navigation do NOT contain any link to `/syllabus`. Furthermore, raw HTML for `/syllabus` routes contains zero internal links because syllabus pages are not pre-rendered.

### Crawlable Link Traversal Matrix

| Hierarchy Level | Crawlable `<a href>` Present? | URL Status Code | Accessible Without JS? |
| :--- | :--- | :--- | :--- |
| Homepage (`/`) -> Library (`/library/`) | Yes (`<a href="/library">`) | 308 -> 200 | Yes |
| Library (`/library/`) -> Category (`/library/class-10/`) | Yes | 308 -> 200 | Yes |
| Category -> Resource (`/resource/87/`) | Yes (`<a href="/resource/87">`) | 308 -> 200 | Yes |
| Homepage (`/`) -> Syllabus (`/syllabus`) | No (Missing in header/home) | 200 (Empty Shell) | No |
| Syllabus (`/syllabus`) -> Syllabus Class/Subject | No (JS rendering only) | 200 (Empty Shell) | No |

### Severity
**P1 - High**: Internal links trigger unnecessary 308 redirects and syllabus routes are invisible to raw HTML crawlers.

### Recommendations
1. Standardize internal `<a href="...">` URLs across pre-renderer templates to include trailing slashes.
2. Add a crawlable `/syllabus` link to header/footer navigation.
3. Extend `scripts/prerender.js` to pre-render static HTML for `/syllabus` routes.

---

## 6. Phase 3 — Sitemap

### Sitemap Architecture
`scripts/generate-sitemap.js` queries active resources from Supabase and generates `public/sitemap.xml` during `npm run build`.

### URL Inventory Breakdown (Total: 123 URLs)
- **1** Homepage (`https://unfollowaman.tech`)
- **5** Static Pages (`/about`, `/contact`, `/terms`, `/privacy-policy`, `/attribution`)
- **19** Library Category Pages (`/library`, `/library/class-10`, etc.)
- **9** Study Notes Category Pages (`/notes`, `/notes/class-10/english-medium`, etc.)
- **23** Syllabus Pages (`/syllabus`, `/syllabus/class-10`, `/syllabus/class-10/science`, etc.)
- **66** Individual Resource Landing Pages (`/resource/27` to `/resource/87`)

### Problems Found
1. **Redirect Distribution**: **99 out of 123 URLs (80.5%)** return 308 redirects because sitemap URLs omit trailing slashes.
2. **Non-Prerendered URLs Included**: 23 `/syllabus` URLs are submitted in `sitemap.xml` despite returning empty SPA application shells without initial pre-rendered HTML content.
3. **Sitemap XML Structure**: Valid XML structure with accurate `<lastmod>`, `<changefreq>`, and `<priority>`. Reference is correctly present in `public/robots.txt`.

### Protected Content Assessment
Zero protected PDF viewer endpoints (`/view/:id`) or private user routes (`/dashboard`) are present in `sitemap.xml`. Protected content isolation is 100% compliant.

### Severity
**P0 - Critical**: Submitting 99 redirecting URLs in `sitemap.xml` severely impairs Search Console processing.

### Recommendations
Update `generateSitemapUrls()` in `scripts/generate-sitemap.js` to format all generated URLs with trailing slashes.

---

## 7. Phase 4 — Public Resource HTML

### Resource Page Architecture
Public resource landing pages (`/resource/:id`) deliver pre-rendered static HTML generated by `generateResourceHtml()` in `scripts/prerender.js`.

### Raw HTML Assessment (`/resource/87/`)
- **`<title>`**: `Chapter 1: Resources and Development | Class 10 Social Science | Horizon`
- **`<meta name="description">`**: Genuine 155-character educational summary text.
- **`<link rel="canonical">`**: `https://unfollowaman.tech/resource/87` (Missing trailing slash).
- **Heading Structure**: Single `<h1>` (`CHAPTER 1: RESOURCES AND DEVELOPMENT`), structured `<h2>` headings for Overview, Topics Covered, Study Guidance, Resource Details, and Related Resources.
- **Content Uniqueness**: Includes complete chapter overview, key topic bullet points, study guidance steps, class/medium metadata, and related resource links.
- **Schema.org Structured Data**: Valid JSON-LD `@type: EducationalResource` block embedded in `<script type="application/ld+json">`.
- **Protected PDF Separation**: Excludes all signed URLs, `storage_bucket`, `file_path`, and PDF iframe embeds. CTA links cleanly to `/view/87`.

### Severity
**P1 - High**: Content quality and HTML structure are excellent; the only flaw is the canonical tag lacking a trailing slash.

---

## 8. Cross-Phase Findings

```
[sitemap.xml] -> URL: /resource/87 (No trailing slash)
       │
       ▼ (Googlebot fetches)
[Cloudflare Pages] -> HTTP 308 Permanent Redirect to /resource/87/
       │
       ▼ (Googlebot follows redirect)
[Fetch /resource/87/] -> HTTP 200 OK (Pre-rendered Static HTML)
       │
       ▼ (Googlebot inspects HTML)
[Canonical Tag] -> <link rel="canonical" href="/resource/87"> (No trailing slash)
       │
       ▼ (Circular Conflict)
Googlebot sees canonical pointing back to the 308 redirect URL!
```

This cross-phase interaction explains why Googlebot discovers the URLs via sitemap, encounters a redirect on first fetch, sees a canonical tag pointing back to the redirecting URL, and leaves the page in "Discovered - currently not indexed".

---

## 9. Root-Cause Assessment

### Priority Ranking Table

| Priority | Issue | Evidence | Affected Routes | Impact | Confidence | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P0** | **Sitemap URLs Cause HTTP 308 Redirects** | 99/123 sitemap URLs return 308 redirect on `curl` | All `/resource/*`, `/library/*`, `/notes/*`, static pages | Googlebot discovers redirect URLs, delaying crawl execution | 100% | Append trailing slashes to all URLs in `scripts/generate-sitemap.js` |
| **P1** | **Canonical Tag URL Mismatch** | Pre-rendered HTML contains `<link rel="canonical" href="https://unfollowaman.tech/resource/87">` | All `/resource/*`, `/library/*`, `/notes/*` static HTML | Creates canonical circular loop with 308 redirect URL | 100% | Standardize `canonicalUrl` in `scripts/prerender.js` to include trailing slash |
| **P1** | **Internal Links Omit Trailing Slashes** | `<a href="/resource/27">` in pre-rendered HTML | All internal HTML links | Forces redirect hop on every internal crawl traversal | 100% | Append trailing slashes to internal `href` targets in pre-rendering templates |
| **P1** | **23 Syllabus Routes Un-prerendered** | `/syllabus/class-10` returns `<div id="root"></div>` without syllabus text | All 23 `/syllabus/*` routes | Crawlers receive empty HTML shell for syllabus pages | 100% | Add syllabus pre-rendering step in `scripts/prerender.js` or adjust sitemap |
| **P2** | **Missing Homepage Link to Syllabus** | Homepage HTML lacks `<a href="/syllabus">` link | `/syllabus` landing pages | Syllabus section relies on sitemap for discovery (orphaned from home) | 100% | Add `/syllabus` link to main header/footer navigation |

---

## 10. Confirmed vs Suspected Factors

### Confirmed Findings (Directly Verified)
1. 99 out of 123 URLs in `public/sitemap.xml` return HTTP 308 redirects upon initial fetch.
2. Pre-rendered HTML canonical tags omit trailing slashes, creating a canonical conflict with Cloudflare Pages' 308 redirect behavior.
3. Internal `<a href="...">` links omit trailing slashes.
4. `/syllabus` routes listed in `sitemap.xml` return un-prerendered HTML shells.
5. Homepage initial HTML does not link to `/syllabus`.
6. Public resource landing pages (`/resource/:id`) contain rich, crawlable HTML summaries and valid Schema.org structured data.
7. Protected PDF viewing endpoints (`/view/:id`) are strictly disallowed in `robots.txt` and omitted from sitemaps.

### Suspected / Likely Contributing Factors
1. The recent addition of 66 resource pages and 28 category pages to `sitemap.xml` flooded Googlebot's crawl queue with 99 redirecting URLs simultaneously, triggering Google's crawl budget throttling.

### Ruled-Out Factors
1. **Robots.txt Blocking**: Verified that `public/robots.txt` does NOT block `/library`, `/notes`, `/resource`, or `/syllabus`.
2. **Noindex Directives**: Verified 0 `noindex` tags across all public pre-rendered HTML pages.
3. **Thin Content / Soft 404s**: Verified that pre-rendered resource HTML contains substantial, unique text, H1-H3 headers, and Schema.org metadata.
4. **Google Penalty / Security Manual Action**: "Discovered - currently not indexed" is an automated crawl queue state, not a penalty or security classification.

---

## 11. What Is Already Correct

The following systems are working correctly and should **NOT** be modified:
1. **Protected PDF Isolation**: `/view/:id` and Edge Function endpoints are properly secured and isolated from public indexable pages.
2. **Schema.org Structured Data**: Pre-rendered JSON-LD `@type: EducationalResource` and `@type: CollectionPage` implementations are compliant and secure.
3. **Public Educational Content Density**: Public resource summaries, chapter outlines, and study guidance steps in HTML provide excellent search context.
4. **`robots.txt` Disallow Rules**: Private routes (`/dashboard`, `/settings/`, `/view/`) are accurately protected.

---

## 12. What Should NOT Be Done

1. **Do NOT expose protected PDFs or signed URLs** in public HTML or sitemaps to attempt to improve indexing.
2. **Do NOT add `noindex` directives** to public educational landing pages or category pages.
3. **Do NOT block public landing pages** (`/resource/*`, `/library/*`, `/notes/*`) in `robots.txt`.
4. **Do NOT blindly request indexing** for all 98 URLs in GSC before fixing trailing slash redirects and canonical tags.
5. **Do NOT inject artificial keyword stuffing** or repetitive boilerplate content into resource pages.

---

## 13. Recommended Fix Plan

### Immediate Fixes (P0 & P1)
1. **Standardize Trailing Slashes in Sitemap (`scripts/generate-sitemap.js`)**:
   Ensure `addUrl()` formats all canonical URLs with a trailing slash (except root `/`).
2. **Standardize Canonical Tags and Internal Links (`scripts/prerender.js`)**:
   Ensure `canonicalUrl` and internal `<a href="...">` links end with trailing slashes (e.g., `${BASE_URL}/resource/${resource.id}/`).
3. **Pre-render Syllabus Routes**:
   Extend `scripts/prerender.js` to pre-render static HTML for all 23 `/syllabus` routes.

### Structural Improvements (P2)
1. **Add Nav Link to Syllabus**:
   Add a direct `<a href="/syllabus/">` link in `MainLayout` / header navigation to ensure full internal crawl traversal.

### Monitoring
1. After deploying fixes, submit the updated `sitemap.xml` in Google Search Console and request indexing for 3-5 key representative trailing-slash URLs (`/resource/87/`, `/library/class-10/`).
2. Monitor GSC Indexing Report over 14-30 days to observe transition from "Discovered" to "Indexed".

---

## 14. Validation Plan

After any future fix implementation, verify using the following steps:
1. **Local Build & Pre-rendering Check**:
   Run `npm run build` and verify that `dist/` contains pre-rendered HTML for resources, categories, static pages, and syllabus routes.
2. **Trailing Slash HTTP Status Check**:
   Run a curl script against all sitemap URLs to confirm **100% of sitemap URLs return HTTP 200 OK** without any 308 redirects.
3. **Canonical Matching Verification**:
   Verify that for every URL `https://unfollowaman.tech/path/`, the in-page `<link rel="canonical">` exactly matches `https://unfollowaman.tech/path/`.
4. **Google Search Console URL Inspection**:
   Use GSC Live Test on `https://unfollowaman.tech/resource/87/` to confirm Googlebot receives 200 OK, detects canonical self-referencing, and renders full HTML content.

---

## 15. Appendix

### Audited Representative URLs & HTTP Status Summary

| Representative URL | Initial Fetch Status | Final Redirect Target | Canonical Tag In HTML |
| :--- | :--- | :--- | :--- |
| `https://unfollowaman.tech/` | 200 OK | - | `https://unfollowaman.tech/` |
| `https://unfollowaman.tech/about` | 308 Redirect | `/about/` | `https://unfollowaman.tech/about` |
| `https://unfollowaman.tech/library` | 308 Redirect | `/library/` | `https://unfollowaman.tech/library` |
| `https://unfollowaman.tech/library/class-10` | 308 Redirect | `/library/class-10/` | `https://unfollowaman.tech/library/class-10` |
| `https://unfollowaman.tech/notes/class-10/english-medium` | 308 Redirect | `/notes/class-10/english-medium/` | `https://unfollowaman.tech/notes/class-10/english-medium` |
| `https://unfollowaman.tech/resource/87` | 308 Redirect | `/resource/87/` | `https://unfollowaman.tech/resource/87` |
| `https://unfollowaman.tech/resource/87/` | 200 OK | - | `https://unfollowaman.tech/resource/87` |
| `https://unfollowaman.tech/syllabus` | 200 OK | - | None (Unrendered SPA shell) |
| `https://unfollowaman.tech/syllabus/class-10` | 200 OK | - | None (Unrendered SPA shell) |

### Key Repository Files Reference
- `scripts/generate-sitemap.js`: Sitemap generation logic.
- `scripts/prerender.js`: Build-time static pre-rendering script.
- `public/robots.txt`: Search engine crawling rules.
- `public/sitemap.xml`: Production sitemap file.
- `src/App.tsx`: Route definitions and code-splitting configuration.
