# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are secondary school students in India (Classes 8th to 10th) studying under the CBSE, NCERT, and State (RBSE) curricula in English and Hindi mediums. They are studying for school exams and board assessments, needing direct, distraction-free access to syllabus topics, high-quality chapter notes, solutions, and past-year question papers (PYQs). Secondary users include teachers referencing structured materials and platform administrators managing announcements and content.

## Product Purpose

Horizon provides a high-performance, clutter-free digital study companion. Its purpose is to eliminate educational friction—long download delays, aggressive advertisements, intrusive paywalls, and unstructured repositories—by offering instant chapter exploration, interactive syllabus tracking, and an optimized in-browser PDF reader. Success is measured by student reading focus, fast time-to-content, and uninterrupted study sessions.

## Positioning

Unlike cluttered, ad-supported free study portals or locked-down commercial edtech platforms that upsell coaching packages, Horizon is an ad-free, high-speed, precision-engineered educational hub. It combines static site speed (SSG/edge caching) with dynamic client-side exploration, token-gated secure resource streaming, and an elevated tactile neumorphic aesthetic tailored specifically for daily sustained study.

## Operating Context

- **Usage Environments**: Low-to-medium bandwidth home and mobile broadband, shared family computers, budget Android tablets/smartphones, and desktop laptops.
- **Study Workflows**: Chapter revision, last-minute exam prep using Past Year Question (PYQ) papers, step-by-step syllabus node completion tracking, and deep reading of educational PDFs.
- **Reading Rituals**: Extended screen time requiring low-glare, eye-comfortable backgrounds, tactile tactile controls, and quick bookmarking/reading progress persistence.

## Capabilities and Constraints

- **Single Page Application with SSG Prerendering**: React 19, Vite, TypeScript, and Cloudflare Pages edge hosting.
- **Curriculum Hierarchy**: Class (8th–10th) → Medium (English/Hindi) → Subject → Chapter → Topic / Subtopic resources.
- **Resource Streaming & PDF Reader**: Custom token-gated 60-second signed URL delivery via Supabase Edge Functions with a dedicated full-bleed `react-pdf` / `pdfjs-dist` reader supporting pan/zoom, page scrubbing, and mobile touch gestures.
- **Notification System**: Web Push notifications (RFC 8291 / VAPID) for syllabus announcements and study reminders with student preference controls.
- **Technical Constraints**: Strict zero-ad commitment; sub-second navigation; zero cumulative layout shift (CLS) during resource inspection; responsive support down to small mobile viewports (360px).

## Brand Commitments

- **Visual Identity**: Tactile, modern Neumorphic visual language using soft raised cards (`#FAFAFA`), subtle wells (`#FDFDFD`), gentle base surfaces (`#F4F4F4`), high-contrast ink (`#111111`), and an energetic brand accent pink (`#E91E8C` / `#E11584`).
- **Typography**: Editorial prestige and academic clarity blending `@fontsource/playfair-display` headings, `Instrument Serif` accents, and preconnected `Roboto` body type.
- **Voice & Tone**: Encouraging, calm, academically rigorous, and respectful of student attention. No alarmist marketing copy or gamified anxiety triggers.

## Evidence on Hand

- **Existing Codebase & Assets**: Working React 19 codebase at `src/`, Cloudflare Pages functions at `functions/`, and Supabase schema/migrations at `supabase/`.
- **Pre-seeded Content**: NCERT/CBSE syllabus topic maps and verified PDF learning materials stored across Supabase storage buckets (`learning_resources`, `chapters`, `syllabus_topics`).
- **Accessibility & Design Rules**: Documented WAI-ARIA and focus standards in `.Jules/palette.md` and render optimization guidelines in `.Jules/bolt.md`.

## Product Principles

1. **Protect Student Attention**: Every screen must prioritize content readability; zero distracting popups, banner ads, or manipulative conversion dark patterns.
2. **Speed is an Educational Feature**: Deliver instant page loads, immediate PDF first-page rendering, and smooth 60fps pan/zoom interactions even on mid-range devices.
3. **Tactile Clarity**: Interface elements should feel physical, stable, and predictable, providing clear feedback without visual noise.
4. **Curricular Faithfulness**: Organize all structures strictly in alignment with recognized NCERT, CBSE, and State Board frameworks so students always know where they stand in their academic year.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 AA standards.
- Clear `focus-visible` keyboard rings (`#E91E8C`) on interactive controls with mouse-click ring suppression.
- Screen-reader-friendly semantic structures across navigation dropdowns, modal dialogs, chapter trees, and PDF viewer controls.
- Dual English and Hindi medium support catering to diverse student linguistic backgrounds across India.
