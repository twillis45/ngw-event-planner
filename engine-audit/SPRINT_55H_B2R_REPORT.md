# Sprint 55H-B2R — Run-of-Show "Now / Next" Marker — Report

*Rework B.2 so execution guidance lives inside the Event Day Schedule, not the Home Spine. Outcome: the marker already existed; B.1 already wired the playbook run-of-show into it. No new code — Pattern 007 (Surface Before Building) in its purest form. The parked B.2 (wrong-surface spine approach) was dropped, never shipped.*

## 1. Files changed
**None.** No runtime, UI, or data change was required. The parked B.2 implementation (execution candidate in `selectEventNextAction` + Home today-tier enrichment) was **dropped from the stash** and is not on `main` (verified: `topExecutionTask` count = 0 in `index.js`/`CommandCenter.jsx`).

## 2. Root cause
The Event Day Schedule (`RunOfShow`, App.js) **already renders a NOW / NEXT UP / LATER / DONE board** when `isDayOf` is true (Sprint 60.T Phase 2 + 60.Y Phase 1): NOW = current item (from `r.actualStart`, else the last item whose time ≤ now), NEXT = the next 2, LATER = the rest, DONE = completed/past, with ▶ Start now / ✓ Done buttons and an ahead/behind drift label. `isDayOf` **auto-engages on the event day** (`dayMode = hasExplicitDayMode ? event.dayMode : isEventToday`). **Sprint 55H-B1 already pointed that surface at `effectiveRos(event)`** — so the playbook-generated run-of-show flows straight into the existing Now/Next board. The capability was never missing; B.2 simply pointed it at the wrong surface.

## 3. Why the spine was the wrong surface
On the event day the Home Spine is owned by the locked **"Your event is today → Enter Day-of Mode"** hero (a higher reactive priority — correct per Pattern 001 / Rule 1), and that spine layout does not render the command `consequence` line, so B.2's "Next: …" enrichment was invisible. The product model is right as the brief states: **the Spine tells you to enter day-of mode; the schedule tells you what's happening now and next.** "What's now/next" belongs on the schedule, which already had the markers.

## 4. New schedule-marker logic
None added. The existing logic already satisfies every B2R rule:
- **Now** — current/active item (started, or the most recent whose time ≤ current time). ✓
- **Next** — the next 2 upcoming items. ✓ (Rule 6: when no item is active, the nearest upcoming is the first NEXT.)
- **Overdue** — the drift label ("N min behind") shows **only once a segment is actually started** (`r.actualStart`), i.e. only where completion/start state exists — never faked (Rules 3 & 7). ✓
- **Data source** — `effectiveRos` (Rule 4/5): manual schedule if any (never overwritten), else the B.1 playbook run-of-show; generated rows keep `source` / `generated` / `playbookType`. ✓
- **Manual outranks generated** — `effectiveRos` returns the stored manual schedule whenever one exists, so manual wins (Rule 3). ✓

## 5. Before / after
- **Before (B.2 attempt):** "Next: Set the table" was pushed into the Home Spine, where the today-hero pre-empts it and the consequence line doesn't render → invisible.
- **After (B2R = verify the right surface):** on the event day, Event Day Schedule shows the NOW / NEXT UP / LATER / DONE board over the playbook run-of-show — `review-artifacts/2026-06-14-sprint-55h-b2r/`:
  - `B-playbook-board.png` — Dinner Party: **NOW 9:00 AM Reheat make-ahead · ▶ Start now**; **NEXT UP 10:00 AM Plate appetizer / 2:00 PM Leftovers**; **DONE · 4** (morning prep collapsed); live header "EVENT DAY · Next: 10:00 AM".
  - `A-now-next-board.png` — manual schedule, same board.
  - `F-mobile-board.png` — 390px, board intact.

## 6. QA matrix (0 page errors)
| Scenario | Now | Next | Notes |
|---|---|---|---|
| A — Dinner Party event day, manual schedule | ✓ | ✓ | Start buttons; manual not overwritten |
| B — Dinner Party event day, playbook schedule | ✓ | ✓ | board over the B.1 run-of-show |
| C — Dinner Party **before** event day (3d out) | **none (correct)** | ✓ | schedule list (7 segs), no false NOW |
| D — Birthday event day, playbook | ✓ | ✓ | board over Birthday run-of-show |
| E — Wedding event day, no playbook + no manual | none | none | empty board (unchanged) |
| F — 390 mobile (Dinner Party event day) | ✓ | ✓ | renders on mobile |
| Home Spine on the event day | — | — | still "Your event is today → Enter Day-of Mode" |

Unit: 53/53 (the shipped B.1 suite; no B.2 reader added). Prod: already live (B.1 + the day-of board) — `main.ff1bcb6d.js`/`af3d7233`. 390 + 1440 verified.

## 7. Risks
**None introduced** — no code changed. The only action was dropping the parked, never-shipped B.2. The day-of board and the B.1 wiring are already in production and unchanged.

## 8. Merge recommendation
**Nothing to merge — already live and verified.** B.1 (shipped) + the pre-existing day-of board already deliver the B2R success condition: on the event day the user is sent to Day-of Mode, and inside the Event Day Schedule they immediately see what's happening **now** and **next**. The wrong-surface B.2 is discarded.

*Verification only — nothing built or changed. Pattern 007: the intelligence already existed; we exposed it (B.1) rather than building a parallel one (B.2).*
