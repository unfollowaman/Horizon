---
name: Horizon
description: A physical, calm digital study desk combining tactile neumorphic depth with editorial typography
colors:
  primary: "#e91e8c"
  primary-deep: "#c2185b"
  primary-dark: "#8b0a50"
  accent: "#e11584"
  neutral-bg: "#f4f4f4"
  surface-raised: "#fafafa"
  surface-recessed: "#fdfdfd"
  ink: "#111111"
  muted-foreground: "#6b7280"
  border-subtle: "rgba(255,255,255,0.8)"
  border: "rgba(0,0,0,0.03)"
typography:
  display:
    fontFamily: "'Instrument Serif', serif"
    fontSize: "clamp(2.8rem, 8vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-2px"
  headline:
    fontFamily: "'Playfair Display', serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0em"
  title:
    fontFamily: "'Playfair Display', serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0em"
  body:
    fontFamily: "'Playfair Display', serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  label:
    fontFamily: "'Roboto', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  full: "9999px"
spacing:
  1: "8px"
  2: "16px"
  3: "24px"
  4: "32px"
  5: "48px"
  6: "64px"
components:
  button-primary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  button-sm:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  card:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "14px"
  card-recessed:
    backgroundColor: "{colors.surface-recessed}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.sm}"
    height: "100px"
---

# Design System: Horizon

## Overview

**Creative North Star: "The Digital Study Desk"**

Horizon is designed as a tranquil, tangible academic environment engineered for sustained study without cognitive fatigue. Unlike standard modern software interfaces dominated by flat, sterile grey planes or loud commercial gamification, Horizon crafts a physical desk feeling. Interactive surfaces possess soft tangible mass, tactile recessed wells hold study materials, and delicate hairline perimeter traces ground each element in physical space.

The aesthetic blends editorial typographic prestige with refined tactile neumorphism. Academic serif headlines evoke library volumes and textbook clarity, while cushioned pill controls and smooth dual-cast shadows provide tactile confidence. The palette is calm and light-absorbing, allowing secondary school students to focus on dense NCERT/CBSE chapter texts and past-year exam questions for hours without visual strain.

Confirmed visual anti-references are permanently rejected: no loud promotional banners, no flashing gamification badges or confetti animations, no intrusive popup paywalls, and no harsh pure-black borders.

**Key Characteristics:**
- Physical dual-direction neumorphism with balanced raised and recessed planes.
- Editorial typographic pairing blending `Instrument Serif` prestige with `Playfair Display` structural titles and `Roboto` functional clarity.
- Low-contrast, glare-free paper tones with rare, high-intent magenta accents.
- Strict keyboard accessibility with dedicated `focus-visible` ring precision.

## Colors

The color palette reflects natural paper and ink, punctuated by an energetic editorial accent reserved strictly for intent and focus.

### Primary
- **Editorial Magenta** (`#e91e8c`): The primary brand accent and focus indicator. Used sparingly for keyboard navigation focus rings (`focus-visible:ring-2 focus-visible:ring-[#E91E8C]`), active navigation states, and key interactive triggers. Paired with **Deep Plum** (`#c2185b`) and **Dark Wine** (`#8b0a50`) in linear gradients for editorial title emphasis and vector icons.

### Neutral
- **Linen Paper** (`#f4f4f4`): The foundational desk base surface (`--bg-base`). A soft, matte neutral that eliminates harsh screen glare during extended reading sessions.
- **Studio Porcelain** (`#fafafa`): The raised surface background (`--bg-raised`). Used on elevated cards, buttons, and top navigation pills.
- **Recessed Well** (`#fdfdfd`): The recessed surface background (`--bg-recessed`). Used for document preview containers, inset wells, and card thumbnail frames.
- **Deep Ink** (`#111111`): The primary text and iconography color. High-contrast, rich charcoal ensuring comfortable legibility across all surfaces.
- **Muted Graphite** (`#6b7280`): Secondary metadata, timestamps, and descriptive subtitles.
- **Delicate Trace** (`rgba(255,255,255,0.8)` & `rgba(0,0,0,0.15)`): 1px hairline boundary traces delivering physical edge definition on raised and recessed components.

### Named Rules
**The Rare Accent Doctrine.** Editorial Magenta (`#e91e8c`) is strictly restricted to ≤10% of any given viewport. Its power comes from restraint; when everything calls for attention, nothing receives it. It is reserved for keyboard focus rings, active filters, and primary conversion triggers.

**The Dual-Trace Doctrine.** Every raised card and button must feature an outer boundary trace (`rgba(0,0,0,0.15)`) coupled with an opposing inner highlight trace (`rgba(255,255,255,0.95)`). Physical surfaces never end abruptly in a CSS border without lighting cues.

## Typography

**Display Font:** `Instrument Serif` (with fallback `serif`)
**Body Font:** `Playfair Display` (with fallback `serif`)
**Label/Mono Font:** `Roboto` (with fallback `sans-serif`)

**Character:** A distinguished, academic literary pairing. `Instrument Serif` delivers expressive, slanted humanistic elegance to hero statements, while `Playfair Display` brings sturdy, authoritative structure to chapter headings and subject cards. `Roboto` provides clean, neutral utility for dense tabular metadata and UI controls.

### Hierarchy
- **Display** (weight: 400, size: `clamp(2.8rem, 8vw, 6rem)`, line-height: 0.95, letter-spacing: -2px): Hero section titles and major landmark statements.
- **Headline** (weight: 700, size: 48px, line-height: 1.1): Major section headings (`h1`) and primary directory pages.
- **Title** (weight: 700, size: 32px, line-height: 1.2): Subject titles, syllabus module headers, and modal dialog names.
- **Body** (weight: 400, size: 16px, line-height: 1.6): Narrative explanatory text, study tips, and chapter descriptions. Line length capped at 65–75ch for optimal reading comfort.
- **Label** (weight: 600, size: 12px, line-height: 1.5, letter-spacing: 0.1em, uppercase): Metadata chips, class tags, and table headers.

### Named Rules
**The Editorial Em Rule.** Italicized emphasis spans (`<em>`) in display headings use the Editorial Magenta gradient (`linear-gradient(to bottom right, #E91E8C, #C2185B, #8B0A50)`) with `-webkit-background-clip: text` and generous right padding (`0.15em`) to prevent italic glyph clipping.

## Layout

Horizon utilizes a centered, fluid spatial model with a maximum content container of 1200px (80rem for headers).

- **Grid & Rhythm**: Multi-column responsive grids (1-column on mobile <640px, 2-column on tablet 640px–1024px, 3-to-4 column on desktop >1024px).
- **Spacing Scale**: Strict multiples of 8px (`--spacing-1: 8px`, `--spacing-2: 16px`, `--spacing-3: 24px`, `--spacing-4: 32px`, `--spacing-5: 48px`, `--spacing-6: 64px`).
- **Responsive Padding**: Full-bleed content on small mobile viewports with tight 12px padding; expanding to 32px (2rem) margin gutters on tablet and desktop.
- **Density**: Moderate-to-high density on curriculum trees and PDF navigation; expansive, breathable density on landing and dashboard overviews.

## Elevation & Depth

Horizon rejects flat design in favor of physical dual-direction neumorphism. Depth is created through bilateral light sourcing: a soft dark shadow cast to the bottom-right paired with a crisp white highlight cast to the top-left.

### Shadow Vocabulary
- **Raised Structural Surface** (`box-shadow: 0 0 0 1px rgba(0,0,0,0.15), 8px 10px 20px rgba(0,0,0,0.10), 2px 3px 6px rgba(0,0,0,0.06), -4px -4px 10px rgba(255,255,255,0.95)`): Applied to cards, floating toolbars, and primary navigation bars.
- **Raised Interactive Hover** (`box-shadow: 0 0 0 1px rgba(233,30,140,0.15), 12px 14px 28px rgba(233,30,140,0.12), 4px 6px 10px rgba(233,30,140,0.08), -6px -6px 14px rgba(255,255,255,0.98)`): Elevates cards and pills upon hover, shifting their ambient glow toward subtle magenta.
- **Recessed Well** (`box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15), inset 3px 3px 8px rgba(0,0,0,0.08), inset -3px -3px 8px rgba(255,255,255,0.95)`): Creates an engraved or carved recess for image thumbnails, search input wells, and document display canvases.
- **Subtle Ambient Nav** (`box-shadow: 0 8px 32px rgba(0,0,0,0.04)`): Floating navigation bars and modal overlays.

### Named Rules
**The Inset Companion Rule.** Every major raised card (`.neu-card`) must contain an internal recessed child container or well (`.neu-recessed`) with a 4px inset buffer to create physical depth equilibrium.

## Shapes

- **Corner Strategy**: Continuous smooth curvature matching element scale:
  - Small badges & buttons: 6px radius (`--radius-sm`).
  - Inputs & dropdowns: 12px radius (`--radius-md`).
  - Cards & dialogs: 16px to 24px radius (`--radius-lg` / `--radius-xl`).
  - Interactive navigation pills & action buttons: Full rounded capsule (`--radius-full`, 9999px).
- **Hairline Borders**: Delicate 1px boundaries (`rgba(0,0,0,0.03)` or `rgba(255,255,255,0.8)`) applied on top of neumorphic shadows to ensure separation on uncalibrated mobile screens.

## Components

### Buttons
- **Shape:** Full rounded capsule (9999px) for primary action pills; 6px rounded rectangle for compact resource card actions.
- **Primary:** Background Studio Porcelain (`#fafafa`), text Deep Ink (`#111111`), padding `0 16px`, height 40px (`--spacing-10`).
- **Hover / Focus:** Hover translates up by 3px (`transform: translateY(-3px)`) with magenta-tinted shadow glow. Focus displays a high-contrast ring (`focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2`). Mouse clicks never trigger focus rings.
- **Compact Card Button:** Small pill or tile (`.neu-raised-sm`), padding `6px 8px`, 11px font size with bold weight.

### Chips
- **Style:** Capsule shape with subtle recessed or raised well, text in Deep Ink, uppercase 12px label typography.
- **State:** Selected chip switches to recessed active state with a delicate magenta border highlight; unselected chips remain raised porcelain.

### Cards / Containers
- **Corner Style:** 16px to 24px radius (`rounded-xl`).
- **Background:** Raised porcelain (`#fafafa`) with an inner 4px recessed canvas (`#fdfdfd`).
- **Shadow Strategy:** Dual-direction structural shadow with outer trace.
- **Internal Padding:** 14px internal guttering (`p-[14px]`).

### Inputs / Fields
- **Style:** Recessed well (`.neu-recessed`), padding `12px 16px`, text Deep Ink, placeholder text Muted Graphite.
- **Focus:** Sharp `focus-visible:ring-2 focus-visible:ring-[#E91E8C]` with 2px offset.
- **Disabled State:** Disabled controls display reduced opacity (0.5), `cursor-not-allowed`, and explicit `aria-disabled="true"`.

### Navigation
- **Style:** Floating capsule pill group (`.navGroup`) with individual pill links.
- **States:** Default links are transparent with Deep Ink text; hover and active links gain subtle scale and contrast without layout shift.
- **Mobile Menu:** Full-screen modal overlay with blur backdrop and slide-down raised neumorphic panel containing categorized navigation blocks.

### Signature Component: PDF Document Reader & Floating Action Cluster
- **Description:** A distraction-free full-bleed PDF viewer featuring floating tactile action pills (page zoom, fit-to-width, chapter drawer toggle) and an accessible WAI-ARIA slider scrubber (`role="slider"`, `aria-valuetext="Page X of Y"`).
- **Styling:** Floating controls use `.neu-raised` capsules positioned over the canvas with `focus-visible:ring-2 focus-visible:ring-[#E91E8C]`.

## Do's and Don'ts

### Do:
- **Do** wrap all interactive custom buttons and links with `focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2` rather than generic `focus:ring`.
- **Do** maintain the 10% maximum surface limit on Editorial Magenta accents to keep student focus centered on reading material.
- **Do** pair raised containers with internal recessed wells to preserve the physical desk metaphor.
- **Do** provide explicit WAI-ARIA roles, attributes (`role="listbox"`, `role="slider"`, `role="dialog"`), and `aria-hidden="true"` on decorative SVG icons.
- **Do** use `Instrument Serif` strictly for display heroes and section highlights, relying on `Playfair Display` for structural titles.

### Don't:
- **Don't** use solid pure-black `#000000` borders or harsh flat box-shadows.
- **Don't** add promotional banners, gamified point popups, countdown timers, or confetti animations to educational surfaces.
- **Don't** use generic cold blue SaaS accents; Horizon's identity is grounded in warm paper neutrals and Editorial Magenta.
- **Don't** trigger focus rings on pointer/mouse clicks; always isolate keyboard focus with `:focus-visible`.
- **Don't** apply decorative icons without `aria-hidden="true"` or icon-only buttons without `aria-label` and matching `title`.
