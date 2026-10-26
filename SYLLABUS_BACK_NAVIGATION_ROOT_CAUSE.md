# Syllabus Back Navigation Root Cause

## User-Reported Behavior

The user observed an incorrect history cycle during in-app navigation within the Syllabus feature:

```text
Home
  ↓
Syllabus (/syllabus)
  ↓
Class Selection (/syllabus/class-10)
  ↓
Subject Selection (/syllabus/class-10/science)
```

When clicking the UI Back button on the Subject page:
```text
Subject Selection
  ↓ Back
Class Selection (/syllabus/class-10)
```
This first Back step appears to work. However, when clicking the UI Back button on the Class Selection page:
```text
Class Selection
  ↓ Back
Syllabus Directory (/syllabus)
```
And when clicking the UI Back button on the Syllabus Directory page:
```text
Syllabus Directory
  ↓ Back
Class Selection (/syllabus/class-10)  ← WRONG
```

From this point forward, pressing Back on Class Selection returns to Syllabus Directory, and pressing Back on Syllabus Directory returns to Class Selection, creating an infinite oscillation between `/syllabus` and `/syllabus/class-10`:

```text
Class Selection (/syllabus/class-10)
      ↓ Back
Syllabus Directory (/syllabus)
      ↓ Back
Class Selection (/syllabus/class-10)
      ↓ Back
Syllabus Directory (/syllabus)
      ↓ ...
```

The user confirmed this occurs during a normal, forward in-app journey starting from Home (`/`). It is NOT a direct-entry scenario.

---

## Exact Reproduction

Using clean browser context and instrumentation in Vitest / React Router v7 (`BrowserRouter` & `MemoryRouter`):

1. Render Home (`/`).
2. Click "Syllabus" feature card -> Navigates to `/syllabus`.
3. Click "Class 10" card -> Navigates to `/syllabus/class-10`.
4. Click "Science" subject card -> Navigates to `/syllabus/class-10/science`.
5. Click Horizon UI Back button on Subject Page ("Back to Subject List").
6. Arrive at `/syllabus/class-10`.
7. Click Horizon UI Back button on Class Selection Page ("Back to Classes").
8. Arrive at `/syllabus`.
9. Click Horizon UI Back button on Syllabus Landing Page ("Go Back").
10. Arrive at `/syllabus/class-10` instead of `/`.
11. Click Horizon UI Back button on Class Selection Page ("Back to Classes") again.
12. Arrive at `/syllabus`.
13. Click Horizon UI Back button on Syllabus Landing Page ("Go Back") again.
14. Arrive at `/syllabus/class-10`.

---

## Expected History

In a standard hierarchy with session history traversal (`POP` / `navigate(-1)`):

```text
Index 0: /                           [PUSH (initial load)]
Index 1: /syllabus                   [PUSH]
Index 2: /syllabus/class-10          [PUSH]
Index 3: /syllabus/class-10/science  [PUSH]
--------------------------------------------------
Index 2: /syllabus/class-10          [POP via navigate(-1)]
Index 1: /syllabus                   [POP via navigate(-1)]
Index 0: /                           [POP via navigate(-1)]
```

---

## Actual History

Because Horizon's UI Back buttons inside `SyllabusPage.tsx` invoke forward `PUSH` navigations (`navigate('/syllabus')` and `navigate('/syllabus/class-10')`), new history entries are pushed onto the history stack instead of popping entries off:

```text
Index 0: /                           [Action: POP (initial load)]
Index 1: /syllabus                   [Action: PUSH]
Index 2: /syllabus/class-10          [Action: PUSH]
Index 3: /syllabus/class-10/science  [Action: PUSH]
Index 4: /syllabus/class-10          [Action: PUSH via handleBackToSubjects]
Index 5: /syllabus                   [Action: PUSH via handleBackToClasses]
Index 6: /syllabus/class-10          [Action: POP via navigate(-1) in SyllabusLanding]
Index 7: /syllabus                   [Action: PUSH via handleBackToClasses]
Index 8: /syllabus/class-10          [Action: POP via navigate(-1) in SyllabusLanding]
... (oscillates indefinitely between Index 6 and 7 / 8)
```

---

## Navigation Event Timeline

| Event # | Component / Source | Target Route | Navigation Type | React Router Key | Stack Pointer Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Home (`/`) | `/` | `POP` | `default` | `0` |
| **2** | Home Card (`/`) | `/syllabus` | `PUSH` | `5bnuhgho` | `1` |
| **3** | `SyllabusLanding` | `/syllabus/class-10` | `PUSH` | `86xg78d6` | `2` |
| **4** | `ClassSubjectSelector` | `/syllabus/class-10/science` | `PUSH` | `7s982i43` | `3` |
| **5** | `SyllabusPage` (`handleBackToSubjects`) | `/syllabus/class-10` | **`PUSH`** | `e0req6k8` | `4` *(First Error)* |
| **6** | `ClassSubjectSelector` (`handleBackToClasses`) | `/syllabus` | **`PUSH`** | `ltaldh99` | `5` |
| **7** | `SyllabusLanding` (`navigate(-1)`) | `/syllabus/class-10` | `POP` | `e0req6k8` | `4` |
| **8** | `ClassSubjectSelector` (`handleBackToClasses`) | `/syllabus` | **`PUSH`** | `qgdh2gta` | `5` *(Trashes key e0req6k8)* |
| **9** | `SyllabusLanding` (`navigate(-1)`) | `/syllabus/class-10` | `POP` | `e0req6k8` | `4` |

---

## History State / Index Timeline

1. At **Index 3** (`/syllabus/class-10/science`), history stack contains: `[/, /syllabus, /syllabus/class-10, /syllabus/class-10/science]`
2. When Back is clicked on Subject page, `handleBackToSubjects` executes `navigate('/syllabus/class-10')`.
   - **This pushes a brand new entry at Index 4.**
   - History stack: `[/, /syllabus, /syllabus/class-10, /syllabus/class-10/science, /syllabus/class-10]`
3. When Back is clicked on Class page, `handleBackToClasses` executes `navigate('/syllabus')`.
   - **This pushes a brand new entry at Index 5.**
   - History stack: `[/, /syllabus, /syllabus/class-10, /syllabus/class-10/science, /syllabus/class-10, /syllabus]`
4. At **Index 5** (`/syllabus`), user clicks Back in `SyllabusLanding.tsx`. `SyllabusLanding` calls `navigate(-1)` (POP).
   - Moving back 1 step in history goes from **Index 5 (`/syllabus`)** to **Index 4 (`/syllabus/class-10`)**.
   - User lands on `/syllabus/class-10`!
5. At **Index 4** (`/syllabus/class-10`), user clicks Back again ("Back to Classes").
   - `ClassSubjectSelector` calls `handleBackToClasses`, which executes `navigate('/syllabus')` (`PUSH`).
   - Pushing at Index 4 overwrites Index 5 with a new `/syllabus` entry.
6. User is at **Index 5 (`/syllabus`)** again. Clicking Back calls `navigate(-1)`, returning to **Index 4 (`/syllabus/class-10`)**.
   - Home (`/`) at Index 0 can never be reached!

---

## PUSH / POP / REPLACE Analysis

* **Home → `/syllabus`**: `PUSH` (Correct forward navigation)
* **`/syllabus` → `/syllabus/class-10`**: `PUSH` (Correct forward navigation)
* **`/syllabus/class-10` → `/syllabus/class-10/science`**: `PUSH` (Correct forward navigation)
* **Subject Back Button (`handleBackToSubjects`)**: **`PUSH`** (**INCORRECT**. Uses `navigate('/syllabus/class-10')` instead of `navigate(-1)`)
* **Class Back Button (`handleBackToClasses`)**: **`PUSH`** (**INCORRECT**. Uses `navigate('/syllabus')` instead of `navigate(-1)`)
* **Landing Back Button (`SyllabusLanding`)**: `POP` (Uses `navigate(-1)`)

---

## Syllabus Route Architecture

The route architecture defined in `src/App.tsx` uses three nested/parameterized route handlers mapped to `SyllabusPage`:

```tsx
<Route path="/syllabus" element={<SyllabusPage />} />
<Route path="/syllabus/:classSlug" element={<SyllabusPage />} />
<Route path="/syllabus/:classSlug/:subjectSlug" element={<SyllabusPage />} />
```

`SyllabusPage` acts as a central router/view-switcher depending on the presence of `classSlug` and `subjectSlug` URL parameters:
1. `!classSlug` -> Renders `<SyllabusLanding />`
2. `classSlug && !subjectSlug` -> Renders `<ClassSubjectSelector />`
3. `classSlug && subjectSlug` -> Renders `<SyllabusFlowchart />`

---

## Syllabus Component Analysis

1. **`SyllabusPage.tsx`**:
   Contains back handler functions passed down to child components:
   ```tsx
   const handleBackToClasses = () => {
     navigate('/syllabus');
   };

   const handleBackToSubjects = () => {
     if (classSlug) {
       navigate(`/syllabus/${classSlug}`);
     }
   };
   ```
   Both functions explicitly call `navigate(...)` with a pathname string. In React Router v7, calling `navigate(url)` without `{ replace: true }` defaults to `PUSH`.

2. **`ClassSubjectSelector.tsx`**:
   Renders top header back button:
   ```tsx
   <button type="button" onClick={onBackToClasses} ... />
   ```
   Invokes `handleBackToClasses` (`navigate('/syllabus')`).

3. **`SyllabusLanding.tsx`**:
   Renders top header back button:
   ```tsx
   <button type="button" onClick={() => navigate(-1)} ... />
   ```
   Invokes `navigate(-1)` (`POP`).

---

## Back Button Analysis

* **Subject View Header Back Button**: Calls `handleBackToSubjects` -> `navigate('/syllabus/${classSlug}')` (`PUSH`).
* **Class View Header Back Button**: Calls `handleBackToClasses` -> `navigate('/syllabus')` (`PUSH`).
* **Landing View Header Back Button**: Calls `navigate(-1)` (`POP`).

The mismatch between `PUSH` on sub-route back buttons and `POP` on the landing page back button creates the history trap.

---

## Automatic Navigation Analysis

No automatic navigation or `useEffect` redirects execute during route changes in `SyllabusPage.tsx`. The `useEffect` hooks in `SyllabusPage.tsx` are strictly dedicated to:
1. Updating `document.title` and meta description tags.
2. Fetching syllabus hierarchy data for active class + subject.
3. Fetching chapter counts for the landing page.

None of the effects invoke `navigate()`.

---

## State/URL Synchronization Analysis

State in `SyllabusPage.tsx` (`chapters`, `chapterCounts`, `loading`, `error`) is purely derived from `useParams()` (`classSlug` and `subjectSlug`). There is no bi-directional state-to-URL synchronization loop pushing routes.

---

## Route Configuration Analysis

* `/syllabus` does not redirect.
* `/syllabus/:classSlug` does not redirect.
* Route lazy-loading via `React.lazy` and `Suspense` does not perform programmatic navigation.
* No auth guards protect syllabus routes.

---

## Native Back Analysis

When using **only native browser/device Back** (or executing `navigate(-1)` at every level):

```text
Index 0: /                           [Action: POP]
Index 1: /syllabus                   [Action: PUSH]
Index 2: /syllabus/class-10          [Action: PUSH]
Index 3: /syllabus/class-10/science  [Action: PUSH]
Index 2: /syllabus/class-10          [Action: POP]
Index 1: /syllabus                   [Action: POP]
Index 0: /                           [Action: POP]
```

**Result**: Native Back works perfectly! The user seamlessly returns to Home (`/`). The underlying browser history is clean until the Horizon custom UI Back buttons corrupt it.

---

## Mixed Back Analysis

* **Scenario A: Horizon Back on Subject -> Native Back on Class**:
  1. Subject Back (`PUSH` `/syllabus/class-10`) -> Index 4: `/syllabus/class-10`.
  2. Native Back from Index 4 pops back to Index 3 (`/syllabus/class-10/science`).
  3. User returns to Subject page instead of Syllabus Directory!

* **Scenario B: Native Back on Subject -> Horizon Back on Class**:
  1. Native Back from Subject (`POP`) -> Index 2: `/syllabus/class-10`.
  2. Horizon Back on Class (`PUSH` `/syllabus`) -> Index 3: `/syllabus`.
  3. Native Back on Syllabus (`POP`) -> Index 2: `/syllabus/class-10`.
  4. Oscillates between Index 2 and 3.

---

## Class/Subject Reproduction Matrix

| Class | Subject | Flow | Reproduces Bug? |
| :--- | :--- | :--- | :--- |
| **Class 8** | Mathematics / Science / Hindi | `Home -> /syllabus -> /syllabus/class-8 -> Back -> Back` | **Yes** |
| **Class 9** | Mathematics / Science / Hindi | `Home -> /syllabus -> /syllabus/class-9 -> Back -> Back` | **Yes** |
| **Class 10** | Mathematics / Science / Social Science / English / Hindi Course A / Hindi Course B / Sanskrit | `Home -> /syllabus -> /syllabus/class-10 -> Back -> Back` | **Yes** |

The issue is 100% independent of class or subject. It occurs across all classes and subjects because the buggy `navigate('/syllabus')` logic in `SyllabusPage.tsx` applies to all routes.

---

## Working Route Comparison

| Feature / Route | Forward Nav | Sub-Level Back Action | Root Landing Back Action | Traversal Result |
| :--- | :--- | :--- | :--- | :--- |
| **Library (`/library`)** | `PUSH` | `navigate(-1)` / URL state | `navigate(-1)` | Works cleanly |
| **Study Notes (`/notes`)** | `PUSH` | `navigate(-1)` / URL state | `navigate(-1)` | Works cleanly |
| **Resource Details (`/resource/:id`)** | `PUSH` | `navigate(-1)` / fallback | `navigate(-1)` | Works cleanly |
| **Syllabus (`/syllabus`)** | `PUSH` | **`navigate('/syllabus')` (`PUSH`)** | `navigate(-1)` (`POP`) | **History Cycle Failure** |

---

## First Incorrect History Mutation

The **first incorrect history mutation** occurs at **Event 5**:

```tsx
// Location: src/pages/syllabus/SyllabusPage.tsx (Line 124)
const handleBackToClasses = () => {
  navigate('/syllabus'); // <--- INCORRECT PUSH MUTATION
};
```

When the user clicks "Back to Classes" on `/syllabus/class-10`, `handleBackToClasses` executes `navigate('/syllabus')`. Because React Router treats string arguments as new forward navigations (`PUSH`), it pushes `/syllabus` onto the stack at **Index 5** instead of popping back to **Index 1**.

---

## Exact Root Cause

The root cause of the Syllabus Back navigation cycle is **improper use of forward `PUSH` navigations (`navigate('/syllabus')` and `navigate('/syllabus/${classSlug}')`) inside UI Back button click handlers (`handleBackToClasses` and `handleBackToSubjects`) in `SyllabusPage.tsx`**.

Instead of popping entries off the browser history stack, the Back buttons push duplicate route entries onto the stack. When the user eventually reaches `/syllabus` and clicks Back (which calls `navigate(-1)`), React Router pops back to the duplicated `/syllabus/class-10` entry sitting immediately behind it in history, locking the user into a 2-node history oscillation stack.

---

## Evidence

Runtime instrumentation from Vitest (`src/pages/syllabus/__tests__/syllabusNavigationInvestigation.test.tsx`):

```text
--- TIMELINE OF NAVIGATION EVENTS ---
┌─────────┬─────────────────────────┬──────────────────────────────┬────────┬────────────┐
│ (index) │ step                    │ pathname                     │ action │ key        │
├─────────┼─────────────────────────┼──────────────────────────────┼────────┼────────────┤
│ 0       │ 'Home Component Render' │ '/'                          │ 'POP'  │ 'default'  │
│ 1       │ 'Syllabus Page Render'  │ '/syllabus'                  │ 'PUSH' │ '5bnuhgho' │
│ 2       │ 'Syllabus Page Render'  │ '/syllabus/class-10'         │ 'PUSH' │ '86xg78d6' │
│ 3       │ 'Syllabus Page Render'  │ '/syllabus/class-10/science' │ 'PUSH' │ '7s982i43' │
│ 4       │ 'Syllabus Page Render'  │ '/syllabus/class-10'         │ 'PUSH' │ 'e0req6k8' │
│ 5       │ 'Syllabus Page Render'  │ '/syllabus'                  │ 'PUSH' │ 'ltaldh99' │
│ 6       │ 'Syllabus Page Render'  │ '/syllabus/class-10'         │ 'POP'  │ 'e0req6k8' │
│ 7       │ 'Syllabus Page Render'  │ '/syllabus'                  │ 'PUSH' │ 'qgdh2gta' │
│ 8       │ 'Syllabus Page Render'  │ '/syllabus/class-10'         │ 'POP'  │ 'e0req6k8' │
└─────────┴─────────────────────────┴──────────────────────────────┴────────┴────────────┘
```

Notice lines 4 and 5: both Back clicks recorded `action: 'PUSH'`.

---

## Confirmed Non-Causes

1. **Native Browser History**: Not corrupted by browser or OS behavior.
2. **Scroll Restoration**: `ScrollToTop.tsx` is completely passive and does not mutate history.
3. **Automatic `useEffect` Redirects**: No effects in `SyllabusPage.tsx` execute `navigate()`.
4. **Direct Entry**: User verified this happens in standard in-app traversal.
5. **Class / Subject Specific Logic**: Failure happens identically across Class 8, Class 9, and Class 10.
6. **State / Query Parameter Synchronization**: No URL search parameter sync exists in Syllabus components.

---

## Recommended Fix

The smallest, safest fix (for future implementation) is to replace explicit path navigations in `handleBackToClasses` and `handleBackToSubjects` with history traversal (`navigate(-1)`):

```tsx
const handleBackToClasses = () => {
  navigate(-1);
};

const handleBackToSubjects = () => {
  navigate(-1);
};
```

Or pass `navigate(-1)` directly to the back buttons in `ClassSubjectSelector` and `SyllabusPage`.

---

## Files Involved

* `src/pages/syllabus/SyllabusPage.tsx`
* `src/pages/syllabus/components/ClassSubjectSelector.tsx`
* `src/pages/syllabus/components/SyllabusLanding.tsx`

---

## Final Conclusion

The Syllabus Back-navigation issue is a **Navigation-Stack Oscillation caused by PUSH-based UI Back buttons**. Every Back click in the inner Syllabus views appends a new entry to the browser history stack rather than traversing backward. When `navigate(-1)` is finally invoked on `/syllabus`, it moves back to the newly pushed `/syllabus/class-10` entry sitting directly behind it, trapping the user in a history loop between `/syllabus` and `/syllabus/class-10`.

---

## Answers to Required Questions

1. **Why does Subject → Class work?**
   Because `handleBackToSubjects` pushes `/syllabus/class-10` onto the stack. Visually, the URL changes to `/syllabus/class-10` and `ClassSubjectSelector` renders, making it look like Back worked, even though it was actually a forward `PUSH`.
2. **Why does Class → Home fail?**
   Because `handleBackToClasses` pushes `/syllabus` onto the top of the stack (Index 5). The original `/` entry remains buried at Index 0.
3. **Why does Class → Back return to Subject?**
   If native Back is pressed after Horizon Back on Subject, native Back steps back into the history entry pushed before it (`/syllabus/class-10/science`).
4. **Is the Syllabus Back button using `PUSH` instead of `POP`?**
   **Yes.** `handleBackToClasses` and `handleBackToSubjects` both call `navigate(path)` which executes a `PUSH`.
5. **Is any component pushing a route after a `POP`?**
   No component pushes automatically after `POP`. The user clicking the Horizon UI Back button invokes `handleBackToClasses`, which performs the `PUSH`.
6. **Is `/syllabus/class-10` duplicated in history?**
   **Yes.** It exists at Index 2 and Index 4 (and subsequently every even index as oscillation continues).
7. **What are the exact `history.state.idx` values?**
   Home: 0, `/syllabus`: 1, `/syllabus/class-10`: 2, `/syllabus/class-10/science`: 3, Horizon Back 1 (`/syllabus/class-10`): 4, Horizon Back 2 (`/syllabus`): 5, Horizon Back 3 (`/syllabus/class-10`): 4 (via `POP`).
8. **What is the first incorrect history mutation?**
   Event 5: `handleBackToSubjects` executing `navigate('/syllabus/class-10')` as a `PUSH` at Index 4.
9. **Which exact file/function/component performs it?**
   `src/pages/syllabus/SyllabusPage.tsx` -> `handleBackToSubjects` (line 124) and `handleBackToClasses` (line 119).
10. **Does native Back reproduce the same problem?**
    **No.** Pure native browser Back executes `POP` at every step and successfully returns to Home (`/`).
11. **Does the problem occur for Classes 8, 9, and 10?**
    **Yes.** It affects all classes identically.
12. **Does it occur for multiple subjects?**
    **Yes.** It affects all subjects identically.
13. **Is any `useEffect` involved?**
    **No.**
14. **Is URL/state synchronization involved?**
    **No.**
15. **Is route configuration involved?**
    **No.**
16. **Is scroll restoration involved?**
    **No.**
17. **What is the technically correct name for this failure?**
    **Navigation-Stack Oscillation caused by PUSH-based UI Back buttons** (or **History-cycle caused by duplicate PUSH entries**).
18. **What is the smallest safe fix?**
    Update `handleBackToClasses` and `handleBackToSubjects` in `SyllabusPage.tsx` to use `navigate(-1)`.
