# Sprint 19 — App.js Event-Day Graft

Stable, runtime-proven operational doctrine grafted into the product shell via strangler pattern. The URL param `?mode=event-day` activates the new surface; its absence leaves the entire existing App.js flow completely untouched.

## Files changed

| File | Type | What |
|---|---|---|
| `src/lib/severity.js` | NEW | Canonical 5-tier severity model (additive, non-breaking) |
| `src/components/EventDayMode.jsx` | NEW | 3-zone event-day graft surface |
| `src/slices/EventDaySlice.jsx` | NEW | Slice harness entry for screenshot/demo without auth |
| `src/index.js` | MODIFIED | Added `?slice=event-day` harness entry (1 line) |
| `src/App.js` | MODIFIED | Added import + `?mode=event-day` routing block (12 lines) |

## What was NOT touched

- EscalationContext · DensityContext · OperationalModeContext — unchanged
- All existing slice harness entries — unchanged, regression verified
- VendorEscalationSlice · DesktopDensitySlice · DebriefSlice — unchanged
- AuthGate · providers wrapper — unchanged
- Theme system / tokens / design primitives — unchanged

## What EventDayMode uses (proven, locked)

- 3-zone orchestration ≥1024 (page 16 + Sprint 11 polish)
- Contained action widths 280 / 360 / 160 (page 44)
- Density collapse via DensityContext (existing)
- Single-P1 hierarchy via EscalationContext (existing)
- Command bar compression (Sprint 13)
- Canonical 5-tier severity + suppression rules (lib/severity.js · Sprint 18B)
- Runtime language authenticity (page 50 + Sprint 18A)
- Studio Matte tokens (design/tokens.js)

## What EventDayMode deliberately does NOT use (deferred)

- Bleed-spine emergency state (page 47)
- Contamination wash (page 47)
- Command trench (page 48)
- Activity log / residue / scar tissue (pages 48–49)
- Partial authority release / procedural unevenness (page 49)
- Toggle primitive (page 45)

## URL routing

```
# Authenticated (via App.js — AuthGate applies):
http://localhost:3000/?mode=event-day
http://localhost:3000/?mode=event-day&event=<eventId>

# Slice harness (no auth — for review and screenshot):
http://localhost:3000/?slice=event-day
```

## Severity suppression verified

| Tier | Authority pill | Date shown | Thread detail | Action set | Density |
|---|---|---|---|---|---|
| nominal | OPERATOR · 14 LIVE | ✓ | "All other threads nominal" | — | full |
| escalated | SYSTEM HOLDING · 3 OF 14 | ✓ | compressed cards | Check ETA · Notify next station | compact |
| critical | SYSTEM HOLDING · 9 OF 14 | ✗ | compressed cards | Call lead directly · Move to backup | compact |
| emergency | SYSTEM HOLDING · 12 OF 14 | ✗ | codes only | CONTACT NOW | crisis |
| recovery | OPERATOR · 14 LIVE | ✓ | compressed cards | Mark resolved | compact |

## Runtime copy verified (page 50 authenticity)

- `All clear · no active escalations · monitoring` — nominal center
- `CAT · 25 min behind` — escalated subtitle
- `CAT · direct action required now` — emergency subtitle
- `CONTACT NOW` — emergency primary action
- `Call lead directly` — critical primary action
- `Move to backup` — critical secondary action
- `Check ETA` · `Notify next station` — escalated actions
- `Mark resolved` — recovery/resolve action
- `All other threads nominal · monitoring` — threads nominal state
- `SYSTEM HOLDING · N OF 14` — authority pill (escalated/critical/emergency)
- `OPERATOR · 14 LIVE` — authority pill (nominal/recovery)

## Viewport QA matrix

| Viewport | Layout | Verified |
|---|---|---|
| 390 | Single column (stacked) | ✓ |
| 768 | Single column | ✓ |
| 1024 | 3-zone (220 / 1fr / 280) | ✓ |
| 1280 | 3-zone (280 / 1fr / 360) | ✓ |
| 1440 | 3-zone (280 / 1fr / 360) | ✓ |

## Slice regression

| Slice | Status |
|---|---|
| `?slice=vendor` | ✅ passes |
| `?slice=desktop-density` | ✅ passes |
| `?slice=debrief` | ✅ passes |
| `?slice=event-day` | ✅ NEW — passes |

## Screenshots

| File | Surface · state |
|---|---|
| `01_event-day_nominal_390.png` | Event-day graft · nominal · 390px |
| `02_event-day_nominal_1280.png` | Event-day graft · nominal · 1280px (3-zone) |
| `03_event-day_nominal_768.png` | Event-day graft · nominal · 768px |
| `04_event-day_nominal_1024.png` | Event-day graft · nominal · 1024px (3-zone entry) |
| `05_event-day_nominal_1440.png` | Event-day graft · nominal · 1440px (3-zone) |
| `06_regression_vendor_1440.png` | Regression · vendor slice · 1440px |
| `07_regression_density_1440.png` | Regression · desktop-density slice · 1440px |
| `08_regression_debrief_1440.png` | Regression · debrief slice · 1440px |

## Build status
✅ compiles, no new errors, no new warnings beyond pre-existing no-unused-vars

## Reproduction

```bash
cd demo && npm start
# No-auth slice harness:
#   http://localhost:3000/?slice=event-day
# Authenticated (requires sign-in):
#   http://localhost:3000/?mode=event-day
#   http://localhost:3000/?mode=event-day&event=<id>
```

## What is NOT validated

- The `?mode=event-day` gated route has not been tested with a real Supabase auth session. Visual verification was done exclusively via `?slice=event-day`.
- Vendor data passed from real `events[]` state has not been tested — the synthetic event uses flat vendor objects. Normalization (`normalizeVendors()`) is in place for both string and object vendor entries.
- No real operator has reviewed the surface. All copy and suppression decisions remain hypotheses until field sessions.
- Sprint 18% human validation gap is unaddressed — dominant blocker across 6+ sprints.

## Honest read

This sprint grafts six sprints of proved doctrine into the product shell in ~250 lines, with no contamination of the existing codebase. The graft is reversible: removing the URL param reverts entirely. The surface renders correctly across all five viewports, all five severity tiers fire correctly, and all three existing slices pass regression. What remains unknown: how a real planner uses it under live pressure.
