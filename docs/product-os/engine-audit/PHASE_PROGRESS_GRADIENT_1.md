# PHASE-PROGRESS-GRADIENT-1 — Phase-Aware Progress Bar + One Goal-Gradient Cue

Date: 2026-07-07 · Slice type: trust + layout repair on the header progress surface · Status: SHIPPED

## 1. Executive verdict
The header track previously filled from `wholeEventReadinessScore` — a whole-event score with no label, no phase, no cue. It now means exactly one thing: **readiness for the current event phase**, with honest counts of chosen workflows and at most one actionable cue. Fill = completed/total for the phase — no percent shown, no score language possible (test-banned).

## 2. Phase Progress Matrix
| Phase | Label | Counted essentials (applies-only) | Suppressed | Cue source |
|---|---|---|---|---|
| pre_event | Planning readiness | date · location · headcount (guestCountResolved) · food-dietary (only with a plan + real count) · shopping (only ≤7 days out) · vendors first-undone (only if vendors exist) · rain plan (only outdoor) · crab order (only if started) · budget/moment (count only once they EXIST — never manufacture a gap) | RSVP replies for count-only hosts · vendors for vendorless · rain for indoor · venue rules for at-home · context nudges · anything hidden by HOST-CHOICE | priority ladder: date > rentals-class > location/rain > food/shopping/crabs > vendors > headcount |
| live_event | Event flow | the day's timed run-of-show cues (past vs next) | ALL stale planning gaps | "Next: <segment> · <time>" → ros-now |
| post_event | Wrap-up | unpaid committed vendors · thank-yous (confirmed guests vs thankYouSent) · rental returns (rented+checked capacity items) | every pre-event action ("Add the location" etc. — verified absent) | "Settle up with <vendor>" / "Send thank-yous · N left" / "Return the rentals" |
| unknown | Planning setup | non-time-dependent essentials only | day-before/live/post labels | "Add the event date to time the plan" → event-date |

## 3–5. Files & model
- `src/lib/phaseProgress.js` — NEW `deriveEventPhaseProgress(event, now)` → `{phase, label, completedCount, totalCount, progress, summary, nextCue}`. Thin composition over guestCountResolved, rainPlanStatus/isLikelyOutdoor, playbook plans, effectiveRos, buildCrabPlan.
- `src/App.js` ReadinessTrack — fill now `completed/total` for the phase; host-shell instance renders one in-flow line: `<label>: <summary> · <cue> →` (testids `phase-progress-line/-summary/-cue`); the EventPlanner header's absolutely-positioned instance stays bar-only (it cannot grow). Space reservation preserved: bar keeps marginBottom 12 in bar-only mode; the cue line carries it in cue mode (layout contract test updated accordingly).

## 6–11. Behavior (live-verified)
Pre-event real event: "Planning readiness: 2 of 5 essentials handled · Add the location →" — cue landed the venue field in-viewport. Post-event: "Wrap-up: 2 things left · Settle up with Smoke Shack →" with zero stale planning copy. Missing date: "Planning setup / Add the event date to time the plan" (unit-tested). Live day: the day-mode FOCUS takeover replaces the header entirely by prior design — the live_event branch serves any non-takeover render and is unit-tested ("Setup handled · Food service next").

## 12–14. Suppression, green-dot, CTAs
Count-only guests produce no RSVP essential or cue; vendorless/indoor/at-home likewise (tests 5–9, 18). The helper is read-only — zero green-dot code touched. Cue routes with the standard (tab, itemId, {focusField}) convention; vendor cues carry vendorId.

## 15. Mobile/header layout
390×844: line renders under the bar, wraps as flex (label / summary / cue), 12px gap to the first card preserved, no overflow; post-event line also clean. Fullscreen/app-shell behavior untouched.

## 16. Not counted (deliberate)
Percentages, scores, AI/confidence words (test-banned); suppressed panels; context nudges; optional features not chosen; fake send/reply/payment states.

## 17–24. Tests & suites
13 contract tests (`src/lib/__tests__/phaseProgress.test.js`) + updated layout contract. Full frontend **2122/2122 (129 suites)** · backend **97/97** · build clean. Prod smoke post-deploy.

## 25. Parked
CommandCenter next-step HERO is not yet phase-aware — post-event it can still surface a pre-event playbook task ("One call to make: Set date, headcount, menu" observed on the disposable post-event event). That ladder is a different surface with its own tiers; recommend **PHASE-HERO-1** follow-up. Also parked: post-event receipts/photo-delivery essentials (no data fields yet); `rentalsReturned` flag has no UI writer yet (cue routes to the capacity list meanwhile).

## 26. Recommendation
Accept, then queue PHASE-HERO-1 to retire stale pre-event heroes after the event.
