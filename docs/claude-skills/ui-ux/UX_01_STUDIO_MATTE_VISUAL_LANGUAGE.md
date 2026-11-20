# UX_01 — Studio Matte Visual Language

The visual system for NGW Event Planner. Every surface, component, and pixel must conform to these rules. No exceptions, no "creative" overrides, no freestyle.

## Design DNA

Studio Matte = dark premium matte surfaces + editorial hierarchy + operational density + calibrated signal color.

It is not a dark theme slapped on Bootstrap. It is not neon-on-black. It is not a generic SaaS dark mode. It is a purpose-built production-board aesthetic for planners who run high-stakes events.

## Surface Palette (Exact Rules)

### Background Layers

| Layer | Token | Purpose | Rule |
|---|---|---|---|
| Canvas | `C.bg` + `--canvas-glow` | Page-level background | Deepest surface. Never place content directly on canvas without a container. The canvas carries one steel glow from the top of the screen, a single token (`--canvas-glow`) sized to the screen height. Sheets and pages let it read through; only dense lists and tables sit on a flat panel for readability. (Owner ruling 11/20/2026; see 02 § Canvas glow.) |
| Card / Panel | `C.card` | Content container surface | One step lighter than canvas. All information lives inside cards or panels. |
| Elevated | `C.cardHover` or 1-2% lighter | Hover states, active selections, flyouts | Never more than 2 steps above canvas. |
| Input | `C.inputBg` | Form fields, text areas, search bars | Recessed into the card. Darker than card surface. |

### Rule: Maximum 3 surface layers visible in any single view

If you can count 4+ distinct background shades in a screenshot, something is wrong. Flatten it.

### Rule: No white backgrounds anywhere

Not on modals, not on popovers, not on tooltips, not on form fields. Studio Matte is dark-on-dark. The lightest surface is `C.card` (charcoal), never white, never light gray.

## Typography System

### Font Stack

*Owner ruling, 11/20/2026. Supersedes "system sans-serif primary" and the app repo's "no custom web fonts, no serif fonts."*

Primary: **Inter**, for everything that is read or tapped — controls, body, and numbers.

Accent serif: **Playfair Display** (`var(--serif)`) is an accent only. It is legal for exactly three jobs:

- italic "why" / rationale lines,
- invite and email card titles,
- display headings at 15px or larger.

It never appears on buttons, on inputs, or on any text under 15px. No monospace for UI labels.

(Code gap, recorded rather than resolved: `--sans` in `hostv2/src/styles.css` still resolves to the system stack and hostv2 does not load Inter, and the italic guide-voice lines currently set in Newsreader via `--serif-read`. The CSS lands in a later batch.)

### Type Scale (Operational Rules)

Scope: this scale is the HOST app (V2) standard — "modern, leaning larger, meant for mobile."

| Role | Size | Tokens | Weight | Tracking | When to Use |
|---|---|---|---|---|---|
| Display (serif) | clamp 30-48px | `--t-display-xl` clamp(36px,11cqw,48px), `--t-display-l` clamp(30px,9.5cqw,40px) | 800 | -0.015em | Playfair Display. Hero/welcome/reveal/after moments and invite name. One per screen. |
| Page title | 22-26px | `--t-section` 22px (day-of "now" headline 26px is a listed literal exception) | 700 | -0.3px | One per page. L1/L2 level headings only. |
| Section title | 17-19px | `--t-section` 22px section heads, `--t-card-title` 19px, `--t-sheet-title` 18px, `--t-sub` 17px | 600 | -0.2px | Card headers 19px, section heads 22px, panel titles, zone labels. Max 4-6 per viewport. |
| Body / row primary | 15.5-16px | `--t-row` 16px, `--t-body` 15.5px, `--t-body-s` 15px, `--t-cta` 15px, `--t-cta-big` 17px, `--t-input` 16px, `--t-input-lg` 17px | 500-600 | 0 | Event names, vendor names, row leads, running prose. The thing the user reads first in a row. |
| Body secondary | 13.5-14px | `--t-row-sub` 13.5px, `--t-meta` 14px, `--t-chip` 14px, `--t-toast` 14px, `--t-btn` 13.5px, `--t-pill` 13px, `--t-note` 13px | 400 | 0 | Dates, types, secondary metadata, row sub-lines. |
| Caption / label | 11-12px | `--t-tag` 12px, `--t-overline` 12px, `--t-caption` 11.5px, `--t-caption-min` 11px | 500-600 | 0.5px uppercase | Status chips, column headers, section overlines. Uppercase + tracking = small-but-readable. |
| Stat number | 24-38px | `--t-hero-star` 38px, `--t-stat` 38px, `--t-stat-sm` 24px | 700-800 | -0.5px | Stat cards only. Never more than 4-6 stat numbers visible without scrolling. |

Body line-height token: `--lh-body` 1.5.

### Rule: Type is tokenized — consume the tokens

The scale above lives as CSS custom properties in `demo/hostv2/src/styles.css`'s `:root` block — the single type source. New type in the host app consumes a `--t-*` token; a raw px font-size is a review flag. Deliberate literal exceptions (invite stationery engraving tiers, the print day sheet, the `.mega`/`.clock`/create-prompt display clamps, monogram badge glyphs, the brand wordmark) are annotated at their selectors.

### Rule: Never use font-size below 11px — and 12px for anything that carries meaning

*Owner ruling, 11/20/2026. Supersedes the app repo's 10px floor.*

Nothing in the app renders below 11px. If it doesn't fit at 11px, the container is too small — fix the layout, not the font.

Anything that carries meaning — a status, a price, a date — renders at 12px or larger. 11px (`--t-caption-min`) is legal only for uppercase labels and fine print. The Caption / label row above spans both: an 11–11.5px caption that states a status, price, or date is under the floor.

### Rule: No form input below 16px

Every input, textarea, and select renders at 16px or larger. iOS Safari auto-zooms the viewport on focus of any control below 16px, and the zoom-jump reads as a bug. Widen or wrap the row instead of shrinking the field.

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
| Page wrapper (mobile) | 20px (shipped: `.content` inline padding `--sp-5`; resolved by code 11/20/2026) | — |
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

- **The proportional budget applies to the phone tier only.** It also survives *inside the hero's own band* at every size — the hero's air is what makes this product not a CRM template, and this rule is not license to fill it.
- **At tablet and above the budget is absolute and applies on BOTH axes:** no contiguous empty region exceeding **200px in height or 320px in width** within the content canvas. Height alone does not catch it — the worst void found on the command surface was 418px *wide*.
- **The governing principle: void must be bounded by content on at least two sides.** Unbounded void running to a canvas edge is not composition.

**Before theorizing about a void, grep the literal numbers in the min-heights.** The 264px of dead air on this product's command surface was not a design choice at all: `.hero{ min-height:calc(852px - 64px - 88px) }` reserved 700px — *an iPhone viewport minus its chrome* — at every width. A phone frame nailed into a desktop composition looks exactly like a deliberate budget and is not one.

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
| Buttons | 12px (`--r-md`, small utility `.mini`), 14px (`--r-row`, the `.cta` family), or pill (`--r-pill`) — resolved by code 11/20/2026 |
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
