**Instructions for Next AI Agent:**

Please continue the migration of the `Horizon` project from Tailwind CSS to Vanilla CSS Modules. The foundation has been laid in the `Header` and `HeroSection` of `src/pages/home/Home.tsx`.

Your task is to migrate the remaining sections of the `Home.tsx` file (or other components as directed) following the established patterns.

**Core Requirements:**
1. **Reference MIGRATION_GUIDE.md:** Review this file for the established CSS Custom Properties (colors, spacing scale where `--spacing-1` = 8px, typography) located in `src/index.css`.
2. **Semantic Naming:** Replace Tailwind utility classes with semantic camelCase class names in the corresponding `.module.css` file (e.g., `Home.module.css`).
3. **No Arbitrary Values:** Use the defined `var(--...)` variables from `src/index.css` wherever possible (especially for colors, spacing, and typography). Avoid hardcoding hex codes or pixel values unless they are specific, one-off layouts.
4. **Responsive Design:** Translate Tailwind's responsive prefixes (`md:`, `lg:`) into appropriate `@media` queries within the CSS Module (e.g., `@media (min-width: 768px)`).
5. **Validation:** After migrating a section, run `npm run build` and visually verify the changes using a local server (`npm run dev`) and Playwright screenshots to ensure 100% visual fidelity with the original Tailwind implementation. Do not modify the underlying DOM structure unnecessarily.
