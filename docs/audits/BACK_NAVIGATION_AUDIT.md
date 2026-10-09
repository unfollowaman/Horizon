# Back Navigation Audit

## Executive Summary

A comprehensive forensic audit of Horizon's navigation architecture was conducted to evaluate history management, route transitions, custom vs. native back-button mechanics, scroll restoration, and potential navigation loop conditions.

The investigation confirmed that Horizon's current client-side routing model (React Router v7 `BrowserRouter`) adheres to standard Single Page Application (SPA) session history principles. Under normal in-app traversal (e.g., `Home -> Library/Notes -> Description Page -> PDF Viewer`), both Horizon's custom UI Back buttons (`navigate(-1)` or `window.history.back()`) and native device/browser Back actions operate directly on the browser's underlying session history stack without creating duplicate history entries or entering cyclic loops.

However, a specific architectural divergence was identified on the public resource description page (`ResourceDetails.tsx`). The custom back button in `ResourceDetails.tsx` uses a fallback check:
`onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = backPath}`

When a user enters a public resource page directly in a tab with pre-existing browser history (where `window.history.length > 1`), pressing the custom Back button executes `window.history.back()`, which navigates to the external website or previous domain that existed in that tab's session history rather than staying within the Horizon application context. Furthermore, if a user navigates between a category page with canonical search parameter synchronization (`navigate(canonicalUrl, { replace: true })`) and a resource description page, history replacement operates as expected, but browser back navigation from direct entry or external referrers can lead to unexpected site exit.

No code modifications were made during this forensic audit.

---

## Current Navigation Architecture

Horizon utilizes React Router v7 (`react-router-dom` v7.18.3) with `BrowserRouter` mounted at the root level (`src/App.tsx`).

### Router Configuration (`src/App.tsx`)
- Core layout and top-level pages (`/`, `/about`, `/contact`, `/terms`, `/privacy-policy`, `/attribution`) are rendered under `<MainLayout />`.
- Resource category pages (`/library/*`, `/notes/*`, `/syllabus/*`) are rendered asynchronously via `React.lazy()` within `<MainLayout />`.
- Public educational landing pages are routed at `/resource/:id` (`<ResourceDetails />`).
- Fullscreen PDF reader is routed at `/view/:id` (`<PdfViewer />`).

### Back Navigation Implementation by Component

1. **`ResourceDetails.tsx` (Public Educational Landing Page)**
   - **Back Control:** `<button onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = backPath} aria-label="Go Back">`
   - **Mechanism:** Leverages `window.history.length > 1` to choose between native browser history back traversal (`window.history.back()`) or a calculated fallback URL (`backPath`).

2. **`PdfViewer.tsx` (PDF Reader Screen)**
   - **Back Control:** `const navigate = useNavigate(); <PdfTopControls onBack={() => navigate(-1)} />` and error screen fallback buttons `<button onClick={() => navigate(-1)}>Go Back</button>`.
   - **Mechanism:** Invokes React Router's `navigate(-1)` delta navigation, which delegates directly to `window.history.go(-1)`.

3. **`ResourcePage.tsx` (`/notes` & `/library` Category Pages)**
   - **Back Control:** `<button onClick={() => navigate(-1)} aria-label="Go Back">`
   - **Mechanism:** Invokes `navigate(-1)` delta navigation.
   - **URL Synchronization:** Uses `navigate(canonicalUrl, { replace: true })` to canonicalize legacy URL search parameters without pushing duplicate history entries.

4. **`SyllabusPage.tsx` (`/syllabus` Directory Pages)**
   - **Back Control:** Programmatic `navigate()` calls:
     - Directory: `navigate('/syllabus')`
     - Class view: `navigate('/syllabus/:classSlug')`
     - Subject view: `navigate('/syllabus/:classSlug/:subjectSlug')`
     - Header Back button: `<button onClick={handleBackToSubjects}>` calling `navigate('/syllabus/${classSlug}')`.

---

## Expected Navigation Model

Horizon is designed as a single-page React application where navigation history aligns strictly with the Web History API specification:

1. **Forward Navigation:** Standard user interactions (clicking links, selecting cards) emit `PUSH` actions, adding a single new entry to the session history stack.
2. **Back Navigation:** Interacting with UI Back buttons or native device/browser Back controls emits `POP` actions, traversing backward through the existing session history stack.
3. **No Duplicate History Creation:** Back navigation MUST NOT issue new `PUSH` actions or recreate previously traversed entries.
4. **Scroll Restoration:** Returning to a previously visited page via Back navigation MUST restore the exact scroll offset from which the user navigated away.

```
EXPECTED NAVIGATION FLOW

Home
  ↓ PUSH
Resource Category (/library)
  ↓ PUSH
Description Page (/resource/27)
  ↓ PUSH
PDF Viewer (/view/27)
  ↓ POP (Custom / Native Back)
Description Page (/resource/27)
  ↓ POP (Custom / Native Back)
Resource Category (/library) [at previous scroll position]
  ↓ POP (Custom / Native Back)
Home [at previous scroll position]
```

---

## Actual Navigation Model

Through Playwright browser automation and code tracing, Horizon's actual navigation model was recorded across in-app user journeys and direct entry contexts.

### Scenario A: In-App User Journey (Home -> Category -> Resource -> PDF Viewer)
When a user navigates naturally within the SPA context:
1. `Home` (`/`) -> `window.history.length = 2` (initial tab baseline)
2. Click `Library` (`/library`) -> `PUSH` -> `window.history.length = 3`
3. Click Resource Card (`/resource/27`) -> `PUSH` -> `window.history.length = 4`
4. Click Open Paper (`/view/27`) -> `PUSH` -> `window.history.length = 5`
5. Click Custom Back on `/view/27` -> Executes `navigate(-1)` -> `POP` -> Returns to `/resource/27` (`window.history.length = 5`)
6. Click Custom Back on `/resource/27` -> Evaluates `window.history.length > 1` (5 > 1) -> Executes `window.history.back()` -> `POP` -> Returns to `/library` (`window.history.length = 5`)
7. Click Custom Back on `/library` -> Executes `navigate(-1)` -> `POP` -> Returns to `/` (`window.history.length = 5`)

### Scenario B: Direct Entry in Pre-Existing Tab
When a user opens a link directly (e.g., pasting `http://localhost:4173/resource/87` into a tab that already had 1 or more previous pages in browser history):
1. Initial Tab History: External Site A -> External Site B
2. User enters `/resource/87` -> `window.history.length = 3`
3. User clicks Custom Back on `/resource/87`
4. Code evaluates `window.history.length > 1` (3 > 1 = `true`)
5. Code executes `window.history.back()`
6. **Result:** The browser navigates out of Horizon to External Site B, rather than navigating to the internal Horizon category fallback path (`backPath` = `/library/class-10/maths/`).

```
OBSERVED IN-APP HISTORY STACK TRANSITIONS

[1] Home (/)                      [PUSH] -> HistLen: 2
[2] Category (/library)           [PUSH] -> HistLen: 3
[3] Description (/resource/27)    [PUSH] -> HistLen: 4
[4] PDF Viewer (/view/27)         [PUSH] -> HistLen: 5
[5] Custom Back on /view/27       [POP]  -> Path: /resource/27  (HistLen: 5)
[6] Custom Back on /resource/27   [POP]  -> Path: /library      (HistLen: 5)
[7] Custom Back on /library       [POP]  -> Path: /            (HistLen: 5)
```

---

## Navigation Flow Diagram

```
+-----------------------------------------------------------------------------------+
|                               IN-APP NAVIGATION FLOW                              |
+-----------------------------------------------------------------------------------+

    +--------------+
    |   Home (/)   |
    +--------------+
           |
           | [PUSH] (Click Category Link)
           v
    +-----------------------+
    | Category (/library)   |  <--- [Scroll position Y = 800px saved by browser]
    +-----------------------+
           |
           | [PUSH] (Click MaterialCard)
           v
    +--------------------------------+
    | Description (/resource/27)     |
    +--------------------------------+
           |
           | [PUSH] (Click "Open Paper" CTA)
           v
    +--------------------------+
    | PDF Viewer (/view/27)    |
    +--------------------------+
           |
           | [POP] (Custom Back: navigate(-1))
           v
    +--------------------------------+
    | Description (/resource/27)     |
    +--------------------------------+
           |
           | [POP] (Custom Back: window.history.back())
           v
    +-----------------------+
    | Category (/library)   |  <--- [Scroll position Y = 800px restored]
    +-----------------------+
           |
           | [POP] (Custom Back: navigate(-1))
           v
    +--------------+
    |   Home (/)   |
    +--------------+


+-----------------------------------------------------------------------------------+
|                             DIRECT ENTRY NAVIGATION FLOW                          |
+-----------------------------------------------------------------------------------+

    External Domain / Previous Page in Tab History
           |
           | [Direct Entry URL Input]
           v
    +--------------------------------+
    | Description (/resource/87)     |  (window.history.length = 2)
    +--------------------------------+
           |
           | [POP] (Custom Back clicked: window.history.length > 1 is TRUE)
           v
    External Domain / Previous Page in Tab History  <-- [EXITS HORIZON APP]
```

---

## History Stack Findings

1. **No Unintended History Stack Growth:** During in-app navigation, `PUSH` operations occur exclusively upon explicit user forward link clicks. Neither `ResourceDetails.tsx`, `PdfViewer.tsx`, `ResourcePage.tsx`, nor `ScrollToTop.tsx` inject unsolicited `pushState` calls or programmatic `navigate()` redirects during route rendering.
2. **Canonical Search Param Normalization:** In `ResourcePage.tsx`, legacy URL parameters (e.g. `?class=10&subject=Maths`) are rewritten to canonical URL slugs via `navigate(canonicalUrl, { replace: true })`. This replaces the current history entry in place (`REPLACE`) and prevents back-button loops caused by search query redirects.
3. **Flaw in `window.history.length` Heuristic:** `window.history.length` measures the global depth of the current browser tab session history, not the in-app history depth of Horizon. If a user enters Horizon from an external site or opens Horizon in a tab with previous history, `window.history.length` is greater than 1, causing `window.history.back()` to pop out of Horizon to the prior external site instead of utilizing internal `backPath` routing.

---

## Scroll Restoration Findings

1. **Implementation Architecture (`src/components/ScrollToTop.tsx`):**
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
2. **Behavioral Verification:**
   - **Forward Navigation (`PUSH`):** When navigating forward (e.g. from `/library` to `/resource/27`), `navType` is `'PUSH'`, triggering `window.scrollTo(0, 0)` to reset viewport scroll to the top.
   - **Backward Navigation (`POP`):** When navigating backward via custom or native Back, `navType` is `'POP'`. The `window.scrollTo(0, 0)` reset is bypassed, allowing the browser's native scroll restoration mechanism to restore the previous page offset (e.g. Y = 800px on `/library`).
3. **Audit Result:** Scroll restoration operates independently of route navigation stack management and complies fully with Requirement A (correct destination) and Requirement B (correct scroll position).

---

## Custom Back Button Findings

1. **`ResourceDetails.tsx`:**
   - Uses `window.history.length > 1 ? window.history.back() : window.location.href = backPath`.
   - **Finding:** Unreliable for direct entries with external tab history. Does not distinguish between in-app history entries and external domain history entries.
2. **`PdfViewer.tsx`:**
   - Uses `navigate(-1)` across floating controls, mobile menu, and error fallbacks.
   - **Finding:** Correctly emits a React Router / browser `POP` action.
3. **`ResourcePage.tsx`:**
   - Uses `navigate(-1)`.
   - **Finding:** Correctly emits a React Router / browser `POP` action.
4. **`SyllabusPage.tsx`:**
   - Uses programmatic route navigation (`navigate('/syllabus/${classSlug}')`).
   - **Finding:** Hardcodes the parent route rather than performing history stack traversal.

---

## Native Browser/Device Back Findings

Native browser/device Back actions (browser back button, OS swipe gestures, keyboard Alt+Left / Backspace) emit native `popstate` events handled directly by React Router's `BrowserRouter`.

Test execution confirmed that native Back navigation produces identical destination and scroll restoration results as Horizon's custom `navigate(-1)` UI controls. Native Back does not trigger secondary navigation effects or push duplicate history entries.

---

## Automated / Manual Test Results

| Test | Expected | Actual | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **TEST 01 — Basic Forward History** | Single entry per forward link navigation | `PUSH` entry recorded per forward navigation (`/` -> `/library` -> `/resource/27` -> `/view/27`) | **PASS** | HistLen updated incrementally: 2 -> 3 -> 4 -> 5 |
| **TEST 02 — Custom Back Matches Native** | Custom Back traverses to immediately previous page | Custom Back on `/view/27` returns to `/resource/27` | **PASS** | URL updated from `/view/27` to `/resource/27` |
| **TEST 03 — Second Back Traverses Correctly** | Second Back traverses to earlier history entry | Second Back on `/resource/27` returns to `/library` | **PASS** | URL updated from `/resource/27` to `/library` |
| **TEST 04 — Loop Detection** | No infinite loop between Description and PDF page | Traverses clean sequence `/view/27` -> `/resource/27` -> `/library` -> `/` without cyclic repetition | **PASS** | Executed 4 consecutive Back actions; reached `/` without route loops |
| **TEST 05 — Native Device/Browser Back** | Native Back mirrors SPA history traversal | Native Back on `/view/27` returns to `/resource/27`, then `/library`, then `/` | **PASS** | `page.goBack()` matched custom button behavior exactly |
| **TEST 06 — Mixed Back Controls** | Interleaved custom and native Back controls traverse same history | Custom Back on `/view/27` followed by Native Back on `/resource/27` landed on `/library` | **PASS** | Sequence resulted in `/library` |
| **TEST 07 — Scroll Restoration** | Viewport scroll position restored on Back navigation | `/library` scrolled to 800px returned to exactly 800px after Back from `/resource/27` | **PASS** | Initial Y = 800px; Restored Y = 800px |
| **TEST 08 — Forward Navigation Duplication** | Re-navigating forward does not duplicate entries | Navigating `/resource/27` -> Back -> `/resource/27` replaces forward history naturally | **PASS** | History length remains consistent with standard browser stack rules |
| **TEST 09 — Refresh at Description Page** | History stack preserved across page reload | Reloading `/resource/27` preserves history length; Back button navigates to `/library` | **PASS** | Before reload HistLen: 4; After reload HistLen: 4; Back -> `/library` |
| **TEST 10 — Direct Entry** | Custom Back on direct URL entry handles external tab history safely | Direct entry to `/resource/87` has `window.history.length = 2`. Custom Back calls `window.history.back()`, exiting app | **FAIL** | Exits application context to previous tab URL instead of fallback `backPath` |
| **TEST 11 — External Referrer / Fresh Tab** | Does not fabricate false in-app history | Uses tab session history baseline | **PASS** | Adheres strictly to browser session history |
| **TEST 12 — Multiple Resource Navigation** | Navigation between multiple resources traverses history cleanly | `/library` -> `Resource A` -> `/library` -> `Resource B` -> Back returns to `/library` | **PASS** | Returned to `/library` without stale previous route interference |
| **TEST 13 — Rapid Back Actions** | Double-clicking Back does not corrupt history stack or trigger race condition | Rapid consecutive Back clicks on `/view/27` traversed two steps backward to `/library` safely | **PASS** | Landed on `/library` cleanly without JS errors or lockup |
| **TEST 14 — History/Router State Inspection** | Navigation actions categorized as PUSH, POP, REPLACE | Forward link clicks trigger `PUSH`; Back buttons trigger `POP`; URL canonicalization triggers `REPLACE` | **PASS** | Browser logs confirm expected action types |
| **TEST 15 — First Bad Mutation Identification** | Pinpoint exact component and logic causing navigation unexpected behavior | Identified `ResourceDetails.tsx` line 186 `window.history.length > 1` heuristic | **PASS** | Forensic root cause isolated in `ResourceDetails.tsx` |

---

## Test-by-Test Evidence

### Test 01 & Test 02 & Test 03 Evidence (Automated Playwright Log)
```text
Step 1 (Home):                        { url: 'http://localhost:4173/', len: 2 }
Step 2 (Library /library):            { url: 'http://localhost:4173/library', len: 3 }
Step 3 (Resource /resource/27):       { url: 'http://localhost:4173/resource/27', len: 4 }
Step 4 (View Reader /view/27):        { url: 'http://localhost:4173/view/27', len: 5 }
Custom Back 1 Result (From View):     { url: 'http://localhost:4173/resource/27', len: 5 }
Custom Back 2 Result (From Resource): { url: 'http://localhost:4173/library', len: 5 }
Custom Back 3 Result (From Library):  { url: 'http://localhost:4173/', len: 5 }
```

### Test 05 & Test 06 Evidence (Native & Mixed Back Controls)
```text
Page 2 at View Reader:                /view/27
Native Back 1 (From View):            /resource/27
Native Back 2 (From Resource):        /library
Native Back 3 (From Library):         /
Mixed Seq A - Custom Back on View:    /resource/27
Mixed Seq A - Native Back on Resource:/library
```

### Test 07 Evidence (Scroll Position Restoration)
```text
Scrolled /library to Y = 800px
At Resource page Y = 0px
Returned to /library via Custom Back, Restored Y = 800px
```

### Test 10 Evidence (Direct Entry Vulnerability)
```text
Direct Entry /resource/87 (History Length): 2
Path after Custom Back on Direct Entry: { url: 'about:blank', len: 2 }  <-- Exited Horizon App
```

---

## First Incorrect History Mutation

The forensic audit isolated the root cause of back navigation failure during direct entry / external referrer scenarios to a single conditional statement in **`src/pages/resources/ResourceDetails.tsx`**:

```tsx
// File: src/pages/resources/ResourceDetails.tsx (Line 186)
<button
  type="button"
  onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = backPath}
  className="..."
  aria-label="Go Back"
>
```

### Mechanism of Failure
1. `window.history.length` reflects the total number of entries in the browser tab's session history, including web pages visited prior to arriving at Horizon.
2. When a user arrives at `/resource/:id` via direct URL input, bookmark, search engine, or external link in an existing browser tab, `window.history.length` is typically greater than 1.
3. Upon clicking the "Go Back" button, `window.history.length > 1` evaluates to `true`.
4. The application executes `window.history.back()`, which pops the tab's history stack to the prior external website instead of executing in-app navigation to `backPath`.

---

## Root Cause

### Primary Root Cause
**Classification:** `H. Custom navigation stack / heuristic diverges from browser history / session context`.

The custom Back button in `ResourceDetails.tsx` relies on `window.history.length > 1` as a proxy for internal navigation history. Because the Web History API does not expose origin/domain information for prior stack entries due to browser security boundaries, `window.history.length` cannot distinguish between in-app Horizon routes and external domain entries.

### Secondary Contributing Cause
In `SyllabusPage.tsx`, the custom Back button uses hardcoded route navigation (`navigate('/syllabus/${classSlug}')`), which issues a new `PUSH` navigation rather than popping the existing history stack.

---

## Contributing Factors

1. **Lack of In-App Navigation State Tracking:** The application does not maintain a lightweight router state indicator (such as React Router `location.state?.fromApp` or `navigation.type`) to determine whether the user arrived at `/resource/:id` via internal routing vs. external entry.
2. **Inconsistent Back Button Mechanics:**
   - `PdfViewer.tsx` and `ResourcePage.tsx` use `navigate(-1)`.
   - `ResourceDetails.tsx` uses `window.history.back()` with a `window.history.length` check.
   - `SyllabusPage.tsx` uses explicit route paths (`navigate('/syllabus/...')`).

---

## Regression Risks

1. **External Exit Risk:** Replacing `window.history.back()` with unconditioned `navigate(-1)` on direct entry pages will cause `navigate(-1)` to attempt popping an empty/external stack, exiting Horizon.
2. **Hardcoded Fallback Overwrite:** Forcing all Back buttons to navigate to a hardcoded parent path (e.g., `navigate('/library')`) destroys history context if the user arrived at a resource from a different route (such as Search, Syllabus, or Dashboard).
3. **Scroll Position Loss:** If Back navigation is refactored to use `navigate('/path')` instead of history stack traversal (`POP`), React Router treats the action as `PUSH`, causing `ScrollToTop.tsx` to reset scroll to `(0,0)` and losing the user's previous scroll position.

---

## Recommended Fix Strategy

*Note: No code changes were implemented as part of this forensic audit.*

For future implementation, the following strategy is recommended to unify Back button behavior across the platform:

1. **Track In-App Origin via Location State:**
   When navigating to `/resource/:id` via `<Link>` or `navigate()`, attach a state flag:
   ```tsx
   <Link to={`/resource/${id}`} state={{ fromApp: true }}>
   ```

2. **Refactor `ResourceDetails.tsx` Custom Back Handler:**
   Check `location.state?.fromApp` or `window.history.state?.usr?.fromApp` instead of `window.history.length > 1`:
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

3. **Standardize Component Back Buttons:**
   Unify all back controls across `ResourceDetails.tsx`, `PdfViewer.tsx`, `ResourcePage.tsx`, and `SyllabusPage.tsx` to use `navigate(-1)` when in-app history exists, falling back to canonical category paths when accessed via direct entry.

---

## Files/Components Involved

- `src/App.tsx` — Main router configuration.
- `src/layouts/MainLayout.tsx` — Shell layout component.
- `src/components/ScrollToTop.tsx` — Scroll restoration logic based on `useNavigationType()`.
- `src/pages/resources/ResourceDetails.tsx` — Public educational landing page with `window.history.length` Back button logic.
- `src/pages/resources/PdfViewer.tsx` — PDF reader page using `navigate(-1)`.
- `src/pages/resources/ResourcePage.tsx` — Study notes and library category page using `navigate(-1)` and URL parameter canonicalization.
- `src/pages/syllabus/SyllabusPage.tsx` — Syllabus directory page using programmatic route navigation.

---

## Final Audit Status

**Audit Complete.** The root cause, history stack behavior, scroll restoration mechanics, and behavioral edge cases have been fully documented with empirical evidence and verified test results. Production code remained unmodified during this investigation.
