# Tailwind to Vanilla CSS Modules Migration Guide

This guide details the conventions established for migrating the application from Tailwind CSS to Vanilla CSS Modules, based on the implementation of the Header and Hero sections.

## 1. CSS Custom Properties (`src/index.css`)
Global variables have been defined in `:root` to replace Tailwind's arbitrary and custom theme values.
- **Colors**: `--bg-primary` (#03111A), `--text-primary` (#FFFFFF), `--text-secondary` (#9A9AA8), `--border-color` (#2E2E2E), `--accent-red` (#FF2E63).
- **Spacing**: Custom scale (1 unit = 8px). `--spacing-1` (8px), `--spacing-2` (16px), `--spacing-3` (24px), `--spacing-4` (32px), `--spacing-6` (48px), `--spacing-8` (64px), `--spacing-10` (80px), `--spacing-16` (128px), `--spacing-24` (192px).
- **Typography**:
  - `--font-serif` ('Instrument Serif', serif), `--font-sans` ('Inter', sans-serif).
  - Sizes: `--text-xs` (0.75rem), `--text-sm` (0.875rem), `--text-base` (1rem), `--text-lg` (1.125rem), `--text-xl` (1.25rem), `--text-4xl` (2.25rem), `--text-5xl` (3rem), `--text-7xl` (4.5rem).
- **Other**: `--radius-full` (9999px), `--radius-2xl` (1rem), `--radius-3xl` (1.5rem).

## 2. CSS Modules Structure
- **File Naming**: Use `.module.css` extensions (e.g., `Home.module.css`).
- **Class Naming**: Use camelCase for semantic class names (e.g., `.headerContainer`, `.heroSection`).
- **Flexbox/Layout**: Convert Tailwind utility classes (`flex`, `items-center`, `justify-between`) into explicit CSS rules mapped to semantic component classes.

## 3. Specific Substitutions
- **Backgrounds**: `bg-[#03111A]` -> `background-color: var(--bg-primary);`
- **Text Styling**: `font-serif text-5xl md:text-7xl` ->
  ```css
  .heading {
    font-family: var(--font-serif);
    font-size: var(--text-5xl);
  }
  @media (min-width: 768px) { .heading { font-size: var(--text-7xl); } }
  ```
- **Spacing**: `px-4 py-3` -> `padding: 12px 16px;` (or use spacing variables). `gap-4` -> `gap: var(--spacing-2);` (16px).
- **Liquid Glass Effect (`.liquidGlass`)**:
  ```css
  .liquidGlass {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  ```

## 4. Component Refactoring Strategy
1. Import the CSS module: `import styles from './ComponentName.module.css';`
2. Group related Tailwind utility classes into a single, semantic CSS class.
3. Replace inline utility strings with the module reference (e.g., `className={styles.brandContainer}`).
4. For responsive states (like `md:block`), use `@media (min-width: 768px)` in the CSS file.
