# design-sync notes — ngw-event-boss

## Repo shape

- **Not a library repo.** `demo/` is a CRA app; the design system lives at
  `src/design/` and was consumed only internally. A library build was added for
  this sync — `npm run design:build` → `dist-design/{index.mjs,index.cjs,index.d.ts,tokens.css}`
  via `scripts/build-design-lib.mjs` (esbuild, React external).
- `package.json` `main`/`module`/`types`/`exports` point at `dist-design/`.
  **Without those the converter reports `[ZERO_MATCH]`** — it finds no entry
  and no types. This cost one wasted build; the fields are load-bearing.
- **No TypeScript anywhere.** `index.d.ts` is hand-written inside
  `build-design-lib.mjs`, not extracted.

## Gotchas that cost a cycle

- **`[ZERO_MATCH]` means the entry isn't declared**, not that components are
  missing. Check `package.json` entry fields before anything else.
- **The default `guidelinesGlob` is wrong here.** `docs/*.md` swept 42 files —
  implementation reports, audits, a Supabase troubleshooting handoff — and
  would have fed them to the design agent as *design guidance*. Pinned to
  `docs/claude-skills/*.md` + `docs/claude-skills/ui-ux/*.md` (21 real files).
- **The `.d.ts` enums must be read from each component's own map.** Three were
  wrong on the first pass because they were inferred from `EscalationContext`'s
  `LEVELS`: `Text.variant`, `AlertBanner.severity`, `EscalationBadge.status`.
  Now guarded by `scripts/check-design-dts.mjs`, wired into `design:build`.
  A wrong enum fails **silently** — the component falls through to its default.

## The dark-canvas problem (affects every preview)

Studio Matte is a **dark** system: `color.text.primary` is `#e8edf2` because it
assumes a carbon ground. The preview card scaffold hardcodes
`body{background:#fff}` in an inline `<style>` that beats the linked
stylesheet, so the first pass rendered near-white text on white — only the
steel-toned roles survived.

**Two fixes, both needed, for different consumers:**

1. `dist-design/tokens.css` (generated from the tokens, `cfg.cssEntry` points
   at it) sets the canvas on `html, body` and exposes 73 `--ngw-*` custom
   properties. This is what **rendered designs** get, and it is why they land
   on the right ground. It also fixes `[CSS_RUNTIME]`.
2. **Every preview wraps its content in a local `Canvas`** using
   `color.surface.canvas`. The scaffold's inline style wins over `styles.css`,
   so the card cannot be fixed from CSS — the content must bring its own
   ground. Do NOT fork `lib/emit.mjs` to change this; the skill forbids it and
   it is the output contract with the app's self-check.

**Every new preview must use the `Canvas` wrapper.** A preview without it
renders effectively blank and grades `needs-work` for a reason that has
nothing to do with the component.

## Provider

`cfg.provider` nests `EscalationProvider` → `DensityProvider`. Button and
AlertBanner read escalation; Surface reads density. The providers are exported
from the barrel (added 2026-08-18) precisely so consumers can wrap.

To show escalation-dependent behavior *inside* a cell, nest a second
`EscalationProvider initialLevel="escalated"` — see `Button.tsx`
`EscalationContextShift`, which is the clearest cell in the set.

## Per-component notes (folded from wave 1)

### Surface
- **`pad` is a space-scale KEY (0-12), not pixels.** `pad={5}` is the default
  card. Single most likely misuse.
- `role` drives fill *and* shadow through `surfaceFor(role, density)`.
  `escalation` also swaps the border to `color.status.risk` — border color is
  not independently settable.
- `DensityProvider` takes **`override`**, not `density` or `initialLevel`
  (that last one is `EscalationProvider`). `DensityProvider` calls
  `useEscalation()`, so it must sit *inside* an `EscalationProvider` — the
  config's provider nesting already supplies that.

### BottomSheet
- **The Canvas rule inverts for overlays.** It is `position: fixed; inset: 0`,
  so it covers the viewport rather than sitting in a card. Its local ground
  must be a full-viewport screen (`minHeight: 100vh`) with plausible host
  content behind — otherwise the 55% scrim sits on flat black and the sheet's
  elevation is invisible.
- Renders correctly inside the card with `cardMode:"single"` + `420x560`.
  No `skip` needed.
- **At 420px, two buttons side by side need short labels.** "Open the dock"
  wraps in a `size="sm"`; "Open dock" fits.
- `color.surface.raised` **does not exist**. Roles are
  `canvas / base / card / elevated / interactive / strong / overlay / dim`.

## Design-system findings worth a decision (not preview defects)

These came out of authoring and are about the tokens, not the cards.

- **`elevation.base` is at the visual threshold on carbon.**
  `0 1px 3px rgba(0,0,0,0.30)` over canvas RGB 20,21,24 peaks at a ~4-5/255
  delta. Measured, not eyeballed: full density darkens the gap below a card to
  16,16,19; crisis density stays flat at 20,21,24; `active` keeps its shadow
  (14,15,17) in both. The density recession is real but nearly invisible in a
  screenshot. **Grade elevation claims by sampling pixels.** If that recession
  should be legible, the fix is a lighter `elevation.base`, not a preview edit.
- **`EscalationBadge` `emergency` and `risk` can render identically.** They
  share `riskBg` (#1a0608) and `riskText` (#f0897e) and differ *only* in the
  dot (`riskBright` #FF3525 vs `risk` #E84036). With `dot={false}` they are
  pixel-identical — two distinct statuses, one appearance. Verified from
  source. `WithoutDot` deliberately omits emergency rather than imply a
  distinction that isn't there.

## Known render warns

- `[CSS_RUNTIME]` fired before `cfg.cssEntry` was set. It should not fire now;
  if it returns, `dist-design/tokens.css` is missing — re-run `design:build`.
- Large dark areas below each cell in the review sheets are the body canvas
  filling the capture viewport, not a layout defect.

## Deliberate design observations (not defects)

- `delayed` and `overdue` are near-identical visually — both map to
  `color.status.warning`. They differ only by chip label. Real, and arguably
  worth a second amber tier, but not a preview problem.
- Button `sm/md/lg/xl` (36/44/52/56) step subtly. That is the real scale.

## Re-sync risks

- **`index.d.ts` is hand-written and will rot** when a primitive gains or
  renames a prop. `check-design-dts.mjs` only guards the four enum unions
  (`Text.variant`, `AlertBanner.severity`, `EscalationBadge.status`,
  `Button.size`) — a new prop, or a changed type on a non-enum prop, passes
  silently. Re-read the primitives' destructured props on any re-sync.
- **`tokens.css` is generated**, so it tracks `tokens.js` automatically — but
  only the flat string/number leaves. A newly *nested* token group will not
  appear as a custom property.
- **The Canvas wrapper is duplicated per preview file.** Deliberate: previews
  compile individually and a shared local import is fragile. If the canvas
  token ever changes, it changes in `tokens.js` and every wrapper follows,
  since they all read `color.surface.canvas` rather than a literal.
- **Node 20 is required** (`engines: >=20`); the shell default here is v16.
  Every command in this sync ran with `PATH=/usr/local/opt/node@20/bin:$PATH`.
- The Figma system map (`CYlmJqDCXEaacCuz9wW3bd`) is dated 2026-05-26 and
  predates `hostv2/` entirely. Code is now upstream of Figma for colour and
  surface — see `docs/audits/2026-08-18_FIGMA_CODE_RECONCILIATION.md`.
