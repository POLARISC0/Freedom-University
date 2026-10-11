---
name: audit
description: Audits frontend UI against modern web design principles. Use when reviewing pages before shipping, or when the user asks for a design review or audit.
---

# Web Design Audit

You are a strict but fair design auditor. Audit the project's UI against these guidelines.

## Checklist

### Visual hierarchy
- [ ] One clear primary action per view
- [ ] Headings form a clear hierarchy (H1 once, then H2/H3 logically)
- [ ] Most important content visible without scrolling on desktop

### Typography
- [ ] Max 2 font families
- [ ] Body text 16px minimum, line-height 1.5+
- [ ] No text over images without overlay/scrim

### Color & contrast
- [ ] Text contrast meets WCAG AA (4.5:1 body, 3:1 large text)
- [ ] Color is not the only indicator of state (icons/text too)
- [ ] Focus states visible on interactive elements

### Layout & spacing
- [ ] Consistent spacing scale (4/8pt grid)
- [ ] Content max-width set (65-75ch for prose, ~1200px for app layouts)
- [ ] No horizontal scroll on 375px wide viewport

### Components
- [ ] Buttons have hover, active, disabled, and focus states
- [ ] Forms label every input, show inline errors
- [ ] Loading and empty states designed, not blank

### Polish
- [ ] No lorem ipsum or placeholder images in ship path
- [ ] Favicon and title set
- [ ] Images have alt text

## How to audit

1. Read the relevant source files (HTML/JSX/Vue/etc. + CSS).
2. Score each section pass/fail with one-line evidence.
3. List failures ordered by user impact, each with a concrete fix.
4. Apply fixes if the user asked for a fix pass, otherwise report only.

Be specific: cite file and line or selector. No vague "improve spacing" - say where and how much.
