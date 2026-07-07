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

## Addendum — dead-CTA report repair (same day)
Todd reported "Do this first →" dead on the NEXT UP caterer hero. Reproduced: the CTA routed correctly to the Plan tab and rendered the tapped-step focus card — but the Plan tab's OWN hero (PlanNowHero) opened the landing with the IDENTICAL step and CTA above it, so the tap read as a no-op (the exact perceptual-deadness class of the original "Make the call" bug). Fix: while a tapped-step focus card is live (`openTaskId`), the Plan hero yields — the landing IS the step; Mark it done / Set this aside clears the card and the hero returns with the next step (live-verified: done → "You're ahead of it… Next up: buy mumbo sauce"). Source-contract test added (phaseHero test 7). Doctrine addition: **a deep-link landing must visibly differ from the screen you tapped on — a landing that re-tells the same words is a dead CTA even when the route is correct.**

## Addendum 2 — third dead-CTA report: route built from a source its consumer never renders
Todd: "CTAs are broken again. CTAs should be deep links only." Repro: the calm-tier hero "See what's next →" routed to `{tab:'Planning', foodFocus:'p_mumbo'}` — but `p_mumbo` doesn't exist on the RENDERED food plan (playbookFoodPlan filters raw playbook purchases by the host's choices), so the deep link terminated on nothing. Three stacked fixes:
1. **Source truth**: `nextUpcomingTask` now previews only ids present on the rendered plan (same-list rule) — the hero named "buy red drink" post-fix, a real row.
2. **Consumer completeness**: the FoodPlan focus effect opens ALL THREE collapse layers a row sits behind (the shopping home via its accordion, the spread card via forceOpen, and the item's GROUP) — previously only the middle layer opened, so even valid ids could land on nothing.
3. **Visible fallback**: an unknown focus id scrolls to the spread card itself — a tap never silently dies.
Live-verified end to end: hero → row mounted, highlighted (settle ring), in viewport. DOCTRINE ADDITION: **a route producer may only emit ids from the exact list its destination renders — and focus consumers must open every collapse layer between the viewport and the target.** Tests: src/lib/__tests__/deepLinkConsumer.test.js (per-type sweep + source contracts).
