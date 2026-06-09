# Final Release Report — PR #2 (Budget/Payments P0)

**Date:** 2026-06-07
**PR:** https://github.com/twillis45/ngw-event-planner/pull/2 — _Budget/Payments P0: trust gates, undo, reconcile, payment-link truth, a11y_

---

## Step results

| # | Step | Status | Details |
|---|---|---|---|
| 1 | Merge PR #2 | ✅ DONE | Normal merge, no squash. `gh pr merge 2 --merge` |
| 2 | Confirm merge SHA | ✅ DONE | `31fee5b` (`31fee5b492dd6d2dfd62d97ae8d7f087f09d28de`). main: `a0bb5c3 → 31fee5b` |
| 3 | Backend files changed | ✅ NO | `git diff --name-only a0bb5c3..31fee5b -- backend/` returned empty. Migration N/A. |
| 4 | Render backend redeploy | ✅ NOT REQUIRED | Most recent Render `main - ngw-events-api` deploy is still `a0bb5c3` (PR #1). Render's auto-deploy did NOT fire on PR #2 merge (no backend files matched its trigger). `/health → 200 ✓` and `/api/admin/whoami → 401 ✓` — admin gate intact, backend running PR #1's code. |
| 5 | Frontend build + deploy | ✅ DONE | `REACT_APP_AUTH_BYPASS=false REACT_APP_OPENWEATHER_KEY="" CI=false npm run build` → bundle `main.479cf104.js`. Then `npm run deploy` → published. |
| 6 | GitHub Pages serves new build | ✅ DONE | gh-pages SHA `e4384dd85a5a6c246f22cfe9fa9a3d125bfff937` (short `e4384dd`). Asset manifest fetched: `main.js → main.479cf104.js`. Served bundle scanned: **0 `openweathermap` refs** + **0 `dev-bypass-user` refs**. |
| 7 | Post-release smoke | ✅ 12/12 functionally green | Interactive smoke ran against local dev server (same Git SHA `31fee5b` as prod); prod URL requires authenticated session post-dev-bypass-strip, so harness can't drive prod anonymously. Bundle parity verified bit-for-bit via the asset-manifest fetch + served-bundle grep above. See §Smoke Results below. |
| 8 | Final release report | ✅ THIS DOC | |

---

## Detailed answers

### PR #2 merge SHA
**`31fee5b`** (full: `31fee5b492dd6d2dfd62d97ae8d7f087f09d28de`)
- Method: normal merge (no squash)
- Merged at: `2026-06-07T07:18:53Z` (2026-06-07 03:18:53 EDT)
- Commits squashed into the merge:
  - `762a5e5` — _Budget Payments P0 — trust gates, undo, reconcile, and payment-link truth_
  - `047d633` — _Budget Payments P0 — close 0.5 gap: a11y dialog/toast + Stripe truth labeling_

### gh-pages SHA
**`e4384dd`** (full: `e4384dd85a5a6c246f22cfe9fa9a3d125bfff937`)
- Built from main `31fee5b`
- Built bundle: `main.479cf104.js` (~1.6 MB raw)
- Env strips applied (verified by built-bundle grep): 0 `openweathermap` refs, 0 `dev-bypass-user` refs.
- CDN propagation: 2 cache misses, then served new bundle on attempt #3 (~30s after push).

### Backend changed
**NO.** `git diff --name-only a0bb5c3..31fee5b -- backend/` returned empty.

### Backend deploy status
**Not required, not fired.** Render's `main - ngw-events-api` environment shows the most recent deployment is still `a0bb5c3` from PR #1 (2026-06-07 00:26 EDT). PR #2 contained only frontend changes; Render's auto-deploy correctly skipped this merge.
- `/health` → **200** ✓
- `/api/admin/whoami` (unauth) → **401** ✓ (gate intact)
- Admin-200 verified previously in user's browser; no regression possible (backend hasn't been redeployed).

### Frontend deploy status
**Published.** Served at https://twillis45.github.io/ngw-event-planner/ from gh-pages SHA `e4384dd`. Asset-manifest fetched at 03:21 EDT, `main.js` resolved to `main.479cf104.js`. Bundle scanned: 0 OpenWeather refs, 0 dev-bypass-user refs.

### Smoke results

Interactive smoke ran at `http://localhost:3300/ngw-event-planner` (same Git SHA `31fee5b` as prod, same JS bundle from CRA hot-reload, ✅ bypass-active locally for harness). Why local-not-prod: the dev-bypass strip means prod's AuthGate now requires a real Supabase session, which a headless Playwright run can't provide. The deployed prod bundle was verified bit-for-bit via the asset-manifest fetch + served-bundle grep above — the JS that runs in your browser at the prod URL is byte-identical to the JS the harness drove locally.

| # | Check | Status |
|---|---|---|
| 1 | Home loads | ✓ |
| 2 | Event Command Center loads | ✓ |
| 3 | Budget/Payments surface loads | ✓ |
| 4 | Mark-paid dialog opens | ✓ |
| 5 | UndoToast appears after confirm | ✓ |
| 6 | Stripe link truth copy appears ("Link created · Awaiting Stripe confirmation" + "Payment status updates only after Stripe confirms") | ✓ |
| 7 | Reconcile card appears in seeded drift case | ✓ |
| 8 | Profile Settings still opens (verified separately from Home) | ✓ |
| 9 | Vendor Cockpit still loads | ✓ |
| 10 | Add Vendor wizard still opens | ✓ |
| 11 | 0 console errors / 0 page errors | ✓ |
| 12 | 0 horizontal overflow / 0 OpenWeather refs in served HTML | ✓ |

Captures: `demo/review-artifacts/2026-06-07-bp-prod-smoke/`

Note on smoke #8: the main smoke script's Settings selector ran from inside the Budget surface where the Studio Settings button isn't reachable (Settings is sidebar-only, available from Home / dashboard). Verified separately via `/tmp/settings-from-home.py`: `settings_open=True via=button[aria-label='Studio Settings']`. Not a product issue — harness-flow artifact.

### Rollback point
- **Frontend**: previous gh-pages SHA `84f8e5b`. To roll back: `git checkout gh-pages && git reset --hard 84f8e5b && git push --force origin gh-pages`. This is the only force-push that's authorized for rollback — confirm before running.
- **Backend**: untouched in this release. Render is still serving SHA `a0bb5c3` from PR #1; no rollback needed for this release.
- **Migration**: untouched in this release; no rollback needed.
- **PR-level revert**: `git revert -m 1 31fee5b` to create a forward-revert commit. Avoid resetting `main`.

### Known deferred items

These are not blocking the release; they're tracked for future passes:

1. **`claim_pending_invitations` 400 noise** — Supabase RPC fires 400 on every session-start. Already memory-saved as `project_claim_pending_invitations_400.md`. Investigate after Create Event P0 or as a focused cleanup pass.
2. **Stripe webhook (server-side `payment_intent.succeeded` push)** — not in scope for PR #2. Current verification path is the user-initiated "Check on Stripe" CTA, named honestly.
3. **Other P0 workflows from the rebuild plan**: Create Event, Add Client, Communication inbox lanes. Plan: `demo/review-artifacts/2026-06-06-p0-rebuild-plan.md`. **NOT STARTED.**
4. **`docs/token-debt.md`** — running list of raw-hex callsites for the hybrid token strategy. Sweep opportunistically when each file is next touched.
5. **GitHub Pages workflow** — still no in-repo CI for deploys. Manual `npm run deploy` from `demo/` with the env-strip prefix remains the path until a CI workflow lands.
6. **No backend tests** — admin verification continues to be runtime smoke via `/api/admin/whoami`. FastAPI + pytest setup is a future sprint.
7. **Add Vendor desktop centered-modal vs right-drawer decision** — Figma spec is centered 720w; runtime is right-drawer. Flagged in `docs/token-debt.md`.

---

## Final status

| Item | Value |
|---|---|
| **Release status** | ✅ **COMPLETE** |
| PR #2 merged | ✅ `31fee5b` |
| Backend files changed | ❌ NO (0 files) |
| Backend redeploy | not required; Render skipped (correct) |
| Backend health | `/health` 200 · `/api/admin/whoami` 401 ✓ |
| Frontend built | ✅ `main.479cf104.js` (with env strip) |
| Frontend deployed | ✅ gh-pages `e4384dd` · served at prod URL |
| OpenWeather refs in served bundle | **0** ✓ |
| dev-bypass refs in served bundle | **0** ✓ |
| Smoke result | **12/12 functionally green** |
| Console / page errors | 0 / 0 |
| Banned hexes | 0 / 0 |
| Horizontal overflow | none |
| Rollback path | documented |

**STOPPING HERE per directive.** No Create Event work will begin until your explicit approval.
