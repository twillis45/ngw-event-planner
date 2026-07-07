# CTA-TRUTH-AUDIT-1 — 50-Scenario Source-of-Truth Audit (Brutal, Executable)

Date: 2026-07-07 · Trigger: Todd — "do a brutal audit of the CTA issue. 50 different scenarios for the host shell. CTAs should be coming from source of truth."

## 1. Executive verdict
The audit is now a PERMANENT TEST, not a report: `src/__tests__/ctaSourceOfTruth.test.js` sweeps **50 scenarios** (10 event types × 5 lifecycle states) across **every route producer in the host shell** and validates each emitted route against the exact source its destination renders. First run: **40 of 50 scenarios failed** — all from one producer. Fixed at the source; final run: **50/50 pass**, and any future producer that emits a route its destination can't honor fails CI by construction.

## 2. What the audit checks (the executable doctrine)
For every scenario × producer: the route's **tab** must be one the host shell renders; a **static anchor** must be in the consumer registry (event-date, guests-entry, rain-plan, parking-notes, food-plan, ros-now, crab-plan, …); a **dynamic id** must exist in the same list the landing surface draws from — `foodFocus`/`foodrow-*` ∈ the rendered food plan (list + choices), `caprow-*` ∈ the capacity list, `crabline-*` ∈ the crab plan's lines, `vendorId` ∈ the event's vendors, `timelineId` ∈ the event's timeline. Producers swept: hero (selectEventNextAction, all tiers), phase cue, milestone router (per open task), budget recovery suggestions, crab issues, day-before sections, context nudges (4 surfaces), location assist, nextUpcomingTask, rain-plan target, decision board (open + settled rows).

## 3. The scenario matrix
Types: bbq · crab feast · birthday · graduation · juneteenth · baby shower · celebration of life · dinner party · family reunion · retirement. States: fresh-no-date · planning-with-count · near-event-full (roster + quoted vendor + crab plan where relevant) · event-day (live ROS) · post-event (unpaid vendor + stale task).

## 4. THE FINDING — the recurring dead-CTA source
`playbookDecisionBoard` routed **every optioned decision** with `foodFocus: <decisionId>` — but the FoodPlan's "Your choices" card renders only its own food-domain choices. Non-food optioned decisions (**shade, theme, cake, registry, games, display, seating, …**) carried routes their destination could never honor → the "What to settle → tap → nothing" class Todd kept hitting, present in 40/50 scenarios (8 of 10 event types).

## 5. Fixes
1. **Producer**: the board emits `foodFocus` only for ids in `playbookFoodPlan(event).choices` — the destination's own list (same-source rule made literal).
2. **Consumer**: HostDecisionsPanel's inline-settle is keyed on the DECISION having options (`playbookDecisionOptions`), not on a foodFocus route — so routeless optioned decisions settle right on the row. The row is its own consumer; no lying deep link needed.
3. **Doctrine test refined**: the old pin ("every open decision carries a route") encoded the bug; the new pin: every open row is actionable via a TRUTHFUL route **or** inline options, and every foodFocus names a rendered choice.

## 6. Results
First run 40/50 FAIL → after fixes **50/50 PASS**. Full frontend **2164/2164 (136 suites)** · backend **97/97** · build clean. The suite runs on every CI pass forever — regressions of this class can no longer ship.

## 7. Standing rule (memory + tests)
A route producer may only emit ids from the exact list its destination renders; a decision with no truthful destination settles inline or stays a calm prompt — never a chevron to nowhere.
