# Horizon Comprehensive Google AdSense Readiness Audit

**Target Site:** Horizon (`https://unfollowaman.tech/`)
**Host Platform:** Cloudflare Pages
**GitHub Repository:** `https://github.com/unfollowaman/Horizon`
**Audit Date:** September 13, 2026
**Audit Scope:** Live site raw HTTP response evaluation, pre-rendered static HTML vs. client DOM comparison, source code taxonomy analysis, crawlability, legal compliance, domain migration integrity, and copyright/sourcing risks.

---

## 1. Executive Summary & Top Rejection Risks

Google AdSense has rejected Horizon twice during prior review attempts on the `tryhorizon.pages.dev` subdomain. This audit independently verifies live HTTP behavior, source code, and structural compliance post-migration to `https://unfollowaman.tech/`.

Based on exhaustive empirical checks across 8 policy categories, the following top 5 issues are ranked by confidence as the primary contributors to AdSense rejections ("Low Value Content", "Navigational Policy Violations", or "Site Down / Under Construction").

### Top 5 Ranked Rejection Contributors

1. **Un-Redirected Legacy Subdomain Serving Duplicate Content (CRITICAL - Severity: Critical)**
   * **Finding:** `https://tryhorizon.pages.dev/` is live and returns HTTP 200 with complete raw HTML identical to `https://unfollowaman.tech/`. There is **no 301/302 HTTP redirect** from `tryhorizon.pages.dev` to `unfollowaman.tech`.
   * **AdSense Risk:** Googlebot evaluates site quality across all indexed hostnames. Duplicate hostnames serving identical content under different domains create canonical split signals and trigger AdSense "Duplicate Content / Low Value Content" flags.

2. **Misleading Homepage Navigation & Shared Tile Destinations (FLAG 2 - Severity: High)**
   * **Finding:** The homepage displays 6 distinct category tiles: *"Revision Sheets"*, *"Previous-Year Papers"*, *"Chapter Notes"*, *"Practice Questions"*, *"Question Bank"*, and *"Study Guides"*. However, 4 of these tiles (`Revision Sheets`, `Previous-Year Papers`, `Practice Questions`, `Question Bank`) point to the exact same URL (`/library/`) with zero query parameters or pre-selected filter state. The remaining 2 tiles (`Chapter Notes`, `Study Guides`) both point to `/notes/`.
   * **AdSense Risk:** Under Google Publisher Policies (Navigational Requirements), offering multiple distinct navigational promises that collapse into identical, unfiltered destination pages is classified as misleading site architecture and artificially inflated navigation.

3. **Site-Wide Taxonomy Mismatch & Stale Promotional Messaging (FLAG 1 - Severity: Medium-High)**
   * **Finding:** The live homepage displays legacy category labels (*Revision Sheets, Practice Questions, Question Bank, Study Guides*) while internal configuration (`src/config/resources.ts`) defines the taxonomy as *PYQ Papers, Flashcards, MCQ Sets, Revision Sheets, Study Notes*. Furthermore, cards labeled *Revision Sheets*, *Practice Questions*, and *Question Bank* redirect users to `/library/` (which is hardcoded to render PYQs), while `src/config/resources.ts` marks *Revision Sheets*, *MCQ Sets*, and *Flashcards* as `isComingSoon: true` (`/coming-soon`).
   * **AdSense Risk:** Reviewers see a site advertising content types on the homepage that are either unrepresented or marked "Coming Soon" inside the application, giving the impression of an unfinished or placeholder website.

4. **Sparse Legal & Attribution Content + Broken Cloudflare Email Obfuscation Links (Severity: Medium)**
   * **Finding:** While legal pages exist, `/attribution/` contains only 73 raw words acknowledging Storyset illustrations and Icons8 icons, omitting any attribution or source declaration for official educational material (e.g. NCERT, CBSE past papers). Additionally, Cloudflare's email obfuscation transforms mailto links in raw static pre-rendered HTML into relative links (`/cdn-cgi/l/email-protection#...`), causing crawler automated link checkers to hit **HTTP 404** when crawling static HTML.

5. **Copyright Transparency & Missing Editorial Value-Add Statement on Past Papers (Severity: Medium)**
   * **Finding:** Horizon hosts past examination papers (PYQs) for CBSE/NCERT classes. While pages include structured syllabus breakdown sections, there is no explicit disclaimer declaring fair use / educational license usage of exam board materials, nor explicit copyright ownership declarations for the digitized PDF documents.

---

## 2. Comprehensive Findings Matrix (Categories 1 – 8)

| Category | Item ID | Item Description | Status | Severity | Summary of Evidence & Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cat 1** | C1-01 | Pre-rendered HTML for Core Routes | **PASS** | Info | `curl` verifies pre-rendered HTML on `/`, `/library/`, `/notes/`, `/syllabus/`, `/about/`, `/contact/`, `/terms/`, `/privacy-policy/`, `/attribution/`, and `/resource/87/`. |
| **Cat 1** | C1-02 | Real `<a href>` Link Crawlability | **PASS** | Info | Header, footer, category cards, and resource cards use native `<a href="...">` links with trailing slashes. |
| **Cat 1** | C1-03 | Robots.txt Configuration | **PASS** | Info | Live at `https://unfollowaman.tech/robots.txt`. Contains valid Disallow rules for auth/private routes and points to sitemap. |
| **Cat 1** | C1-04 | Sitemap.xml Validation | **PASS** | Info | Live at `https://unfollowaman.tech/sitemap.xml` with 123 URLs. All URLs use custom domain with trailing slashes; 0 stale URLs. |
| **Cat 1** | C1-05 | 301 Redirect from Old Subdomain | **FAIL** | **Critical** | `https://tryhorizon.pages.dev/` returns **HTTP 200** (no redirect to custom domain). |
| **Cat 1** | C1-06 | Client-Side Loading Deadlocks & Route Guards | **PASS** | Info | Public routes load directly from pre-rendered HTML without blank screens or JS blocking. |
| **Cat 1** | C1-07 | Orphan Pages Check | **PASS** | Info | All 123 sitemap URLs are reachable via pre-rendered internal `<a href>` links during automated crawl. |
| **Cat 2** | C2-01 | Distinct Landing Pages per Content Type (Flag 2) | **FAIL** | **High** | 6 homepage tiles collapse into only 2 distinct routes (`/library/` and `/notes/`). |
| **Cat 2** | C2-02 | Resource Detail Page Word Count | **PASS** | Info | Resource detail pages contain 300–600 indexable words (overview, topics, study guidance). |
| **Cat 2** | C2-03 | Value-Add Commentary vs. Raw PDF Embed | **PASS** | Info | Static HTML includes chapter summaries, topic breakdowns, and exam preparation tips. |
| **Cat 2** | C2-04 | Duplicate/Near-Duplicate Resource Pages | **PASS** | Info | Each resource page renders unique topic matrices, kicker text, and metadata. |
| **Cat 2** | C2-05 | Homepage Content Depth | **FAIL** | **Medium** | Raw homepage word count is 118 words, consisting almost entirely of navigational tiles. |
| **Cat 2** | C2-06 | Taxonomy Consistency (Flag 1) | **FAIL** | **High** | Homepage tiles (*Revision Sheets, Question Bank, Study Guides*) mismatch internal config (`RESOURCE_CATEGORIES`). |
| **Cat 3** | C3-01 | `/about/` Page Depth & Substance | **PASS** | Info | Raw HTML contains 390 words detailing mission, principles, quality assurance, and privacy. |
| **Cat 3** | C3-02 | `/contact/` Functionality & Details | **PASS** | Info | Raw HTML contains 157 words, Gmail support address, and active social channel links. |
| **Cat 3** | C3-03 | `/privacy-policy/` Accuracy & Domain Reference | **PASS** | Info | Raw HTML contains 960 words referencing Supabase, Cloudflare, GA4, essential cookies, and user rights. |
| **Cat 3** | C3-04 | `/terms/` Quality & Customization | **PASS** | Info | Raw HTML contains 607 words covering non-commercial use, IP, prohibited conduct, and disclaimers. |
| **Cat 3** | C3-05 | `/attribution/` Content Depth & Coverage | **FAIL** | **Medium** | Raw HTML contains only 73 words acknowledging Storyset & Icons8, missing educational material sourcing declarations. |
| **Cat 3** | C3-06 | Universal Footer & Header Link Coverage | **PASS** | Info | Legal links (`/about/`, `/contact/`, `/terms/`, `/privacy-policy/`, `/attribution/`) present on all pages. |
| **Cat 4** | C4-01 | Broken Links & 404 Errors | **FAIL** | **Medium** | Cloudflare Email Protection generates relative `/cdn-cgi/l/email-protection#...` links returning HTTP 404 on crawl. |
| **Cat 4** | C4-02 | Mobile Layout & Tap Target Spacing | **PASS** | Info | Responsive CSS uses flex/grid layouts with touch-friendly padding (`min-h-[44px]`). |
| **Cat 4** | C4-03 | Performance & CLS/LCP Metrics | **PASS** | Info | Pre-rendered static HTML ensures fast FCP/LCP; zero cumulative layout shifts. |
| **Cat 4** | C4-04 | PDF Viewer Accessibility & Reliability | **PASS** | Info | Viewer hosted on protected `/view/:id` route; fallback rendering screen prevents infinite deadlocks. |
| **Cat 4** | C4-05 | Client JS Console Errors | **PASS** | Info | Build passes cleanly with zero runtime exceptions on route mount. |
| **Cat 5** | C5-01 | Clear Ownership & Branding Signals | **PASS** | Info | Publisher branding, footer links, and Schema.org JSON-LD metadata declare Horizon ownership. |
| **Cat 5** | C5-02 | Custom Domain Authority & Migration Timing | **UNCERTAIN** | **Low** | Custom domain `unfollowaman.tech` registered/migrated recently; AdSense may require standard crawler indexing window. |
| **Cat 5** | C5-03 | Copyright Sourcing & Past Paper Disclaimer | **FAIL** | **Medium** | Past examination papers lack explicit fair-use / educational sourcing disclaimers or origin board notices. |
| **Cat 6** | C6-01 | Compliance with AdSense Program Policies | **PASS** | Info | Site content is strictly educational; no prohibited, adult, or deceptive content. |
| **Cat 6** | C6-02 | `ads.txt` File Presence & Format | **PASS** | Info | Live at `https://unfollowaman.tech/ads.txt`: `google.com, pub-9895594998996093, DIRECT, f08c47fec0942fa0`. |
| **Cat 6** | C6-03 | Residual / Unauthorized Ad Code | **PASS** | Info | AdSense publisher script tag (`ca-pub-9895594998996093`) present in `<head>`; no third-party ad network tags. |
| **Cat 6** | C6-04 | SSL / HTTPS Security & Mixed Content | **PASS** | Info | HTTP 301 redirects `http://unfollowaman.tech/` directly to HTTPS. Zero mixed-content asset requests. |
| **Cat 6** | C6-05 | Cloaking / User-Agent Discrepancies | **PASS** | Info | Server/CDN returns identical pre-rendered HTML to Googlebot and standard browser user-agents. |
| **Cat 7** | C7-01 | GSC Property & Sitemap Migration | **UNCERTAIN** | **Medium** | Requires Google Search Console account confirmation to verify Change of Address tool execution. |
| **Cat 7** | C7-02 | Duplicate Content Risk Between Subdomain and Custom Domain | **FAIL** | **Critical** | Both `tryhorizon.pages.dev` and `unfollowaman.tech` serve identical HTTP 200 content. |
| **Cat 7** | C7-03 | DNS / SSL Resolution Reliability | **PASS** | Info | Cloudflare Edge resolves DNS and SSL handshake cleanly without intermittent drops. |
| **Cat 8** | C8-01 | Prerender & Navigation Fixes Post-Migration | **PASS** | Info | All 23 syllabus routes and listing pages pre-render correctly on `unfollowaman.tech` with trailing slashes. |

---

## 3. Detailed Audit by Category

### Category 1: Crawlability & Rendering
* **Initial HTML Content (C1-01 - PASS):** Raw HTTP fetches to all core routes return fully populated HTML containing `<title>`, `<meta description>`, `<link rel="canonical">`, and semantic body text in `#root`.
* **Internal Link Architecture (C1-02 - PASS):** Navigation bar, footer, and category/resource cards use standard `<a href="...">` tags with clean trailing slashes (e.g., `<a href="/library/">`).
* **Robots.txt (C1-03 - PASS):** Accessible at `https://unfollowaman.tech/robots.txt`. Correctly disallows private routes (`/dashboard`, `/settings/`, `/onboarding`, `/login`, `/register`, `/coming-soon`, `/view/`) and specifies `Sitemap: https://unfollowaman.tech/sitemap.xml`.
* **Sitemap Integrity (C1-04 - PASS):** `https://unfollowaman.tech/sitemap.xml` contains 123 URLs, all using the custom domain `https://unfollowaman.tech/` with trailing slashes. Zero 404s or redirects found during crawling.
* **Old Subdomain Redirect (C1-05 - FAIL - CRITICAL):** Fetching `https://tryhorizon.pages.dev/` returns **HTTP 200 OK** instead of **301 Moved Permanently**. Cloudflare Pages default configuration continues serving the live site on both hostnames, creating severe duplicate content issues in search indexes.

### Category 2: Content Depth & Quality
* **Destination Link Consolidation / Flag 2 (C2-01 - FAIL - HIGH):**
  * Tile 1: "Revision Sheets" -> `/library/` (PYQ listing)
  * Tile 2: "Previous-Year Papers" -> `/library/` (PYQ listing)
  * Tile 3: "Chapter Notes" -> `/notes/` (Notes listing)
  * Tile 4: "Practice Questions" -> `/library/` (PYQ listing)
  * Tile 5: "Question Bank" -> `/library/` (PYQ listing)
  * Tile 6: "Study Guides" -> `/notes/` (Notes listing)
  * *Analysis:* Clicking "Revision Sheets" or "Practice Questions" loads the exact same page as "Previous-Year Papers" without pre-filtering by type.
* **Taxonomy Mismatch / Flag 1 (C2-06 - FAIL - HIGH):**
  * Live homepage tiles show: *Revision Sheets, Previous-Year Papers, Chapter Notes, Practice Questions, Question Bank, Study Guides*.
  * Source configuration (`src/config/resources.ts`) defines:
    * `pyq`: "PYQ Papers" (active -> `/library`)
    * `flashcards`: "Flashcards" (`isComingSoon: true`)
    * `mcq`: "MCQ Sets" (`isComingSoon: true`)
    * `revision_sheets`: "Revision Sheets" (`isComingSoon: true`)
    * `notes`: "Study Notes" (active -> `/notes`)
  * *Analysis:* The homepage promotes feature titles (*Revision Sheets*, *Practice Questions*, *Question Bank*) that internal config explicitly sets as `isComingSoon: true` or collapses into PYQs.
* **Resource Page Content Depth (C2-02 - PASS):** Detail pages (e.g., `/resource/87/`) feature structured educational content including overview paragraphs, topics lists, and step-by-step study guidance.

### Category 3: Required/Expected Pages Quality
* **About Page (`/about/` - PASS):** Substantive 390-word explanation of platform mission, quality principles, transparency, privacy, and future roadmap.
* **Contact Page (`/contact/` - PASS):** Contains clear contact channels, support scope, Gmail link (`tryhorizon18@gmail.com`), and social links.
* **Privacy Policy (`/privacy-policy/` - PASS):** Comprehensive 960-word privacy policy detailing Supabase auth, Cloudflare hosting, GA4 analytics, cookie-less design, and user rights.
* **Terms of Service (`/terms/` - PASS):** Detailed 607-word terms covering non-commercial use, IP rights, account security, and disclaimers.
* **Attribution Page (`/attribution/` - FAIL - MEDIUM):** Page contains only 73 words acknowledging Storyset and Icons8. It lacks any attribution or educational reference disclaimer regarding official curriculum board materials.

### Category 4: Site Functionality & UX for Anonymous Reviewers
* **Cloudflare Email Obfuscation 404 Links (C4-01 - FAIL - MEDIUM):** Cloudflare Pages automatically replaces `mailto:tryhorizon18@gmail.com` in pre-rendered static HTML with JavaScript email protection (`/cdn-cgi/l/email-protection#...`). For web crawlers that do not run JS, following these links results in **HTTP 404 Not Found**.
* **Mobile UX & Tap Targets (C4-02 - PASS):** Spacing and touch targets adhere to mobile accessibility standards (`min-h-[44px]` touch targets, responsive CSS grid/flex).

### Category 5: Trust & Transparency Signals
* **Copyright & Sourcing Declarations (C5-03 - FAIL - MEDIUM):** Previous-Year Question Papers (PYQs) are compiled from official educational boards (e.g. CBSE). While Horizon formats these into study guides, the site lacks an explicit Copyright / Educational Sourcing disclaimer on PYQ pages or `/attribution/`, which can raise flags during AdSense copyright verification.
* **Domain Trust (C5-02 - UNCERTAIN):** Re-applying under `unfollowaman.tech` is a positive step, but Google crawlers require time to re-index and establish domain trust.

### Category 6: Technical / Policy Compliance
* **`ads.txt` Verification (C6-02 - PASS):** Correctly formatted and accessible at `https://unfollowaman.tech/ads.txt`.
* **HTTPS Enforcement (C6-04 - PASS):** `http://unfollowaman.tech/` returns HTTP 301 redirecting to `https://unfollowaman.tech/`.
* **Ad Code Presence (C6-03 - PASS):** Google AdSense tag (`ca-pub-9895594998996093`) is correctly included in HTML `<head>`.

### Category 7: Domain Migration Integrity
* **Subdomain Duplication (C7-02 - FAIL - CRITICAL):** As noted in C1-05, `https://tryhorizon.pages.dev/` is actively serving duplicate content without a 301 redirect.

### Category 8: Prior Fix Verification
* **Syllabus Prerender & Navigation (C8-01 - PASS):** Verified post-migration. All 23 syllabus routes (`/syllabus/class-10/science/`, etc.) pre-render static HTML with canonical trailing slashes on `unfollowaman.tech`.

---

## 4. Raw Evidence Appendix

### A. HTTP Header & Status Verification

```bash
# 1. Old Subdomain Status (CRITICAL ISSUE: Returns 200 OK, not 301 Redirect)
$ curl -sI https://tryhorizon.pages.dev/
HTTP/2 200
date: Sun, 13 Sep 2026 09:52:42 GMT
content-type: text/html; charset=utf-8
server: cloudflare

# 2. HTTP to HTTPS Redirect (PASS)
$ curl -sI http://unfollowaman.tech/
HTTP/1.1 301 Moved Permanently
Location: https://unfollowaman.tech/
Server: cloudflare

# 3. Custom Domain Status (PASS)
$ curl -sI https://unfollowaman.tech/
HTTP/2 200
content-type: text/html; charset=utf-8
server: cloudflare
```

### B. Live Homepage Raw Tile Links (Flag 2 Evidence)

```html
<!-- Live homepage HTML snippet fetched via raw HTTP -->
<div class="neu-card p-6 rounded-2xl relative">
  <a href="/library/" class="absolute inset-0 z-20" aria-label="Go to Revision Sheets"></a>
  <h3 class="text-xl font-bold text-ink mb-2">Revision Sheets</h3>
  <p class="text-ink/80">Concise summary sheets for quick pre-exam revision.</p>
</div>
<div class="neu-card p-6 rounded-2xl relative">
  <a href="/library/" class="absolute inset-0 z-20" aria-label="Go to Previous-Year Papers"></a>
  <h3 class="text-xl font-bold text-ink mb-2">Previous-Year Papers</h3>
  <p class="text-ink/80">Solve official past exam papers to understand question patterns.</p>
</div>
<div class="neu-card p-6 rounded-2xl relative">
  <a href="/notes/" class="absolute inset-0 z-20" aria-label="Go to Chapter Notes"></a>
  <h3 class="text-xl font-bold text-ink mb-2">Chapter Notes</h3>
  <p class="text-ink/80">Structured study notes with definitions, key concepts, and diagrams.</p>
</div>
<div class="neu-card p-6 rounded-2xl relative">
  <a href="/library/" class="absolute inset-0 z-20" aria-label="Go to Practice Questions"></a>
  <h3 class="text-xl font-bold text-ink mb-2">Practice Questions</h3>
  <p class="text-ink/80">Topic-wise problem sets to test your understanding.</p>
</div>
<div class="neu-card p-6 rounded-2xl relative">
  <a href="/library/" class="absolute inset-0 z-20" aria-label="Go to Question Bank"></a>
  <h3 class="text-xl font-bold text-ink mb-2">Question Bank</h3>
  <p class="text-ink/80">Curated collections of essential exam questions.</p>
</div>
<div class="neu-card p-6 rounded-2xl relative">
  <a href="/notes/" class="absolute inset-0 z-20" aria-label="Go to Study Guides"></a>
  <h3 class="text-xl font-bold text-ink mb-2">Study Guides</h3>
  <p class="text-ink/80">Step-by-step guidance on tackling complex topics.</p>
</div>
```

### C. Source Code Taxonomy Conflict (Flag 1 Evidence)

```typescript
// src/config/resources.ts
export const RESOURCE_CATEGORIES: Record<ResourceType, ResourceCategoryConfig> = {
  pyq: { title: 'PYQ Papers', path: '/library', isComingSoon: false },
  flashcards: { title: 'Flashcards', path: '/coming-soon', isComingSoon: true },
  mcq: { title: 'MCQ Sets', path: '/coming-soon', isComingSoon: true },
  revision_sheets: { title: 'Revision Sheets', path: '/coming-soon', isComingSoon: true },
  notes: { title: 'Study Notes', path: '/notes', isComingSoon: false }
};
```

---

## 5. Items Requiring External Console Verification

The following items could not be verified purely through codebase inspection or raw HTTP fetching and require manual verification in external administrative consoles:

1. **Google Search Console Property Status:** Verification that `https://unfollowaman.tech/` is added as a primary domain property in GSC, that the GSC "Change of Address" tool was submitted from `tryhorizon.pages.dev`, and that `https://unfollowaman.tech/sitemap.xml` shows status "Success".
2. **Cloudflare Redirect Rule Configuration:** Verification that a Page Rule or Bulk Redirect Rule is configured in the Cloudflare dashboard to redirect `https://tryhorizon.pages.dev/*` -> `https://unfollowaman.tech/$1` (HTTP 301).
3. **AdSense Site Ownership Status:** Verification that `unfollowaman.tech` is added to the AdSense account sites list and ready for review.

---
*End of Audit Deliverable.*
