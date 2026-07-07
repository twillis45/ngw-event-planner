# PHASE-HERO-1 + ONE-TELLING-1 — Phase-True Heroes, One Telling per Screen

Date: 2026-07-07 · Slice type: subtraction repair (HOST-SHELL-BUSINESS-AUDIT-1's highest-leverage slice) · Status: SHIPPED

## 1. Executive verdict
The two shell defects the business audit ranked highest are fixed at their single sources: (a) `selectEventNextAction` — the ONE hero producer for HostHome, Command, and previews — is now phase-gated by the same engine as the header bar, so a finished event can never again show "Set date, headcount, menu"; (b) the Next Up list drops any row the hero above it already tells, and hides its whole section when that empties it. Pure subtraction — no new cards, no new engine.

## 2. What changed
- `src/CommandCenter.jsx` · `selectEventNextAction`: `deriveEventPhaseProgress` gate at the top. **post_event** → wrap-up hero from the phase engine's cue ("Settle up with <vendor>." / "Send thank-yous · N left." / "Return the rentals."), consequence "The event is done — this is the last of the wrap-up."; nothing left → **null** (surfaces show their all-set states — no manufactured hero). **live_event with cues** → "Next: <segment> · <time>." routed to ros-now ("It's event day — run the day; the plan can rest."); no cues → falls through honestly (day-of shopping still matters). **pre_event/unknown** → the existing planning ladder, untouched.
- `dropHeroDuplicate(rows, na)` (exported): normalized 32-char-prefix match between a Next Up row and the hero title; both Next Up render sites use it for the rows AND the section gate, so an emptied list removes the header too (empty sections are noise — HOST-CHOICE doctrine).

## 3. Verification
Unit: 6 tests (`src/__tests__/phaseHero.test.js`) — post-event wrap-up hero, all-wrapped→null, event-day cue hero, pre-event ladder untouched, dedupe drops exactly the duplicate, distinct rows survive. Live: the audit's exact stale scenario now renders "NEXT STEP: Settle up with Smoke Shack. The event is done…" agreeing with the header's "Wrap-up: 2 things left"; the real Juneteenth event tells the caterer step ONCE (hero only, Next Up header gone since it held only the duplicate). Suites **2137/2137 (131 suites)** · backend **97/97** · build clean. Disposable event cleaned.

## 4. Parked (from the same audit, unchanged)
What-to-settle default-collapse test, stored-task copy migration, "since last visit" line, demo-pill docking.

## 5. Recommendation
Accept.
