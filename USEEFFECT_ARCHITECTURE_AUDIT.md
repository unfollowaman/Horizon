# useEffect Architecture Audit

## 1. Executive Summary

- **Total `useEffect` occurrences:** 37
- **Number legitimate:** 33
- **Number suspicious:** 4
- **Number recommended for removal/refactoring:** 3
- **Highest-priority candidates:** `ResourcePage.tsx` (responsive layout state mirroring), `Home.tsx` (scroll state), `usePdfControls.ts` (timer management).
- **Overall Recommendation:** The codebase generally uses `useEffect` appropriately for data fetching, event listeners, and complex external synchronizations (like PDF canvas and animations). However, there are a few instances of unnecessary state derivation/mirroring (especially in the newly merged `ResourcePage.tsx` and some scroll-tracking in `Home.tsx`) that should be refactored to simplify state and reduce re-renders.

## 2. Complete Effect Inventory

| File | Component/Hook | Purpose | Classification | Priority | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/components/AuthListener.tsx` | `AuthListener` | Redirect user based on auth state | A (External Sync - Router) | Keep | Leave as is (legitimate routing side effect). |
| `src/components/ProfilePopover.tsx` | `ProfilePopover` | Close popover on outside click | A (DOM Sync) | Keep | Legitimate event listener, cleanup is correct. |
| `src/components/ScrollToTop.tsx` | `ScrollToTop` | Scroll window to top on route change | A (External Sync) | Keep | Legitimate DOM manipulation. |
| `src/components/PdfLoadingScreen.tsx` | `PdfLoadingScreen` | Measure container dimensions using `ResizeObserver` | A (DOM Sync) | Keep | Legitimate, needed for dot grid calculation. |
| `src/components/Dropdown.tsx` | `Dropdown` | Close dropdown on outside click | A (DOM Sync) | Keep | Legitimate event listener. |
| `src/pages/attribution/Attribution.tsx` | `Attribution` | Update document title and meta description | A (DOM Sync) | Keep | Legitimate DOM manipulation. |
| `src/pages/user/Dashboard.tsx` | `Dashboard` | Fetch user progress data | B (Data fetching) | Keep | Legitimate data fetching on mount. |
| `src/pages/home/Home.tsx` | `Home` | Track scroll position to toggle `scrolledPastHero` state | C (Derived State / DOM Sync) | P1 | Refactor. Can often be replaced by CSS sticky/intersection observer or simpler derivation if strictly needed. |
| `src/pages/home/Home.tsx` | `Home` | Disable body scroll when mobile menu is open | A (DOM Sync) | Keep | Legitimate DOM manipulation. |
| `src/pages/home/Home.tsx` | `Home` | Close mobile menu on Escape key press | A (DOM Sync) | Keep | Legitimate event listener. |
| `src/pages/home/HeroPhoneAnimation.tsx` | `HeroPhoneAnimation` | Check for `prefers-reduced-motion` | A (External Sync) | Keep | Legitimate media query listener. |
| `src/pages/home/HeroPhoneAnimation.tsx` | `HeroPhoneAnimation` | Observe container width with `ResizeObserver` | A (DOM Sync) | Keep | Legitimate observer. |
| `src/pages/home/HeroPhoneAnimation.tsx` | `HeroPhoneAnimation` | Observe text width with `ResizeObserver` | A (DOM Sync) | Keep | Legitimate observer. |
| `src/pages/home/HeroPhoneAnimation.tsx` | `HeroPhoneAnimation` | Main animation loop via `requestAnimationFrame` | A (External Sync) | Keep | Legitimate animation loop. |
| `src/pages/home/HeroPhoneAnimation.tsx` | `HeroPhoneAnimation` | Apply final state immediately if reduced motion | F (Initialization) | Keep | Appropriate fallback logic. |
| `src/pages/about/About.tsx` | `About` | Update document title and meta description | A (DOM Sync) | Keep | Legitimate DOM manipulation. |
| `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` | `PdfDocumentRenderer` | Observe container width for PDF rendering | A (DOM Sync) | Keep | Legitimate observer. |
| `src/pages/resources/pdf-viewer/components/PdfDocumentRenderer.tsx` | `PdfDocumentRenderer` | Intersection observer to detect currently visible PDF page | A (DOM Sync) | Keep | Legitimate observer. |
| `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts` | `usePdfProgress` | Track latest page in a ref for unmount save | D (State Sync) | Keep | Needed for unmount cleanup closure. |
| `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts` | `usePdfProgress` | Debounced save of reading progress | A (External Sync - Network) | Keep | Legitimate debounced network call. |
| `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts` | `usePdfProgress` | Reset `completionCheckedRef` when `id` changes | F (Initialization) | Keep | Legitimate ref reset. |
| `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts` | `usePdfProgress` | Check and mark chapter completion at 95% | A (External Sync - Network) | Keep | Legitimate network side effect. |
| `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts` | `usePdfProgress` | Save progress on unmount | A (External Sync - Network) | Keep | Legitimate cleanup action. |
| `src/pages/resources/pdf-viewer/hooks/usePdfProgress.ts` | `usePdfProgress` | Fetch initial reading progress | B (Data fetching) | Keep | Legitimate data fetching. |
| `src/pages/resources/pdf-viewer/hooks/usePdfData.ts` | `usePdfData` | Fetch PDF resource data and related resources | B (Data fetching) | Keep | Legitimate data fetching. |
| `src/pages/resources/pdf-viewer/hooks/usePdfSlider.ts` | `usePdfSlider` | Clear timeout on unmount | A (External Sync) | Keep | Legitimate cleanup. |
| `src/pages/resources/pdf-viewer/hooks/usePdfSlider.ts` | `usePdfSlider` | Handle global mousemove/mouseup for slider dragging | A (DOM Sync) | Keep | Legitimate global event listeners. |
| `src/pages/resources/pdf-viewer/hooks/usePdfKeyboardShortcuts.ts` | `usePdfKeyboardShortcuts` | Prevent default on Ctrl+P and Ctrl+S | A (DOM Sync) | Keep | Legitimate global event listener. |
| `src/pages/resources/pdf-viewer/hooks/usePdfControls.ts` | `usePdfControls` | Show controls when menus open/close and manage timer | D (State Sync) | P2 | Could potentially be simplified, but works as intended. |
| `src/pages/resources/pdf-viewer/hooks/usePdfControls.ts` | `usePdfControls` | Reset timer when `numPages` or `pdfError` changes | D (State Sync) | P2 | Minor synchronization. |
| `src/pages/resources/pdf-viewer/hooks/usePdfControls.ts` | `usePdfControls` | Close three dots menu on outside click | A (DOM Sync) | Keep | Legitimate event listener. |
| `src/pages/resources/ResourcePage.tsx` | `ResourcePage` | Sync `isDesktop` state and mirror/adjust filter selections based on window resize | C (Derived State) / D (State Sync) | P0 | **High Priority**. Unnecessary state setting inside an effect. Overwrites user selections on resize. |
| `src/pages/resources/ResourcePage.tsx` | `ResourcePage` | Fetch resources based on config | B (Data fetching) | Keep | Legitimate data fetching. |
| `src/pages/resources/ResourceDetails.tsx` | `ResourceDetails` | Fetch single resource and related resources | B (Data fetching) | Keep | Legitimate data fetching. |
| `src/pages/onboarding/Onboarding.tsx` | `Onboarding` | Fetch user profile for onboarding step calculation | B (Data fetching) | Keep | Legitimate data fetching. |
| `src/pages/privacy/PrivacyPolicy.tsx` | `PrivacyPolicy` | Update document title and meta description | A (DOM Sync) | Keep | Legitimate DOM manipulation. |
| `src/context/AuthContext.tsx` | `AuthProvider` | Initialize auth session and listen for auth state changes | A (External Sync) | Keep | Core auth listener. |

## 3. High-Priority Findings

### P0 Candidate: `ResourcePage.tsx` - Resize Layout State Mirroring
**Current Pattern:**
```typescript
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) {
        setSelectedSubject(prev => prev === 'Subjects' ? 'All Subjects' : prev);
        setSelectedThirdFilter(prev => prev === config.getThirdFilterMobileLabel('') ? config.getThirdFilterDesktopLabel('') : prev);
        setSelectedClass(prev => prev === 'Class 10' ? 'Classes' : prev);
      } else {
        // ... similar reverse mapping
      }
    };
    // ...
  }, [config]);
```
**Why it is problematic:**
This effect synchronizes `isDesktop` into state and then *forces updates to filter state* based on window resizing. This is an anti-pattern. If a user selects "Class 10" on desktop, then resizes their window to mobile, the effect changes their selection back to "Classes" (the default), losing their intent. It mixes layout concerns (desktop vs mobile label) with data filtering concerns (what class is selected).
**What should replace it:**
1.  Store the *actual* selected value (e.g., `""` for all, `"Class 10"` for a specific class) in state, not the display label.
2.  Use `isDesktop` (which can be determined during render or via a custom hook like `useMediaQuery`) to *derive the display label* during render, rather than updating state inside an effect.
**Expected Benefit:** Eliminates unnecessary re-renders, prevents user data loss on resize, simplifies state management.
**Regression Risk:** Moderate. Requires careful mapping of underlying values to display values in the `Dropdown` component and `filteredResources` `useMemo`.

### P1 Candidate: `Home.tsx` - Scroll State Tracking
**Current Pattern:**
```typescript
  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.8;
      setScrolledPastHero(window.scrollY > threshold);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
```
**Why it is problematic:**
Causes a state update (and thus a re-render of the entire `Home` component) on potentially every scroll event when crossing the threshold. While not strictly "wrong", it's often a performance bottleneck if not throttled or handled via CSS.
**What should replace it:**
Ideally, use an `IntersectionObserver` on the Hero section itself, which is much more performant than binding to the global scroll event. Alternatively, if it only controls CSS classes for a sticky header, sometimes `position: sticky` and styling based on that can suffice.
**Expected Benefit:** Improved scroll performance, fewer React renders.
**Regression Risk:** Low.

## 4. ResourcePage Analysis

The newly merged `ResourcePage.tsx` successfully consolidates the logic for Library and Study Notes. However, it inherited or introduced a problematic `useEffect` that listens to `window.matchMedia` and subsequently calls `setSelectedSubject`, `setSelectedThirdFilter`, and `setSelectedClass`.

This effect attempts to maintain "default" labels that differ between mobile and desktop (e.g., "Subjects" vs "All Subjects"). By forcefully changing the state on resize, it breaks the Single Source of Truth principle. The filter state should represent the *logical* filter applied (e.g., `null` or `ALL`), and the UI should decide how to render that logical state based on the current viewport during the render phase.

## 5. Event Listener Analysis

- **`ResizeObserver`**: Used heavily and correctly in `PdfLoadingScreen`, `HeroPhoneAnimation`, and `PdfDocumentRenderer`. Cleanup logic is present (`observer.disconnect()`).
- **`mousemove`/`mouseup`**: Used in `usePdfSlider` for dragging. Cleanup is correct.
- **`keydown`**: Used in `usePdfKeyboardShortcuts` and `Home`. Cleanup is correct.
- **`mousedown`**: Used in `ProfilePopover`, `Dropdown`, and `usePdfControls` for outside-click detection. Cleanup is correct.

**Conclusion:** Event listeners are generally well-managed with appropriate cleanup.

## 6. Data Fetching Analysis

Data fetching effects exist in:
- `Dashboard.tsx`
- `ResourcePage.tsx`
- `ResourceDetails.tsx`
- `Onboarding.tsx`
- `usePdfData.ts`
- `usePdfProgress.ts`

These effects are generally wrapped in `async` functions defined inside the effect and called immediately. They use loading states (`setLoading(true/false)`) appropriately. There is some risk of race conditions if a component unmounts quickly or props change rapidly, as abort controllers are not universally used, but given the current architecture, they are standard and legitimate. The `learningResourcesAPI` is used correctly.

## 7. Dependency/Cleanup Analysis

- Dependencies are generally correct.
- Cleanup functions are present for intervals, timeouts, and event listeners.
- The `usePdfProgress.ts` hook uses a clever `latestPageRef` to ensure the unmount cleanup function has access to the most recent `currentPage` state, which is a correct pattern to avoid stale closures in unmount effects.

## 8. Recommended Refactoring Order

1.  **`ResourcePage.tsx` (P0)**: Refactor filter state to store logical values, derive display labels during render, and remove the `matchMedia` state-mirroring `useEffect`.
2.  **`Home.tsx` (P1)**: Replace the global `scroll` event listener with an `IntersectionObserver` for tracking the `scrolledPastHero` state.
3.  Leave legitimate fetch/listener effects unchanged.

## 9. Risk Assessment

- **`ResourcePage.tsx` Refactor**: Moderate implementation risk. Changing how filter state is represented requires updating the `useMemo` that filters resources and the props passed to `Dropdown`. Thorough testing of filtering on both desktop and mobile is required.
- **`Home.tsx` Refactor**: Low risk. Primarily affects the appearance of the mobile menu hamburger button.

## 10. Final Recommendation

- **Total Effects:** 37
- **To Remain Unchanged:** 34
- **To Refactor:** 3

The architecture is fundamentally sound regarding side effects. The priority is fixing the state derivation bug in `ResourcePage.tsx` introduced during the recent consolidation. The codebase correctly relies on `useEffect` for necessary external synchronizations like PDF rendering, complex animations, and data fetching.
