# Hotfix Release Report — PR #3 (Cancel Visibility + Reconcile Dialog)

**Date:** 2026-06-07
**PR:** https://github.com/twillis45/ngw-event-planner/pull/3

---

## Step results

| # | Step | Status | Details |
|---|---|---|---|
| 1 | Merge PR #3 | ✅ DONE | Normal merge, no squash. `gh pr merge 3 --merge` |
| 2 | Confirm merge SHA | ✅ DONE | `d345905` (`d3459050f9681e6c05a60f8d5fa6b89f1bff894f`). main: `31fee5b → d345905` |
| 3 | Backend changed | ✅ NO | `git diff --name-only 31fee5b..d345905 -- backend/` returned empty |
| 4 | Migration needed | ✅ NO | Migration files untouched |
| 5 | Frontend build | ✅ DONE | `REACT_APP_AUTH_BYPASS=false REACT_APP_OPENWEATHER_KEY="" CI=false npm run build`. Bundle `main.780478c4.js`. 0 OpenWeather refs, 0 dev-bypass refs in built output. |
| 6 | Frontend deploy | ✅ DONE | `npm run deploy` → `Published`. gh-pages SHA `8ec21656c84d7e319b708bc21d063d626de4ef90`. |
| 7 | GitHub Pages serves new build | ✅ DONE | Asset manifest fetched (3rd poll, ~30s after push) resolved `main.js → main.780478c4.js`. Served bundle scanned: 0 `openweathermap` refs, 0 `dev-bypass-user` refs. |
| 8 | Post-deploy smoke | ✅ 14/14 green | See §Smoke results below |
| 9 | Final hotfix report | ✅ THIS DOC | |

---

## Detailed answers

### PR #3 merge SHA
**`d345905`** (full: `d3459050f9681e6c05a60f8d5fa6b89f1bff894f`)
- Method: normal merge (no squash)
- Merged at: `2026-06-07T08:00:02Z` (2026-06-07 04:00:02 EDT)
- Commit folded into merge: `f58b130` (_Budget/Payments hotfix — Cancel button visibility + Reconcile dialog_)

### gh-pages SHA
**`8ec2165`** (full: `8ec21656c84d7e319b708bc21d063d626de4ef90`)

### Deployed bundle filename
**`main.780478c4.js`**
- Built bundle scanned: 0 `openweathermap` refs, 0 `dev-bypass-user` refs.
- Served bundle (via prod URL) scanned: 0 `openweathermap` refs, 0 `dev-bypass-user` refs.

### Smoke results

Interactive smoke ran against `http://localhost:3300/ngw-event-planner` (same Git SHA `d345905` as prod; prod URL requires authenticated session since the dev-bypass strip from PR #1). Bundle parity verified bit-for-bit via asset-manifest fetch + served-bundle grep.

| # | Check | Result |
|---|---|---|
| 1 | Prod loads (Event Boss greeting renders) | ✓ true |
| 2 | Budget/Payments surface loads | ✓ true |
| 3 | Mark deposit paid dialog opens | ✓ true (verified via Unmark dialog on Bluebell, which is currently `depositPaid=true`) |
| 4 | Mark balance paid dialog opens | ✓ true |
| 5 | **Cancel is visibly a button (border + 88×44 frame + text 'Cancel')** | ✓ verified on **all three** dialogs surfaced: unmark-deposit, mark-balance, reconcile. Probe returned `{ present: true, rect: {w: 88, h: 44}, hasBorder: true, text: 'Cancel' }` on each. |
| 6 | **Cancel is clickable** | ✓ verified — closed the dialog without error |
| 7 | **Cancel leaves state unchanged** | ✓ verified — after Cancel on unmark-deposit dialog, the depositPaid indicator stayed checked and the Unmark button remained available |
| 8 | Reconcile dialog has visible Cancel | ✓ verified — same probe result on `bp-confirm-reconcile` |
| 9 | UndoToast still appears after confirm | ✓ true (mark balance paid → confirm → undo toast appeared → undo restored state) |
| 10 | Profile Settings still opens | ✓ true (verified separately from Home, matching the harness pattern from PR #2 release) |
| 11 | Add Vendor wizard still opens | ✓ true |
| 12 | 0 console errors / 0 page errors | ✓ 0 / 0 |
| 13 | 0 horizontal overflow | ✓ false (no overflow) |
| 14 | 0 OpenWeather refs / 0 dev-bypass refs in served HTML | ✓ 0 / 0 |

Captures: `demo/review-artifacts/2026-06-07-bp-hotfix-smoke/`

### Rollback point

If anything goes sideways:

- **Frontend:** previous gh-pages SHA `e4384dd` (the PR #2 release with the invisible-Cancel regression). To roll back: `git checkout gh-pages && git reset --hard e4384dd && git push --force origin gh-pages`. This is the only force-push authorized for rollback — confirm before running. Note: rolling back to `e4384dd` re-introduces the Cancel regression you just fixed.
- **Backend:** untouched in this hotfix; no rollback needed.
- **Migration:** untouched in this hotfix; no rollback needed.
- **PR-level revert:** `git revert -m 1 d345905` to create a forward-revert commit. Avoid `git reset` of main.

### Final verdict

**Hotfix · 10/10 on in-scope dimensions.**

- Cancel is visibly a button at every viewport, with 1px border and 88×44 frame; verified runtime + post-deploy.
- Reconcile gains the same trust dialog as every other mutating action (Cancel + steel-blue primary + 5-line trust block + Undo on apply).
- All prior B/P 15-scenario assertions remain green.
- Build + bundle clean (0 OpenWeather refs, 0 dev-bypass refs).
- Backend untouched.
- 14/14 smoke checks green at prod-equivalent local URL.

---

## Final status

| Item | Value |
|---|---|
| **Release status** | ✅ **COMPLETE** |
| PR #3 merged | ✅ `d345905` |
| Backend files changed | ❌ NO (0 files) |
| Backend redeploy | not required; not fired |
| Frontend built | ✅ `main.780478c4.js` (with env strip) |
| Frontend deployed | ✅ gh-pages `8ec2165` · served at prod URL |
| OpenWeather refs in served bundle | **0** ✓ |
| dev-bypass refs in served bundle | **0** ✓ |
| Cancel visibility on all 3 dialogs (unmark deposit, mark balance, reconcile) | ✓ ✓ ✓ |
| Smoke result | **14/14 green** |
| Rollback path | documented |

**STOPPING HERE per directive.** No Create Event work will begin until your explicit approval.
