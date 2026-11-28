# Live check fe7b6960 (includes #326 one-guest sheet, #327 email look, #331 docs): Sat Nov 28, 2026, ~1:20–1:45 PM EST

Live: the hostv4 `ngw-build` meta reads fe7b6960 (deployed 11:02 AM EST). 191ef9c9 (#326) was already superseded when I started, so I checked fe7b6960, which includes it. Signed out. Every POST/PUT/PATCH/DELETE was aborted. E2E_TEST_ plans, example.com guests and 555 phones. tel:/sms:/mailto: were read, never opened. Nothing sent.

## Regressions
None.

| Check | Result |
|---|---|
| hostv2 run.cjs vs 1ae1ef56 | 0 new failures, floor regressions or console errors; only the version changed |
| hostv4 / guests-e / swipe / reach / guests-kit | 40/40, 30/30, 55/55, 5/5, 15/15 |
| hostv4-batch-278 | 33/36; the same 3 "center" misses, identical numbers |
| v2kit (6), signedout (3), replies (9), import-esc (4), header (7) | all ok, 0 page errors |

## #326 one-guest sheet (`guest-sheet-fe7b.cjs`, 390 dark/light, 834, 1024, 1194, 1440)
| Item | Result |
|---|---|
| Name field shows "Ada Pine" | ok |
| Call / Text / Email | `tel:2025550101`, `sms:2025550101`, `mailto:ada.pine%40example.com` |
| Group | input `list="gk-groups"`; datalist has the plan's groups (Family, Work) |
| Nudge row | "Nudge Ada" when she has a per-guest invite record (`invitedAt`) |
| Rename in place | "Ada Pine-Smith" saved; old name kept as `aka: ["ada pine"]` |
| Page errors / sideways | 0 / 0 |

## Finding: "Nudge the 2 who haven’t replied" covers the back link (hostv2 ?guests=kit, 1024 / 1194 / 1440)
- The list pane's top button (302px wide, right-aligned to the pane's edge at 584px) runs from x=282, over "‹ Your plan" (217–329).
- The overlap is 46px, and the back link reads "‹ Your" behind it (screenshot `guest-sheet/1194x834-dark-list.jpg`).
- 390 and 834: the button sits elsewhere (bottom bar / right side), so there is no overlap.
- hostv4 with the same plan: the button sits at 341–643, so there is no overlap.
- Likely cause: a longer label in a pane only ~400px wide. I can't load the pre-#326 build to compare, but this button and label predate #326.

## Question (not a bug)
On a plan shared only by link (`invitesSentAt`, no per-guest `invitedAt`), the one-guest sheet shows no "Nudge <name>" row: `canNudge` needs `wasInvited`. Since #324, the path's Replies line counts the whole list as invited in that case. Is that intended?
