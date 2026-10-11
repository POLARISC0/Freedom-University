---
name: design-system
description: Complete design system with tokens and component patterns. Use when starting a new frontend project or when the user wants consistent styling across pages.
---

# Awesome Design System

Use these tokens and patterns as the default for new frontend work. Adapt the primary hue to the project's brand, keep the scales.

## Color tokens

```css
:root {
  --color-primary-50: #eef4ff;
  --color-primary-100: #dbe6fe;
  --color-primary-500: #3b5bff;  /* adapt hue per brand */
  --color-primary-600: #2743d6;
  --color-primary-700: #1e34ad;
  --neutral-50: #f8fafc;
  --neutral-100: #f1f5f9;
  --neutral-200: #e2e8f0;
  --neutral-600: #475569;
  --neutral-900: #0f172a;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
}
```

Dark mode: swap neutrals (bg #0f172a, surface #1e293b, text #f8fafc).

## Typography scale

- Display: 48/56, 40/48, 32/40 - semibold, letter-spacing -0.02em
- Heading: 24/32, 20/28, 18/26 - semibold
- Body: 16/26, 14/22 - regular
- Caption: 12/18 - medium, uppercase for labels with 0.08em tracking

Font pairing default: "Inter" body + "Sora" or serif display ("Newsreader") for marketing pages.

## Spacing scale (8pt)

`4, 8, 12, 16, 24, 32, 48, 64, 96, 128` - section gaps 64-96 desktop, 48 mobile.

## Radii & shadows

- radii: sm 6px, md 10px, lg 16px, pill 999px
- shadow-sm: 0 1px 2px rgba(16,24,40,.06)
- shadow-md: 0 4px 16px rgba(16,24,40,.08)
- shadow-lg: 0 12px 32px rgba(16,24,40,.12)

## Components

### Button
- Primary: bg primary-600, white text, radius md, padding 12x20, font 14 semibold. Hover: primary-700 + translateY(-1px). Focus: 3px ring primary-100.
- Secondary: white bg, 1px neutral-200 border, neutral-900 text. Hover: neutral-50 bg.
- Sizes: sm (8x14, 13px), md (12x20, 14px), lg (16x28, 16px).
- Disabled: 50% opacity, no pointer events.

### Card
- White surface, 1px neutral-200 border (or none + shadow-md), radius lg, padding 24. Hover lift only when clickable.

### Input
- Height 44px, radius md, 1px neutral-200 border, padding 0 14, 14px font. Focus: 2px primary-500 border + 3px primary-100 ring. Error: danger border + message below in 13px danger.

### Badge
- Pill, 12px medium, padding 4x10. Variants: neutral, primary, success, warning, danger with 50-bg/700-text.

## Page patterns

- Hero: eyebrow badge + 48px display heading + 18px subcopy (neutral-600) + dual CTA + social proof row.
- Section header: eyebrow (12px uppercase primary-600) + 32px heading + 16px subcopy, centered or left with max-w-2xl.
- Feature grid: 3 cols desktop, icon in 40px rounded primary-50 tile, 18px title, 14px neutral-600 description.
