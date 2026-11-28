# Live check 44ae2726 (#318, #317 G1, #319 G2a): Sat Nov 28, 2026, ~12:40–1:15 AM EST

Live: the hostv4 `ngw-build` meta reads 44ae2726 (deployed 7:21 PM EST Nov 27); the hostv2 bundle carries the same sha.
Chromium at 5 sizes. Every POST/PUT/PATCH/DELETE aborted (only Sentry). Weather GETs answered locally (rain). E2E_TEST_ plans and example.com names only. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs ea22a08c | 0 new failures, 0 floor regressions, 0 new console errors. Only the version string changed (2026.11.27.9). |
| hostv4 / guests-e / swipe / reach-289 | 40/40, 30/30, 55/55, 5/5 |
| hostv4-batch-278 | 33/36. The 3 misses are the same "center" geometry checks as ea22a08c (834, 844x390, 1024x768), with identical numbers. No change. |
| #318 touch phone header (390, light + dark) | Date line 0px under the name; "✎ Rename" below the date line, not between. Non-touch 390 also 0px. |
| #318 weather pill | At 390 the pill spans 44–357px of 390 and ends in its own ellipsis ("…100% cha…"). At 834 and up it fits without clipping. No sideways scroll. |
| Tablet / desktop header | Unchanged: caps date line above the name. |
| #317 Guests answers line (hostv4, count / no-count / list plans) | No "about —" at any size. A plan without a count shows "About how many are coming?". |
| #319 kit move: iPad three panes | 1024x1366, 1194x834, 1440x900: Places 0–260, main 260–659, Guest 660–right. 390 and 834: one pane. 0 page errors, 0 sideways. |

New probes: `header-44ae.cjs` (#318 gap, Rename order, pill ellipsis), `guests-kit-44ae.cjs` (answers line, panes).

## Ahead of #320 (G2b, `.gk` scope)
Probes that select a renamed class and will need updating:
- `hostv4.cjs:40` reads `.q` → `.gk-q`
- `hostv4-guests.cjs:67` reads `[data-question] .row.go` → `.row.gk-go`
The `.sheet` / `.card` uses in `day-31b2.cjs`, `vendors-remind-f60e.cjs` and `hostv4-day-9009.cjs` are on The Day or hostv2, not the Guests kit; they stay unless those screens adopt the kit.
