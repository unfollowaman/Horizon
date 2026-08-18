# Horizon — Semantic HTML Audit

## 1. Executive Summary

As part of the pre-indexing cleanup roadmap for the Horizon educational platform, this audit evaluates the current HTML markup structure across all pages and components.

### Purpose
Search engines, screen readers, browser reader modes, and accessibility tools rely heavily on standard HTML semantic elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<h1>`-`<h6>`, `<form>`, `<label>`, `<ul>`/`<ol>`, `<button>`, `<a>`) to interpret page structure, content hierarchy, and interactive boundaries.

### Key Audit Findings
1. **Inconsistent Page-Level Landmarks**: While `MainLayout.tsx` provides `<main>` and `<footer>`, subpages rendered within `MainLayout` (e.g., Library, Study Notes, Dashboard, Settings) lack consistent `<header>` and `<nav>` elements.
2. **Heading Level Discontinuity & Missing `<h1>` Tags**:
   - Pages such as `ResourcePage` (Library & Study Notes), `Dashboard`, `About`, `Login`, `Register`, `NotificationSettings`, and `ComingSoon` start their visual page titles with `<h2>` instead of `<h1>`.
   - `MaterialCard` components use `<h4>` headings directly inside lists/grids without preceding `<h3>` headings.
3. **Interactive `<div>`s & Nested Interactive Elements**:
   - `MaterialCard.tsx` uses a top-level `<div>` with an `onClick` handler as a card-wide trigger, while nesting real `<Link>` and `<button>` elements inside it.
   - `Dropdown.tsx` uses non-semantic `<div>` elements with `onClick` for both the trigger and option items instead of semantic `<button>` or `<select>` elements.
   - `PdfPageSlider.tsx` uses interactive touch/mouse `<div>` elements instead of a semantic `<input type="range">`.
4. **Form Controls & Missing Labels**:
   - Newsletter inputs in `Home.tsx` and auth inputs in `Login.tsx` / `Register.tsx` lack associated `<label>` elements or implicit visual labels.
5. **Non-Semantic Lists & Key-Value Pairs**:
   - Resource grids (`ResourcePage.tsx`), feature grids (`FeaturesSection`, `OtherResources`), and profile summaries (`Dashboard.tsx`) rely on plain `<div>` containers rather than `<ul>`/`<li>` or `<dl>`/`<dt>`/`<dd>`.

---

## 2. Global Layout & Landmark Analysis

### Current Layout Architecture
```
index.html
└── <html>
    ├── <head> ... </head>
    └── <body>
        └── <div id="root">
            └── App.tsx
                ├── AuthProvider & BrowserRouter
                ├── Home.tsx (Standalone Header, Main, Footer)
                ├── MainLayout.tsx
                │   ├── <main> (Wraps Outlet for subroutes)
                │   └── <footer> (Global copyright footer)
                └── PdfViewer.tsx (Standalone full-screen route)
```

### Landmark Audit
- **`index.html`**: Properly specifies `<!doctype html>` and `<html lang="en">`.
- **`MainLayout.tsx`**:
  - Uses `<main className="...">` around `<Outlet />`.
  - Uses `<footer className="...">` for global footer.
  - **Missing**: No global `<header>` or `<nav>` landmark in `MainLayout.tsx`. When users navigate from `Home.tsx` to `/library`, `/notes`, `/dashboard`, or `/privacy-policy`, there is no site-wide `<header>` or primary navigation bar surrounding these subpages (only page-level back buttons and profile buttons).
- **`Home.tsx`**:
  - Contains `<header>`, `<main>`, and `<footer>` landmarks.
  - Desktop and mobile navigation menus properly use `<nav>`.
  - Content sections use `<section>` (`HeroSection`, `FeaturesSection`, `HighlightsSection`).
- **`ResourceDetails.tsx`**:
  - Correctly uses `<aside>` for metadata and related items sidebar, and `<section>` within the sidebar.

---

## 3. Heading Hierarchy Audit (`<h1>` – `<h6>`)

Search engines and screen readers rely on a single, clear `<h1>` per page representing the main page topic, followed by sequentially nested `<h2>`, `<h3>`, etc.

### Page-by-Page Heading Breakdown

| Route / Page | Top Heading | Heading Structure | Issues Identified |
| :--- | :--- | :--- | :--- |
| **`/` (`Home.tsx`)** | `<h1>` | `<h1>` (Hero) &rarr; `<h2>` (Features, Highlights) &rarr; `<h3>` (Cards, Newsletter, Footer) | **Good**. Follows sequential heading hierarchy. |
| **`/library` & `/notes` (`ResourcePage.tsx`)** | `<h2>` | `<h2>` (Page Title) &rarr; `<h4>` (MaterialCard) | **Missing `<h1>`**. Page title (`LIBRARY` / `STUDY NOTES`) is `<h2>`. `MaterialCard` uses `<h4>`, skipping `<h3>`. |
| **`/dashboard` (`Dashboard.tsx`)** | `<h2>` | `<h2>` ("Student Dashboard") &rarr; `<h3>` (Cards) &rarr; `<h4>` (Profile Name) | **Missing `<h1>`**. Main title is `<h2>`. |
| **`/view/:id` (`PdfViewer.tsx`)** | `<h2>` | `<h2>` ("Loading resource...", "Resource not found", "Login required", "Access denied") | **Missing `<h1>`**. Informational/error state overlays use `<h2>` as top-level heading. |
| **`/resource/:id` (`ResourceDetails.tsx`)** | `<h2>` | `<h2>` (Resource Title) &rarr; `<h3>` (Details, Related) | **Missing `<h1>`**. Main resource title uses `<h2>`. |
| **`/about` (`About.tsx`)** | `<h2>` | `<h2>` ("About Horizon") &rarr; `<h3>` (Section titles) | **Missing `<h1>`**. Main page title uses `<h2>`. |
| **`/privacy-policy` (`PrivacyPolicy.tsx`)** | `<h1>` | `<h1>` ("Privacy Policy") &rarr; `<h2>` (Sections) &rarr; `<h3>` (Subsections) | **Good**. Perfect sequential heading hierarchy. |
| **`/attribution` (`Attribution.tsx`)** | `<h1>` | `<h1>` ("Attribution") &rarr; `<h2>` (Illustrations, Icons) &rarr; `<h3>` (Providers) | **Good**. Sequential hierarchy. |
| **`/login` (`Login.tsx`)** | `<h2>` | `<h2>` ("Login") | **Missing `<h1>`**. Title is `<h2>`. |
| **`/register` (`Register.tsx`)** | `<h2>` | `<h2>` ("Register" / "Check your email") | **Missing `<h1>`**. Title is `<h2>`. |
| **`/onboarding` (`Onboarding.tsx`)** | `<h1>` / `<h2>` | Step 1: `<h1>`. Steps 2–5: `<h2>`. | **Inconsistent**. Step 1 uses `<h1>`, but subsequent steps switch to `<h2>`. |
| **`/settings/notifications`** | `<h2>` | `<h2>` ("Notification Settings") &rarr; `<h3>` (Sections) | **Missing `<h1>`**. Title is `<h2>`. |
| **`/coming-soon` (`ComingSoon.tsx`)** | `<h2>` | `<h2>` ("Coming Soon") | **Missing `<h1>`**. Title is `<h2>`. |

---

## 4. Interactive Elements Audit

Interactive controls should use semantic elements (`<button>` for actions, `<a>`/`<Link>` for navigation).

### Issues Identified

#### 1. Clickable `<div>` Card Containers with Nested Controls
- **Component**: `MaterialCard.tsx`
- **Current Markup**:
  ```tsx
  <div className="..." onClick={() => navigate(`/view/${resource.id}`)}>
    ...
    <Link to={`/view/${resource.id}`} onClick={(e) => e.stopPropagation()}>View</Link>
    <button onClick={(e) => handleDownload(...)}>Download</button>
  </div>
  ```
- **Problem**: Nesting focusable, interactive elements (`<Link>`, `<button>`) inside an outer `<div>` with an `onClick` handler creates invalid interactive tree structures. Screen readers cannot properly describe or navigate the outer card container as a button, and keyboard users cannot activate the outer card without triggering nested focus stops.

#### 2. Custom Dropdown Control Built Entirely with `<div>`s
- **Component**: `Dropdown.tsx`
- **Current Markup**:
  ```tsx
  <div className="..." ref={dropdownRef}>
    <div className="..." onClick={() => setIsOpen(!isOpen)}>
      <span>{value}</span>
      <svg ... />
    </div>
    {isOpen && (
      <div>
        {options.map(option => (
          <div key={option} onClick={...}>{option}</div>
        ))}
      </div>
    )}
  </div>
  ```
- **Problem**: The trigger element is a `<div>` instead of a `<button>`. Option items are `<div>` elements instead of `<button>`s, `<li>`s, or native `<option>`s. Standard browser keyboard navigation (Space/Enter to toggle, Arrow keys to navigate options) is completely non-functional.

#### 3. Custom Page Slider Built with Touch/Mouse Event `<div>`s
- **Component**: `PdfPageSlider.tsx`
- **Current Markup**:
  ```tsx
  <div ref={sliderContainerRef} className="..." onTouchStart={...} onMouseDown={...}>
    <div className={styles.sliderTrack} />
    <div className={styles.sliderThumb}>
      <span>{currentPage}</span>
    </div>
  </div>
  ```
- **Problem**: The semicircular range control uses unsemantic `<div>` elements with raw mouse/touch listeners rather than a semantic range input (`<input type="range">`). Browsers and screen readers cannot identify this control as a range slider.

#### 4. Header Mobile Hamburger Toggle Button
- **Component**: `Home.tsx` & `PdfFloatingControls.tsx`
- **Observation**: Hamburger toggles correctly use `<button>` tags with `aria-label` and `aria-expanded` attributes.

---

## 5. Form Controls & Input Audit

### Issues Identified

#### 1. Missing `<label>` Elements in Forms
- **Components**:
  - `Home.tsx` (HighlightsSection newsletter subscription form):
    ```tsx
    <form onSubmit={handleSubscribe}>
      <input type="text" placeholder="Your name" ... />
      <input type="email" placeholder="Your email" ... />
      <input type="password" placeholder="Password" ... />
      <button type="submit">Subscribe</button>
    </form>
    ```
  - `Login.tsx`:
    ```tsx
    <form onSubmit={handleLogin}>
      <input type="email" placeholder="Email" ... />
      <input type="password" placeholder="Password" ... />
      <button type="submit">Login</button>
    </form>
    ```
  - `Register.tsx`:
    ```tsx
    <form onSubmit={handleRegister}>
      <input type="text" placeholder="Full Name" ... />
      <input type="email" placeholder="Email" ... />
      <input type="password" placeholder="Password" ... />
      <button type="submit">Register</button>
    </form>
    ```
- **Problem**: Form inputs rely solely on `placeholder` attributes. Placeholders are not substitutes for semantic `<label>` elements or `aria-label` attributes because they disappear during text entry, leaving screen readers and users without persistent input identification.

#### 2. Disabled Form Inputs without Fieldsets
- **Component**: `NotificationSettings.tsx`
- **Observation**: Form checkboxes in coming-soon settings are disabled `<input type="checkbox" disabled />` wrapped in `<label>` tags. Wrapping checkboxes in `<label>` is semantic, though grouping them in a `<fieldset>` with a `<legend>` would clarify form sections.

---

## 6. Content & List Structures

### Issues Identified

#### 1. Resource Card Grids
- **Component**: `ResourcePage.tsx`
- **Current Markup**:
  ```tsx
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px]">
    {filteredResources.map(resource => (
      <MaterialCard key={resource.id} resource={resource} />
    ))}
  </div>
  ```
- **Problem**: A collection or grid of resource items is a list of content cards. Using `<div>` wrappers instead of `<ul>` and `<li>` prevents screen readers from announcing list length (e.g., "List of 12 items").

#### 2. Feature Card Grids
- **Components**: `Home.tsx` (`FeaturesSection`) & `OtherResources.tsx`
- **Current Markup**:
  ```tsx
  <div className={styles.featuresGrid}>
    {getAllFeatures().map((f, i) => (
      <div key={i} className={styles.featureCard}>...</div>
    ))}
  </div>
  ```
- **Problem**: The grid of feature items should be structured using a list (`<ul>` / `<li>`) or semantic content items (`<article>`).

#### 3. Key-Value Statistics & Profile Summary
- **Component**: `Dashboard.tsx`
- **Current Markup**:
  ```tsx
  <div className="flex justify-between items-center pb-3 border-b border-black/[0.04]">
    <span className="text-body-base text-muted-foreground font-medium">Class</span>
    <span className="text-body-base text-ink font-bold">{profile?.student_class}</span>
  </div>
  ```
- **Problem**: Profile details (Class, Study Medium, Member Since) and Study Statistics are key-value definition pairs. Using arbitrary `<div>` and `<span>` elements obscures the semantic relationship that a description list (`<dl>`, `<dt>`, `<dd>`) naturally conveys.

---

## 7. Comprehensive Page-by-Page Audit Summary

### 1. `index.html`
- **Landmarks**: `<html>`, `<head>`, `<body>`, `<div id="root">`.
- **Status**: **Clean**. Has `<!doctype html>` and `lang="en"`.

### 2. `Home.tsx`
- **Landmarks**: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`.
- **Headings**: `<h1>` (Hero title), `<h2>` (Features, Highlights titles), `<h3>` (Feature cards).
- **Issues**:
  - Highlights newsletter form inputs lack `<label>` elements.
  - Feature grid uses `<div>`s instead of `<ul>`/`<li>`.

### 3. `ResourcePage.tsx` (`/library` & `/notes`)
- **Landmarks**: `<main>` (from `MainLayout`). Missing `<section>` wrappers.
- **Headings**: Starts with `<h2>` for page title instead of `<h1>`.
- **Issues**:
  - Missing `<h1>` tag.
  - Filter dropdowns built using non-semantic `<div>`s.
  - Resource grid uses `<div>`s instead of `<ul>`/`<li>`.

### 4. `MaterialCard.tsx`
- **Headings**: Uses `<h4>` directly.
- **Issues**:
  - Outer `<div>` with `onClick` acts as an interactive button/card, but contains nested `<Link>` and `<button>` elements.
  - Heading level `<h4>` skips `<h3>`.

### 5. `Dashboard.tsx` (`/dashboard`)
- **Landmarks**: `<main>` (from `MainLayout`). Sidebar and main columns use `<div>` instead of `<aside>` and `<section>`.
- **Headings**: Title is `<h2>` ("Student Dashboard") instead of `<h1>`.
- **Issues**:
  - Missing `<h1>` tag.
  - Profile summary details use `<div>`/`<span>` instead of `<dl>`/`<dt>`/`<dd>`.
  - Sidebar column uses `<div>` instead of `<aside>`.

### 6. `ResourceDetails.tsx` (`/resource/:id`)
- **Landmarks**: `<main>` (from `MainLayout`), `<aside>` (Sidebar), `<section>` (Details and Related sections).
- **Headings**: Main title is `<h2>` instead of `<h1>`.
- **Issues**:
  - Main resource title is `<h2>` instead of `<h1>`.

### 7. `About.tsx` (`/about`)
- **Landmarks**: `<header>`, `<section>`.
- **Headings**: Header title is `<h2>` ("About Horizon") instead of `<h1>`. Section titles are `<h3>`.
- **Issues**:
  - Page title is `<h2>` instead of `<h1>`.

### 8. `PrivacyPolicy.tsx` (`/privacy-policy`)
- **Landmarks**: `<header>`, `<section>`.
- **Headings**: `<h1>` ("Privacy Policy"), `<h2>` (Sections), `<h3>` (Subsections).
- **Status**: **Excellent semantic HTML**.

### 9. `Attribution.tsx` (`/attribution`)
- **Landmarks**: `<header>`, `<section>`.
- **Headings**: `<h1>` ("Attribution"), `<h2>` (Sections), `<h3>` (Subsections).
- **Status**: **Excellent semantic HTML**.

### 10. `Login.tsx` (`/login`) & `Register.tsx` (`/register`)
- **Landmarks**: `<main>` (from `MainLayout`).
- **Headings**: Title is `<h2>` instead of `<h1>`.
- **Issues**:
  - Missing `<h1>` tag.
  - `<form>` inputs lack `<label>` elements.

### 11. `Onboarding.tsx` (`/onboarding`)
- **Landmarks**: Outer container is `<div>`.
- **Headings**: Step 1 uses `<h1>`, Steps 2–5 use `<h2>`.
- **Issues**:
  - Inconsistent heading hierarchy across onboarding steps.

### 12. `NotificationSettings.tsx` (`/settings/notifications`)
- **Headings**: Title is `<h2>` instead of `<h1>`.
- **Issues**:
  - Missing `<h1>` tag.

### 13. `ComingSoon.tsx` (`/coming-soon`)
- **Headings**: Title is `<h2>` instead of `<h1>`.
- **Issues**:
  - Missing `<h1>` tag.

### 14. `PdfViewer.tsx` (`/view/:id`)
- **Landmarks**: Standalone full-screen `<div>`. Floating top controls contain back and menu buttons.
- **Headings**: Informational overlays use `<h2>`.
- **Issues**:
  - Missing `<h1>` tag.
  - Floating top bar buttons are not wrapped in `<header>` or `<nav>`.
  - `PdfPageSlider` uses non-semantic touch/mouse `<div>`s instead of a range slider input.

---

## 8. Prioritized Recommendations & Action Plan

To resolve these semantic HTML issues without changing the visual design, CSS styling, or application behavior, the following phased refactoring plan is recommended for future tasks:

### Phase 1: High Impact / Low Risk (Page Titles & Heading Hierarchy)
1. **Promote Main Page Titles to `<h1>`**:
   - In `ResourcePage.tsx`, change `<h2 className="...">` to `<h1 className="...">` (retain existing Tailwind CSS classes so visual styling is identical).
   - In `Dashboard.tsx`, change main title `<h2>` to `<h1>`.
   - In `About.tsx`, `Login.tsx`, `Register.tsx`, `NotificationSettings.tsx`, and `ComingSoon.tsx`, update page heading tags to `<h1>` while keeping exact CSS classes.
2. **Adjust Card Heading Levels**:
   - In `MaterialCard.tsx`, change `<h4 className="...">` to `<h3 className="...">` so card titles follow `<h1>` (Page) &rarr; `<h3>` (Card) directly or through section headings.

### Phase 2: High Impact / Medium Effort (Form Labels & Interactive Controls)
1. **Add Visually Hidden or Explicit Labels to Forms**:
   - In `Home.tsx` (Newsletter), `Login.tsx`, and `Register.tsx`, wrap inputs with `<label>` tags or add implicit `<label className="sr-only">` elements for accessibility tooling without altering visual appearance.
2. **Refactor Custom `Dropdown.tsx`**:
   - Convert the trigger `<div>` to a `<button type="button">`.
   - Wrap options container in a `<ul>` and option items in `<li><button type="button">`.
   - Retain all existing Tailwind classes and dropdown positioning logic.
3. **Refactor `MaterialCard.tsx` Container**:
   - Remove outer `onClick` from the card `<div>` container.
   - Expand the primary `<Link to={`/view/${resource.id}`}>` overlay or make the title/thumbnail explicit links, eliminating nested interactive click handlers while keeping the card visual hover state identical.

### Phase 3: Medium Impact / Structural Cleanup (Lists & Landmarks)
1. **Convert Resource and Feature Grids to `<ul>` / `<li>`**:
   - In `ResourcePage.tsx`, update grid container from `<div>` to `<ul>` and `MaterialCard` wrapper to `<li>`.
   - In `FeaturesSection` (`Home.tsx`) and `OtherResources.tsx`, use `<ul>` and `<li>` for feature card grids.
2. **Use `<dl>`, `<dt>`, `<dd>` for Definition Metadata**:
   - In `Dashboard.tsx` (Profile Summary & ResourceDetails), replace `<div>`/`<span>` row pairs with semantic description lists (`<dl>`, `<dt>`, `<dd>`) styled with existing flexbox utilities.
3. **Enhance Page Region Landmarks**:
   - In `Dashboard.tsx`, wrap the sidebar column in an `<aside>` tag and main content in `<section>` tags.
   - In `PdfViewer.tsx`, wrap top floating controls in a `<header>` or `<nav>` container.

---

*Audit completed for pre-indexing cleanup roadmap. No application code or CSS modified.*
