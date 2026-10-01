## 2026-03-13 - WAI-ARIA Listbox Pattern & Keyboard Navigation in Custom Dropdowns
**Learning:** Custom interactive select components built using plain `<button>` triggers must declare `aria-haspopup="listbox"` and render options in a `role="listbox"` container with `role="option"` buttons and `aria-selected` attributes rather than `aria-pressed`. Keyboard listeners should support ArrowUp/ArrowDown traversal, Home/End jump, and Escape closing with automatic focus management back to the trigger button.
**Action:** Always provide explicit `ariaLabel` props to custom dropdown controls and handle keyboard focus explicitly when building custom select/combobox components.

## 2026-03-14 - Keyboard Focus Ring Precision with focus-visible
**Learning:** In Neumorphic and custom card component interfaces, using `focus:outline-none focus:ring-2` can trigger intrusive focus rings on pointer clicks. Replacing `focus:` classes with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent` ensures clear high-contrast focus rings appear strictly during keyboard navigation without cluttering mouse click interactions.
**Action:** Always prefer `focus-visible:` utilities over `focus:` for buttons and interactive `role="button"` elements.

## 2026-03-30 - Focus Rings on Overlay Link Elements
**Learning:** When using full-card overlay `<Link>` elements (`absolute inset-0 z-20`) to make entire card containers clickable, omitting focus utilities leaves keyboard navigation without a visible focus indicator. Adding explicit `rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2` to overlay links ensures keyboard Tab navigation renders a visible focus ring that matches the card's rounded border radius.
**Action:** Always include matching `rounded-*` border-radius and `focus-visible:ring-2` styling on overlay link elements.

## 2026-03-31 - Accessible Custom Progress Bars & Disabled Control Hints
**Learning:** When rendering disabled setting controls or form inputs, pairing explicit input `id`s with `htmlFor` labels, `aria-disabled="true"`, and explanatory `title` tooltips ensures assistive technologies and mouse/keyboard users clearly understand the control's state and why it is currently unavailable.
**Action:** Always bind disabled checkboxes or toggles to explicit `<label>` elements via `htmlFor`, and provide `aria-disabled="true"` alongside explanatory `title` tooltips.

## 2026-04-01 - WAI-ARIA Slider Semantics for Custom Floating Controls
**Learning:** Custom interactive slider/scrubber elements (like PDF document page scrubbers) built with draggable `<div>` elements must declare `role="slider"`, `tabIndex={0}`, `aria-label`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and descriptive `aria-valuetext` (e.g. "Page 3 of 10") so screen readers can interpret slider position and value bounds. High-contrast `focus-visible` ring utilities (`focus-visible:ring-2 focus-visible:ring-[#E91E8C]`) ensure keyboard navigation renders clear focus indicators.
**Action:** Always wrap custom range scrubbers/sliders with full WAI-ARIA `slider` role semantics, `tabIndex={0}`, dynamic `aria-valuetext`, and high-contrast `focus-visible` focus indicators.

## 2026-04-02 - Descriptive ARIA Labels for Contextual Inline Navigation Links
**Learning:** In informational prose and static marketing/about cards, single-word inline navigation links (such as "Library" or "Contact") lack sufficient standalone context when announced out-of-flow by screen reader link lists. Providing explicit `aria-label` attributes (e.g., `aria-label="Visit our online Library to browse study materials"`) ensures screen readers convey full destination context and action purpose.
**Action:** Always add descriptive `aria-label` attributes to terse or single-word inline links embedded in paragraph text on informational pages.

## 2026-04-03 - WAI-ARIA Modal Drawers & Escape Dismissal in Mobile Overlays
**Learning:** Slide-out navigation panels and mobile drawer overlays rendered over full-screen interfaces (such as PDF readers) must declare `role="dialog"`, `aria-modal="true"`, and descriptive `aria-label="Mobile navigation menu"` attributes so screen readers isolate modal context. Attaching a global `keydown` listener for `KeyboardEvent.key === 'Escape'` when the modal state is active ensures users can dismiss mobile menus effortlessly using standard keyboard controls.
**Action:** Always declare `role="dialog"`, `aria-modal="true"`, and `Escape` key event dismissal on mobile slide-out navigation drawers.

## 2026-04-04 - Dynamic ARIA Label Toggle Actions for Accordion Triggers
**Learning:** In expandable accordion trees and chapter cards, screen reader users receive clearer action intent when interactive toggle buttons dynamically prefix `aria-label` values with the specific action (e.g. `Expand Chapter 1: Real Numbers` vs `Collapse Chapter 1: Real Numbers`) alongside `aria-expanded={isOpen}`. Pairing action-prefixed ARIA labels with `focus-visible:ring-offset-2` ensures keyboard navigation renders clean, unobstructed focus rings over neumorphic card borders.
**Action:** Always dynamically indicate the action (`Expand` / `Collapse`) in `aria-label` attributes on accordion trigger controls alongside `aria-expanded`.

## 2026-04-05 - High-Contrast Focus Rings & Native Hover Tooltips on Header Icon Links
**Learning:** Icon-only navigation links in top headers (such as `ProfileButton`) benefit significantly from pairing dynamic `aria-label` values with matching `title={ariaLabel}` attributes to provide instant fallback hover tooltips for mouse users. Upgrading low-contrast default focus ring styles (`focus-visible:ring-ink/20`) to high-contrast brand accent utilities (`focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2`) guarantees clear keyboard navigation focus visibility against soft neumorphic card backgrounds and elevated header borders.
**Action:** Always pair `aria-label` with `title` on icon-only navigation links, and use brand accent `focus-visible:ring-[#E91E8C]` focus indicators.

## 2026-04-06 - Accessible Popover Overlays & High-Contrast Focus Rings
**Learning:** Profile popover menus and user account dropdowns rendered over headers must declare `role="dialog"` and `aria-label="User account options"` so screen readers convey overlay context. Pairing dynamic `aria-label` with matching `title` attributes on avatar buttons provides native hover tooltips for mouse users, while `focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2` guarantees visible keyboard focus over neumorphic card backgrounds.
**Action:** Always declare `role="dialog"` and `aria-label` on popover overlays, and use brand pink focus ring utilities with `focus-visible:ring-offset-2` on avatar triggers.

## 2026-04-07 - High-Contrast Focus Rings & Mouse Tooltip Coupling on Floating Overlay Controls
**Learning:** Floating overlay controls (such as PDF viewer floating buttons) rendered over content canvases require high-contrast focus rings (`focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2`) so keyboard navigation remains clearly visible against variable document backgrounds. Coupling `aria-label` with matching `title` tooltips on icon-only buttons provides native mouse hover tooltips without additional JS popover dependencies, while `aria-hidden="true"` on inner SVGs prevents redundant screen reader announcements.
**Action:** Always pair `aria-label` with matching `title` tooltips and `aria-hidden="true"` on inner SVGs for icon-only floating overlay action buttons.

## 2026-04-08 - Accessible Skip to Main Content Landmark Navigation
**Learning:** Providing a visually hidden "Skip to main content" link (`sr-only focus:not-sr-only`) targeting `<main id="main-content" tabIndex={-1}>` at the root layout level gives keyboard and screen reader users a fast, standard bypass route to main page content, eliminating repetitive tab navigation through top header menus.
**Action:** Always include a `href="#main-content"` skip link in top-level app layouts and assign `id="main-content"` with `tabIndex={-1}` on the `<main>` container.
