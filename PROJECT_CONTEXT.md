# Horizon Platform — Project Context & Architectural Documentation

## 1. Project Architecture & Technology Stack

Horizon is a high-performance educational platform designed for secondary school students (Classes 8th to 10th) studying under the CBSE, NCERT, and State (RBSE) curricula. The platform combines a client-side Single Page Application (SPA) with build-time Static Site Generation (SSG) for SEO.

- **Frontend Core**: React 19 (`react` & `react-dom` `^19.2.6`), TypeScript (`~6.0.2`), Vite 8 (`^8.0.12`).
- **Routing**: `react-router-dom` (`^7.18.0`).
- **Styling**: Tailwind CSS (`^3.4.19`), PostCSS, Autoprefixer, scoped Vanilla CSS Modules (`*.module.css`), and Neumorphic design variables in `src/index.css`.
- **Typography**: Self-hosted `@fontsource/playfair-display`, self-hosted `Instrument Serif` (`.woff2` in `public/fonts/`), preconnected `Roboto`.
- **PDF Rendering & Pan/Zoom**: `pdfjs-dist` (pinned to `5.4.296`), `react-pdf` (`^10.4.1`), `react-zoom-pan-pinch` (`^4.0.3`).
- **Backend & Auth SDK**: `@supabase/supabase-js` (`^2.112.2`).
- **Testing**: Vitest (`^4.1.10`), `jsdom` (`^29.1.1`), `@testing-library/dom` (`^10.4.1`), Playwright (`^1.62.1`).
- **Edge Functions**: Deno Runtime on Supabase Edge Network.
- **Hosting / CDN**: Cloudflare Pages with Edge Functions (`functions/_middleware.js`).

---

## 2. Folder Structure & Important Files

```
Horizon/
├── .Jules/                          # Project design conventions & performance learnings
│   ├── palette.md                   # WAI-ARIA patterns, accessibility, focus-visible conventions
│   └── bolt.md                      # React.memoization rules and high-frequency RAF ref caching
├── docs/                            # In-depth architectural reports, audits, and guides
│   ├── audits/                      # PDF touch blank screen audit, navigation audits
│   ├── guides/                      # Migration, seeding, and edge function deployment guides
│   └── reports/                     # Security, accessibility, and performance reports
├── functions/                       # Cloudflare Pages Functions
│   └── _middleware.js               # Cloudflare HTMLRewriter middleware for canonical & robots
├── public/                          # Static assets and public crawlable manifests
│   ├── .well-known/                 # AI catalog (ai-plugin.json, llms.txt)
│   ├── assets/                      # Avatars, illustrations, hero avif images, favicons
│   ├── fonts/                       # Self-hosted Instrument Serif woff2 font files
│   ├── _headers                     # Cloudflare Pages HTTP response headers & CORS rules
│   ├── ai-catalog.json              # Structured catalog for agentic AI search
│   ├── llms.txt                     # Plain-text markdown guide for LLM crawlers
│   ├── robots.txt                   # Search crawler directives (disallows auth/viewer/dashboard)
│   ├── sitemap.xml                  # Dynamic sitemap generated at build time
│   └── sw.js                        # Service worker for Web Push Notifications
├── scripts/                         # Build & maintenance scripts
│   ├── copy-pdf-worker.mjs          # Copies pdf.worker.min.mjs to public/ before build
│   ├── generate-sitemap.js          # Queries Supabase to produce public/sitemap.xml
│   ├── prerender.js                 # Static pre-renderer injecting HTML & JSON-LD
│   └── seed_*.js                    # DB seed scripts (seed_admin, seed_pdfs, seed_syllabus_2026)
├── src/                             # Core React Application
│   ├── components/                  # UI components (MaterialCard, Dropdown, Modals, ErrorBoundary)
│   │   ├── loading/                 # PageLoader, Spinner
│   │   └── RenderingScreen/         # Animated canvas during PDF loading
│   ├── config/                      # Resource category & navigation route configurations
│   ├── context/                     # Context providers (AuthContext.tsx)
│   ├── data/                        # Static navigation links and fallback mock data
│   ├── hooks/                       # Reusable hooks (useDelayedLoading, useBottomRubberBand)
│   ├── layouts/                     # Shell layout (MainLayout.tsx)
│   ├── pages/                       # Application pages & routes
│   │   ├── about/                   # About page
│   │   ├── admin/                   # Admin Push Notifications Dispatcher & History
│   │   ├── attribution/             # Content & asset attribution
│   │   ├── auth/                    # Login.tsx, Register.tsx
│   │   ├── coming-soon/             # Feature placeholder
│   │   ├── contact/                 # Contact & support
│   │   ├── home/                    # Landing page with HeroPhoneAnimation
│   │   ├── onboarding/              # Class & medium selection onboarding
│   │   ├── privacy/                 # Privacy Policy
│   │   ├── resources/               # ResourcePage, ResourceDetails, PdfViewer
│   │   │   └── pdf-viewer/          # Modular viewer components, hooks, and loaders
│   │   ├── settings/                # Notification preferences
│   │   ├── syllabus/                # Interactive syllabus directory & flowchart visualizer
│   │   ├── terms/                   # Terms of Service
│   │   └── user/                    # Dashboard.tsx & student progress hooks
│   ├── services/                    # API integration (supabase.ts, auth.ts, notifications.ts)
│   ├── types/                       # TypeScript interfaces, database schema, PostgREST types
│   ├── utils/                       # Utility functions (permissions, download, urlHelper)
│   ├── App.tsx                      # App root router and route protection tree
│   ├── index.css                    # Global Neumorphic design tokens, utilities & reset
│   └── main.tsx                     # Entry point mounting root ErrorBoundary
└── supabase/                        # Backend configuration
    ├── functions/                   # Supabase Edge Functions (Deno)
    │   ├── resource-access/         # Token-gated 60-second signed URL generator
    │   ├── send-push-notification/  # Web Push dispatcher with VAPID crypto (RFC 8291)
    │   └── subscribe-push/          # Push subscription registration with SSRF protection
    ├── migrations/                  # Versioned PostgreSQL migrations
    └── config.toml                  # Supabase local CLI config
```

---

## 3. Frontend & Routing

### Routing Architecture (`src/App.tsx`)
- Driven by `react-router-dom` v7 with `BrowserRouter`.
- **Top-Level Authentication Routing (`AuthListener.tsx`)**:
  - Automatically redirects users with incomplete onboarding (`!profile.onboarding_completed`) to `/onboarding`.
  - Redirects onboarded users away from `/login`, `/register`, or `/onboarding` back to `/`.
- **Resilient Dynamic Imports (`lazyWithRetry.ts`)**:
  - Wraps dynamic `React.lazy` imports with automatic chunk-retry logic (up to 2 retries on network drops) and `sessionStorage` reload guards to resolve stale deployed chunk hashes cleanly.
- **Route Hierarchy**:
  - **Public Shell (`MainLayout.tsx`)**:
    - Static Pages: `/about`, `/contact`, `/terms`, `/privacy-policy`, `/attribution`.
    - PYQ Library: `/library`, `/library/:classSlug`, `/library/:classSlug/:mediumSlug`, `/library/:classSlug/:mediumSlug/:subjectSlug`.
    - Study Notes: `/notes`, `/notes/:classSlug`, `/notes/:classSlug/:mediumSlug`, `/notes/:classSlug/:mediumSlug/:subjectSlug`.
    - Syllabus Directory: `/syllabus`, `/syllabus/:classSlug`, `/syllabus/:classSlug/:subjectSlug`.
    - Resource Details: `/resource/:id`.
    - User Pages: `/dashboard`, `/settings/notifications`.
    - Auth Pages: `/login`, `/register`.
  - **Admin Guarded Route (`AdminRoute.tsx`)**:
    - `/admin/notifications`: Enforces `user.app_metadata.role === 'admin'`. Non-admins are routed to `/dashboard`.
  - **Standalone Reader Route**:
    - `/view/:id`: Isolated full-bleed PDF reader with dedicated `RenderingScreen` suspense fallback outside `MainLayout`.
  - **Catch-all 404 Route**.

---

## 4. UI Components & Design System

- **Neumorphic Visual Language**: Soft tactile raised cards, recessed wells, delicate 1px boundary traces, and dual-direction box-shadows (`.neu-raised`, `.neu-card`, `.neu-inset`, `.neu-recessed`, `.neu-pressed`, `.neu-button`).
- **Color Tokens**:
  - Base: `#F4F4F4` (`--bg-base`)
  - Raised Cards: `#FAFAFA` (`--bg-raised`)
  - Recessed Wells: `#FDFDFD` (`--bg-recessed`)
  - Ink: `#111111`
  - Accent / Brand Pink: `#E11584` / `#E91E8C`
- **Accessibility Patterns (`.Jules/palette.md`)**:
  - Focus indicators use `focus-visible:ring-2 focus-visible:ring-[#E91E8C]` to prevent focus rings on mouse clicks while ensuring clear visibility for keyboard navigation.
  - Dropdowns implement WAI-ARIA `listbox` with `role="option"` and full Arrow/Escape keyboard navigation.
  - PDF scrubber declares `role="slider"`, `aria-valuenow`, and dynamic `aria-valuetext`.
  - Mobile drawers and popovers declare `role="dialog"`, `aria-modal="true"`, and Escape key dismissal.
  - Decorative icons declare `aria-hidden="true"`.
- **Render Optimizations (`.Jules/bolt.md`)**:
  - Repeated list and flowchart cards (`MaterialCard`, `ChapterNodeCard`, `TopicNodeCard`) are wrapped in `React.memo`.
  - Array sorting is memoized with `useMemo` using non-mutating copies.
  - Sub-element DOM references are cached in `useRef` arrays during continuous 60fps animation loops (`HeroPhoneAnimation.tsx`).

---

## 5. Supabase Integration, Authentication, Database & Storage

### Authentication & Profiles (`src/context/AuthContext.tsx`, `src/services/auth.ts`)
- Supabase Auth handles email/password signup and sessions.
- Student metadata stored in the `profiles` table: `student_class`, `study_medium`, `avatar_url`, `onboarding_completed`, `name`.
- Administrator status is verified via `user.app_metadata.role === 'admin'`.

### Database Tables & Security
- **`learning_resources`**: Master content table storing titles, subjects, classes, media, storage buckets, file paths, and educational guidance JSONB fields.
- **`chapters`**: NCERT/CBSE chapter hierarchy.
- **`syllabus_topics` & `syllabus_topic_resources`**: Granular topic nodes and resource mappings.
- **`reading_progress` & `chapter_completions`**: Student dashboard metrics.
- **`push_subscriptions`**: Client push registrations; table grants strictly revoke direct client `INSERT` and `UPDATE` (RLS restricts direct `SELECT` and `DELETE` to the resource owner). Registrations are created via the `subscribe-push` Edge Function using `service_role`.
- **`announcements`**: Broadcast messages; public read access is restricted to `status = 'sent'`.

### Storage
- **Public Bucket (`pdfs`)**: Unclassified files and PYQ papers.
- **Protected Buckets**: Study Notes and proprietary content.

---

## 6. PDF Handling & Protected Resources

1. **Worker Distribution**:
   - `scripts/copy-pdf-worker.mjs` runs during `npm run prebuild` to place `pdf.worker.min.mjs` into `public/`.
   - `pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'` configured in `PdfDocumentRenderer.tsx`.
2. **Resource Protection (`isResourceProtected`)**:
   - A resource is protected if `storage_bucket !== 'pdfs'` and `resource_type !== 'pyq'`.
3. **Download Permissions (`canDownload`)**:
   - **Study Notes cannot be downloaded** (`canDownload` returns `false` strictly for `resource_type === 'notes'`).
   - PYQs and other allowed resources respect `allow_download !== false`.
4. **Edge Function Token Gating (`resource-access`)**:
   - When viewing or downloading protected resources, the client invokes `resource-access` with user `Authorization: Bearer <token>`.
   - Edge Function verifies active user session and returns a **60-second time-limited signed URL** generated via the admin service role.
5. **Viewer Pipeline (`src/pages/resources/pdf-viewer/`)**:
   - Implements `react-pdf` for canvas rendering.
   - Touch gestures & zooming managed by `TransformWrapper` (`react-zoom-pan-pinch`).
   - Features custom page scrubber (`PdfPageSlider`), top/bottom overlay controls (`PdfFloatingControls`), rotation toggle, rubber-band effect, and reading progress tracking (`usePdfProgress`).

---

## 7. SEO, Pre-rendering & Indexing

- **Canonical Base URL**: `https://unfollowaman.tech`
- **Dynamic Sitemap Builder (`scripts/generate-sitemap.js`)**:
  - Connects to Supabase, crawls all active resources, generates hierarchical category paths (`/notes/class-10/english-medium/science/`) and individual `/resource/:id` URLs, and outputs `public/sitemap.xml`.
- **Static Pre-renderer (`scripts/prerender.js`)**:
  - Ingests `dist/index.html` post-build and renders static HTML files for all static routes, categories, syllabus pages, and resource detail pages.
  - Injects pre-rendered `<div id="root">` content, `<title>`, `<meta name="description">`, `<link rel="canonical">`, and Schema.org JSON-LD structured data (`CollectionPage`, `BreadcrumbList`, `LearningResource`).
  - Executes `assertSecurityCompliance()` before writing files to prevent secret leakage.
- **Agentic AI Discoverability**:
  - Serves `public/llms.txt`, `public/ai-catalog.json`, and `.well-known/ai-plugin.json` for AI agents.
- **Crawler Rules (`public/robots.txt`)**:
  - Disallows `/dashboard`, `/settings/`, `/onboarding`, `/login`, `/register`, `/coming-soon`, and `/view/`.

---

## 8. Deployment Configuration (Cloudflare Pages)

- **Cloudflare Edge Middleware (`functions/_middleware.js`)**:
  - Intercepts requests on staging/preview domains (`tryhorizon.pages.dev`).
  - Uses Cloudflare's `HTMLRewriter` to rewrite canonical links to `https://unfollowaman.tech/<path>` and inject `<meta name="robots" content="noindex, nofollow" />`, preventing duplicate indexation.
- **HTTP Headers (`public/_headers`)**:
  - Declares CORS (`Access-Control-Allow-Origin: *`) and caching headers for AI manifests, robots, and sitemap.

---

## 9. Environment Variables

*Note: Variable names only; never store secret values in code or commits.*

### Client / Frontend (.env)
- `VITE_SUPABASE_URL`: Public Supabase API gateway URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase Anonymous public API key.

### Supabase Edge Functions / Runtime Secrets
- `SUPABASE_URL`: Internal Supabase API URL.
- `SUPABASE_ANON_KEY`: Supabase Anonymous API key.
- `SUPABASE_SERVICE_ROLE_KEY`: Privileged admin key for signed URLs and push registration.
- `ALLOWED_ORIGIN` / `ALLOWED_ORIGINS`: Comma-separated list of permitted CORS origins.
- `VAPID_PUBLIC_KEY`: Public VAPID key for Web Push.
- `VAPID_PRIVATE_KEY`: Private VAPID key for RFC 8291 notification signing.
- `VAPID_SUBJECT`: `mailto:` or URL identifier for push services.
- `SUPABASE_ACCESS_TOKEN`: Personal Access Token for Supabase CLI deployments.

---

## 10. Build & Testing Commands

- **Development Server**: `npm run dev`
- **Unit & Integration Tests**: `npm run test` (runs Vitest in single-run mode)
- **Linting**: `npm run lint` (runs ESLint)
- **Local Preview**: `npm run preview`
- **Prebuild**: `npm run prebuild` (executes `node scripts/copy-pdf-worker.mjs`)
- **Full Production Build**: `npm run build`
  - Sequence: `node scripts/generate-sitemap.js` -> `tsc -b` -> `vite build` -> `node scripts/prerender.js`

---

## 11. Important Development Conventions

1. **Strict Non-Destructive Modularity**: Preserve existing comments, structure, and accessibility markup unless specifically refactoring.
2. **WAI-ARIA Accessibility**: Always reference `.Jules/palette.md` for ARIA roles, `focus-visible` styling, and screen-reader announcements.
3. **React Performance**: Always reference `.Jules/bolt.md` for `React.memo` usage on grid/list items and caching element refs in high-frequency animations.
4. **Security Isolation**:
   - Study Notes must never be given direct download links.
   - Protected storage operations must proceed through the `resource-access` edge function.
   - Client code must never use the Supabase `service_role` key.
5. **URL & Category Slugs**: All category routing must use `buildCategoryUrl()` and `slugTo*` / `*ToSlug` helpers in `src/utils/urlHelper.ts` to maintain canonical URL structure.

---

## 12. Known Issues & Limitations

1. **PDF Viewer Touch Blank Screen**:
   - In `src/pages/resources/pdf-viewer/hooks/usePdfData.ts`, calling `download.data.buffer.slice(...)` produces an unstable `ArrayBuffer` reference identity on every render pass triggered by user touch (`handleInteraction()`). This causes `react-pdf`'s `<Document>` component to unmount pages and re-parse the document in the worker thread, producing a 3–4 second blank white screen on touch devices. (Detailed in `PDF_VIEWER_TOUCH_BLANK_SCREEN_DIAGNOSIS.md`).
2. **PostgREST Schema Evolution Fallback**:
   - Queries in `learningResourcesAPI.ts` feature legacy fallback handlers catching error code `42703` / `PGRST204` if chapter content columns do not yet exist on newly attached database instances.
3. **Web Push Browser Limitations**:
   - Browser push notifications depend on `PushManager` and `ServiceWorker`, which are unsupported in iOS in-app webviews or unsecured non-localhost HTTP environments.
4. **Dynamic Chunk Loading Latency**:
   - Stale chunk hashes following Cloudflare Pages redeployments are handled by `lazyWithRetry()`, which requires a controlled reload to align client chunks with newly deployed assets.
