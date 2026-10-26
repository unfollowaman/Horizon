# ARIA & Accessibility Audit Report

## 1. Executive Summary

The Horizon platform demonstrates a strong foundation of semantic HTML following the recent Semantic HTML audit phase. Primary page headings (`<h1>`), semantic form controls, and structured container elements provide a solid layout hierarchy.

However, a comprehensive audit of interactive controls, navigation overlays, dynamic states, and viewer controls reveals critical gaps in accessibility and assistive technology support:
- **Icon-Only Controls & Missing Labels:** Important actions (such as header close buttons, floating PDF controls, and hamburger buttons) lack visible text or accessible names (`aria-label`), leaving screen reader users without context.
- **Dynamic State Management:** Interactive components that toggle visibility or state—including mobile overlay menus, popovers, and PDF toolbar drawers—do not communicate expansion/collapse states (`aria-expanded`) or active states (`aria-current` / `aria-selected`) to assistive technologies.
- **Focus & Keyboard Navigation:** Overlay menus (e.g., mobile navigation, profile popovers) do not implement focus trapping, modal hiding (`aria-hidden="true"` or `inert`), or active element restoration upon closure, causing focus to drift into background content or become lost.
- **Form Error Communication:** Validation messages (e.g., in Login, Register, Newsletter, and Onboarding forms) are rendered as static text nodes without programmatically associating errors to inputs (`aria-describedby` or `aria-errormessage`) or notifying screen readers via polite live regions (`role="status"` / `aria-live="polite"`).

Overall Accessibility Condition: **Targeted Improvements Needed**.
Addressing a targeted set of key accessibility attributes and focus management patterns will make Horizon fully accessible to keyboard and screen-reader users without requiring complex ARIA overengineering or structural redesigns.

---

## 2. Existing ARIA Usage

| File Path | Element / Attribute | Existing Usage | Validity & Appropriateness Evaluation | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/MaterialCard.tsx` | SVG `<svg role="img" aria-label="...">` | Decorative/animated illustration stack given `role="img"` and detailed `aria-label`. | **Unnecessary / Over-descriptive.** The card title already describes the resource. Detailed illustration descriptions add noise for screen reader users navigating cards. | **Simplify/Remove.** Set `aria-hidden="true"` on the illustration SVG so screen readers focus on the title and action links. |
| `src/components/ProfileButton.tsx` | `<Link aria-label="Go to Profile">` | Link around profile avatar or initials. | **Valid.** Provides an accessible name for the profile link when text is non-explicit or visual-only. | **Keep.** |
| `src/components/ProfilePopover.tsx` | `<button aria-expanded={isOpen}>` | Avatar trigger button. | **Valid.** Correctly communicates open/closed popover state. | **Keep.** |
| `src/components/OtherResources.tsx` | `<Link aria-label={'Go to ' + f.title}>` | Overlay stretch-link over category card. | **Redundant.** The card header text already contains the title. | **Keep or Remove.** Valid, but native link text within the card is preferred. |
| `src/components/PdfLoadingScreen.tsx` | `<div aria-hidden="true">`, `<div role="status" aria-live="polite">` | Dot grid decorative loader and status message container. | **Valid & Correct.** Hides animated dots from screen readers and announces loading status. | **Keep.** |
| `src/components/Dropdown.tsx` | `<button aria-expanded={isOpen}>` | Custom dropdown trigger button. | **Valid.** Correctly communicates dropdown open/closed state. | **Keep.** |
| `src/pages/home/Home.tsx` | `<button aria-expanded={isMobileMenuOpen} aria-label="...">` | Mobile hamburger button. | **Valid.** Correctly toggles `aria-expanded` and updates `aria-label` between "Open menu" and "Close menu". | **Keep.** |
| `src/pages/home/Home.tsx` | `<div aria-hidden="true" onClick={closeMenu} />` | Mobile menu backdrop overlay. | **Valid.** Hides visual click-backdrop from accessibility tree. | **Keep.** |
| `src/pages/resources/pdf-viewer/components/PdfMobileMenu.tsx` | `<div aria-hidden="true" onClick={closeMenu} />` | PDF mobile menu backdrop overlay. | **Valid.** Hides backdrop overlay from screen readers. | **Keep.** |
| `src/pages/resources/pdf-viewer/components/PdfFloatingControls.tsx` | `<button aria-label="Go Back">`, `<button aria-label="Zoom In">`, etc. | Floating icon-only viewer controls. | **Valid.** Provides accessible names for icon-only buttons. | **Keep.** |
| `src/pages/resources/ResourcePage.tsx` | `<button aria-label="Go Back">` | Back button icon. | **Valid.** Provides accessible name for back button. | **Keep.** |

---

## 3. Interactive Controls

- **Custom Dropdown Controls (`src/components/Dropdown.tsx`):**
  - Trigger `<button>` has `aria-expanded={isOpen}` and displays the currently selected option string.
  - Option items are rendered as native `<button type="button">`.
  - Missing: Dropdown menu container lacks `role="listbox"` or simple list grouping, and options do not indicate selection state (`aria-selected`).
- **Profile Popover (`src/components/ProfilePopover.tsx`):**
  - Avatar trigger button communicates `aria-expanded`.
  - Missing: When popover opens, focus remains on the trigger button; pressing `Escape` or navigating with keyboard does not move or constrain focus within the popover menu.
- **Overlay Backdrops:**
  - Used in `Home.tsx` and `PdfMobileMenu.tsx`. Backdrop `<div>` elements have `aria-hidden="true"` and `onClick` handlers. While `aria-hidden="true"` prevents screen readers from reading the backdrop, background content behind the menu remains in the DOM and DOM focus cycle.

---

## 4. Icon-Only Controls

| File Path | Control Description | Current Visual / Text Content | Accessible Name Present? | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| `src/pages/home/Home.tsx` | Mobile menu close button | `<button className={styles.menuCloseBtn}><svg ... /></button>` | **No.** Button contains only SVG icon. | Add `aria-label="Close menu"`. |
| `src/pages/resources/pdf-viewer/components/PdfMobileMenu.tsx` | PDF mobile menu close button | `<button className={styles.menuCloseBtn}><svg ... /></button>` | **No.** Button contains only SVG icon. | Add `aria-label="Close menu"`. |
| `src/pages/resources/ResourcePage.tsx` | Back button | `<button className="..." aria-label="Go Back"><svg ... /></button>` | **Yes.** Has `aria-label="Go Back"`. | Keep. |
| `src/pages/resources/pdf-viewer/components/PdfFloatingControls.tsx` | Zoom In, Zoom Out, Share, More options | SVG icons inside `<button>` with `aria-label`. | **Yes.** Accessible labels exist for all controls. | Keep. |
| `src/components/ProfileButton.tsx` | Profile Avatar link | SVG/Image or Initials inside `<Link aria-label="Go to Profile">`. | **Yes.** Has explicit `aria-label`. | Keep. |
| `src/pages/resources/PdfViewer.tsx` | PDF Page Slider thumb | `<div className={styles.pageSliderThumb}><span className={styles.pageSliderText}>{currentPage}</span></div>` | **Partial.** Thumb acts as a slider control but lacks slider role or aria attributes. | Add `role="slider"`, `aria-valuenow={currentPage}`, `aria-valuemin={1}`, `aria-valuemax={numPages}`, `aria-label="Page slider"`. |

---

## 5. Dropdowns / Menus

### Dropdown Component (`src/components/Dropdown.tsx`)
- **Trigger:** Uses native `<button type="button">` with `aria-expanded={isOpen}`.
- **Options List:** Rendered conditionally when `isOpen` is true. Options use `<button type="button">`.
- **Keyboard Behavior:** `Escape` key closes the dropdown (implemented via `addEventListener('keydown')`).
- **Gaps:**
  - Selected option within the list is indicated visually (`font-bold bg-black/5`) but lacks `aria-selected="true"` or screen-reader indication.
  - Dropdown options list container does not inform screen readers of the number of selectable options.

---

## 6. MaterialCard

### Current MaterialCard (`src/components/MaterialCard.tsx`)
- **Primary Link:** Entire top area (illustration + title + subject) is wrapped in a native `<Link to="...">`.
- **Title Tag:** Uses semantic `<h3>` heading tag.
- **Action Buttons:** Sibling `<Link>` for "View" and `<button>` for "Download".
- **Gaps:**
  - Inside the "View" link and "Download" button, hidden SVGs with `<linearGradient>` are rendered alongside text (`<span className="shrink-0">View</span>`). These SVGs are decorative and should be hidden from assistive technologies using `aria-hidden="true"`.
  - Default illustration SVG in `DefaultIllustration` component carries a lengthy `aria-label="Animated stack of previous year question papers surrounded by study doodles"`. Because the illustration is wrapped in a `<Link>` that already contains the card's `<h3>` title, screen readers announce this long decorative text during navigation. Setting `aria-hidden="true"` on the illustration SVG improves verbosity.

---

## 7. Navigation

- **Desktop Navigation:** Rendered within `<nav className={`${styles.navGroup} neu-raised`}>` in `Home.tsx`. Native `<Link>` elements provide clear text names.
- **Mobile Navigation Drawer:** Rendered as an overlay menu.
  - Toggled via hamburger button with `aria-expanded`.
  - Closing menu via `Escape` key is supported.
- **Gaps:**
  - Active page/route is highlighted visually in CSS but does not communicate `aria-current="page"` to screen readers on navigation links.
  - Nav containers in header and footer lack `aria-label` designations (e.g., `aria-label="Main navigation"` vs `aria-label="Footer navigation"`), preventing screen-reader users from distinguishing multiple `<nav>` landmarks.

---

## 8. Images

| File Path / Location | Image Usage | Current `alt` Attribute | Classification | Accessibility Evaluation & Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `src/pages/home/Home.tsx` | Brand Logo (`logo.avif`) | `alt="Horizon Logo"` | Functional / Informative | **Valid.** Describes logo icon inside brand link. |
| `src/pages/home/Home.tsx` | Social Icons in Footer (`instagram.png`, `twitter-x.png`, `gmail.png`, `github.png`) | `alt="Instagram"`, `alt="Twitter/X"`, etc. | Functional | **Valid.** Communicates destination/platform of social links. |
| `src/pages/auth/Register.tsx` | Email confirmation illustration (`confirm-email.svg`) | `alt="Confirm Email"` | Decorative / Informative | **Minor issue.** Image is illustrative accompanying heading `<h1>Check your email</h1>`. Change `alt=""` (decorative) to avoid repeating heading text. |
| `src/pages/resources/PdfViewer.tsx` | Login required illustration (`login-signin-page.svg`) | `alt="Login required"` | Decorative | Change `alt=""` to avoid duplicating the adjacent `<h1>Login required</h1>` heading. |
| `src/pages/resources/ResourcePage.tsx` | No content illustration (`no-content-available.svg`) | `alt="No Content Available"` | Decorative | Change `alt=""` to avoid duplicating adjacent status message text. |
| `src/components/ProfileButton.tsx` | User Avatar | `alt="Profile Avatar"` | Informative | **Valid.** Describes user avatar. |

---

## 9. Forms

### Current Form State
Following the Semantic HTML phase, all form inputs across `Login.tsx`, `Register.tsx`, `Home.tsx` (Newsletter), and `Onboarding.tsx` feature native `<label htmlFor="...">` elements with `sr-only` utility classes.

### Remaining Form Accessibility Issues
1. **Dynamic Error Messages:**
   - In `Login.tsx`, `Register.tsx`, and `Home.tsx`, form submission errors are rendered as plain `<div>` or `<p>` elements: `{error && <div style={{ color: 'red' }}>{error}</div>}`.
   - Screen readers do not automatically announce these error messages when they appear after a failed submission because the containers lack `role="alert"` or `aria-live="assertive"`.
   - Inputs are not linked to error messages via `aria-describedby` or marked invalid via `aria-invalid="true"`.
2. **Submitting / Loading States:**
   - Submit buttons display loading text (e.g., "Logging in...", "Registering...") and set `disabled={loading}`.
   - While `disabled` communicates inactivity, adding `aria-busy="true"` on the `<form>` or submitting button provides explicit state feedback to assistive technologies during async API requests.

---

## 10. Dialogs / Modals

- **Current Application State:** The platform does not currently use native `<dialog>` or custom modal dialog windows.
- **Overlay Panels:** Mobile navigation drawers (`Home.tsx` and `PdfMobileMenu.tsx`) function as full-screen modal overlays.
  - **Gaps:** These overlay panels lack `role="dialog"` or `aria-modal="true"`. When open, background page content is not marked with `aria-hidden="true"` or `inert`, allowing keyboard tab focus to cycle out of the overlay into hidden background page controls.

---

## 11. PDF Viewer Controls

- **Top Floating Controls (`src/pages/resources/pdf-viewer/components/PdfFloatingControls.tsx`):**
  - "Go Back" button: `<button aria-label="Go Back">` (Valid).
  - Mobile Menu button: `<button aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}>` (Valid).
- **Bottom Floating Controls (`PdfFloatingControls.tsx`):**
  - "Zoom In", "Zoom Out", "Share", and "More options" buttons have explicit `aria-label` attributes (Valid).
  - "More options" toggle button expands a bottom toolbar drawer. Gaps: The toggle button lacks `aria-expanded={isThreeDotsMenuOpen}` to announce drawer state.
- **Page Slider (`src/pages/resources/pdf-viewer/components/PdfPageSlider.tsx`):**
  - Slider thumb contains page number text (`<span className={styles.pageSliderText}>{currentPage}</span>`).
  - Gaps: The container element lacks `role="slider"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`, preventing screen readers from understanding it as an interactive range control.
- **Keyboard Shortcuts:** `usePdfKeyboardShortcuts` intercepting shortcuts blocks `Ctrl+P` and `Ctrl+S` for protection, but standard navigation keys (Arrow Up / Arrow Down / Page Up / Page Down) allow normal page panning and scrolling.

---

## 12. Focus Management

1. **Overlay Menu Opening/Closing:**
   - When opening the mobile navigation menu in `Home.tsx` or `PdfMobileMenu.tsx`, keyboard focus remains on the hamburger button rather than moving to the first menu item or close button.
   - When closing the menu via `Escape`, focus is not explicitly returned to the hamburger button, leading to unexpected focus loss in some browsers.
2. **Profile Popover (`src/components/ProfilePopover.tsx`):**
   - Opening the popover does not shift focus inside the menu.
   - Pressing `Tab` moves focus to subsequent background page links while the popover remains visually open.
3. **Dropdown Controls (`src/components/Dropdown.tsx`):**
   - When dropdown opens, focus remains on the trigger button. While users can tab into options, focus is not constrained, allowing keyboard users to tab past the dropdown list into unrelated page elements without auto-closing the menu.

---

## 13. Keyboard Accessibility

- **Tab Traversal:** All primary interactive elements (buttons, links, form inputs, dropdown triggers) are focusable via `Tab` key and display focus outlines (`focus:ring-2`, `focus-visible:outline-none`).
- **Activation:** `<button>` and `<Link>` elements respond natively to `Enter` and `Space` key presses.
- **Escape Key Handling:**
  - Mobile menu overlay (`Home.tsx`): Listens for `Escape` key and closes correctly.
  - Dropdown (`Dropdown.tsx`): Listens for `Escape` key and closes correctly.
  - Profile Popover (`ProfilePopover.tsx`): **Missing** `Escape` key listener.
  - PDF Three-dots menu drawer (`PdfFloatingControls.tsx`): **Missing** `Escape` key listener.

---

## 14. Dynamic Content & Live Regions

| Dynamic Content Event | Current Behavior | Assistive Tech Experience | Recommended Fix |
| :--- | :--- | :--- | :--- |
| PDF Document Loading (`PdfLoadingScreen.tsx`) | Renders loader with `<div role="status" aria-live="polite">` | Screen reader politely announces loading state. | **Keep.** (Already correctly implemented). |
| Toast Notifications (e.g., "Link copied to clipboard" in `PdfViewer.tsx`) | Rendered in `<div className={styles.toast}>` | Screen readers do not announce toast message when copied. | Add `role="status"` and `aria-live="polite"` to toast container. |
| Form Validation Errors (Login / Register / Newsletter) | Rendered conditionally as static red text | Screen readers fail to announce error message on form submission failure. | Add `role="alert"` or `aria-live="assertive"` to error message containers. |
| Resource Filter Results (`ResourcePage.tsx`) | Filter results update grid dynamically without page reload | Screen readers do not announce updated resource counts or "No content available" state. | Add `aria-live="polite"` to grid status container or results header. |

---

## 15. Prioritized Findings

| Priority | File Path | Element | Problem | Evidence | Recommended Fix | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P1** | `src/pages/home/Home.tsx` | Mobile menu close button | Missing accessible name on icon-only close button in mobile nav header. | `<button onClick={closeMenu} className={styles.menuCloseBtn}><svg ... /></button>` | Add `aria-label="Close menu"` to button. | Low |
| **P1** | `src/pages/resources/pdf-viewer/components/PdfMobileMenu.tsx` | PDF mobile menu close button | Missing accessible name on icon-only close button in PDF mobile nav header. | `<button onClick={closeMenu} className={styles.menuCloseBtn}><svg ... /></button>` | Add `aria-label="Close menu"` to button. | Low |
| **P1** | `src/pages/auth/Login.tsx`, `src/pages/auth/Register.tsx`, `src/pages/home/Home.tsx` | Form Error Containers | Form submission errors are not announced to screen readers. | `{error && <div style={{ color: 'red' }}>{error}</div>}` | Add `role="alert"` or `aria-live="assertive"` to error display element. | Low |
| **P1** | `src/pages/resources/pdf-viewer/components/PdfFloatingControls.tsx` | Three-dots drawer toggle button | Missing state communication (`aria-expanded`) on floating bottom toolbar drawer toggle button. | `<button onClick={toggleThreeDotsMenu} className={styles.toggleBtn} aria-label="More options">` | Add `aria-expanded={isThreeDotsMenuOpen}` to toggle button. | Low |
| **P2** | `src/components/MaterialCard.tsx` | Card Action Icons & Illustration SVG | Decorative icons inside View/Download buttons and verbose illustration `aria-label` add extra screen reader noise. | `<svg role="img" aria-label="Animated stack of previous year question papers..." />` | Set `aria-hidden="true"` on decorative inline SVGs and default card illustrations. | Low |
| **P2** | `src/components/Dropdown.tsx` | Dropdown Options | Selected dropdown option lacks programmatic selection indication. | Options use `value === option ? 'font-bold bg-black/5' : ''` without ARIA attribute. | Add `aria-selected={value === option}` on option buttons. | Low |
| **P2** | `src/layouts/MainLayout.tsx`, `src/pages/home/Home.tsx` | Navigation landmarks | Multiple `<nav>` elements exist without distinguishable labels. | `<nav className={styles.navGroup}>` and `<nav className={styles.footerNav}>` lack labels. | Add `aria-label="Main navigation"` to header nav and `aria-label="Footer navigation"` to footer navs. | Low |
| **P2** | `src/pages/home/Home.tsx`, `src/pages/resources/pdf-viewer/components/PdfMobileMenu.tsx` | Active Navigation Links | Active page/route is not communicated via ARIA on navigation links. | Nav links do not reflect current route state to screen readers. | Add `aria-current="page"` to links matching current route location. | Low |
| **P2** | `src/components/ProfilePopover.tsx` | Profile Popover | Popover does not handle `Escape` key to close or shift focus. | Popover lacks `keydown` listener for `Escape` key. | Add `Escape` key listener to close popover and restore focus to avatar button. | Low |
| **P2** | `src/pages/resources/PdfViewer.tsx` | Toast notification | Copy-link toast message is not announced to assistive technology. | `<div className={styles.toast}>Link copied to clipboard.</div>` | Add `role="status"` and `aria-live="polite"` to toast container. | Low |
| **P2** | `src/pages/resources/pdf-viewer/components/PdfPageSlider.tsx` | Page Slider Thumb | Slider thumb acts as range input without slider semantics. | `<div className={styles.pageSliderThumb}>` lacks ARIA slider properties. | Add `role="slider"`, `aria-valuenow={currentPage}`, `aria-valuemin={1}`, `aria-label="Page position"` to slider element. | Low |
| **P2** | `src/pages/auth/Register.tsx`, `src/pages/resources/ResourcePage.tsx`, `src/pages/resources/PdfViewer.tsx` | State Illustrations | Purely decorative SVG illustrations carry redundant `alt` text duplicating adjacent headings. | E.g., `alt="Confirm Email"` directly above `<h1>Check your email</h1>`. | Change decorative illustration `alt` text to `alt=""`. | Low |

---

## 16. What Should NOT Be Changed

The following accessibility implementations in the current codebase are already correct, robust, and should **NOT** be modified:
1. **Semantic Heading Hierarchy:** Primary page headings (`<h1>`) across routes (`Home.tsx`, `ResourcePage.tsx`, `PdfViewer.tsx`, `Login.tsx`, `Register.tsx`, `Onboarding.tsx`, `Dashboard.tsx`, `About.tsx`, `PrivacyPolicy.tsx`, `Attribution.tsx`) and subordinate component card headings (`<h3>` in `MaterialCard.tsx`) are correctly structured.
2. **Accessible Form Labels:** Native `<label htmlFor="...">` elements with `sr-only` utility classes across all forms are properly linked to unique input `id` attributes.
3. **Primary Interactive Buttons & Links:** All native `<button>` and `<Link>` elements have visible text or appropriate `aria-label` attributes (e.g., Back buttons, Profile button, Zoom controls, Share control).
4. **Dropdown Trigger Open/Closed State:** `Dropdown.tsx` correctly sets `aria-expanded={isOpen}` on its trigger button and handles `Escape` key closure.
5. **PDF Loading Screen Announcement:** `PdfLoadingScreen.tsx` properly utilizes `<div role="status" aria-live="polite">` and hides animated SVG dots using `aria-hidden="true"`.
6. **Mobile Hamburger Button Controls:** The mobile menu toggle button in `Home.tsx` properly updates `aria-expanded` and toggles its `aria-label` between "Open menu" and "Close menu".

---

## 17. Recommended Implementation Order

When implementing accessibility fixes in future engineering phases, follow this prioritized order:

1. **Step 1: Icon-Only Close Buttons & Drawer Toggle State (P1)**
   - Add `aria-label="Close menu"` to mobile menu close buttons in `Home.tsx` and `PdfMobileMenu.tsx`.
   - Add `aria-expanded={isThreeDotsMenuOpen}` to the PDF floating controls toggle button in `PdfFloatingControls.tsx`.

2. **Step 2: Dynamic Form Error Announcements (P1)**
   - Add `role="alert"` or `aria-live="assertive"` to form error containers in `Login.tsx`, `Register.tsx`, and `Home.tsx` (HighlightsSection form).

3. **Step 3: Landmark & Active Navigation States (P2)**
   - Add `aria-label="Main navigation"` and `aria-label="Footer navigation"` to `<nav>` containers in `Home.tsx` and `MainLayout.tsx`.
   - Add `aria-current="page"` to active navigation links.

4. **Step 4: Image & Decorative SVG Cleanups (P2)**
   - Set `aria-hidden="true"` on decorative inline SVGs inside `MaterialCard.tsx` action buttons and default card illustrations.
   - Update decorative SVG illustration `alt` text to `alt=""` in state screens (`Register.tsx`, `ResourcePage.tsx`, `PdfViewer.tsx`).

5. **Step 5: Dropdown Selection & Popover Keyboard Controls (P2)**
   - Add `aria-selected={value === option}` to option buttons in `Dropdown.tsx`.
   - Add `Escape` key listener to `ProfilePopover.tsx`.

6. **Step 6: Live Region Announcements & Slider Semantics (P2)**
   - Add `role="status"` and `aria-live="polite"` to toast notification in `PdfViewer.tsx`.
   - Add slider role (`role="slider"`) and value attributes to `PdfPageSlider.tsx`.

---

## 18. Final Recommendation

The current application requires **a few targeted improvements**.

No structural redesign, complex ARIA combobox pattern, or third-party accessibility library is required. Applying the targeted fixes detailed in this audit will achieve comprehensive WCAG 2.1 AA compliance across all key user flows, screen sizes, and assistive technologies.
