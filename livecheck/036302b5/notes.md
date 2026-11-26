# Live check 036302b5 (#303 B7 moments): Thu Nov 26, 2026, 3:10–3:29 PM EST

Live: the hostv4 `ngw-build` meta and the hostv2 bundle both read 036302b5f1c7 (deployed 3:05 PM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted (only Sentry). Share, clipboard and open stubbed. E2E_TEST_ plans only. Nothing sent.
#304 (61219b8f) is merged but was not yet live during this check.

## Regressions
None.

## Bug (new in #303's shared add, multi-day trips only)
`addMomentEdit` saves the moment row with no `day`, and `todaysRos` reads a missing day as day 1 (`(r.day || 1) === k`).
Repro (`moments-0363.cjs` v2-trip-day2-add, plus `trip-moment-day-0363.cjs`): Group Trip May 13–15, 2027, at 9:00 AM on day 2, tap hostv2's "Add it" on "Worth a spot: Group photo".
- The other days' rows are kept (r1–r4), so #303's overwrite fix holds. The new row is `{ id: m-groupPhoto, day: undefined }`.
- Day 1 run: Group photo is shown in both shells.
- Day 2 run: hostv4 does not show it, and hostv2 still offers "Worth a spot: Group photo" again.
- The toast says "on today's run", which is untrue on day 2 and later.
Suggested fix (sent to the parent): set `day: dayIndexOf(event, now)` when `spanNights(event) > 0`.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 99402647 | See diff-from-99402647.md; the only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| day-31b2 / daybefore / day-fb01 / here reruns | All ok at 5 sizes; 0 page errors |
| #303 hostv4 moment (Thanksgiving, 3:08 PM EST) | Ok at 5 sizes. "Worth a spot: Group photo · Not on today's run yet." The sheet's time defaults to 15:20, the next step ("Next at 3:20 PM"). "Add it to the run" saves m-groupPhoto at 15:20 with rosEdited, and the row moves on to "Shared meal / mingle". |
| #303 hostv2 on a trip | Other days are kept (fixed). Day placement is wrong; see the bug above. |
