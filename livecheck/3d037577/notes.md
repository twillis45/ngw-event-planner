# Live check 3d037577 (#324: Replies counts link invites; signed-out Share wording): Sat Nov 28, 2026, ~8:20–8:40 AM EST

Live: the hostv4 `ngw-build` meta reads 3d037577 (deployed 8:04 AM EST); the hostv2 bundle carries the same sha. Signed out. Every POST/PUT/PATCH/DELETE was aborted. E2E_TEST_ plans, example.com guests. Nothing sent.

## Regressions
None.

| Check | Result |
|---|---|
| hostv2 run.cjs vs 1d8a646b | 0 new failures, floor regressions or console errors. Only the version changed (2026.11.28.5). |
| hostv4 / guests-e / swipe / reach / guests-kit | 40/40, 30/30, 55/55, 5/5, 15/15 |
| hostv4-batch-278 | 33/36; the same 3 "center" misses, identical numbers |
| v2kit (6 variants), signedout (3), import-esc (4), header #318 (7) | all ok, 0 page errors |

## #324 verified (`replies-3d03.cjs`, 390 dark, 390 light, 1194)
The plan's invite went out by link (`invitesSentAt` set, no guest `invitedAt`), with 3 guests:
- 1 Yes → "Replies 1 of 3"
- none → "Replies 0 of 3"
- Yes + No → "Replies 2 of 3"

That closes the "Replies 0 of 0" finding from the signed-in pass on f3b65ccb.

Share the link, signed out: "Your reply link isn’t ready. Your plan isn’t saved to your account yet. Sign in and it saves." with a [Sign in] button. "current app" no longer appears.

## Open items
None from this session's findings.
