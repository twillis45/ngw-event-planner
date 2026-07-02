# Glyph Standard — Single Source of Truth

_Standing rule for every event identity mark (glyph) in NGW Event Boss. Established 2026-07-01._

## The rule
An event's glyph is decided in **one** place and rendered by **one** component. No surface re-derives
the icon, hardcodes an emoji/icon/shape, or picks its own rendering. This is why the mark on the
invite is the same mark carried through the whole app.

## The two primitives
1. **`eventGlyph(event, C)`** (`src/App.js`) — THE resolver. Returns `{ icon, hue, color, sacred, flag, mark }`.
   Reads a persisted **`event.glyph`** override first, else derives from type via `evtIdentity` →
   `EVT_IDENT`. `color` is an alias of `hue` so it's a drop-in for old `evtIdentity` callers.
2. **`<EventGlyph icon hue size variant sacred quiet/>`** (`src/App.js`) — THE renderer. One identity,
   fidelity chosen by size/variant:
   - `variant="hero"` (large, colored) → **SacredMark** for sacred marks, else the **glass** volume (`GlassIcon`).
   - `variant="mono"` (small/badge) → the **same shape**, flat + authored colors via `monoSvg`
     (`src/glassIcons.js`) — a clean silhouette that DROPS the crowded flame/leg detail strokes at small
     size. **Never** the generic flat-icon spark.
   - `variant="auto"` → hero at ≥44px, mono below.
   - `quiet` (somber events, e.g. Repast) → a muted flat mark, never a colored volume.

## Non-negotiables
- **Never** render an event glyph with a raw `<Icon name={ident.icon}>`, `<GlassIcon>`, `<SacredMark>`,
  or an emoji directly on a surface. Always `<EventGlyph>`.
- **Never** compute identity with a fresh `evtIdentity(...)` when the full `event` is available — use
  `eventGlyph(event, C)` so a persisted override is honored.
- Small/badge spots get the **mono silhouette**, not the glass volume (glass = hero-only, and it reads
  crowded/muddy below ~40px). Colored glass stays a hero treatment.
- A **new event type MUST ship** `{ identity icon in EVT_IDENT + hue + a GLASS_SHAPES entry }`. A type
  without a glass shape falls back to a generic mark — which the standard forbids.

## The guardrail
`src/glassIcons.test.js` asserts every event-identity icon has a glass shape and every shape renders a
valid hero + mono SVG. If you add a type/icon, add its shape or the test fails.

## Persistence ("created for the RSVP → carried throughout")
Set `event.glyph = { icon?, hue?, sacred? }` to override the type-derived mark for a specific event.
Because every surface resolves through `eventGlyph(event, C)`, that choice is carried everywhere —
invite, command header, plan, day-of — from the one stored value.
