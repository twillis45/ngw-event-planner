# Live check f3b65ccb (#320 G2b .gk scope, #321 G2c-1 hostv2 ?guests=kit): Sat Nov 28, 2026, ~4:20–5:15 AM EST

Live: the hostv4 `ngw-build` meta reads f3b65ccb (deployed 2:09 AM EST); the hostv2 bundle carries the same sha.
Chromium at 5 sizes (390 in dark and light). Every POST/PUT/PATCH/DELETE aborted (only Sentry). E2E_TEST_ plans, example.com guests. Nothing sent.

## Regressions
None.

## Results
| Check | Result |
|---|---|
| hostv2 run.cjs vs 44ae2726 | 0 new failures, 0 floor regressions, 0 new console errors. Only the version string changed (2026.11.28.2). |
| hostv4 / guests-e / swipe / reach-289 | 40/40, 30/30, 55/55, 5/5, after switching `.app`→`.gk-app, .app`, `.q`→`.gk-q, .q`, `.row.go`→`.row.gk-go, .row.go`. The `q` values read identically to 44ae2726. |
| hostv4-batch-278 | 33/36; the same 3 "center" geometry misses as 44ae2726/ea22a08c, identical numbers. |
| guests-kit-44ae (hostv4) | 15/15: no "about —"; three panes at 1024/1194/1440. |
| hostv2 ?guests=kit (`v2kit-f3b6.cjs`), 390 dark+light, 834, 1024, 1194, 1440 | All steps ok, 0 page errors, 0 sideways. |

### hostv2 ?guests=kit detail
- Layout: phone one pane; 834 one pane (no rail at that size); 1024 / 1194 / 1440 three panes. The kit's left edge equals `.srail`'s right edge (1194: rail 1–201, listpane 201–601, gk-gdetail 601–1194).
- Saved-answer line: after answering, "Planning around 2 now. Undo" shows on screen at every size. In hostv2 it is the toast (bottom; bottom-right at 1440), not hostv4's inline line under the header.
- Path: Your answers line reads "about 2 · by name · no +1s · adults only · replies by Dec 9". Guests → Review your invite (view `invite`) → Design this page (view `invite-design`).
- Back, in-page: "‹ Your invite" → invite, "‹ Guests" → guests.
- Back, browser/phone: from Design this page, one Back → invite, the next → guests.
- Row swipe (touch): left swipe on Bo Reed reveals "Mark Bo Reed can’t make it"; tapping it saves rsvp No. Passes at 390, 834, 1024, 1194 once the toast has cleared.
- Without the flag: no `.gk`; the old sheet (#sheet-title) opens.

## Observation (product call, not a regression)
For ~6 s after the last question ("Reply-by date set — your invite and the nudges read it. Undo"), hostv2's toast covers the guest rows:
- 390: it sits over the "No reply yet" group, just above the "Review your invite" button.
- 1194: it straddles the list/detail boundary (about 397–797px) over the Bo Reed row.
A swipe or tap there in that window hits the toast, or opens the guest behind it. hostv4 shows the same answer inline, so it doesn't overlap. (The probe now waits for the toast to clear, so the passing run's screenshots no longer show the overlap; v2kit/1194x834-dark/07-swipe-back.jpg, from an earlier pass, shows the same toast covering the "Your message" box on Design this page.)
