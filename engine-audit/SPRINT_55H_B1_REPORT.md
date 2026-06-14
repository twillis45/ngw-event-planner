# Sprint 55H-B1 — Run-of-Show Surfacing — Report

*Surface authored playbook execution intelligence through the existing Event Day Schedule — no new engine, surface, tab, runtime system, or storage. Pattern 006/007 in practice.*

## 1. Root cause
The playbook run-of-show is authored (`schedules.{cooking|preparation,setup,cleanup}`) but the live **Event Day Schedule tab** (`event.ros`) was seeded only from a *generic* starter (`buildStarterROS` — load-in / doors / etc., type-agnostic). The runtime never read playbook schedules into the day-of view. A routing gap, not an intelligence gap. **A second root cause surfaced during build:** the src `dinnerParty.js` was a *subset* migrated in 55C-1 (purchases only) and was missing its `schedules` block entirely — the schedules existed only in `engine-audit/playbooks/dinner-party.playbook.json`. Completing that src copy was required for B.1 to work for Dinner Party.

## 2. Files changed
| File | Change |
|---|---|
| `src/lib/playbooks/index.js` | New `playbookRunOfShow(event)` — derives a day-of run-of-show from playbook schedules (`T0 ±` `when` tokens → clock times anchored on `event.timeOfDay`), tagged `{source:'playbook', generated:true, playbookType}`. New `effectiveRos(event)` — returns the user's schedule if any exists, else the derived one. |
| `src/lib/playbooks/data/dinnerParty.js` | Added the authored `schedules` block (brought into src from the canonical playbook JSON — completes the 55C-1 partial migration). |
| `src/App.js` | Import `effectiveRos`/`getPlaybook`. Event Day Schedule renders `effectiveRos(event)` with a seeded `setRos` (first edit persists the derived rows). Playbook events are created with empty `ros` (so the day-of view derives + inherits playbook changes); non-playbook keep the generic starter. `rosCount`, Calendar, Vendors, and the day-of-bar "next segment" also read `effectiveRos`. |
| `src/lib/playbooks/__tests__/reader.test.js` | +9 tests (run-of-show derivation, metadata, pre-day exclusion, anchor, effectiveRos Rule 1/5). |

## 3. Architecture
**Derive at read-time, never auto-persist.** `effectiveRos(event)` = the stored `event.ros` if it has *any* content (manual/imported — Rule 1, never overwrite), otherwise `playbookRunOfShow(event)` (Rule 5 — re-derived each read, so a playbook timing change flows through automatically). Because the derived rows are not persisted, a playbook event's `ros` stays empty until the host edits; the first edit's `setRos` seeds the derived rows + the edit and saves them, at which point the schedule is owned and the playbook no longer overrides. The playbook stays the single source of truth (Rule 5) — no schedule logic is duplicated in App.js. No new storage, schema, tab, or panel (Rules 3/4): same `event.ros` array, same `RunOfShow` renderer.

## 4. Before / after
- **Before:** a Dinner Party's Event Day Schedule = generic starter (Vendor load-in / Doors / Dinner service), or empty.
- **After:** `review-artifacts/2026-06-14-sprint-55h-b1/A-dinner-ros.png` — 7 real segments: 14:00 slow-cook/roast · 15:00 set the table · 15:00 chill whites + drinks station · 16:00 empty dishwasher/stage bus tub · 17:00 reheat make-ahead · 18:00 plate appetizer (guests arrive) · 22:00 post-party reset — each owned by "Host." `B-birthday-ros.png` = the Birthday run-of-show. `D-dinner-manual.png` = a manual schedule, untouched.

## 5. QA matrix
| Scenario | Setup | Expected | Result |
|---|---|---|---|
| A | Dinner Party, no manual schedule | Playbook ROS appears | **7 segments** ✓ |
| B | Birthday, no manual schedule | Birthday ROS appears | **5 segments** ✓ |
| C | Wedding, no playbook | Unchanged | **0 segments** ✓ |
| D | Dinner Party, manual schedule exists | Manual preserved, no overwrite | **1 segment (the manual one)** ✓ |
| E | Generated (un-customized) + playbook updated | Reflects new playbook | ✓ by construction — derived at read-time, never persisted (unit-tested) |

Unit: **53/53 pass.** Prod bundle builds clean (`main.ff1bcb6d.js`, +1.6 kB). Runtime: **0 page errors** across all scenarios.

## 6. Risks
- **New playbook events are born with empty `ros`** (so the day-of view derives). If a host never opens the Event Day Schedule and never edits, nothing is persisted — but the tab always shows the derived schedule, so the experience is unaffected. Non-playbook events keep the generic starter (no change).
- **Edit hand-off:** the first edit persists the derived rows. Verified `RunOfShow` writes `ros` only on explicit user actions (add/edit/delete/mark-done) — no mount-time auto-persist — so the read-time-derive contract holds.
- **Anchor accuracy:** times are anchored on `event.timeOfDay` (default `afternoon` → 15:00). An event without `timeOfDay` set anchors at 15:00 rather than its true start — the relative *sequence* is always correct; absolute clock times may shift. Low impact, host-editable.
- **Pre-day items excluded:** T-1d/T-3d shopping + the T-1d-evening make-ahead are intentionally not in the day-of schedule (they're planning). Surfacing those is a separate (planning-timeline) concern, not B.1.

## 7. Recommendation
**SHIP.** Smallest possible change (~one reader function + read-time wiring), zero new architecture, all 5 QA scenarios pass, manual schedules provably preserved, playbook stays source of truth. Delivers the success condition: a first-time host opens an event and immediately sees a realistic, playbook-quality run-of-show without building it — the system feels smarter because existing intelligence is now visible, not because a new engine was created.

*Follow-ons (separate sprints, per the Phase B audit): B.2 execution candidates, B.3 capacity, B.4 contingencies; complete the src `schedules`/`rentalsGap` migration for any other playbook subsets if found.*
