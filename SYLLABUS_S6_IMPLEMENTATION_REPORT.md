# Horizon Phase S6 — Syllabus Flowchart Visualizer Implementation Report

**Date:** March 2026
**Phase:** Stage 6 (S6)
**Status:** Complete & Verified

---

## 1. S6 Objective
The objective of Phase S6 is to introduce an interactive, dynamic flowchart visualizer as the primary user experience for syllabus subject pages (`/syllabus/:classSlug/:subjectSlug`). S6 replaces the accordion tree layout with a visual connected-node graph mapping:

$$\text{Class} \longrightarrow \text{Subject} \longrightarrow \text{Chapter} \longrightarrow \text{Topic / Exercise / Grammar}$$

The visual graph must be generated dynamically from existing syllabus data without hardcoded node coordinates or separate implementations per subject, preserving existing routing, SEO metadata, and protected resource flows.

---

## 2. Existing Architecture Inspected
Before making changes, the S5/S5.1 syllabus architecture was inspected:
- **Routing:** `/syllabus`, `/syllabus/:classSlug`, `/syllabus/:classSlug/:subjectSlug` (`src/App.tsx`, `src/pages/syllabus/SyllabusPage.tsx`)
- **Service Layer:** `fetchSyllabusHierarchy(classId, subjectName)` in `src/services/learningResourcesAPI.ts` and resolution functions in `src/services/syllabusService.ts`
- **Data Model:** `SyllabusChapterHierarchy` consisting of `Chapter` joined with `SyllabusTopic[]` (including `topic_type` as `'topic'`, `'exercise'`, `'grammar'`) and optional mapped `Resource[]`
- **Design Tokens:** Neumorphic card/recessed/raised styles, `#E91E8C` brand accent color, standard typography.

---

## 3. Graph Architecture Selected
We selected a lightweight, highly responsive canvas graph architecture powered by `react-zoom-pan-pinch` (`TransformWrapper`, `TransformComponent`):

```
SyllabusPage
  ↓
SyllabusFlowchart
  ↓ (pure transformation layer)
graphTransform (transformHierarchyToGraph)
  ↓
{ nodes, edges, width, height }
  ↓
Canvas Layer (TransformComponent)
  ├── SVG Edges Layer (Curved paths with gradient stroke)
  └── Nodes HTML Overlay Layer
        ├── ChapterNodeCard
        └── TopicNodeCard (Topic / Exercise / Grammar)
```

### Why this approach?
1. **Reuses Stack:** Utilizes existing `react-zoom-pan-pinch` (already used in `PdfDocumentRenderer.tsx`), adding zero extra heavy bundle size.
2. **Dynamic & Deterministic:** Automatically computes column layout positions and SVG connecting curves based on data length and display order.
3. **Smooth Pan & Zoom:** Desktop drag/wheel and mobile touch-drag/pinch supported natively with high FPS.
4. **Accessible HTML Nodes:** Renders nodes as styled HTML elements inside the transformed container, enabling keyboard navigation, focus rings, screen reader labels, and clickable resource links (`<Link>`).

---

## 4. Components & Files Changed / Added

| File | Status | Description |
|---|---|---|
| `src/pages/syllabus/utils/graphTransform.ts` | **New** | Pure function `transformHierarchyToGraph` converting `SyllabusChapterHierarchy[]` to nodes, edges, and graph dimensions. |
| `src/pages/syllabus/utils/__tests__/graphTransform.test.ts` | **New** | Unit tests for pure graph transformer (6 tests). |
| `src/pages/syllabus/components/SyllabusFlowchart.tsx` | **New** | Reusable interactive flowchart component with pan/zoom/fit controls, SVG edge curves, and neumorphic node cards. |
| `src/pages/syllabus/components/__tests__/SyllabusFlowchart.test.tsx` | **New** | Unit tests for `SyllabusFlowchart` component (5 tests). |
| `src/pages/syllabus/SyllabusPage.tsx` | **Modified** | Updated subject route renderer to primary `SyllabusFlowchart` view. |
| `src/pages/syllabus/__tests__/Syllabus.test.tsx` | **Modified** | Updated integration test suite for S6 flowchart UI and routing (17 tests). |

---

## 5. Data Transformation Approach
The `transformHierarchyToGraph(chapters)` pure function processes `SyllabusChapterHierarchy[]`:
- **Column Layout:** Arranges each chapter as a distinct vertical column spaced horizontally (`CHAPTER_WIDTH = 320px`, `COLUMN_GAP = 60px`).
- **Stacked Children:** Arranges topic, exercise, and grammar child nodes vertically beneath their parent chapter.
- **Node IDs:**
  - Chapter Node ID: `chapter-{chapter.id}`
  - Topic Node ID: `topic-{topic.id}`
- **Edge IDs:** `edge-{chapter.id}-{topic.id}`
- **Sorting:** Preserves `display_order` or `chapter_number` sorting for chapters and `display_order` sorting for child topic nodes.
- **Independent Existence:** Creates nodes for every topic regardless of whether `resources` exist.

---

## 6. Node Types & Visual Hierarchy

1. **Chapter Nodes (`ChapterNodeCard`):**
   - Distinct double-border with `#E91E8C` accent.
   - Shows Chapter Number badge, Chapter Name, and section count pill.
   - Multilingual text wrapping with flex text containment (`break-words line-clamp-2`).

2. **Topic Nodes (`TopicNodeCard`):**
   - Recessed card styling (`neu-recessed`).
   - Distinct badges for `topic_type`:
     - **Topic:** Neutral dark pill (`Topic`)
     - **Exercise:** Blue pill (`Exercise`)
     - **Grammar:** Purple pill (`Grammar`)
   - Shows topic title and optional short description.
   - Shows resource CTA links (`View Notes` + `English` / `Hindi` pill) when resources exist.

---

## 7. Edge & Layout Approach
- Connected SVG curved paths (`d="M x1 y1 C x1 midY, x2 midY, x2 y2"`) connecting bottom-center of Chapter cards to top-center of child Topic cards.
- SVG edges styled with a linear gradient from `#E91E8C` to `#8B0A50` with dashed strokes (`strokeDasharray="4 2"`).

---

## 8. Desktop & Mobile Interaction
- **Desktop:** Click-drag canvas to pan; mouse wheel to zoom; compact top-right control bar for **+** (Zoom In), **−** (Zoom Out), and **Fit View** (Reset View). Node links operate independently without dragging canvas.
- **Mobile:** Single-finger drag to pan; pinch-to-zoom; touch taps on nodes trigger resource navigation. Graph viewport container uses `h-[70vh] min-h-[500px]` with `overflow: hidden`, preventing page-level horizontal scrollbar creation.

---

## 9. Accessibility Implementation
- Floating control buttons feature explicit `aria-label` attributes (`"Zoom in flowchart"`, `"Zoom out flowchart"`, `"Fit flowchart to view"`).
- All resource links inside nodes are semantic `<Link>` components with keyboard focus rings (`focus:ring-2 focus:ring-[#E91E8C]`).
- Topic types are distinguished by explicit textual labels (`Topic`, `Exercise`, `Grammar`) in addition to visual badge colors.

---

## 10. Resource Link Behavior
- Nodes exist unconditionally regardless of resource availability.
- If resources exist in `topic.resources`, a `View Notes` button linking to `/resource/:id` is rendered.
- If no resource exists, the node remains visible and functional without broken links or fabricated resource buttons.
- No storage URLs, signed tokens, or protected PDF URLs are exposed in graph DOM nodes.

---

## 11. Test Results
- **Graph Transformer Unit Tests (`graphTransform.test.ts`):** 6 / 6 passed.
- **Flowchart Component Unit Tests (`SyllabusFlowchart.test.tsx`):** 5 / 5 passed.
- **Syllabus Integration Tests (`Syllabus.test.tsx`):** 17 / 17 passed.
- **Full Application Test Suite (`npm test`):** 225 / 225 passed across 31 test files.

---

## 12. Build & Typecheck Results
- **TypeScript Compilation (`tsc -b`):** 0 errors.
- **Vite Production Build (`vite build`):** Success (built `dist/` in ~2.29s).
- **Static Pre-rendering (`prerender.js`):** Success (pre-rendered 66 static resource pages and 28 category listing pages).

---

## 13. Database & Security Confirmation
- **Database Schema / Data:** NO database schema, RLS policy, or syllabus seed data changes were made.
- **Resource Access:** Protected PDF access infrastructure and edge functions remained untouched.

---

## 14. Verification Checklist
- [x] Flowchart is the primary syllabus UI on subject routes (`/syllabus/:classSlug/:subjectSlug`).
- [x] Existing syllabus hierarchy service layer (`fetchSyllabusHierarchy`) is reused.
- [x] No hardcoded graph node coordinates.
- [x] Class → Subject → Chapter → Topic/Exercise/Grammar hierarchy visually mapped.
- [x] Curved SVG edges connect chapters to child nodes.
- [x] Desktop pan/zoom and mobile touch interaction verified.
- [x] Page-level horizontal overflow avoided via bounded container viewport.
- [x] Hindi Course A and Hindi Course B remain separate subjects for Class 10.
- [x] Grammar and Exercise nodes visibly distinguishable.
- [x] Full test suite (225 tests) and production build pass cleanly.
