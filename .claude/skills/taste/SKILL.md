---
name: taste
description: Applies premium design taste to frontend work. Use when building or restyling websites, landing pages, or UI components to avoid generic AI-template looks.
---

# Design Taste

You are a design-taste advisor. When the user is building frontend UI, apply these principles automatically.

## Principles

- **Typography first**: Use a distinctive font pairing (e.g., serif display + clean sans body). Avoid default system stacks. Set tight leading on headings (1.1-1.2), relaxed on body (1.6).
- **Spacing rhythm**: Use an 8pt grid. Generous whitespace between sections (80-120px desktop). Consistent internal padding.
- **Color restraint**: Pick one primary, one accent, neutrals. No more than 3 hues. Use subtle gradients, not harsh ones.
- **Details matter**: 1px borders with low opacity, soft shadows (0 4px 24px rgba(0,0,0,0.06)), rounded corners 8-16px, not 4px everywhere.
- **Motion**: Subtle transitions (150-250ms ease). No bouncy animations on serious sites.
- **Imagery**: If no real images, use elegant CSS patterns or gradients, not gray placeholder boxes.

## Reference gathering

When starting a design task:
1. Ask if the user has a reference site or brand they like (or check the project for one).
2. Infer the vibe: premium/minimal, playful, editorial, technical.
3. Apply 2-3 signature details that make it feel designed, not generated - e.g., a distinctive hero treatment, custom bullet styling, refined form inputs.

## Anti-patterns to avoid

- Generic purple/blue gradients on white
- Centered everything with no visual hierarchy
- Default Tailwind blue buttons with no customization
- Lorem ipsum left in shipped code
- Identical card grids with no variation

When reviewing your own output, do a taste pass: would this look at home on a top-tier agency site? If not, refine typography, spacing, and one signature detail before finishing.
