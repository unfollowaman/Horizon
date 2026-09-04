# Stage 5 (S5) — Syllabus Routing & UI Foundation Implementation Report

**Status:** S5 IMPLEMENTED (S6 Visual Flowchart deferred to Stage 6)
**Branch:** `feature/s5-syllabus-ui`
**Date:** September 2026

---

## 1. Scope Implemented

Stage 5 (S5) builds the complete user-facing syllabus navigation and expandable hierarchy browsing experience on top of the Stage 4 (S4) database schema (`chapters`, `syllabus_topics`, `syllabus_topic_resources`, `learning_resources`) and data-fetching API (`fetchSyllabusHierarchy`).

### Key S5 Delivered Capabilities:
1. **User Flow & Navigation:**
   `Syllabus` → `Class Selection (Class 8, Class 9, Class 10)` → `Subject Selection` → `Chapter & Topic Hierarchy`.
2. **Deterministic Routes:**
   - `/syllabus` (Syllabus landing directory page)
   - `/syllabus/:classSlug` (Class subject selector, e.g., `/syllabus/class-10`)
   - `/syllabus/:classSlug/:subjectSlug` (Subject chapter hierarchy view, e.g., `/syllabus/class-10/mathematics`)
3. **Data/API Integration:**
   Reused existing `fetchSyllabusHierarchy(studentClass, subject)` from `src/services/learningResourcesAPI.ts` with normalized class IDs (`8`, `9`, `10`) and exact subject names.
4. **Subject Distinction:**
   Preserved Class 10 Hindi Course A and Hindi Course B as separate database subject entries in the UI.
5. **Expandable Hierarchy Tree:**
   Clear chapter and topic hierarchy with expand/collapse controls, chapter summaries, and topic descriptions.
6. **Topic Types & Badges:**
   Visually distinguished `topic`, `exercise`, and `grammar` sections using distinct badge styles without altering database classification.
7. **Medium-Neutral Resource Links:**
   Resource links ("View Notes", English / Hindi) appear under syllabus topic nodes ONLY when actual topic-resource mappings exist in `syllabus_topic_resources`. No fake or inferred links are created. Coexisting English and Hindi resources under one topic render seamlessly as resource options.
8. **Class 9 Special Case:**
   Class 9 Mathematics Chapters 9–15 render cleanly without fabricated exercise nodes.
9. **UI & Accessibility:**
   Neumorphic styling matching Horizon's design language, keyboard accessible controls (`aria-expanded`, `tabIndex`), responsive mobile/desktop layouts, and skeleton/error/retry UI states.

---

## 2. Routes Created & Updated

| Route | View Component | Description |
| :--- | :--- | :--- |
| `/syllabus` | `SyllabusLanding` | Renders Class 8, Class 9, and Class 10 selection cards |
| `/syllabus/:classSlug` | `ClassSubjectSelector` | Renders available subjects for selected class (e.g. `/syllabus/class-10`) |
| `/syllabus/:classSlug/:subjectSlug` | `SyllabusHierarchyTree` | Fetches and renders chapter/topic tree for class & subject (e.g. `/syllabus/class-10/hindi-course-a`) |

*Routes are registered in `src/App.tsx` under `MainLayout` with lazy loading (`Suspense`).*

---

## 3. Components & Code Created/Modified

### Created Components:
- `src/services/syllabusService.ts` — Normalization helpers, class/subject definitions, and slug resolution functions.
- `src/pages/syllabus/SyllabusPage.tsx` — Main route container component handling URL parameters, state management, and API calls.
- `src/pages/syllabus/components/SyllabusLanding.tsx` — Neumorphic landing directory card view.
- `src/pages/syllabus/components/ClassSubjectSelector.tsx` — Subject grid selector with back navigation.
- `src/pages/syllabus/components/SyllabusHierarchyTree.tsx` — Chapter accordion tree with Expand/Collapse All buttons.
- `src/pages/syllabus/components/SyllabusTopicNode.tsx` — Topic item with `topic_type` badge and linked `Link` resource buttons.
- `src/pages/syllabus/components/SyllabusSkeleton.tsx` — Pulse loading placeholder skeleton.
- `src/pages/syllabus/__tests__/Syllabus.test.tsx` — Vitest integration test suite for S5.

### Modified Files:
- `src/App.tsx` — Added lazy-loaded `/syllabus`, `/syllabus/:classSlug`, and `/syllabus/:classSlug/:subjectSlug` routes.
- `src/config/resources.ts` — Added `Syllabus` to global navigation features and header links.
- `scripts/generate-sitemap.js` — Added `/syllabus`, `/syllabus/class-8`, `/syllabus/class-9`, and `/syllabus/class-10` to public static sitemap entries.

---

## 4. Resource-Link & Medium-Neutral Mechanics

1. **Resource Link Generation:**
   - Extracted `resources` directly from `topic.resources` returned by `fetchSyllabusHierarchy`.
   - If `resources` array is non-empty, renders a "View Notes" action badge specifying language (`English` or `Hindi`).
   - If no resource exists for a topic node, zero action buttons or placeholder links are generated.
2. **Medium-Neutral Coexistence:**
   - Syllabus nodes are language-agnostic.
   - If both an English and a Hindi resource map to the same topic ID via `syllabus_topic_resources`, both buttons are rendered side-by-side under the same node.
3. **Protected Document Access:**
   - Resource buttons link strictly to `/resource/:id` public educational landing pages using `Link` from `react-router-dom`.
   - Zero storage bucket paths, signed URLs, file paths, or PDF tokens are exposed.

---

## 5. Accessibility & Responsive Behavior

- Keyboard navigation supported on all class cards, subject cards, expand/collapse toggles, and resource links.
- Semantic HTML tags (`<header>`, `<main>`, `<article>`, `<button>`, `<nav>`, `<h1>`–`<h4>`) used throughout.
- Expandable chapter controls declare explicit `aria-expanded` and `aria-label` properties.
- Responsive flex and grid layouts (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) adapt cleanly across desktop, tablet, and mobile viewports.

---

## 6. Test Results

Vitest test suite execution:

```
✓ src/pages/syllabus/__tests__/Syllabus.test.tsx (11 tests)
  ✓ 1. /syllabus renders the main Syllabus landing page with Class 8, Class 9, and Class 10 cards
  ✓ 2. Clicking Class 10 navigates to /syllabus/class-10 and renders Class 10 subjects
  ✓ 3. Class 8 subject selection renders expected Class 8 subjects
  ✓ 4. Class 9 subject selection renders expected Class 9 subjects with unified Hindi
  ✓ 5. Class 10 keeps Hindi Course A and Hindi Course B strictly separate
  ✓ 6. Subject page calls fetchSyllabusHierarchy with normalized class and subject name
  ✓ 7. Renders chapters and topics in display order and respects topic_type badges
  ✓ 8. Resource links appear ONLY when actual topic-resource mappings exist without creating fake links
  ✓ 9. English and Hindi resources can coexist under one syllabus topic node
  ✓ 10. Class 9 Mathematics Chapters 9-15 render safely with zero exercise nodes
  ✓ 11. Handles error state and retry option safely without crashing

Test Files: 29 passed (29)
     Tests: 201 passed (201)
  Duration: 16.73s
```

---

## 7. Production Build Result

Executing `npm run build`:

```
> node scripts/generate-sitemap.js && tsc -b && vite build && node scripts/prerender.js

Fetched 66 active resources from Supabase.
Sitemap generated successfully at /app/public/sitemap.xml with 104 total URLs.
vite v8.1.0 building client environment for production...
✓ built in 2.50s
Pre-rendering public static information pages...
  ✓ Pre-rendered / -> dist/index.html
  ✓ Pre-rendered /about -> dist/about/index.html
  ✓ Pre-rendered /contact -> dist/contact/index.html
  ✓ Pre-rendered /terms -> dist/terms/index.html
  ✓ Pre-rendered /privacy-policy -> dist/privacy-policy/index.html
  ✓ Pre-rendered /attribution -> dist/attribution/index.html
Connecting to Supabase to fetch learning resources...
Mapping 66 active resources for pre-rendering...
Pre-rendering complete! Successfully generated 66 static resource pages in dist/resource/<id>/index.html.
Pre-rendering public category listing pages...
Pre-rendering complete! Successfully generated 28 static category listing pages.
```

---

## 8. Distinction from S6 Flowchart

- **Stage 5 (S5) — Complete:** Standard expandable/collapsible tree hierarchy browser with text nodes, topic badges, and resource action links.
- **Stage 6 (S6) — Future:** Interactive visual flowchart with pan, zoom, node connections, and graphical graph rendering. S5 strictly avoids simulating S6 flowchart pan/zoom mechanics.

---

## 9. Final Confirmation Statements

- **PR Branch:** `feature/s5-syllabus-ui`
- **PR Status:** PR created, **NOT merged** into main.
- **S6 Status:** S6 flowchart was **NOT implemented** in this PR.
