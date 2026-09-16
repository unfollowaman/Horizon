## 2026-03-13 - WAI-ARIA Listbox Pattern & Keyboard Navigation in Custom Dropdowns
**Learning:** Custom interactive select components built using plain `<button>` triggers must declare `aria-haspopup="listbox"` and render options in a `role="listbox"` container with `role="option"` buttons and `aria-selected` attributes rather than `aria-pressed`. Keyboard listeners should support ArrowUp/ArrowDown traversal, Home/End jump, and Escape closing with automatic focus management back to the trigger button.
**Action:** Always provide explicit `ariaLabel` props to custom dropdown controls and handle keyboard focus explicitly when building custom select/combobox components.

## 2026-03-14 - Keyboard Focus Ring Precision with focus-visible
**Learning:** In Neumorphic and custom card component interfaces, using `focus:outline-none focus:ring-2` can trigger intrusive focus rings on pointer clicks. Replacing `focus:` classes with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent` ensures clear high-contrast focus rings appear strictly during keyboard navigation without cluttering mouse click interactions.
**Action:** Always prefer `focus-visible:` utilities over `focus:` for buttons and interactive `role="button"` elements.

## 2026-03-30 - Focus Rings on Overlay Link Elements
**Learning:** When using full-card overlay `<Link>` elements (`absolute inset-0 z-20`) to make entire card containers clickable, omitting focus utilities leaves keyboard navigation without a visible focus indicator. Adding explicit `rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2` to overlay links ensures keyboard Tab navigation renders a visible focus ring that matches the card's rounded border radius.
**Action:** Always include matching `rounded-*` border-radius and `focus-visible:ring-2` styling on overlay link elements.
