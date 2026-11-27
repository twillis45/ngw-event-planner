# Live check 5f793bcc (#311 reminders skip the past, #312 budget drawer agrees): Fri Nov 27, 2026, 4:40–4:53 AM EST

Live: the hostv4 `ngw-build` meta reads 5f793bcc1f92 (deployed 3:05 AM EST).
Chromium at 5 sizes, light and dark for the budget. Every POST/PUT/PATCH/DELETE aborted (only Sentry). "Plan with" and "Use it" were never tapped. The .ics was saved into vr/<vp>/ and never imported. E2E_TEST_ plans only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs b5896d46 | See diff-from-b5896d46.md; the only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| day-31b2 / day-fb01 reruns | All ok at 5 sizes |
| **#311** reminders (Thanksgiving, screen clock 1:30 PM EST) | Fixed. "Add 11 reminders" (it was 16 at the same clock on f60ebbb0). The first DTSTART is 20261126T140000 ("Turkey out to rest under foil"), and nothing before 1:30 PM is included (the 9:00, 10:30, 12:00, 1:00 steps and the 1:00 PM caterer are gone). Times stay floating. Ok at 5 sizes. |
| **#312** budget drawer | Fixed. "Change your budget": Lean $100 $8 a head / Mid‑range $300 $25 a head / All-out · our pick $400 $33 a head. "Our pick" is the question's recommended tier (All-out, "Covers your plan"). Rows are 65px; "Your own number" and "Use it" are in view. Light and dark, at 5 sizes. |
| Budget question / dark steel ask (re-run) | Same as b5896d46: ok. |

## Note
"Our pick" in the drawer marks the recommendation, not the host's current selection. With Lean picked on the question and the drawer opened, the drawer still marks All-out as our pick and shows no selected tier. I read that as intended (a recommendation), not a bug.
