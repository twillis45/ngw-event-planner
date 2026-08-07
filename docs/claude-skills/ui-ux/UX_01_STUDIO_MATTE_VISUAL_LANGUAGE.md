# UX_01 — Studio Matte Visual Language

The visual system for NGW Event Planner. Every surface, component, and pixel must conform to these rules. No exceptions, no "creative" overrides, no freestyle.

## Design DNA

Studio Matte = dark premium matte surfaces + editorial hierarchy + operational density + calibrated signal color.

It is not a dark theme slapped on Bootstrap. It is not neon-on-black. It is not a generic SaaS dark mode. It is a purpose-built production-board aesthetic for planners who run high-stakes events.

## Surface Palette (Exact Rules)

### Background Layers

| Layer | Token | Purpose | Rule |
|---|---|---|---|
| Canvas | `C.bg` | Page-level background | Deepest surface. Never place content directly on canvas without a container. |
| Card / Panel | `C.card` | Content container surface | One step lighter than canvas. All information lives inside cards or panels. |
| Elevated | `C.cardHover` or 1-2% lighter | Hover states, active selections, flyouts | Never more than 2 steps above canvas. |
| Input | `C.inputBg` | Form fields, text areas, search bars | Recessed into the card. Darker than card surface. |

### Rule: Maximum 3 surface layers visible in any single view

If you can count 4+ distinct background shades in a screenshot, something is wrong. Flatten it.

### Rule: No white backgrounds anywhere

Not on modals, not on popovers, not on tooltips, not on form fields. Studio Matte is dark-on-dark. The lightest surface is `C.card` (charcoal), never white, never light gray.

## Typography System

### Font Stack

Primary: system sans-serif (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).

No custom web fonts until performance budget allows it. No serif fonts. No monospace for UI labels.

### Type Scale (Operational Rules)

| Role | Size | Weight | Tracking | When to Use |
|---|---|---|---|---|
| Page title | 20-24px | 700 | -0.3px | One per page. L1/L2 level headings only. |
| Section title | 15-17px | 600 | -0.2px | Card headers, panel titles, zone labels. Max 4-6 per viewport. |
| Body / row primary | 13-14px | 500-600 | 0 | Event names, vendor names, client names. The thing the user reads first in a row. |
| Body secondary | 12-13px | 400 | 0 | Dates, types, secondary metadata. |
| Caption / label | 10-11px | 500-600 | 0.5px uppercase | Status chips, column headers, section overlines. Uppercase + tracking = small-but-readable. |
| Stat number | 22-28px | 700 | -0.5px | Stat cards only. Never more than 4-6 stat numbers visible without scrolling. |

### Rule: Never use font-size below 10px

Nothing in the app renders below 10px. If it doesn't fit at 10px, the container is too small — fix the layout, not the font.

### Rule: Page title appears exactly once

If a viewport shows two elements styled as page titles (20px+ bold), one of them is wrong. Fix hierarchy.

### Rule: Weight communicates scannability, not importance

Bold (600-700) = "read this first when scanning." Regular (400) = "read this after you've found the row you want." Do not bold everything. Do not bold nothing.

## Spacing System

### Base Unit: 4px grid

All spacing values must be multiples of 4: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

No 5px. No 7px. No 15px. No 18px. No 25px. If your spacing isn't a multiple of 4, fix it.

### Density Rules

| Context | Padding | Gap |
|---|---|---|
| Page wrapper (mobile) | 12-16px | — |
| Page wrapper (tablet) | 16-20px | — |
| Page wrapper (desktop) | 20-24px | — |
| Card internal | 12-16px | 8-12px between sections |
| Row item (list) | 10-12px vertical, 12-16px horizontal | 8px between inline elements |
| Stat card | 12-16px | 4-8px label-to-number |
| Chip / pill | 4-6px vertical, 8-12px horizontal | — |

### Rule: Desktop is denser, not wider

When you have more horizontal space, add more columns and show more data. Do not just add padding. 1440px desktop should feel like a production control board — dense, scannable, efficient. Not a mobile layout stretched to fill whitespace.

### Rule: Never exceed 40px gap between sibling cards

If two adjacent cards have 40px+ of empty space between them, the layout is too loose. Tighten it.

### Rule: The void budget is absolute above the phone, and it bounds both axes

(Board, 2026-08-07.) The rule above governs the gap *between two siblings*. It says nothing about a large empty **region**, and that is where this product was losing.

The minimalist budget — one loud thing per screen, roughly 45% deliberate emptiness — was calibrated on a 393×852 phone: about **150,000 px²**, and at that size it reads as composure. Held as a percentage it becomes **2.5× that area on a 1280×654 laptop and 6.2× at 1920×1080.** Emptiness does not scale as a feeling. Six times the void is not six times the calm; it is an unfinished page.

- **The proportional budget applies to the phone tier only.** It also survives *inside the hero's own band* at every size — the hero's air is what makes this product not a CRM template, and this rule is not licence to fill it.
- **At tablet and above the budget is absolute and applies on BOTH axes:** no contiguous empty region exceeding **200px in height or 320px in width** within the content canvas. Height alone does not catch it — the worst void found on the command surface was 418px *wide*.
- **The governing principle: void must be bounded by content on at least two sides.** Unbounded void running to a canvas edge is not composition.

**Before theorising about a void, grep the literal numbers in the min-heights.** The 264px of dead air on this product's command surface was not a design choice at all: `.hero{ min-height:calc(852px - 64px - 88px) }` reserved 700px — *an iPhone viewport minus its chrome* — at every width. A phone frame nailed into a desktop composition looks exactly like a deliberate budget and is not one.

## Border and Divider Rules

### Borders

- Card borders: `1px solid ${C.border}` — subtle, structural.
- Input borders: `1px solid ${C.border}` — visible but not dominant.
- Active/selected borders: `2px solid ${C.accent}` — reserved for active states only.

### Rule: No thick borders

Maximum border width is 2px, and only for active/selected states. No 3px, 4px, or "boxed" UI.

### Dividers

- Horizontal dividers between list items: `1px solid ${C.border}` at ~0.5 opacity.
- Section dividers inside cards: borderBottom on the section header, not a standalone `<hr>`.
- No vertical dividers between columns. Use spacing to separate columns.

## Border Radius

| Element | Radius |
|---|---|
| Cards, panels, modals | 8-12px |
| Buttons | 6-8px |
| Chips / pills | 12-16px (pill shape) |
| Inputs | 6-8px |
| Avatars / thumbnails | 50% (circle) |

### Rule: Consistent radius within a view

If cards are 10px radius, all cards in that view are 10px radius. Do not mix 8px and 12px cards in the same screen.

## Shadow and Elevation

Studio Matte does not use heavy shadows.

### Rules

- No `box-shadow` on cards unless they are overlays (modals, dropdowns, tooltips).
- Cards are differentiated by background color, not shadow. Card sits on canvas = color step. Not shadow.
- Modals and flyouts: `0 8px 32px rgba(0,0,0,0.5)` — one shadow level for all overlays.
- No multiple shadow levels. No "shadow-sm", "shadow-md", "shadow-lg" scale. One level: "overlay."

## Icon Rules

- Size: 14-18px for inline icons, 20-24px for standalone action buttons.
- Color: `C.muted` for decorative, `C.fg` for actionable, status color for status indicators.
- No colored icons that don't mean something. An icon is either muted (structural) or colored (semantic).
- No icon-only buttons without `aria-label`. If there's no text label, there must be an aria-label.

## Animation and Transition Rules

- Hover transitions: `150ms ease` on background-color and opacity only.
- No spring physics. No bounce. No slide-in. No fade-in on page load.
- Tab changes: instant. No crossfade, no slide.
- Modal open: instant or 150ms fade. No slide-up. No scale-in.
- Loading states: pulse/shimmer on skeleton shapes. No spinning logos. No "fun" loading animations.

## The 5-Second Test

When you finish building a surface, mentally run the 5-second test:

1. Can the user identify what this screen is for in under 5 seconds?
2. Can they find the primary action in under 5 seconds?
3. Does it look like a premium production tool, or a generic dashboard?

If the answer to any question is no, the surface needs work before shipping.
