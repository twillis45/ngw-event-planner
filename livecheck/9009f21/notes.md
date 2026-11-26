# Live check 9009f21 (#281–#286, #288): Thu Nov 26, 2026, 4:51–5:25 AM EST

Live confirmed at 4:51 AM EST: hostv2 bundle and hostv4 `ngw-build` meta both read `9009f2148f5f`.
Chromium, 5 sizes (390×844, 834×1194, 1024×1366, 1194×834 touch, 1440×900). Every POST/PUT/PATCH/DELETE aborted. Share, clipboard and open stubbed. E2E_TEST_ plans only. Nothing sent.

## Regressions
None. All existing suites match c6e6c5a.

## Results

| Check | Result |
|---|---|
| hostv2 run.cjs vs c6e6c5a | 0 new failures, 0 floor regressions, 0 new console errors. The only HTTP error is the expected 404 on public/announcements/test-two-days. 0 401s. Changes: the version string, and The Day now leads with "Before guests arrive" (expected, #288). |
| hostv4.cjs (budget, 40 steps) | 40/40 ok |
| hostv4-guests-e (30) | 30/30 ok (More has Share, Download and Tell me only) |
| hostv4-swipe (55) | 55/55 ok |
| hostv4-batch-278 path | question / noNames / named / pastReplyBy ok at all sizes. `sent` is "Replies lit, no button" when no guest has contact info: the same as c6e6c5a, already raised and kept by the parent. Updates signed-out, centering and contact all ok. |
| #281/#288 The Day, Thanksgiving, 10:00 AM EST, 3 PM start | ok at 5 sizes. "Before guests arrive", 10 rows, including "Everyone has a sober way home" and "Kitchen fire basics checked". "If something goes wrong" holds "Grease or grill fire". Moment: Group photo (meal-first rule). No sideways scroll. |
| #281 every type (390) | Card on Birthday (Toast), Housewarming (Group photo), Baby Shower (Games), Graduation (Recognition speech), Friendsgiving (Group photo). Rides row on Birthday, Housewarming, Graduation, Friendsgiving; none on Baby Shower. "New Year's Eve" is not one of the 47 playbook types, so it falls back to Group photo with no rides row (not counted). |
| #283 framed guest page | ok at 5 sizes. The iframe `../hostv2/?invite-preview=E2E_TEST_lc-inv` shows the plan ("Rosa"). 0 sideways scroll in the frame and the page. "See the full invite" toggles. Plan unchanged. 0 writes beyond the aborted Sentry POST. |
| #285 links ≥ 44×44 | ok. No link or `.link` under 44 on Your invite, the full invite, Design this page, Your plan or Next step, at 5 sizes. |
| #286 Design this page | ok at 5 sizes. Opens, the back link reads "Your invite", and the plan in localStorage is unchanged after opening. |

## Finding (not a regression): #284 counts still differ on the day

Seeded Thanksgiving, today, 6 days old, 8 steps (leadDays −14, −10, −5 done, −3, −2, −1, 0, +3). The app merged the playbook steps in.
At 10:00 AM EST the same Plan board shows three counts:
- The Day alert: **"20 things still open"** (open past their window);
- Final run-through card: **"27 plan steps still open"** (every unfinished step, including today's and later);
- Checklist row: **"Needs you — 9 overdue"** (taskIsOverdue, reachable only).

#284's two stated changes hold. The banner now counts unreachable steps (20 > 9), and the checklist line leaves out plan-handled steps (0 here). The three numbers count different things, but they are labelled alike, so the owner's "App is lying somewhere" can still happen. Same at all 5 sizes. Screenshots: day-probe/<vp>/02-still-open-parity.jpg.

## Files
- `livecheck/hostv4-day-9009.cjs`: new probe (The Day, parity, framed invite, Design this page, links).
- `day-probe/`, `hostv4/`, `hostv4-guests-e/`, `hostv4-swipe/`, `hostv4-batch/`, `results.json`, `summary.md`, `diff-from-c6e6c5a.md`, and `_*.log`.
