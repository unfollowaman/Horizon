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
