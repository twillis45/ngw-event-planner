# Sprint 60G — `7aebb4f` Timeline Reconciliation

**Date:** 2026-06-18
**Subject:** `7aebb4f` ("Playbook planning timelines + RSVP redesign + budget entry workflow").
**Verdict:** Intent right, implementation lossy. The planning-section confusion (past-dated
phases, duplicate "Final Prep") is one root cause: a **lossy bridge** that snaps precise
playbook `offsetDays` onto the legacy `PHASE_OFFSET` grid.

---

## Root cause
`offsetDaysToPhase` (App.js:2477) snaps each milestone's `offsetDays` to the *nearest*
`PHASE_OFFSET` phase. `playbookTimelineEntries` (2486) then stores that snapped `week`.
Consequences, all observed on a Juneteenth event created the day before:
- **Precision lost / nodes doubled:** offsetDays 21 & 18 → both "3 Weeks Out" (May 29, "0/2");
  14 & 16 → both "2 Weeks Out" (Jun 5, "0/2"). The playbook's real per-step timing is discarded.
- **Duplicate names:** `PHASE_FOCUS` maps `2 Weeks Out` **and** `Week Of` both to "Final Prep".
- **Past-dated wall:** snapped phases get dates from `PHASE_OFFSET` relative to the event, so an
  imminent event shows elapsed phases with no compression.

## Deeper EP-1 problem
The app already has the precise backward-solve engine `eventSolve.mjs` (real offsetDays, family
graphs, compression) — but it runs in **shadow mode** (App.js:32403). So the precise engine is
shadowed while a lossy snap drives the live UI: two timeline models, the good one unused.

## What's fine (do not undo)
- **Budget-entry readiness** (`budgetSet` = real money, not seeded $0) — honest; does **not**
  conflict with the 60E host-Budget rewrite (the `Budget` component is still the planner cockpit).
- RSVP redesign — independent (confirm it doesn't fork guest-count logic).

## Reconciliation
1. **Playbook milestones = single source of timeline truth** — render each at its **real** date
   (`event − offsetDays`); stop snapping to `PHASE_OFFSET` for playbook events (keep the grid only
   for legacy template types without a playbook).
2. **Group + compress honestly** — band by real offsetDays; collapse past under a
   "N earlier steps — the window passed" line (host choice **b**).
3. **Dedup `PHASE_FOCUS`** (`2 Weeks Out` distinct from `Week Of`) — latent bug for legacy types too.
4. **(Larger, separate)** Promote `eventSolve` out of shadow to *own* the timeline with the
   playbook milestones as its data — one engine, not a shadowed + a lossy-live one.

## This sprint ships
Steps **2 + 3** (past-collapse in the host stepper + `PHASE_FOCUS` dedup) + preserve `offsetDays`
on timeline entries (de-risks step 1/4). Step 1 full real-date render and step 4 (eventSolve
promotion) are the scoped follow-on.
