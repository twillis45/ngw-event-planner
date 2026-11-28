# Live check d41eb613 (#328: kit list tags, households, party line, find box): Sat Nov 28, 2026, ~2:05–2:25 PM EST

Live: the hostv4 `ngw-build` meta reads d41eb613 (deployed 1:50 PM EST). Signed out. Every POST/PUT/PATCH/DELETE was aborted. E2E_TEST_ plans, example.com guests. Nothing sent.

## Regressions
None.

| Check | Result |
|---|---|
| hostv2 run.cjs vs fe7b6960 | 0 new failures, floor regressions or console errors; only the version changed |
| hostv4 / guests-e / swipe / reach / guests-kit | 40/40, 30/30, 55/55, 5/5, 15/15 |
| hostv4-batch-278 | 33/36; the same 3 "center" misses, identical numbers |
| v2kit (6), signedout (3), replies (9), import-esc (4), header (7) | all ok, 0 page errors |
| guest-sheet (#326) | all ok at 390 and 834. At 1024, 1194 and 1440 the "Nudge the 2" button still covers "‹ Your plan" by 46px. Expected: the fix (#334) is not in this build. |

## #328 verified (`list-tags-d41e.cjs`, 390 dark/light, 1194, 1440; 9 guests)
- Tags under the names:
  - Ada: "+1 Sam Pine"
  - Bo: "2 kids · Vegetarian"
  - Cy: "Peanut allergy"
  - Di / Eli: "with Eli" / "with Di"
  - no tags on the plain guests
- Household headings, in order: "Family · 2", "Work · 1", "Everyone else · 6".
- Party line: "+1 plus-one · 2 kids. Food sizes kids lighter."
- The find box shows at 9 names (from 8). It matches:
  - the +1 ("Sam" → Ada)
  - the group ("work" → Cy)
  - the email ("ada.pine@" → Ada)
  - the name ("moss" → Di, Eli)
- 0 page errors, 0 sideways scroll.
