## 2026-03-31 - Memoizing Repeated List Components with React.memo
**Learning:** In list views like `ResourcePage` that render grids of `MaterialCard` items, parent state updates (such as filter selections, navigation state, or parent counters) cause every rendered card to re-render even if its `resource` prop hasn't changed. Wrapping `MaterialCard` in `React.memo` prevents unnecessary virtual DOM reconciliations for items in grid lists.
**Action:** When working on list/grid components with repeated items in React, wrap child item components with `React.memo` and assign `displayName` to ensure optimal render performance.

## 2026-03-31 - Memoizing Flowchart Graph Node Cards to Prevent Pan/Zoom Re-render Storms
**Learning:** In interactive pan/zoom viewports like `SyllabusFlowchart` (using `react-zoom-pan-pinch`), `onTransform` scale state updates trigger on every animation frame during panning or zooming. Without `React.memo`, every rendered graph node component in the viewport canvas re-renders on every scale tick even when node props are referentially identical (`===`), resulting in thousands of unnecessary re-renders per second.
**Action:** Wrap graph node sub-components in `React.memo` and ensure the graph nodes array is memoized via `useMemo` so React skips re-rendering node cards during viewport scale and pan updates.
