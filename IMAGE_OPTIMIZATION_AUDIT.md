# Image Optimization Audit

## 1. Inventory of Images

| Filename | Location | Format | Intrinsic Dimensions | File Size | Where it is used |
|---|---|---|---|---|---|
| `apple-touch-icon.png` | `public/assets/favicon/` | PNG | 180 × 180 | 14 KB | `index.html` |
| `favicon-96x96.png` | `public/assets/favicon/` | PNG | 96 × 96 | 6.4 KB | `index.html` |
| `favicon.svg` | `public/assets/favicon/` | SVG | - | 2.6 MB | `index.html` |
| `logo.png` | `public/assets/favicon/` | PNG | 3264 × 3264 | 1.2 MB | `Dashboard.tsx`, `Home.tsx`, `HeroPhoneAnimation.tsx` |
| `web-app-manifest-192x192.png` | `public/assets/favicon/` | PNG | 192 × 192 | 15 KB | `site.webmanifest` |
| `web-app-manifest-512x512.png` | `public/assets/favicon/` | PNG | 360 × 360 (Note: mismatch with name) | 36 KB | `site.webmanifest` |
| `announcements.png` | `public/assets/hero/` | PNG | 1024 × 1024 | 1.2 MB | `HeroPhoneAnimation.tsx` |
| `flashcards.png` | `public/assets/hero/` | PNG | 1024 × 1024 | 1.3 MB | `HeroPhoneAnimation.tsx` |
| `mcq-sheets.png` | `public/assets/hero/` | PNG | 1536 × 1024 | 2.2 MB | `HeroPhoneAnimation.tsx` |
| `notes.png` | `public/assets/hero/` | PNG | 1024 × 1024 | 1.3 MB | `HeroPhoneAnimation.tsx` |
| `pyq-papers.png` | `public/assets/hero/` | PNG | 1024 × 1024 | 1.4 MB | `HeroPhoneAnimation.tsx` |
| `revision-sheets.png` | `public/assets/hero/` | PNG | 1024 × 1024 | 1.4 MB | `HeroPhoneAnimation.tsx` |
| `coming-soon.svg` | `public/assets/SVG Illustrations/` | SVG | - | 30 KB | `ComingSoon.tsx` |
| `confirm-email.svg` | `public/assets/SVG Illustrations/` | SVG | - | 51 KB | `Register.tsx` |
| `login-signin-page.svg` | `public/assets/SVG Illustrations/` | SVG | - | 80 KB | `PdfViewer.tsx` |
| `no-content-available.svg` | `public/assets/SVG Illustrations/` | SVG | - | 35 KB | `ResourcePage.tsx` |
| `pyq-papers.svg` | `public/assets/SVG Illustrations/` | SVG | - | 54 KB | `MaterialCard.tsx` |
| `study-notes.svg` | `public/assets/SVG Illustrations/` | SVG | - | 35 KB | `MaterialCard.tsx` |
| `github.png` | `public/assets/Social Links/` | PNG | 50 × 50 | 1.5 KB | `Home.tsx` |
| `gmail.png` | `public/assets/Social Links/` | PNG | 50 × 50 | 838 B | `Home.tsx` |
| `instagram.png` | `public/assets/Social Links/` | PNG | 50 × 50 | 889 B | `Home.tsx` |
| `twitter-x.png` | `public/assets/Social Links/` | PNG | 50 × 50 | 949 B | `Home.tsx` |
| `icons.svg` | `public/` | SVG | - | 5.0 KB | (Potentially loaded by components, needs verification) |

## 2. Public/Static Assets

All the identified images are located in the `public/` directory, which means they are shipped directly to the users without build-time processing by Vite. This makes optimizing these assets crucial, as they will be served as-is.

**Most Critical Path Assets:**
- `favicon.svg` (2.6 MB) - Loaded on every page request via `index.html`.
- `logo.png` (1.2 MB) - Loaded in multiple key areas, including `Home.tsx` (Hero, Footer) and `Dashboard.tsx`.
- Hero Animation Assets (`announcements.png`, `flashcards.png`, `mcq-sheets.png`, `notes.png`, `pyq-papers.png`, `revision-sheets.png`) - All are 1MB+ and load simultaneously in `HeroPhoneAnimation.tsx` on the main landing page.

## 3. Identify Large Assets

| Asset | Format | Dimensions | File Size | Used By | Loaded Initially? | Concern |
|---|---|---:|---:|---|---|---|
| `favicon.svg` | SVG | - | 2.6 MB | `index.html` | Yes | Extremely large for a favicon. SVGs should typically be kilobytes, not megabytes. It's likely unminified, contains embedded raster graphics, or has excessive anchor points. This blocks rendering. |
| `logo.png` | PNG | 3264 × 3264 | 1.2 MB | `Dashboard.tsx`, `Home.tsx`, `HeroPhoneAnimation.tsx` | Yes (Above fold) | Massively oversized for UI usage. Loaded early in the render cycle on primary routes. |
| `mcq-sheets.png` | PNG | 1536 × 1024 | 2.2 MB | `HeroPhoneAnimation.tsx` | Yes (Hero Section) | Huge file size for a single animation frame/asset. Loads on the initial landing page view. |
| `pyq-papers.png` | PNG | 1024 × 1024 | 1.4 MB | `HeroPhoneAnimation.tsx` | Yes (Hero Section) | Very large file size. Loads on the initial landing page view. |
| `revision-sheets.png` | PNG | 1024 × 1024 | 1.4 MB | `HeroPhoneAnimation.tsx` | Yes (Hero Section) | Very large file size. Loads on the initial landing page view. |
| `flashcards.png` | PNG | 1024 × 1024 | 1.3 MB | `HeroPhoneAnimation.tsx` | Yes (Hero Section) | Very large file size. Loads on the initial landing page view. |
| `notes.png` | PNG | 1024 × 1024 | 1.3 MB | `HeroPhoneAnimation.tsx` | Yes (Hero Section) | Very large file size. Loads on the initial landing page view. |
| `announcements.png` | PNG | 1024 × 1024 | 1.2 MB | `HeroPhoneAnimation.tsx` | Yes (Hero Section) | Very large file size. Loads on the initial landing page view. |

## 4. Image Dimensions Analysis

- **`logo.png`**:
  - Intrinsic Dimensions: 3264 × 3264
  - Rendered Dimensions:
    - Desktop Header (`.brandLogoImg`): height 24px (`h-6`)
    - Hero Brand Pill (`.heroBrandPillImg`): height 24px (`h-6`)
    - Mascot in Animation (`.mascot`): width 60px
    - Footer (`.footerLogo`): 44px × 44px
  - **Issue**: A 3264x3264 image is being loaded only to be scaled down to 24px-60px. This wastes significant bandwidth and CPU resources for decoding.

- **Hero Animation Assets (`notes.png`, `flashcards.png`, etc.)**:
  - Intrinsic Dimensions: 1024 × 1024 (and 1536 × 1024 for `mcq-sheets.png`)
  - Rendered Dimensions: `.iconImage` is set to `width: 64px`, height auto.
  - **Issue**: Six 1024x1024+ images, totaling ~8.8 MB, are downloaded just to be rendered at 64px width. This is a severe performance bottleneck for the landing page.

- **Social Icons (`github.png`, `gmail.png`, etc.)**:
  - Intrinsic Dimensions: 50 × 50
  - Rendered Dimensions: `.footerSocialIcon` is `32px × 32px`.
  - **Issue**: Not a major problem as file sizes are < 2 KB, but intrinsically they are larger than rendered.

- **Web App Manifest 512x512 icon**:
  - The file `web-app-manifest-512x512.png` has actual dimensions of 360 × 360, which might violate manifest requirements for a 512x512 icon.

- **SVG Illustrations (`confirm-email.svg`, `login-signin-page.svg`, etc.)**:
  - Rendered Dimensions (e.g., `confirm-email.svg`): `w-40 h-40` (160px × 160px).
  - **Issue**: SVGs scale infinitely, but filesizes are slightly bulky (e.g., `login-signin-page.svg` is 80 KB). They might contain unminified markup or embedded base64 graphics.

## Summary of Concerns

1.  **Enormous Favicon:** `favicon.svg` at 2.6 MB is critical. It forces every visitor to download a 2.6 MB file just for a tiny browser tab icon.
2.  **Hero Section Payload:** The `HeroPhoneAnimation.tsx` component requires downloading approximately 8.8 MB of PNGs (`notes.png`, `pyq-papers.png`, etc.) which are then rendered at only 64px wide.
3.  **Oversized Logo:** `logo.png` is 3264x3264 (1.2 MB) but is never rendered larger than 60px anywhere in the app.
4.  **Format Modernization:** All raster images are currently PNGs. No modern formats (WebP, AVIF) are being utilized, missing out on substantial compression benefits.
