# Live check 2b71d6e0 (#322: kit steps open hostv2's own sheets): Sat Nov 28, 2026, ~6:20–6:35 AM EST

Live: the hostv4 `ngw-build` meta reads 2b71d6e0 (deployed 6:08 AM EST); the hostv2 bundle carries the same sha. Signed out. Every POST/PUT/PATCH/DELETE was aborted (only Sentry). E2E_TEST_ plans, example.com guests. Nothing sent.

## Regressions
None.

| Check | Result |
|---|---|
| hostv2 run.cjs vs f3b65ccb | 0 new failures, 0 floor regressions, 0 new console errors. Only the version changed (2026.11.28.3). |
| hostv4 / guests-e / swipe / reach-289 / guests-kit | 40/40, 30/30, 55/55, 5/5, 15/15 |
| hostv4-batch-278 | 33/36; the same 3 "center" misses, identical numbers |
| hostv2 ?guests=kit (`v2kit-f3b6.cjs`), 390 dark + light (via ngw-theme), 834, 1024, 1194, 1440 | all ok, 0 page errors |
| Signed-out Guests (`signedout-kit-f3b6.cjs`), 390 dark + light, 1194 | all ok, 0 page errors, only Sentry blocked |
| #318 header recheck | ok at all sizes, light really light |

## Expected changes (#322), signed out
- Send sheet: "…Sign in once in the current app, then come back here. [Sign in in the current app]" → "Sending uses your account, so replies come back to this plan. [Sign in]".
- ⋯ More: "Importing a list and the QR code are in the current app for now. Open the current app" → "Show QR code" and "Import a list" buttons.
- Updates and questions: "…Sign in from the current app first. [Open the current app]" → "…need this plan saved to your account. [Sign in]".

## Leftover wording (small)
Share the link, signed out, still says: "Your reply link isn’t ready. Your plan isn’t saved to your account yet. Open it once in the current app, signed in, and it saves." Everywhere else in the kit now offers "Sign in" in place. (Source: `LINK_WHY.unpublished` in src/guestsKit/sendKit.jsx.)
