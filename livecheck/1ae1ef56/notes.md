# Live check 1ae1ef56 (#325: Delete on account-synced plans): Sat Nov 28, 2026, ~9:30–9:50 AM EST

Live: the hostv4 `ngw-build` meta reads 1ae1ef56 (built 9:06 AM EST); the hostv2 bundle carries the same sha. Signed out. Every POST/PUT/PATCH/DELETE was aborted. E2E_TEST_ plans, example.com guests. Nothing sent.

## Regressions
None.

| Check | Result |
|---|---|
| hostv2 run.cjs vs 3d037577 | 0 new failures, floor regressions or console errors. Only the version changed (2026.11.28.6). |
| hostv4 / guests-e / swipe / reach / guests-kit | 40/40, 30/30, 55/55, 5/5, 15/15 |
| hostv4-batch-278 | 33/36; the same 3 "center" misses, identical numbers |
| v2kit (6), signedout (3), replies (9), import-esc (4), header #318 (7) | all ok, 0 page errors |

## Not verified here
#325 changes plans that sync from an account, so it needs a sign-in. A run on the demo account would:
- delete only a throwaway E2E_TEST_ plan made through Create;
- confirm the plan stays gone after a reload;
- read the server to confirm the plan is gone and "My Friendsgiving" is unchanged.

The earlier sign-in session was signed out and deleted, so this needs a new owner-sent link.
