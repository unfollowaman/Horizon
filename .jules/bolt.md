## 2026-03-31 - Memoizing Repeated List Components with React.memo
**Learning:** In list views like `ResourcePage` that render grids of `MaterialCard` items, parent state updates (such as filter selections, navigation state, or parent counters) cause every rendered card to re-render even if its `resource` prop hasn't changed. Wrapping `MaterialCard` in `React.memo` prevents unnecessary virtual DOM reconciliations for items in grid lists.
**Action:** When working on list/grid components with repeated items in React, wrap child item components with `React.memo` and assign `displayName` to ensure optimal render performance.

## 2026-04-01 - Memoizing Interactive Canvas/Flowchart Nodes in Zoom/Pan Viewports
**Learning:** Canvas and flowchart visualizers (like `SyllabusFlowchart`) update scale/transform state on every zoom and pan gesture via `TransformWrapper`. Without memoization, hundreds of child node components (`ChapterNodeCard`, `TopicNodeCard`) re-render on every frame update during interaction. Wrapping node cards in `React.memo` stops redundant reconciliations and maintains 60fps pan/zoom.
**Action:** Always wrap node items rendered inside interactive zoom/pan viewports with `React.memo` and assign `displayName`.

## 2026-04-02 - Non-Mutating Shallow Copy Sorting for React State Arrays
**Learning:** Calling `Array.prototype.sort()` directly on arrays passed from React state or `useMemo` hooks mutates state in place when no filters are active. Performing a shallow copy `[...resources].sort(...)` prevents React state mutation and preserves render cache integrity while enabling fast numeric coercions (`Number(val) || 0`) over repeated string parsing.
**Action:** Always sort array arguments via a shallow copy (`[...arr].sort(...)`) inside data processing and configuration helpers to preserve state immutability.
