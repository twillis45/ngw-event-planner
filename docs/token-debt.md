# Token Debt — Studio Matte Hybrid Token Migration

**Created:** 2026-06-06 (Sprint Profile Settings Review · Hybrid Strategy)
**Source of truth:** `demo/src/theme/palette.js`

This document tracks the raw-hex callsites that bypass `palette.js`. The
hybrid strategy is: stop creating new raw-hex debt, sweep existing
callsites opportunistically as each file is touched. Do NOT chase every
hex across the codebase in a single pass — that's the risk we explicitly
chose to avoid.

## Source of truth

`demo/src/theme/palette.js` is the locked Studio Matte palette. It
exports tokens for three modes:

| Mode  | Use                                    | Source                          |
|-------|----------------------------------------|---------------------------------|
| Dark  | Day-of operational surfaces            | Figma "Studio Matte" mode       |
| Mid   | **Production default** — app shell     | Code (Sprint 60.L Carbon Lock)  |
| Light | Light-parity opt-in (deferred sprint)  | Figma "Light" mode              |

## Figma sync gap

Figma file `CYlmJqDCXEaacCuz9wW3bd` currently has only **Studio Matte**
and **Light** modes. The production **Mid Carbon** ramp (`#111519` …
`#2E353D`) is not yet written back to Figma. Until a Figma sync sprint
adds Mid as a third mode, Figma is one step behind code on the carbon
surface tier — both are valid sources, but the runtime app uses Mid.

**Follow-up:** Write Mid Carbon mode back to Figma's `NGW Color`
collection. Affects 7 surface/border variables. Quick, low-risk; defer
to next Figma sync.

## Wired in this sprint

- `demo/src/App.js` — `DARK` palette object reads `carbonBody`,
  `carbonPanel`, `carbonSurface2`, `carbonBorder`,
  `steelBlueGradientTop`, `steelBlueGradientBottom`, `dangerRed`,
  `amber`, `successGreen`, `textPrimary`, `textSecondary` from
  `theme/palette.js`. Values unchanged.
- `demo/src/App.js` — Profile Settings brand-color picker reads
  `defaultBrandColor` + `brandPresets` from `theme/palette.js`. Removes
  banned `#1a6fba` (SaaS blue) default and banned `#14b8a6` (neon teal)
  preset chip.

## Raw-hex debt to migrate when next touching the file

These are surfaces that hold raw hex literals outside the `C` palette
flow. Migrate ONLY when you're already in the file for other work.

### High traffic (do first when convenient)
- `demo/src/components/AuthGate.jsx` — login screen palette swap landed
  in Sprint 61.M but kept raw hexes (`#111519`, `#1C2227`, `#4E6877`,
  `#4FAE7A`, `#E84036`).
- `demo/src/plan/DecisionApprovalCenter.jsx` — CTA truthfulness pass
  uses raw hex for warn/danger anchors.
- `demo/src/plan/CommunicationHub.jsx` — 6-state comm vocab badges hold
  raw hex tier colors.
- `demo/src/components/BudgetEstimateHint.jsx` — confidence hierarchy
  raw hex literals (post `metroFactor` fix).

### Lower traffic
- `demo/src/admin/AdminConsole.jsx` — admin-gated, less user-visible.
- `demo/src/components/EventDayMode.jsx` — day-of surfaces should run
  the Dark mode (deeper carbon) — natural fit for mode swap when
  migrated.
- `demo/src/orchestration/*` — runner/cron status badges.

### Inside App.js (defer entirely until next pass)
The `DARK` object's remaining raw hexes (`accentPressed`, `live`,
`pending`, `LIGHT` mode object) — defer to a dedicated theme refactor
sprint. Migrating them now risks the monolith.

## Rules going forward

1. **New code** — import from `theme/palette.js`. No new raw hexes for
   the Studio Matte palette. Custom user-selectable colors (brand
   color, event-type accent) may remain raw hex; labels them "custom"
   so the app shell stays token-controlled.
2. **Touched files** — if you open a file in the migration list and
   the change is trivial, swap its raw hexes for palette imports while
   you're there. If the change is non-trivial, leave the hexes alone
   and add a note here.
3. **Banned values never re-enter** — `#1a6fba` SaaS blue, `#14b8a6`
   neon teal, `#f0bc44`/`#e08c38` decorative warm gold. Lint these out
   in a future linter pass.
4. **Mode contract** — Mid is the production default. The shell renders
   Mid unless a user opts into Dark (Event Day) or Light (parity).
   `palette.ACTIVE_MODE` is the switch.

## Closeout criteria

This file is closed when:
- All migration-list files are migrated OR explicitly retired.
- Figma carries all 3 modes (Dark, Mid, Light) with parity.
- A linter forbids new raw hexes from the Studio Matte palette ramp.
- `ACTIVE_MODE` is wired to a user-level theme toggle (Settings →
  Appearance), so palette swap is one user action instead of a code
  change.
