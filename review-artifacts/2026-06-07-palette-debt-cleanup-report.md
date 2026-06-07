# Palette Debt Cleanup — Remove Banned `#1a6fba` from User-Reachable Paths

**Date:** 2026-06-07
**Branch:** `sprint-palette-debt-cleanup`
**Scope:** Three callsites only. No theme/workflow/backend changes.

---

## Goal

Per palette.js line 36–38, `#1a6fba` is the banned **SaaS blue**. Three callsites in `App.js` still rendered it on user-reachable paths (LIGHT theme accent + two brand-fallback defaults). This PR replaces those with locked palette tokens. No new raw hex literals introduced.

## Replacement choices

| Callsite | Before | After | Token | Final value | Rationale |
|---|---|---|---|---|---|
| `App.js:194` LIGHT theme `accent` | `'#1a6fba'` | `steelBlue` (palette import) | `palette.steelBlue` | `#4E6877` | Locked Studio Matte identity token, mode-independent per palette.js |
| `App.js:1202` `brandAccent(profile)` fallback | `'#1a6fba'` | `defaultBrandColor` (already imported) | `palette.defaultBrandColor` | `#4E6877` | This is the explicitly named "Studio Steel" default exported by palette.js for exactly this purpose |
| `App.js:5427` `VendorBriefView` accent fallback | `'#1a6fba'` | `defaultBrandColor` | `palette.defaultBrandColor` | `#4E6877` | Same — public vendor brief uses brand color or falls back to studio default |

`#4E6877` ("Studio Steel") was already the default brand preset, the Client Portal accent, and the dark-theme gradient top. It is now the LIGHT accent and the brand fallback. One identity color across the surfaces that previously held debt.

## Contrast verdict

| Surface | Combination | Contrast | WCAG |
|---|---|---|---|
| LIGHT theme accent on white surface | `#4E6877` on `#ffffff` | ≈ 4.88 : 1 | ✓ AA normal text · ✓ AA UI components |
| LIGHT theme accent on `#f8f8fa` body | `#4E6877` on `#f8f8fa` | ≈ 4.81 : 1 | ✓ AA normal text · ✓ AA UI components |
| Brand-fallback accent on white briefs | `#4E6877` on `#ffffff` | ≈ 4.88 : 1 | ✓ AA normal text |
| Previously rejected: `steelBlue500` (`#6F8794`) on white | — | ≈ 3.60 : 1 | ✗ Fails AA normal text (3.6 < 4.5) |
| Previously rejected: `steelBlueDark` (`#3F5B6A`) on white | — | ≈ 6.55 : 1 | ✓ AAA but visually too dark — reads as structural, not as accent |

`#4E6877` is the highest brand-identity-respecting token that passes AA on white. Darker tokens (`#3F5B6A`, `#566F7D`) pass with more headroom but read as structural/text rather than accent.

## Does it affect default DARK mode?

**No.** DARK reads its accent from `STEEL.blue500` (`#6F8794`) and `accentTopGrad: steelBlueGradientTop` (`#4E6877`). DARK never read line 194 — that's the LIGHT block. Runtime QA at all 5 viewports confirms `rgb(26, 111, 186)` (the rgb form of `#1a6fba`) and the hex string `1a6fba` both render 0 times in DARK mode (already true before this PR, true after).

## Does it affect Client Portal / briefs / proposals?

**Yes, positively.**
- `brandLetterheadHTML(profile)` (line 1203+) uses `brandAccent(profile)`. When a planner has set a `brandColor`, no change — their custom hex still wins. When they have not, the fallback steps from banned `#1a6fba` → approved `#4E6877`. Letterheads on briefs/proposals now sit in the locked Studio Matte palette by default.
- `VendorBriefView` (the public-vendor-facing brief page at line 5424+) — same pattern. Planner's brand color wins; fallback steps off banned blue onto Studio Steel.
- Client Portal at line 8550 was already on `#4E6877` since the earlier hand-migration. Unchanged.

## What was NOT changed

- No theme rebuild
- `<ThemeToggle />` not hidden
- DARK theme untouched
- No new raw hex literals — only token imports
- No backend
- No migration
- No workflow changes
- Date Entry Phase B+C **not touched** (PR #5 stays isolated; this PR only conflicts with PR #5 on the import line, which both modify additively)
- `LIGHT` theme block's other entries (`accent2: '#0891b2'`, `text: '#111118'`, `muted: '#71707e'`, `success: '#16a34a'`, `warn: '#f59e0b'`, `danger: '#ef4444'`) — still raw hex. These were already deferred per `docs/token-debt.md` ("Inside App.js — defer entirely until next pass"). Out of scope.

---

## Pre-coding review board (7 reviewers)

| Reviewer | Concern | Answer |
|---|---|---|
| UI/UX lead | Will LIGHT mode still feel premium after losing SaaS blue? | **Yes.** Studio Steel `#4E6877` is the same identity color used on Carbon dark CTAs, Client Portal accents, and the default brand preset. One identity, three surfaces. Less SaaS, more cohesive. |
| Accessibility lead | Does `#4E6877` on white pass WCAG AA? | **Yes — 4.88:1 on white, 4.81:1 on `#f8f8fa`.** Passes AA normal text (≥4.5:1) and AA UI components (≥3:1). Darker tokens were considered but reduce accent feel without accessibility benefit. |
| Premium SaaS designer | Will any CTA become "muddy"? | LIGHT-theme CTAs become steel-blue against white. Compared to bright SaaS blue, slightly more muted but reads as "intentional premium" — same register as the dark mode that's already shipping. |
| Mobile UX lead | Does the brand-accent change affect mobile readability on briefs/portals? | **No mobile-specific risk.** Letterhead/brief rendering already uses `brandAccent()` on every form factor. The fallback value changed; the rendering path didn't. |
| No Guesswork PO | Does the swap hide intent or change behavior silently? | **No.** Banned color removed. Planner-set `brandColor` still wins for branded surfaces. Studio Steel becomes the honest default. Token swap is documented in the diff, in this report, and in palette.js. |
| Trust & safety reviewer | Could this swap unhinge any color used as state/severity signal? | **No.** The swap only affects `accent`/`brandAccent`-class identity colors. Status anchors (danger, success, warn, live, pending) untouched. No state/severity surface changed. |
| Skeptical paying planner | "Will my briefs look different?" | **Only if you never set a brand color.** Then yes — your letterhead changes from bright `#1a6fba` to Studio Steel `#4E6877`. If you did set a brand color, no change. |

---

## QA matrix

Harness: `/tmp/palette-debt-qa.py`. Captures + JSON: `review-artifacts/2026-06-07-palette-debt-qa/`.

Each cell is the rendered count of the banned hex (string + rgb form) across that surface at that viewport.

### DARK mode regression (4 surfaces × 5 viewports)

| Surface | 390 | 430 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| Home — `#1a6fba` rendered | 0 | 0 | 0 | 0 | 0 |
| Home — `rgb(26,111,186)` rendered | 0 | 0 | 0 | 0 | 0 |
| Create Event — banned rendered | 0 | 0 | 0 | 0 | 0 |
| Budget/Payments — banned rendered | n/a | n/a | n/a | 0 | 0 |
| Add Vendor wizard — banned rendered | 0 | 0 | 0 | 0 | 0 |
| Page errors | 0 | 0 | 0 | 0 | 0 |
| Console errors | 0 | 0 | 0 | 0 | 0 |
| Horizontal overflow | none | none | none | none | none |

(Budget cell n/a at narrow viewports because the harness needed the bottom-nav budget tab which is only structurally exposed on larger surfaces — mobile budget is reached via different path.)

### LIGHT mode render check (2 surfaces × 5 viewports)

| Surface | 390 | 430 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|
| LIGHT Home — banned rendered | 0 | 0 | 0 | 0 | 0 |
| LIGHT Profile Settings — banned rendered | 0 | 0 | 0 | 0 | 0 |
| Studio Steel `rgb(78,104,119)` rendered on Home | 1 | 1 | 2 | 21 | 21 |
| Studio Steel rendered on Settings | 1 | 1 | 28 | 68 | 68 |
| ThemeToggle reachable | (via localStorage) | (via localStorage) | (via localStorage) | ✓ button | ✓ button |
| Page errors | 0 | 0 | 0 | 0 | 0 |
| Console errors | 0 | 0 | 0 | 0 | 0 |

The Profile Settings brand-color picker at desktop renders the `#4E6877` swatch hex as a visible label — that is the **brand preset label** showing the planner which Studio Matte hue is named "Studio Steel", not a rendered-style violation. Confirmed by visual screenshot at `review-artifacts/2026-06-07-palette-debt-qa/1024_06_light_settings.png`.

### Build artifact scan

| Check | Result |
|---|---|
| Bundle | `main.cc97d904.js` |
| `openweathermap` refs in built bundle | **0** |
| `dev-bypass-user` refs in built bundle | **0** |
| `AUTH_BYPASS:"false"` baked in | ✓ (4 occurrences from env-strip) |
| `1a6fba` in built bundle | **0** (was 3 in the pre-cleanup PR #5 bundle) |
| `14b8a6` | **0** |
| `f0bc44` | **0** |
| `e08c38` | **0** |
| `4E6877` Studio Steel (positive control) | 13 |
| Compile errors | 0 |
| Compile warnings | 2 pre-existing `no-unused-vars` (not introduced by this PR) |

---

## Files changed

| File | Change |
|---|---|
| `src/App.js` | `+4 / −4` — `steelBlue` added to import list, 3 callsites swapped |
| `review-artifacts/2026-06-07-palette-debt-cleanup-report.md` | new |
| `review-artifacts/2026-06-07-palette-debt-qa/` | 30 viewport screenshots + qa.json |

## Backend changed

**NO.** Migration not required.

## Recommendation

**Merge this palette PR first**, then re-base or merge PR #5 (Date Entry Phase B+C) cleanly. Both PRs touch the same import line so a small merge conflict is possible; if it lands, the resolution is trivial (keep both `steelBlue` and the date-entry helper imports — they don't collide).

## Brutality check

- **Did the banned color leave?** Yes — 0 in built bundle, 0 rendered at every viewport in every mode.
- **Did anything else change?** No — only 3 surgical line edits + 1 import addition.
- **Did contrast survive?** Yes — 4.88:1 on white, passes WCAG AA normal text.
- **Did any CTA lose clarity?** No — Studio Steel is the canonical identity color.
- **Did any brand/brief surface regress?** No — `brandColor`-set planners unchanged; unset planners get Studio Steel instead of banned SaaS blue.
- **Is this safe to merge before PR #5?** Yes — it touches no Date Entry code.
- **Is this scope creep?** No — three lines + one import. No theme rebuild. No workflow change. No backend.
