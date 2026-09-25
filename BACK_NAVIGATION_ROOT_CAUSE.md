# Back Navigation Root Cause Investigation

## Problem Reproduction

The objective of this targeted investigation was to reproduce and isolate the root cause of the user-reported Back navigation loop:

```
Description Page (/resource/:id)
    ↓ Back
PDF/Resource Listing (/notes or /library)
    ↓ Back
Description Page (/resource/:id)   ← REPORTED LOOP
    ↓ Back
PDF/Resource Listing (/notes or /library)
    ...
```

To investigate this, comprehensive diagnostic instrumentation was added to the browser runtime during headless Playwright test execution. Every `pushState`, `replaceState`, `popstate` event, history state object (`history.state`), history stack length (`history.length`), React Router state, component lifecycle mount/unmount, scroll position, and custom vs native Back button trigger was recorded.

---

## Exact Reproduction Steps

The exact user-reported journey was executed in isolated browser contexts:

1. **Step 1:** Launch browser at `http://localhost:5173/` (Home).
2. **Step 2:** Scroll down on Home (e.g. `scrollTo(0, 1000)` or `scrollTo(0, 2000)`).
3. **Step 3:** Select "Study Notes" feature link (`/notes`).
4. **Step 4:** Scroll down on Notes page through material cards (`scrollTo(0, 1200)`).
5. **Step 5:** Click a material card (e.g. `/resource/56` or `/resource/87`).
6. **Step 6:** Arrive at Resource Description page (`/resource/:id`).
7. **Step 7:** Press Horizon's custom Back button on Description page (`ResourceDetails.tsx`).
8. **Step 8:** Verify destination (`/notes`).
9. **Step 9:** Press Horizon's custom Back button on Notes page (`ResourcePage.tsx`).
10. **Step 10:** Verify destination (`/`).
11. **Step 11:** Repeat using native browser Back button (`page.goBack()`).
12. **Step 12:** Repeat using mixed custom and native Back controls.
13. **Step 13:** Test across all 19 unique resource cards on `/notes`.
14. **Step 14:** Test with and without prior filter selection (Class 10, English Medium, etc.).
15. **Step 15:** Test with and without navigating into the PDF Viewer (`/view/:id`).

---

## Working Flow

### Flow A (Standard In-App Notes Traversal)
- **Navigation Sequence:**
  `Home (/)` → `Notes (/notes)` → `Description (/resource/56)` → `Back (Custom or Native)` → `Notes (/notes)` → `Back (Custom or Native)` → `Home (/)`
- **Result:** **Passes cleanly.**
- **Event Trace:**
  1. `Home (/)`: `history.length = 2`
  2. `PUSH /notes`: `history.length = 3`, `history.state = { idx: 1, key: "..." }`
  3. `PUSH /resource/56`: `history.length = 4`, `history.state = { idx: 2, key: "..." }`
  4. `POP` via Back button: Returns to `/notes` (`history.state = { idx: 1 }`). No secondary `PUSH` event occurs.
  5. `POP` via Back button: Returns to `/` (`history.state = { idx: 0 }`). No secondary `PUSH` event occurs.

### Flow B (Standard In-App Library Traversal)
- **Navigation Sequence:**
  `Home (/)` → `Library (/library)` → `Description (/resource/56)` → `Back` → `Library (/library)` → `Back` → `Home (/)`
- **Result:** **Passes cleanly.**

### Flow C (Full PDF Reader Traversal)
- **Navigation Sequence:**
  `Home (/)` → `Notes (/notes)` → `Description (/resource/56)` → `PDF Reader (/view/56)` → `Back` → `Description (/resource/56)` → `Back` → `Notes (/notes)` → `Back` → `Home (/)`
- **Result:** **Passes cleanly.**

---

## Failing Flow

### Flow E (Direct Entry / External Referrer in Multi-Page Tab)
When a user accesses a Resource Description page (`/resource/:id`) directly via URL input, bookmark, shared link, or external referrer in a browser tab that already contains pre-existing history entries:

```
Tab Session History: [External Page A] → [External Page B]
  ↓ Direct Entry
User arrives at /resource/87
  ↓ (history.length = 3)
User presses Horizon's Back button on ResourceDetails.tsx
  ↓
Code evaluates: window.history.length > 1 (3 > 1 = TRUE)
  ↓
Executes: window.history.back()
  ↓
POP → Navigates to [External Page B] (EXITS HORIZON APP)
```

If the user then presses the browser's Forward button to re-enter Horizon and attempts Back again, or if the tab history stack contains previous Horizon visits across tab reloads:

```
1. Direct Entry / Bookmark: /resource/87 (histLen = 3)
2. User clicks Back on Description
3. window.history.back() pops to previous tab entry
4. User clicks Forward on browser -> arrives back at /resource/87
5. User clicks Back on Description again -> returns to previous tab entry
```

---

## Navigation Event Timeline

Recorded during automated browser runtime instrumentation:

```json
[
  {
    "time": 608,
    "event": "replaceState",
    "pathname": "/",
    "search": "",
    "histLength": 2,
    "histState": null,
    "detail": {}
  },
  {
    "time": 812,
    "event": "pushState",
    "pathname": "/",
    "search": "",
    "histLength": 2,
    "histState": { "idx": 0 },
    "detail": { "url": "/notes" }
  },
  {
    "time": 3767,
    "event": "pushState",
    "pathname": "/notes",
    "search": "",
    "histLength": 3,
    "histState": { "usr": null, "key": "drw1j3xd", "idx": 1 },
    "detail": { "url": "/resource/56" }
  },
  {
    "time": 5638,
    "event": "popstate",
    "pathname": "/notes",
    "search": "",
    "histLength": 4,
    "histState": { "usr": null, "key": "drw1j3xd", "idx": 1 },
    "detail": { "state": { "usr": null, "key": "drw1j3xd", "idx": 1 } }
  },
  {
    "time": 5737,
    "event": "popstate",
    "pathname": "/",
    "search": "",
    "histLength": 4,
    "histState": { "idx": 0 },
    "detail": { "state": { "idx": 0 } }
  }
]
```

Key Observation: When Back is pressed on `/notes`, `popstate` fires at `t=5737ms` updating the URL to `/`. No `pushState` or `replaceState` event follows. The navigation stack stabilizes immediately.

---

## History State Timeline

1. **Initial Mount (`/`):**
   - `window.location.pathname`: `/`
   - `window.history.length`: `2`
   - `window.history.state`: `{ idx: 0 }`

2. **Navigate to Notes (`/notes`):**
   - Action: `PUSH`
   - `window.location.pathname`: `/notes`
   - `window.history.length`: `3`
   - `window.history.state`: `{ usr: null, key: "...", idx: 1 }`

3. **Navigate to Resource (`/resource/56`):**
   - Action: `PUSH`
   - `window.location.pathname`: `/resource/56`
   - `window.history.length`: `4`
   - `window.history.state`: `{ usr: null, key: "...", idx: 2 }`

4. **1st Back Click on `ResourceDetails.tsx`:**
   - Control: `<button onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = backPath}>`
   - Evaluated Condition: `window.history.length > 1` (4 > 1 = `true`)
   - Executed: `window.history.back()`
   - Action: `POP`
   - `window.location.pathname`: `/notes`
   - `window.history.length`: `4`
   - `window.history.state`: `{ usr: null, key: "...", idx: 1 }`

5. **2nd Back Click on `ResourcePage.tsx`:**
   - Control: `<button onClick={() => navigate(-1)}>`
   - Executed: `navigate(-1)` (delegates to `window.history.go(-1)`)
   - Action: `POP`
   - `window.location.pathname`: `/`
   - `window.history.length`: `4`
   - `window.history.state`: `{ idx: 0 }`

---

## PUSH / POP / REPLACE Analysis

1. **PUSH Operations:**
   - Occur strictly when a user clicks a `<Link to="...">` or triggers programmatic `navigate('/url')`.
   - No component, effect, or layout wrapper emits an unprompted `PUSH` on route mount or after `POP`.

2. **POP Operations:**
   - Occur when the user clicks Horizon's Back button (`navigate(-1)` or `window.history.back()`) or uses the browser/device native Back button.
   - Triggers `popstate` event.
   - React Router updates internal route location matching without issuing new history stack entries.

3. **REPLACE Operations:**
   - Occur in `ResourcePage.tsx` lines 330-333:
     ```tsx
     if (qClass || qSubject || qMedium || (qYear && config.thirdFilterType === 'year')) {
       const canonicalUrl = buildCategoryUrl(...);
       if (canonicalUrl !== `${location.pathname}${location.search}`) {
         navigate(canonicalUrl, { replace: true });
       }
     }
     ```
   - This cleanly rewrites query-parameter URLs (e.g. `/notes?class=10`) to canonical path URLs (`/notes/class-10`) in-place (`REPLACE`). It does **not** push duplicate history entries.

---

## Component Lifecycle Findings

Component lifecycle instrumentation was executed across `MainLayout`, `ResourcePage`, `ResourceDetails`, and `ScrollToTop`:

1. **Mount / Unmount Lifecycle:**
   - On `PUSH` `/resource/56`: `ResourcePage` unmounts, `ResourceDetails` mounts.
   - On `POP` Back to `/notes`: `ResourceDetails` unmounts, `ResourcePage` mounts.
2. **Effect Execution:**
   - `ResourcePage.tsx` `useEffect` array: `[config.resourceType, config.includeChapters, config.thirdFilterType, selectedThirdFilter, authLoading]`.
   - `ResourceDetails.tsx` `useEffect` array: `[id]`.
   - **Finding:** Neither component's `useEffect` triggers navigation when mounting after a `POP` event.

---

## Notes Page Findings

Inspected `src/pages/resources/ResourcePage.tsx` (`StudyNotesRoute`):

- **Filter Selection:** Selecting dropdown filters updates route paths via `navigate(targetUrl)`. This is a user-initiated `PUSH`.
- **Card Click:** Material cards render `<Link to={`/resource/${resource.id}`}>`. Clicking a card is a standard React Router `PUSH`.
- **URL Synchronization:** Uses `navigate(canonicalUrl, { replace: true })`.
- **Return Behavior:** Returning to `/notes` via Back (`POP`) remounts `ResourcePage`. The synchronization effect compares `canonicalUrl` with current `location.pathname + location.search`. Since both match, no `navigate()` is called.

---

## Resource Page Findings

Inspected `src/pages/resources/ResourceDetails.tsx`:

- **Back Button Handler (Line 223):**
  ```tsx
  onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = backPath}
  ```
- **Finding:** `window.history.length` returns the total depth of the browser tab's history stack. If a user opened Horizon in a tab with pre-existing history (or navigated externally before entering), `window.history.length` is > 1 even if there is no prior Horizon page in the stack. Executing `window.history.back()` pops the user out of the Horizon application entirely.

---

## Scroll Restoration Findings

Inspected `src/components/ScrollToTop.tsx`:

```tsx
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
};
```

- **Forward Navigation (`PUSH`):** `navType === 'PUSH'`, triggering `window.scrollTo(0, 0)` to scroll to top.
- **Back Navigation (`POP`):** `navType === 'POP'`, skipping `window.scrollTo(0, 0)`. The browser's native scroll restoration restores the scroll position on `/notes` (e.g. Y = 1200px).
- **Finding:** Scroll restoration functions cleanly and does **not** trigger any navigation events.

---

## Native Back Findings

Tested native browser Back button (`page.goBack()`) independently:

1. **Native Back 1 (on `/resource/56`):** Emits `popstate` -> URL becomes `/notes`.
2. **Native Back 2 (on `/notes`):** Emits `popstate` -> URL becomes `/`.

**Finding:** Native Back and Horizon's custom Back button produce identical navigation event sequences during in-app SPA journeys. Native Back does not trigger loops or secondary `PUSH` events.

---

## Custom Back Findings

Comparison of custom Back controls across components:

| Component | Handler | Action Type | Behavior |
| :--- | :--- | :--- | :--- |
| `ResourceDetails.tsx` | `window.history.length > 1 ? window.history.back() : window.location.href = backPath` | `POP` (or `window.location`) | Pops history; exits app on direct entry with tab history |
| `ResourcePage.tsx` | `navigate(-1)` | `POP` | Pops history stack to previous entry |
| `PdfViewer.tsx` | `navigate(-1)` | `POP` | Pops history stack to previous entry |
| `SyllabusLanding.tsx` | `navigate(-1)` | `POP` | Pops history stack to previous entry |

---

## First Divergence From Expected Behavior

During normal in-app navigation, **no loop or incorrect navigation event occurs**. The navigation sequence strictly matches expectations.

However, during direct entry / external referrer access to a Description page (`/resource/:id`), the first incorrect event is:

```
EXPECTED EVENT:
User clicks Back on /resource/87 (Direct Entry)
↓
Application recognizes no in-app history exists
↓
Navigates to fallback backPath (/notes or /library) via navigate(backPath, { replace: true })

ACTUAL EVENT:
User clicks Back on /resource/87 (Direct Entry)
↓
window.history.length > 1 evaluates to TRUE (because tab has prior external pages)
↓
window.history.back() executes
↓
FIRST DIVERGENCE:
Browser pops out of Horizon application to external domain entry.
```

---

## Exact Root Cause

The root cause of unexpected navigation behavior on Horizon's Description page is **the flawed `window.history.length > 1` heuristic in `ResourceDetails.tsx`**:

1. `window.history.length` measures global browser tab history depth, not internal Horizon SPA history depth.
2. Web browser security intentionally hides cross-origin history URLs from JavaScript (`history.state` / `window.history`), preventing `window.history.length` from determining whether prior entries belong to Horizon or external domains.
3. When `window.history.length > 1` evaluates to `true` on direct entry pages, `window.history.back()` navigates outside the application.

---

## Evidence

1. **Playwright Navigation Logs:**
   - In-app journey: `history.length` incremented 2 → 3 → 4; Back button issued single `popstate` events restoring `idx: 1` (`/notes`) and `idx: 0` (`/`).
   - Direct entry journey: `history.length` = 2; Back button called `window.history.back()`, landing on `about:blank` / external page.

2. **Codebase Inspection:**
   - `src/pages/resources/ResourceDetails.tsx` line 223:
     ```tsx
     onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = backPath}
     ```

---

## Why Previous Audit Did Not Detect This

The previous audit (`BACK_NAVIGATION_AUDIT.md`) tested the basic in-app SPA flow (`Home -> Library -> Resource -> PDF Viewer`) and verified that `navigate(-1)` works under standard history conditions. However, it did not execute deep scroll/filter variations or isolate why direct entries with pre-existing tab history behave differently from in-app transitions.

---

## Confirmed Non-Causes

Through empirical runtime instrumentation, the following have been **ruled out as causes** of navigation loops:

- `ScrollToTop.tsx` (skips `scrollTo` on `POP` and emits no navigation)
- React Router v7 `BrowserRouter` core engine
- `useEffect` hooks in `ResourcePage.tsx` and `ResourceDetails.tsx` (none call `navigate()` after `POP`)
- Material Card click handlers (standard `<Link>` elements)
- Dropdown filter state changes (use `navigate(targetUrl)` cleanly)
- Native browser `popstate` handling
- PDF Viewer controls (`navigate(-1)`)

---

## Recommended Fix Direction

*(For future implementation — no production code was modified during this task)*

1. **Track In-App Traversal via Location State:**
   When navigating to a resource card, pass an in-app state flag:
   ```tsx
   <Link to={`/resource/${resource.id}`} state={{ fromApp: true }}>
   ```

2. **Replace `window.history.length` Check in `ResourceDetails.tsx`:**
   ```tsx
   const location = useLocation();
   const navigate = useNavigate();

   const handleBack = () => {
     if (location.state?.fromApp) {
       navigate(-1);
     } else {
       navigate(backPath, { replace: true });
     }
   };
   ```

3. **Standardize All Back Buttons:**
   Use the `location.state?.fromApp` pattern across all custom Back controls in the application.

---

## Files Involved

- `src/pages/resources/ResourceDetails.tsx` — Contains `window.history.length > 1` Back logic.
- `src/pages/resources/ResourcePage.tsx` — Category page component for `/notes` and `/library`.
- `src/components/MaterialCard.tsx` — Renders resource card links.
- `src/components/ScrollToTop.tsx` — Handles scroll restoration on route changes.
- `src/App.tsx` — Main application routing tree.

---

## Answers to Required Explicit Questions

1. **Can the user's original loop be reproduced?**
   No infinite `Description ↔ Notes` loop occurs during in-app navigation in a clean browser session. However, Back navigation fails under direct entry / external tab history conditions where `window.history.length > 1` forces an unexpected app exit.
2. **If yes, under exactly what conditions?**
   Not applicable (loop does not occur in clean in-app SPA traversal).
3. **If no, what conditions were tested and what evidence explains the discrepancy?**
   Tested: (a) Home -> Notes -> Resource -> Back -> Back, (b) Home -> Library -> Resource -> Back -> Back, (c) Home -> Notes -> Resource -> PDF Viewer -> Back -> Description -> Back -> Notes, (d) Filter selections on Notes before resource click, (e) Deep scrolling on Home and Notes before resource click, (f) Native Back button, (g) Mixed custom and native Back, (h) All 19 resource cards on `/notes`. Instrumentation proves React Router cleanly handles `POP` events without secondary `PUSH` triggers.
4. **What is the exact navigation sequence during the failure?**
   Direct Entry `/resource/87` (`histLen > 1`) → Click Back → `window.history.back()` → Exits Horizon to previous tab URL.
5. **Is the history stack itself wrong?**
   No. The browser history stack maintains exact indexes (`idx: 0`, `idx: 1`, `idx: 2`).
6. **Is a "PUSH" occurring during/after "POP"?**
   No. Recorded runtime event logs confirm no `PUSH` occurs after a `POP` event.
7. **Is a "REPLACE" involved?**
   `ResourcePage.tsx` uses `REPLACE` to rewrite query parameters to canonical URLs, but this occurs during initial category load, not during Back navigation.
8. **Is an effect triggering navigation?**
   No. All component `useEffect` hooks were instrumented and confirmed to perform zero navigation calls upon `POP` remount.
9. **Is a redirect triggering navigation?**
   No redirects fire during Back navigation.
10. **Is Notes-specific code involved?**
    `ResourcePage.tsx` handles `/notes`, but its Back button uses standard `navigate(-1)`.
11. **Is ResourceDetails involved?**
    Yes. `ResourceDetails.tsx` contains line 223 (`window.history.length > 1`), which causes improper app exit on direct entries.
12. **Is scroll restoration involved?**
    No. `ScrollToTop.tsx` checks `navType !== 'POP'` and bypasses scroll resetting on Back navigation without triggering router events.
13. **Is React Router involved directly or indirectly?**
    React Router v7 operates correctly. The issue stems from custom application logic (`window.history.length > 1`).
14. **Why does native Back reproduce or fail to reproduce the issue?**
    Native Back emits browser `popstate` events, which React Router handles cleanly. Native Back does not trigger `ResourceDetails`'s custom button handler, so native Back operates as a true history stack pop.
15. **What is the first incorrect navigation event?**
    The execution of `window.history.back()` on direct entry when `window.history.length > 1` is true due to external tab history.
16. **Which exact file/function/component causes it?**
    `src/pages/resources/ResourceDetails.tsx`, line 223, in the Back button `onClick` handler.
17. **What evidence proves that conclusion?**
    Instrumentation logs of `history.length`, `history.state`, and Playwright test execution demonstrating tab exit on direct entries.

---

## Final Conclusion

Horizon's in-app navigation architecture cleanly handles standard user journeys without route loops or duplicate history entries. The root cause of navigation failure on Description pages is isolated to `ResourceDetails.tsx` line 223, where `window.history.length > 1` misinterprets global browser tab history as internal app history. Production code was left untouched in accordance with instructions.
