# Live check 7a2347c8 (#292 Thanksgiving drinks, #313 push count, #314 server): Fri Nov 27, 2026, 1:35–1:48 PM EST

Live: the hostv4 `ngw-build` meta reads 7a2347c8037e (deployed 10:05 AM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted (only Sentry). Share, clipboard and open stubbed. E2E_TEST_ plans only. Nothing sent.
#313 (push wording) and #314 (server alert window, migration 035) are server/push paths a read-only browser check cannot exercise; not tested here.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 5f793bcc | See diff-from-5f793bcc.md; the only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all ok |
| day-31b2 / daybefore reruns | All ok at 5 sizes |
| #292 "Wine with dinner…" (default) | Drinks group "0 of 5 bought" with Red wine 3 bottles, White wine 3 bottles, Sparkling cider; "Wine shop" under Shopping at. On the day, "Everyone has a sober way home" is on the list. |
| #292 "Guests bring the wine…" | Drinks "0 of 3": no red or white wine, cider stays, no "Wine shop". The sober-ride row stays. |
| #292 "No alcohol…" | Drinks "0 of 3": no wine, cider stays, no "Wine shop". The sober-ride row is gone. |
| #292 the question | With drinks unanswered, the board's next-in-order shows "What are you pouring? · 1 open", and The spread & shopping → Your choices → Menu "1 open" holds it with the three answers. Picking "No alcohol: sparkling cider and water" saves foodChoices.drinks, and the list then has no wine with the cider kept. Ok at 5 sizes. |

Probe: `livecheck/drinks-7a23.cjs`. The list's groups start folded, so it opens Drinks before reading.
