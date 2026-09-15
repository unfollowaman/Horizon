## 2026-03-31 - Memoizing Repeated List Components with React.memo
**Learning:** In list views like `ResourcePage` that render grids of `MaterialCard` items, parent state updates (such as filter selections, navigation state, or parent counters) cause every rendered card to re-render even if its `resource` prop hasn't changed. Wrapping `MaterialCard` in `React.memo` prevents unnecessary virtual DOM reconciliations for items in grid lists.
**Action:** When working on list/grid components with repeated items in React, wrap child item components with `React.memo` and assign `displayName` to ensure optimal render performance.

## 2026-04-01 - Memoizing Interactive Canvas/Flowchart Nodes in Zoom/Pan Viewports
**Learning:** Canvas and flowchart visualizers (like `SyllabusFlowchart`) update scale/transform state on every zoom and pan gesture via `TransformWrapper`. Without memoization, hundreds of child node components (`ChapterNodeCard`, `TopicNodeCard`) re-render on every frame update during interaction. Wrapping node cards in `React.memo` stops redundant reconciliations and maintains 60fps pan/zoom.
**Action:** Always wrap node items rendered inside interactive zoom/pan viewports with `React.memo` and assign `displayName`.
