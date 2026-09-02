# Horizon — Google AdSense Readiness Audit Report

**Audit Date:** May 2024 (Current Repository State)
**Target Domain:** `https://unfollowaman.tech`
**Application / Framework:** Vite React SPA with Cloudflare Pages hosting, Supabase backend, and Node-based static sitemap generation.
**Auditor:** Jules (Senior Software Engineer & Technical Auditor)

---

## 1. Executive Summary

Horizon underwent a comprehensive technical, content, architectural, and policy audit following a previous rejection by Google AdSense. The purpose of this audit is to evaluate the current repository, database schema, route hierarchy, build output, crawlability infrastructure, and legal/trust signals to determine whether the site is genuinely ready for resubmission to Google AdSense.

Since the initial rejection, substantial architectural and content enhancements have been implemented:
* **Removal of Unfinished Sections:** All "Coming Soon" navigation links (**Flashcards**, **MCQ Sets**, **Revision Sheets**, and **Updates**) have been hidden from desktop and mobile navigation headers, footers, and homepage feature grids.
* **Trust & Legal Compliance:** Dedicated, fully accessible **Contact** (`/contact`) and **Terms of Service** (`/terms`) pages have been implemented with genuine contact details (`tryhorizon18@gmail.com` and social channels) and clear usage policies, replacing previous broken/looping anchor links.
* **Crawler Access & Indexing:** `public/robots.txt` was reconfigured to explicitly allow search engine crawling of public resource landing pages (`/resource/`). A dynamic sitemap generator (`scripts/generate-sitemap.js`) generates 100 total URLs in `public/sitemap.xml` during `npm run build`.
* **Public Educational Landing Pages:** Created dedicated public HTML landing pages (`/resource/:id`) for all 66 active learning resources. These pages expose semantic HTML titles, class/subject badges, chapter overviews, syllabus topic lists, study guidance steps, and Schema.org `EducationalResource` JSON-LD structured data while keeping protected PDF viewers (`/view/:id`) behind access controls.
* **Hierarchical Filter URLs & SEO Metadata:** Implemented canonical URL routing for Class, Subject, and Medium combinations (e.g., `/notes/class-10/hindi-medium/civics`), backed by dynamic document `<title>` and `<meta name="description">` tag updates.
* **Subject Identifier Standardization:** Updated application subject identifiers from "Political Science" to "Civics" across user interface controls, routing utilities, database queries, and sitemaps while keeping the underlying storage path (`political-science`) securely isolated from public indexable URLs.

**Core Findings Requiring Attention Before Resubmission:**
1. **Language Mismatch on Resource ID 87 ("Resource and Development"):** English-medium study note inherits a Hindi chapter summary from the joined `chapters` table entry due to a missing resource-level summary override in Supabase.
2. **Pure SPA Client-Side Rendering Architecture:** Static site generation (SSG) pre-renders `public/sitemap.xml` and compiles `dist/index.html` with an empty `<div id="root"></div>`. AdSense automated review bots (`Mediapartners-Google`) that do not execute client-side JavaScript or timeout during initial Supabase network fetches will encounter an empty HTML shell.
3. **Generic Template Fallbacks on Previous Year Papers (PYQs):** 47 PYQ resources rely on shared fallback text for section overviews because individual PYQ database rows lack custom item-level `chapter_summary`, `topics`, or `study_guidance` fields in Supabase.

---

## 2. Current Verdict

### **VERDICT: NOT READY — FIX P0 & P1 ISSUES FIRST**

**Submission Recommendation:** **DO NOT APPLY YET.**

While the platform has made dramatic improvements and resolved explicit policy violations (such as under-construction links and missing trust pages), resubmitting in the current state carries a high risk of another rejection under Google's **"Low Value Content"** or **"Site Unavailable / Cannot be Crawled"** flags due to client-side JS rendering dependency for crawlers and an English-medium page displaying Hindi educational text.

---

## 3. Google Requirements Checked

Audit items evaluated against current official Google AdSense Publisher Policies, Google Search Central documentation, and Google Webmaster Guidelines:

| Policy / Requirement Area | Official Google Standard | Horizon Compliance Status | Evidence / Implementation Detail |
| :--- | :--- | :--- | :--- |
| **Site Ownership & Ad Code** | Must host `ads.txt` at root and include publisher script in `<head>`. | **COMPLIANT (EXPLICIT)** | `public/ads.txt` contains `google.com, pub-9895594998996093, DIRECT, f08c47fec0942fa0`. `index.html` includes script tag with matching publisher ID. |
| **Site Under Construction** | Pages under construction or placeholder navigation links are strictly prohibited. | **COMPLIANT (EXPLICIT)** | `src/config/resources.ts` sets `isComingSoon: true`, `showOnMobile: false`, `showOnDesktop: false` for unfinished sections. Zero coming-soon links in visible navigation. |
| **Required Legal & Trust Content** | Clear, accessible Privacy Policy, Terms of Service, and Contact options. | **COMPLIANT (EXPLICIT)** | Dedicated routes `/privacy-policy`, `/terms`, `/contact`, `/about`, `/attribution` in `App.tsx` linked from `Home.tsx` footer and navigation menus. |
| **Original / Useful Content** | Must offer substantial, unique, original value beyond syndicated or programmatic boilerplate. | **PARTIALLY COMPLIANT (POLICY RISK)** | 19 Notes pages provide unique chapter summaries, but 47 PYQ pages use shared template fallbacks, and Resource ID 87 has a Hindi/English language mismatch. |
| **Navigation & Deceptive Links** | Menus must be clear, functional, and lead directly to promised content without redirect loops. | **COMPLIANT (EXPLICIT)** | Header and footer links point directly to active routes (`/library`, `/notes`, `/about`, `/contact`, `/terms`, `/privacy-policy`). |
| **Crawlability & `robots.txt`** | Main content must be crawlable by Googlebot and Mediapartners-Google. | **PARTIALLY COMPLIANT (TECHNICAL INFERENCE)** | `robots.txt` permits `/resource/`. However, pure SPA client-side rendering (`<div id="root"></div>`) requires JS execution to display text. |
| **Deceptive / Prohibited Content** | No illegal, misleading, or gated content presented deceptively. | **COMPLIANT (EXPLICIT)** | Protected PDFs require login (`401_UNAUTHORIZED`) on `/view/:id`, while public HTML summaries on `/resource/:id` provide full transparency without deception. |

---

## 4. Previous Risk Areas — Before vs Current Status

Evaluation of all 17 risk areas identified during previous audit cycles:

| # | Risk Area | Status | Evidence & Current Code Implementation |
| :--- | :--- | :--- | :--- |
| **1** | **Thin / Low-Value Content** | **PARTIALLY FIXED** | Added educational guides (`LibraryEducationalGuide.tsx`, `NotesEducationalGuide.tsx`) to listing routes and rich HTML sections to `/resource/:id`. However, PYQ pages rely on generic fallback text. |
| **2** | **Generic Resource Pages** | **FIXED** | `/resource/:id` (`ResourceDetails.tsx`) renders resource-type-specific kickers, titles, syllabus topic badges, metadata grids, and guidance steps. |
| **3** | **Empty / Unfinished Sections** | **FIXED** | Filtered out unreleased features (`flashcards`, `mcq`, `revision_sheets`) from `getAllFeatures()` and `getNavLinks()` in `src/config/resources.ts`. |
| **4** | **Coming-Soon Pages** | **FIXED** | `/coming-soon` route exists for direct access safety, but is disallowed in `robots.txt` and removed from all site navigation. |
| **5** | **Placeholder Links** | **FIXED** | All footer and header links point to real, functional pages (`/contact`, `/terms`, `/privacy-policy`, `/about`, `/attribution`). |
| **6** | **Poor Navigation** | **FIXED** | Hierarchical filter navigation, back buttons (`window.history.back()`), breadcrumbs, and profile popover menu operate cleanly across viewports. |
| **7** | **Insufficient Educational HTML** | **FIXED** | Pages render plain HTML headings (`<h1>`, `<h2>`, `<h3>`), paragraphs, lists (`<ul>`, `<li>`), and definition grids (`<dl>`, `<dt>`, `<dd>`) readable by crawlers. |
| **8** | **Protected PDFs Context** | **FIXED** | Public HTML landing pages (`/resource/:id`) display educational context, chapter summaries, and topics without exposing protected PDF signed URLs. |
| **9** | **Missing Chapter Content** | **PARTIALLY FIXED** | 19 Notes resources have detailed chapter summaries and topics, but Resource ID 87 displays Hindi summary text on an English medium resource page. |
| **10** | **URL Hierarchy** | **FIXED** | `src/utils/urlHelper.ts` implements bi-directional mapping for `/notes/:classSlug/:mediumSlug/:subjectSlug` and `/library/:classSlug/:mediumSlug/:subjectSlug`. |
| **11** | **Sitemap Completeness** | **FIXED** | `scripts/generate-sitemap.js` queries active resources from Supabase and outputs 100 canonical URLs to `public/sitemap.xml` during build. |
| **12** | **`robots.txt` Configuration** | **FIXED** | `public/robots.txt` allows public `/resource/` routes and blocks private `/dashboard`, `/settings/`, `/onboarding`, `/login`, `/register`, `/coming-soon`, and `/view/`. |
| **13** | **Structured Data** | **FIXED** | `ResourceDetails.tsx` injects Schema.org `EducationalResource` JSON-LD; `ResourcePage.tsx` injects `CollectionPage` JSON-LD; legal pages inject `Organization` JSON-LD. |
| **14** | **SSR / SSG / Crawlability** | **NOT FIXED** | Site is built as a pure Vite React SPA serving `<div id="root"></div>` in `dist/index.html`. No pre-rendered static HTML files exist for individual resource routes. |
| **15** | **Legal / Trust Pages** | **FIXED** | `/privacy-policy`, `/terms`, `/contact`, `/about`, and `/attribution` are fully authored, responsive, and cross-linked. |
| **16** | **Duplicate Resource Pages** | **FIXED** | Canonical link tags (`<link rel="canonical">`) dynamically injected on all category and resource landing pages to prevent duplicate indexation. |
| **17** | **Excessive PDF Reliance** | **FIXED** | Resource landing pages provide comprehensive educational text, topic lists, and study guidance in crawlable HTML independently of PDF viewer access. |

---

## 5. Content Quality Audit

Public educational pages were inspected across `/library`, `/notes`, and individual resource landing pages (`/resource/:id`):

### A. Listing Pages (`/library` & `/notes`)
* **Educational Context:** `LibraryEducationalGuide.tsx` and `NotesEducationalGuide.tsx` render semantic HTML sections above resource grids. They dynamically state available classes, subjects, mediums, chapter counts, and year ranges based on loaded resources.
* **Crawlable Text:** Provides introductory paragraphs, contextual filter notices (e.g., *"Currently displaying study notes filtered for Class 10 • Civics • Hindi Medium"*), category overviews, and structured study strategy bullet points.

### B. Individual Resource Landing Pages (`/resource/:id`)
* **Primary Heading:** Rendered via semantic `<h1>` tag with class/subject/medium badges and kicker labels (`CHAPTER 1` or `CLASS 10 SCIENCE — PREVIOUS-YEAR QUESTION PAPER`).
* **Educational Summary:** Renders multi-paragraph summaries (`chapter_summary`).
* **Syllabus & Topic Breakdown:** Displays structured subtopic cards using circular checkmark badges and bold labels (`Topics Covered & Key Concepts`).
* **Study Guidance Steps:** Renders step-by-step preparation advice (`Study Guidance & Preparation Tips`).
* **Resource Metadata:** Structured `<dl>` element providing Class, Subject, Medium, Resource Type, Exam Year, Total Pages, Total Marks, Duration, and Upload Date.
* **Related Resources:** Internal links to 3 related learning resources matching the same class/subject.

---

## 6. Chapter / Resource Page Audit

Database inspection of Supabase records (`learning_resources` and `chapters` tables) revealed the following breakdown across all 66 active resources:

* **Total Learning Resources:** 66
  * **Study Notes (`notes`):** 19 resources
  * **Previous Year Papers (`pyq`):** 47 resources
* **Total Records in `chapters` Table:** 18

### Detailed Subject Breakdown for Notes Resources:
* **History:** 1 resource (Class 10, Hindi Medium)
* **Geography:** 8 resources (Class 10, 7 Hindi Medium, 1 English Medium)
* **Economics:** 5 resources (Class 10, Hindi Medium)
* **Civics:** 5 resources (Class 10, Hindi Medium)

### Findings & Language Anomaly:
1. **18 Chapter Records in Supabase:** All 18 chapters in the `chapters` table contain chapter-specific summaries in Hindi.
2. **Language Mismatch Bug (Resource ID 87):**
   * **Resource Details:** ID `87`, Title: `"Resource and Development"`, Class: `Class 10`, Subject: `Geography`, Medium: `english`.
   * **Database State:** `learning_resources.chapter_summary` is `null` for ID 87. It links to `chapter_id: '2779881d-4e65-41d2-8db0-b44dbf83cf74'` ("संसाधन और विकास").
   * **Mapping Logic (`learningResourcesAPI.ts`):** `const chapterSummary = item.chapter_summary || chapterObj?.chapter_summary || null;`
   * **Resulting Defect:** On English-medium page `/resource/87`, the Overview section displays Hindi text (*"यह अध्याय संसाधनों के वर्गीकरण, उनके विवेकपूर्ण उपयोग और विकास की आवश्यकताओं को समझाता है..."*).
3. **PYQ Content Differentiation:** All 47 PYQ resources lack custom `chapter_summary`, `topics`, and `study_guidance` in Supabase, relying on generic fallback template text.

---

## 7. URL Structure Audit

URL parameters, slugs, and canonical tags were audited across all public routes:

### A. Route Hierarchy
* **Category URLs:** `/notes/:classSlug/:mediumSlug/:subjectSlug` and `/library/:classSlug/:mediumSlug/:subjectSlug`
  * Example: `https://unfollowaman.tech/notes/class-10/hindi-medium/civics`
  * Example: `https://unfollowaman.tech/library/class-10/english-medium/science`
* **Resource Landing Pages:** `https://unfollowaman.tech/resource/:id` (e.g., `https://unfollowaman.tech/resource/56`)

### B. Political Science → Civics Renaming Audit
* **Subject Identifier:** Renamed to `Civics` across UI filter controls, database rows, sitemap links, and test suites.
* **Sitemap Output:** `public/sitemap.xml` correctly contains `https://unfollowaman.tech/notes/class-10/hindi-medium/civics`.
* **Physical Storage Directory:** Physical storage bucket directory intentionally remains `political-science`. Because file paths are accessed via signed URLs or internal state, the raw storage path `political-science` does not appear in public indexable URLs or sitemaps.

### C. Canonical Link Tag Management
Both `ResourcePage.tsx` and `ResourceDetails.tsx` dynamically update `<link rel="canonical">` on mount and clean up on unmount, ensuring search engines index the canonical representation of each category and resource page.

---

## 8. Crawlability Audit

### A. Client-Side SPA Limitations (Critical Finding)
Horizon is built as a Single Page Application (SPA) using Vite and React 19, hosted on Cloudflare Pages.
* **Build Artifact Inspection:** `dist/index.html` contains:
  ```html
  <!doctype html>
  <html lang="en">
    <head> ... </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/assets/index-B8gKVg0C.js"></script>
    </body>
  </html>
  ```
* **Implication for AdSense Crawlers:** When search crawlers or AdSense verification bots (`Mediapartners-Google`) make an HTTP `GET` request to `https://unfollowaman.tech/resource/56`, the raw response contains zero educational text—only `<div id="root"></div>`.
* **Risk:** Although Googlebot can execute JavaScript, AdSense automated review bots frequently evaluate raw HTML responses. If JS execution fails or network calls to Supabase time out during automated review, the reviewer bot flags the page as empty or unavailable.

### B. Meta Robots & HTTP Headers
* No global `noindex` or `nofollow` tags are present on public routes.
* Cloudflare Pages correctly returns HTTP `200 OK` for valid SPA routes and serves static assets with proper MIME types.

---

## 9. robots.txt Audit

Inspection of `public/robots.txt`:

```
User-agent: *
Disallow: /dashboard
Disallow: /settings/
Disallow: /onboarding
Disallow: /login
Disallow: /register
Disallow: /coming-soon
Disallow: /view/

Sitemap: https://unfollowaman.tech/sitemap.xml
```

### Audit Assessment:
* **Allowed:** `/`, `/library`, `/notes`, `/resource/`, `/about`, `/contact`, `/terms`, `/privacy-policy`, `/attribution`.
* **Blocked:** Authenticated dashboard (`/dashboard`), settings (`/settings/`), onboarding (`/onboarding`), auth screens (`/login`, `/register`), unreleased features (`/coming-soon`), and protected PDF viewers (`/view/`).
* **Sitemap Declaration:** Accurately declares `https://unfollowaman.tech/sitemap.xml`.
* **Verdict:** **100% Correct and Compliant.**

---

## 10. Sitemap Audit

Inspection of generated `public/sitemap.xml`:

* **Total Included URLs:** 100
  * **Static Information Pages (8):** `/`, `/library`, `/notes`, `/about`, `/contact`, `/terms`, `/privacy-policy`, `/attribution`.
  * **Active Resource Landing Pages (66):** `/resource/22` through `/resource/87`.
  * **Hierarchical Category Pages (26):** `/library/class-10`, `/notes/class-10/hindi-medium/civics`, etc.
* **Excluded URLs:** All protected PDF viewer routes (`/view/:id`), authentication pages, and user dashboard routes are properly excluded.
* **Domain Uniformity:** All `<loc>` tags utilize the canonical production domain `https://unfollowaman.tech`.
* **Civics URL Verification:** Sitemap contains `/notes/class-10/hindi-medium/civics`. No obsolete `political-science` URLs exist in `sitemap.xml`.

---

## 11. Structured Data Audit

Semantic Schema.org JSON-LD structured data blocks were audited across all primary routes:

### A. Resource Landing Pages (`ResourceDetails.tsx`)
```json
{
  "@context": "https://schema.org",
  "@type": "EducationalResource",
  "name": "यूरोप में राष्ट्रवाद",
  "description": "...",
  "url": "https://unfollowaman.tech/resource/56",
  "educationalLevel": "Class 10",
  "about": { "@type": "Thing", "name": "History" },
  "inLanguage": "hi",
  "learningResourceType": "Study Note",
  "provider": { "@type": "Organization", "name": "Horizon", "url": "https://unfollowaman.tech" },
  "isPartOf": { "@type": "WebSite", "name": "Horizon", "url": "https://unfollowaman.tech" }
}
```
* **Security Check:** Does not expose signed storage URLs, internal file paths, or private bucket names.

### B. Category Listing Pages (`ResourcePage.tsx`)
```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Class 10 Civics Study Notes | Horizon",
  "description": "...",
  "url": "https://unfollowaman.tech/notes/class-10/hindi-medium/civics",
  "provider": { "@type": "Organization", "name": "Horizon", "url": "https://unfollowaman.tech" }
}
```

### C. Legal & Organization Pages (`About.tsx` & `Contact.tsx`)
Renders Schema.org `Organization` structured data with official website URL and support contact properties.

---

## 12. Legal / Trust / Transparency Audit

Verification of required trust and legal pages:

1. **Privacy Policy (`/privacy-policy`):**
   * Fully authored in `src/pages/privacy/PrivacyPolicy.tsx`.
   * Explicitly discloses usage of Supabase (authentication & storage), Cloudflare Pages (hosting), and Google Analytics (GA4 Measurement ID `G-0TBLST0MRT`).
   * States data retention, user rights, cookies/local storage usage, and contact info.
2. **Terms of Service (`/terms`):**
   * Fully authored in `src/pages/terms/Terms.tsx`.
   * Details acceptable educational usage, non-commercial restrictions, user responsibilities, intellectual property, service availability, and disclaimers.
3. **Contact Us (`/contact`):**
   * Fully authored in `src/pages/contact/Contact.tsx`.
   * Features real support email (`tryhorizon18@gmail.com`) and active social links (X/Twitter, GitHub, Instagram, Substack).
4. **About Us (`/about`) & Attribution (`/attribution`):**
   * Outlines platform mission, educational principles, and resource attribution details.
5. **Footer Cross-Linking:** `Home.tsx` renders a unified footer across pages containing direct links to all five legal/info pages.

---

## 13. Navigation / User Experience Audit

* **User Journey Tested:** `Home -> Class -> Subject -> Medium -> Chapter -> Resource Landing Page -> Complete Study Note Reader`.
* **Navigation Links:** All primary navigation links in header and footer resolve to active pages.
* **Unfinished Features:** `RESOURCE_CATEGORIES` in `src/config/resources.ts` sets `showOnMobile: false` and `showOnDesktop: false` for `flashcards`, `mcq`, and `revision_sheets`. `getAllFeatures()` filters `!cat.isComingSoon`, ensuring feature cards show only active PYQs and Study Notes.
* **Back Navigation:** `ResourceDetails.tsx` implements `onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = backPath}` to ensure visitors never encounter broken navigation loops.

---

## 14. Mobile / Responsive Audit

Public pages were evaluated across mobile viewports (320px, 375px, 414px) and tablet viewports (768px, 1024px):

* **Horizontal Overflow & Scrolling:** Containers utilize `w-[min(96vw,1600px)]`, `min-w-0`, `break-words`, and `overflow-x-auto no-scrollbar` to prevent horizontal page wobble.
* **Mobile Menu Overlay:** `Home.module.css` and `PdfViewer.module.css` use dark translucent backdrops (`rgba(0,0,0,0.45)`) with backdrop blur and explicit dark box-shadows (`box-shadow: 0 12px 40px rgba(0,0,0,0.25)`) to eliminate white neomorphic halo artifacts against dark overlays.
* **Touch Targets & Controls:** Mobile filter dropdowns and PDF page slider controls feature touch padding (`p-1 sm:p-2`, `w-11 h-11`) adhering to mobile touch target guidelines.

---

## 15. PDF Protection Audit

* **Access Control Enforcement:** `isResourceProtected(resource)` in `src/utils/resourceHelper.ts` classifies resources stored outside the public `pdfs` bucket as protected.
* **Public vs Protected Route Separation:**
  * **Public Route (`/resource/:id`):** Displays crawlable educational context, summaries, syllabus topic lists, and study guidance without exposing signed storage URLs.
  * **Protected Reader Route (`/view/:id`):** `usePdfData` checks authentication state. Unauthenticated visitors accessing protected Study Notes receive a `401_UNAUTHORIZED` login screen, blocking unauthorized access to PDF binaries.
* **Shortcuts & Download Security:** `usePdfKeyboardShortcuts` intercept and block `Ctrl+P` / `Ctrl+S` commands inside the PDF viewer. `canDownload` in `src/utils/permissions.ts` strictly enforces the `allow_download` database flag.

---

## 16. Duplication / Programmatic Content Audit

* **19 Notes Resources:** Each chapter note in Hindi features an original, multi-paragraph educational summary and topic breakdown written specifically for that chapter.
* **Resource ID 87 Anomaly:** As identified in Section 6, ID 87 inherits Hindi summary text on an English-medium resource page, causing content duplication with ID 81 ("संसाधन और विकास").
* **47 PYQ Resources:** Lack custom item-level summaries in Supabase and display identical fallback text (*"This previous-year question paper contains official questions for students..."*). While acceptable for past examination papers, populating specific subject/year descriptions will strengthen overall site quality.

---

## 17. Technical Error Audit

* **Vitest Suite Execution:** Executed `npm test` across the repository.
  * **Result:** **24 passed (24 test files, 147 tests passed)**.
  * Tests covered `auth.test.ts`, `learningResourcesAPI.test.ts`, `ResourceDetails.test.tsx`, `useDashboardProgress.test.ts`, `sitemap.test.ts`, `urlHelper.test.ts`, `HomeAdTrigger.test.tsx`, `LibraryInFeedAd.test.tsx`, and `Terms.test.tsx`.
* **Production Build Execution:** Executed `npm run build` (`node scripts/generate-sitemap.js && tsc -b && vite build`).
  * **Result:** **Build succeeded cleanly in 2.61s**. Output bundles created in `dist/`.
* **Console Warnings & Hydration:** Zero React 19 hydration errors or unresolved console exceptions detected during build or test execution.

---

## 18. P0 Issues (Must Fix Before Resubmitting)

### Issue 1: Language Mismatch on English Resource ID 87
* **Severity:** **CRITICAL (P0 — Content Quality & Language Consistency Violation)**
* **Exact Location:** Supabase `learning_resources` table (ID `87`) / `src/services/learningResourcesAPI.ts` (`mapLearningResource`).
* **Problem:** Resource ID 87 (Title: `"Resource and Development"`, Class 10 Geography, English Medium) has `chapter_summary = null` on `learning_resources`. `mapLearningResource` falls back to `chapterObj.chapter_summary` from the joined `chapters` table, which is written in Hindi (*"यह अध्याय संसाधनों के वर्गीकरण..."*).
* **Why it matters:** Google AdSense quality guidelines flag pages displaying conflicting language content (English header/metadata with Hindi body text) as corrupt or low-quality content.
* **Recommended Fix:** Update Supabase `learning_resources` record ID `87` to populate a proper English `chapter_summary` (e.g., *"This chapter explains the classification of resources, their judicious utilization, soil types, land degradation, and sustainable development strategies..."*) and English `topics`.

### Issue 2: Pure SPA Client-Side Rendering Dependency for Review Crawlers
* **Severity:** **HIGH (P0 — AdSense Crawler Accessibility Risk)**
* **Exact Location:** `vite.config.ts` / Build Pipeline / `dist/index.html`.
* **Problem:** The built application in `dist/` serves a blank `<div id="root"></div>` shell. When an automated AdSense review bot fetches `https://unfollowaman.tech/resource/56`, it receives raw HTML containing no body text or educational content unless it executes client-side JavaScript and completes asynchronous Supabase network fetches.
* **Why it matters:** AdSense reviewer bots frequently evaluate raw HTTP responses without executing complex JavaScript or waiting for remote API requests. If the bot times out, it flags the site as "Low Value Content" or "Site Unavailable / Empty".
* **Recommended Fix:** Implement SSG / static pre-rendering for public routes (`/resource/:id`, `/notes`, `/library`, `/about`, `/contact`, `/terms`, `/privacy-policy`) during `npm run build` (or generate static HTML meta/content shells), so crawlers receive fully rendered HTML text directly in the raw response.

---

## 19. P1 Issues (Strongly Recommended Before Resubmitting)

### Issue 3: Generic Fallback Summaries Across 47 PYQ Landing Pages
* **Severity:** **MEDIUM (P1 — Programmatic Content Quality Risk)**
* **Exact Location:** `src/pages/resources/ResourceDetails.tsx` (Fallback JSX blocks).
* **Problem:** All 47 Previous Year Question Paper landing pages (`/resource/22` through `/resource/55`) display identical template paragraphs for "Paper Overview", "Subject Areas", and "How to Use This Paper".
* **Why it matters:** AdSense automated algorithms check for repetitive or programmatically generated pages with little unique text per page.
* **Recommended Fix:** Populate specific subject, class, and year descriptions in Supabase for PYQ rows or enhance the template renderer to generate dynamic subject-specific question coverage details (e.g., highlighting algebra/geometry for Math PYQs, organic/inorganic chemistry for Chemistry PYQs).

### Issue 4: Category URL Hierarchy `all-mediums` Suffix in Sitemap
* **Severity:** **LOW/MEDIUM (P1 — SEO Canonical Hygiene)**
* **Exact Location:** `scripts/generate-sitemap.js` (`generateSitemapUrls`) & `src/utils/urlHelper.ts`.
* **Problem:** When medium is not specified, sitemap generates URLs such as `/library/class-10/all-mediums/science`.
* **Why it matters:** URLs containing placeholder slugs like `all-mediums` can be perceived by search engines as artificial or duplicate parameter paths.
* **Recommended Fix:** Simplify canonical URL generation so class + subject routes omit `all-mediums` (e.g., `/library/class-10/science`).

---

## 20. P2 Improvements (Nice to Have)

### Improvement 5: Social Share Open-Graph Image Tags
* **Location:** `index.html` / `ResourceDetails.tsx`.
* **Description:** Add dynamic `<meta property="og:image">` and `<meta name="twitter:image">` tags for public resource pages to enhance social preview cards.

### Improvement 6: Expand Schema.org `Course` Markup
* **Location:** `ResourcePage.tsx`.
* **Description:** Add Schema.org `Course` or `EducationalOccupationalProgram` structured data to category listing pages alongside existing `CollectionPage` markup.

---

## 21. Exact Recommended Next Steps

To prepare Horizon for a successful Google AdSense re-application, perform the following exact steps in order:

1. **Fix Resource ID 87 Summary in Supabase (P0):**
   * Execute SQL update in Supabase editor:
     ```sql
     UPDATE learning_resources
     SET chapter_summary = 'This chapter covers the classification of resources, land resource management, soil types in India, soil erosion, and sustainable development principles essential for Class 10 Board preparation.'
     WHERE id = '87';
     ```
2. **Implement Static Pre-rendering / Static Shell Generation for Public Routes (P0):**
   * Integrate a pre-rendering script or Vite SSG plugin (e.g. `vite-plugin-prerender` or a custom pre-render script run during `npm run build`) to generate static HTML files in `dist/` for static pages and all 66 `/resource/:id` routes, ensuring crawlers receive raw HTML containing titles, descriptions, and summaries.
3. **Enhance Subject-Specific Educational Context for PYQs (P1):**
   * Update `ResourceDetails.tsx` or Supabase PYQ rows to inject subject-tailored question breakdown text (Science, Mathematics, Social Science, English, Hindi) into PYQ landing pages.
4. **Clean Category Sitemap URLs (P1):**
   * Update `scripts/generate-sitemap.js` and `src/utils/urlHelper.ts` to output clean `/library/class-10/science` category URLs without `all-mediums`.
5. **Verify Build, Sitemap, and Test Suite:**
   * Run `npm test` and `npm run build`. Confirm generated static HTML files in `dist/` contain readable educational text.
6. **Submit Resubmission to Google AdSense:**
   * Once P0 and P1 items are deployed to production (`https://unfollowaman.tech`), request a site re-review in the Google AdSense dashboard.

---

## 22. Final Verdict Statement

```
================================================================================
FINAL VERDICT: DO NOT APPLY YET
================================================================================
Horizon has made extraordinary progress in resolving previous rejection causes.
The platform now features clean navigation, dedicated legal/trust pages, robots.txt
allow rules, dynamic sitemaps, structured JSON-LD data, and protected PDF access controls.

However, resubmitting immediately is NOT RECOMMENDED due to two critical blockers:
1. Language Mismatch on Resource ID 87 (English page displaying Hindi text).
2. Pure SPA client-side rendering dependency (crawlers receiving <div id="root"></div>).

Once Resource ID 87 is updated in Supabase and static HTML pre-rendering is
configured for public resource routes, Horizon will be in an exceptionally strong
position for Google AdSense approval.
================================================================================
```

---

## 23. Evidence / URLs / Files Inspected

### Code & Config Files Inspected:
* `src/App.tsx`
* `src/config/resources.ts`
* `src/config/resourcePageConfigs.ts`
* `src/data/navigation.ts`
* `src/services/learningResourcesAPI.ts`
* `src/services/supabase.ts`
* `src/utils/urlHelper.ts`
* `src/utils/resourceHelper.ts`
* `src/utils/permissions.ts`
* `src/pages/home/Home.tsx`
* `src/pages/resources/ResourcePage.tsx`
* `src/pages/resources/ResourceDetails.tsx`
* `src/pages/resources/PdfViewer.tsx`
* `src/pages/resources/components/LibraryEducationalGuide.tsx`
* `src/pages/resources/components/NotesEducationalGuide.tsx`
* `src/pages/contact/Contact.tsx`
* `src/pages/terms/Terms.tsx`
* `src/pages/privacy/PrivacyPolicy.tsx`
* `src/pages/about/About.tsx`
* `src/pages/attribution/Attribution.tsx`
* `src/components/HomeAd.tsx`
* `src/components/LibraryInFeedAd.tsx`
* `public/robots.txt`
* `public/ads.txt`
* `scripts/generate-sitemap.js`
* `vite.config.ts`
* `package.json`

### Generated Artifacts Inspected:
* `public/sitemap.xml` (100 URLs generated during build)
* `dist/index.html` (Vite client build output)

### Database Records & Queries Evaluated:
* Executed Supabase client queries inspecting all 66 `learning_resources` rows and 18 `chapters` table records for language, summaries, topics, and schema fields.

---

## 24. Google Official Sources Used

1. **Google AdSense Program Policies:**
   `https://support.google.com/adsense/answer/48182`
2. **Google Publisher Policies (Content Standards & Under Construction):**
   `https://support.google.com/adsense/answer/10502938`
3. **Google Search Central — Technical Requirements for Googlebot & Crawlers:**
   `https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers`
4. **Google Search Central — JavaScript SEO Basics:**
   `https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics`
5. **Google Search Central — Educational Resource Structured Data (`EducationalResource`):**
   `https://developers.google.com/search/docs/appearance/structured-data/educational-resource`
6. **Google AdSense Help — `ads.txt` Guide:**
   `https://support.google.com/adsense/answer/7532444`
