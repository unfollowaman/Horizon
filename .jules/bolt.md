## 2026-03-31 - Memoizing Repeated List Components with React.memo
**Learning:** In list views like `ResourcePage` that render grids of `MaterialCard` items, parent state updates (such as filter selections, navigation state, or parent counters) cause every rendered card to re-render even if its `resource` prop hasn't changed. Wrapping `MaterialCard` in `React.memo` prevents unnecessary virtual DOM reconciliations for items in grid lists.
**Action:** When working on list/grid components with repeated items in React, wrap child item components with `React.memo` and assign `displayName` to ensure optimal render performance.

## 2026-04-01 - Memoizing Interactive Canvas/Flowchart Nodes in Zoom/Pan Viewports
**Learning:** Canvas and flowchart visualizers (like `SyllabusFlowchart`) update scale/transform state on every zoom and pan gesture via `TransformWrapper`. Without memoization, hundreds of child node components (`ChapterNodeCard`, `TopicNodeCard`) re-render on every frame update during interaction. Wrapping node cards in `React.memo` stops redundant reconciliations and maintains 60fps pan/zoom.
**Action:** Always wrap node items rendered inside interactive zoom/pan viewports with `React.memo` and assign `displayName`.

## 2026-04-01 - Memoizing Syllabus Flowchart Chapter Cards and Topic Sorting
**Learning:** In interactive syllabus visualizers (`SyllabusFlowchart`), toggling one chapter card re-renders all 15-25 chapter cards in the grid and repeatedly mutates/re-sorts topic arrays during render. Extracting `FlowchartChapterCard` into a `React.memo` component, memoizing sorted topics with `useMemo`, and wrapping event handlers in `useCallback` eliminates virtual DOM reconciliation for unchanged chapters and prevents array mutations on every state update.
**Action:** Always wrap repeated card items in interactive syllabus/roadmap grids with `React.memo` and memoize topic sorting using `useMemo` with non-mutating array copies.
