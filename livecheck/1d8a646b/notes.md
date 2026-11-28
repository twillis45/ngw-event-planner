# Live check 1d8a646b (#323: kit saved line inside the page, Escape closes import): Sat Nov 28, 2026, ~7:35–7:55 AM EST

Live: the hostv4 `ngw-build` meta reads 1d8a646b (deployed 7:19 AM EST); the hostv2 bundle carries the same sha. Signed out. Every POST/PUT/PATCH/DELETE was aborted (only Sentry). E2E_TEST_ plans, example.com guests. Nothing sent.

## Regressions
None.

| Check | Result |
|---|---|
| hostv2 run.cjs vs 2b71d6e0 | 0 new failures, floor regressions or console errors. Only the version changed (2026.11.28.4). |
| hostv4 / guests-e / swipe / reach / guests-kit | 40/40, 30/30, 55/55, 5/5, 15/15 |
| hostv4-batch-278 | 33/36; the same 3 "center" misses, identical numbers |
| v2kit (390 dark/light, 834, 1024, 1194, 1440) | all ok, 0 page errors |
| signedout (390 dark/light, 1194) | all ok |
| header #318 | ok at all 7 variants |

## #323 verified (`import-esc-1d8a.cjs`, 390 dark/light, 1194, 1440)
- After answering, "Planning around 2 now. Undo" sits inside the kit page, right under "Planning for 2" (top 125–131px). It is on screen, there are 0 fixed toasts, and it overlaps 0 other controls. This fixes the toast-over-rows finding from f3b65ccb.
- ⋯ → "Import a list" opens hostv2's Guest list sheet. Escape closes it back to the kit's Guests view, and the kit stays open.
- The saved line still clears after ~6 s, as before (v2kit `row-swipe` waits 6.0–6.1 s).

## Still open
- Signed out, Share the link still says "…Open it once in the current app, signed in, and it saves." (`LINK_WHY.unpublished`).
- "Replies 0 of 0" after a reply (from the signed-in pass on f3b65ccb). Not rechecked here: it needs a sign-in.
