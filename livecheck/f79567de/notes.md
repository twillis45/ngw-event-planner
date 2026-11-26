# Live check f79567de (#295 B2 the day before): Thu Nov 26, 2026, 10:10–10:40 AM EST

Live: the hostv4 `ngw-build` meta and the hostv2 bundle both read f79567debf5f (deployed 10:01 AM EST).
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted (only Sentry). Weather GETs answered locally (rain). Share, clipboard and open stubbed. E2E_TEST_ plans only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 31b2dd20 | Only the version string changed. 0 new failures, floor regressions or console errors. The only HTTP error is the expected 404. |
| hostv4 / guests-e / swipe / batch | 40/40, 30/30, 55/55, all states ok |
| day-31b2 (#291, #294 re-run) | All ok at 5 sizes; 0 page errors |
| #295 evening before (Thanksgiving dated 11/26, clock 11/25 4:00 PM EST) | ok at 5 sizes. Subtitle "Tomorrow · guests at 3:00 PM". Tonight: "Cook the make-ahead dishes", "Do the shopping". Button: "Done: cook the make-ahead dishes". "Tomorrow's weather" shows the rain card. Before tomorrow: Still to get 28 items / Reconfirm your vendors 1 to lock in / Rain backup Not set, each an `<a href="../hostv2/">`, none underlined, plus the line "open in the current app for now". |
| Tonight ticks (shared tick) | The button ticks step 1: "Done: Cook the make-ahead dishes… — 1 still open." The "Do the shopping" tick: "…0 still open. 40 items marked bought (40 at an estimate — tap any to add the real price)."; foodGot has 40 marks; Tonight and the button are gone; Before tomorrow now reads "Still to get · 4 rentals". |
| Count row | A list plan with a pending guest: "Final guest count · Not settled" opens Guests in hostv4. |
| hostv2 tick (toggleTask → lib/stepToggle) | Game Night, a late "Do the shopping" step: the board card's "Mark done" ticks it, foodGot gets 26 marks, and the card leaves. Same behavior as before. |

## Question (not a regression)
Before the shopping tick, "Still to get" read 28 items (24 food plus 4 rentals, judging by the 4 rentals left afterwards), but the tick marked 40 food-list items bought. The count probably leaves out list lines it doesn't count (pantry or optional items?). Worth a look that the two readers mean the same list.
