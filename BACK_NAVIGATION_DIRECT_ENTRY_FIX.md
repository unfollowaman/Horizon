# Back Navigation Direct Entry Fix

## Problem
In `src/pages/resources/ResourceDetails.tsx`, the Back button used `window.history.length > 1 ? window.history.back() : window.location.href = backPath`. Because `window.history.length` reflects the total browser tab session history rather than Horizon's internal navigation stack, direct entries (from search engines, bookmarks, direct links, or external sites) in tabs with prior history triggered `window.history.back()`, navigating users out of Horizon.

## Root Cause
`window.history.length` cannot differentiate between internal Horizon navigation history and prior external browser tab history.

## Implementation
1. **Resource Details Back Navigation:** Updated `ResourceDetails.tsx` to inspect `location.state?.fromApp` using React Router's `useLocation()` and `useNavigate()`.
   - When `location.state?.fromApp` is `true`, `navigate(-1)` is called, executing a clean `POP` history traversal and preserving previous page scroll position.
   - When `location.state?.fromApp` is `falsy` (direct entry), `navigate(backPath, { replace: true })` is called, keeping the user inside Horizon and replacing the history entry without introducing duplicate history stack entries or exiting the app.
2. **In-App Link State Tagging:** Added `state={{ fromApp: true }}` to all internal navigation components leading to `/resource/:id`:
   - `src/components/MaterialCard.tsx` (card container and "View" button)
   - `src/pages/syllabus/components/SyllabusTopicNode.tsx` ("View Notes" button)
   - `src/pages/syllabus/components/SyllabusFlowchart.tsx` ("View Notes" button in graph nodes)
   - `src/pages/resources/ResourceDetails.tsx` (Related Resources items)

## Resource Entry Points Updated
| File | Component | Navigation Element | State Added |
| --- | --- | --- | --- |
| `src/components/MaterialCard.tsx` | `MaterialCard` | Card container `<Link>` | `state={{ fromApp: true }}` |
| `src/components/MaterialCard.tsx` | `MaterialCard` | View CTA `<Link>` | `state={{ fromApp: true }}` |
| `src/pages/syllabus/components/SyllabusTopicNode.tsx` | `SyllabusTopicNode` | View Notes `<Link>` | `state={{ fromApp: true }}` |
| `src/pages/syllabus/components/SyllabusFlowchart.tsx` | `TopicNodeCard` | View Notes `<Link>` | `state={{ fromApp: true }}` |
| `src/pages/resources/ResourceDetails.tsx` | `ResourceDetails` | Related Resource `<Link>` | `state={{ fromApp: true }}` |

## Tests Performed
- **Automated Unit Tests:** Added unit test coverage in `src/pages/resources/__tests__/ResourceDetails.test.tsx` verifying:
  1. Direct entry navigation falls back to `backPath` using `replace: true`.
  2. In-app navigation with `state.fromApp` executes `navigate(-1)`.
- **E2E Playwright Verification:** Executed Playwright automation capturing video and screenshots verifying both direct entry and in-app navigation flows.

## Test Results

| Test | Expected | Actual | Status |
| --- | --- | --- | --- |
| Direct Resource Entry | Stay inside Horizon (navigate to `backPath` with replace) | Navigated to `/notes/class-10/english-medium/geography` inside Horizon | PASS |
| External Tab History | Stay inside Horizon on Back click | Navigated to internal `backPath` without exiting app | PASS |
| Notes Flow | Resource → Notes (`POP`) | Returned to `/notes` cleanly | PASS |
| Library Flow | Resource → Library (`POP`) | Returned to `/library` cleanly | PASS |
| PDF Flow | PDF → Resource → Notes | PDF back to Resource, Resource back to Notes | PASS |
| Native Back | Normal browser history traversal | Followed native browser session history | PASS |
| Mixed Back | Same underlying history sequence | Traversed expected route sequence | PASS |
| Scroll Restoration | Previous position restored | Preserved scroll position via `POP` traversal | PASS |
| All Resource Entry Points | Correct previous route | All entry points tagged with `state.fromApp` | PASS |

## Scroll Restoration Verification
In-app navigation uses `navigate(-1)` (`POP`), allowing `ScrollToTop.tsx` (`useNavigationType() !== 'POP'`) to bypass scroll resets and preserve exact scroll coordinates on return to notes/library listing pages.

## Native Back Verification
The fix uses React Router location state and `navigate()` handlers without modifying window state or overriding native browser back button listeners. Native browser/device Back buttons continue to work standardly.

## History POP/REPLACE Verification
- In-app Back button calls `navigate(-1)`, triggering a `POP` navigation action.
- Direct entry Back button calls `navigate(backPath, { replace: true })`, triggering a `REPLACE` navigation action that replaces the single direct-entry entry with the category route.

## Files Changed
- `src/pages/resources/ResourceDetails.tsx`
- `src/components/MaterialCard.tsx`
- `src/pages/syllabus/components/SyllabusTopicNode.tsx`
- `src/pages/syllabus/components/SyllabusFlowchart.tsx`
- `src/pages/resources/__tests__/ResourceDetails.test.tsx`

## Regression Check
Searched the codebase for `window.history.length > 1`. Confirmed removed from `ResourceDetails.tsx`. (Note: NotificationSettings.tsx contains a separate `window.history.length > 1` pattern for settings subpage navigation, kept out of scope per directives). All 322 project tests passed.

## Final Status
Fix verified and complete. Direct entry back navigation stays strictly inside Horizon, while in-app history traversal and scroll restoration remain fully preserved.
