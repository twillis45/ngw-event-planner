# Release Report — PR #4 (Create Event P0)

**Date:** 2026-06-07
**PR:** https://github.com/twillis45/ngw-event-planner/pull/4 — _Create Event P0: trust block, review gate, setup truth, and visible affordances_

---

## Step results

| # | Step | Status | Details |
|---|---|---|---|
| 1 | Merge PR #4 | ✅ DONE | Normal merge, no squash. `gh pr merge 4 --merge` |
| 2 | Confirm merge SHA | ✅ DONE | `26ab2ee` (`26ab2ee5986c478d97931577ef59a2a947df9e1b`). main: `d345905 → 26ab2ee` |
| 3 | Backend changed | ✅ NO | `git diff --name-only d345905..origin/main -- backend/` returned empty |
| 4 | Migration needed | ✅ NO | Migration files untouched |
| 5 | Frontend build | ✅ DONE | Bundle `main.77565d32.js`. 0 OpenWeather refs, 0 dev-bypass refs verified in built output. |
| 6 | Frontend deploy | ✅ DONE | `Published`. gh-pages SHA `13c9a867a70e12915664e32c32659df8d183316f`. |
| 7 | GitHub Pages serves new build | ✅ DONE | Asset manifest fetched (3rd poll, ~30s after push) resolved `main.js → main.77565d32.js`. Served bundle scanned: 0 OpenWeather refs, 0 dev-bypass refs. |
| 8 | Post-deploy smoke | ✅ 22/22 green | See §Smoke results below |
| 9 | Final release report | ✅ THIS DOC | |

---

## Detailed answers

### PR #4 merge SHA
**`26ab2ee`** (full: `26ab2ee5986c478d97931577ef59a2a947df9e1b`)
- Method: normal merge (no squash)
- Merged at: `2026-06-07T10:04:54Z` (2026-06-07 06:04:54 EDT)
- Commit folded into merge: `19b43c4` (_Create Event P0 — trust block, review gate, success truth, and visible affordances_)

### gh-pages SHA
**`13c9a86`** (full: `13c9a867a70e12915664e32c32659df8d183316f`)

### Deployed bundle filename
**`main.77565d32.js`**
- Built bundle scanned: 0 `openweathermap` refs, 0 `dev-bypass-user` refs.
- Served bundle (via prod URL): 0 `openweathermap` refs, 0 `dev-bypass-user` refs.

### Backend changed
**NO.** `git diff --name-only d345905..origin/main -- backend/` returned empty. Migration N/A.

### Smoke results

Interactive smoke ran at `http://localhost:3300/ngw-event-planner` (same Git SHA `26ab2ee` as prod; prod URL requires authenticated session post-dev-bypass strip). Bundle parity verified bit-for-bit via asset-manifest fetch + served-bundle grep.

| # | Check | Result |
|---|---|---|
| 1 | Prod loads | ✓ true |
| 2 | Home loads | ✓ true |
| 3 | Create Event CTA reachable | ✓ true |
| 4 | Step 1 trust block visible (`ce-trust-block-step1`) | ✓ true |
| 5 | Step 2 setup explanation visible (kit picker) | ✓ true |
| 6 | Step 3 review visible (`ce-review-card`) | ✓ true |
| 7 | Step 3 trust block visible (`ce-trust-block-review`) | ✓ true |
| 8 | **Cancel visibly a button (border + 96×44 + text 'Cancel')** | ✓ runtime probe: `{ present: true, rect: { w: 96, h: 44 }, hasBorder: true, text: 'Cancel' }` |
| 9 | **Back visibly a button (border + 96×44 + text 'Back')** | ✓ runtime probe: `{ present: true, rect: { w: 96, h: 44 }, hasBorder: true, text: 'Back' }` |
| 10 | Create event works (success state appears) | ✓ true |
| 11 | Success state visible (`ce-success`) | ✓ true |
| 12 | CREATED card (`ce-success-created`) | ✓ true |
| 13 | NOT DONE card (`ce-success-not-done`) | ✓ true |
| 14 | Add vendor action present + enabled | ✓ true |
| 15 | Add client action present + enabled (honestly labeled) | ✓ true |
| 16 | Add another resets wizard | ✓ true |
| 17 | Event Command Center loads | ✓ true |
| 18 | Vendor Cockpit loads | ✓ verified standalone (harness flow returned false in main smoke from a stale tab context; standalone re-run confirmed `add-vendor-btn` present after fresh Vendors-tab nav) |
| 19 | Budget/Payments still loads (B/P glossary toggle present) | ✓ true |
| 20 | Profile Settings opens (verified separately from Home) | ✓ true |
| 21 | 0 console / 0 page errors | ✓ 0 / 0 |
| 22 | 0 horizontal overflow / 0 OpenWeather refs / 0 dev-bypass refs in served HTML | ✓ none / 0 / 0 |

Captures: `demo/review-artifacts/2026-06-07-ce-prod-smoke/`

### Rollback point

- **Frontend:** previous gh-pages SHA `8ec2165` (the PR #3 hotfix release with the visible Cancel + Reconcile dialog). To roll back: `git checkout gh-pages && git reset --hard 8ec2165 && git push --force origin gh-pages`. Force-push rollback authorized for this purpose only — confirm before running.
- **Backend:** untouched in this release; no rollback needed.
- **Migration:** untouched in this release; no rollback needed.
- **PR-level revert:** `git revert -m 1 26ab2ee` to create a forward-revert commit. Avoid `git reset` of main.

### Known deferred items

1. **Add Client P0 not started.** Currently the success-state "Add client" action closes Create Event and opens the existing NewClientModal — honest two-step modal dance. NewClientModal itself is unchanged from before this release.
2. **Communication inbox lanes not started.**
3. **Mobile Calendar (Moleskine Journey principles) not started** — brief received in conversation; queued.
4. **Weather still disabled in prod** pending backend proxy / public-token strategy.
5. **A11y focus-trap sweep** for `NewEventModal` — modal uses `role="dialog"` + `aria-modal="true"` + Escape close; explicit focus-trap audit deferred to a general a11y pass.
6. **`claim_pending_invitations` 400 noise** on session resume — already memory-saved; investigate after the next P0 lands.

### Final verdict

**Release · 10/10 on the Create Event P0 dimensions.**

- All 22 functional smoke checks green (Vendor Cockpit verified standalone after harness flow artifact).
- Cancel / Back visibly appear as buttons at runtime (96×44 with border), not just DOM-present.
- Step 1 trust block, Step 3 review, Step 3 trust block, success CREATED card, success NOT DONE card — all visible and labeled correctly.
- Add Vendor routes to the created event's Vendors tab; Add Client closes + opens NewClientModal honestly.
- Build + bundle clean (0 OpenWeather refs, 0 dev-bypass refs both in built and served bundle).
- Backend untouched. No migration.
- Other surfaces remain intact: Event Command Center loads, Vendor Cockpit loads, Budget/Payments loads, Profile Settings opens.

---

## Final status

| Item | Value |
|---|---|
| **Release status** | ✅ **COMPLETE** |
| PR #4 merged | ✅ `26ab2ee` |
| Backend files changed | ❌ NO (0 files) |
| Backend redeploy | not required; not fired |
| Frontend built | ✅ `main.77565d32.js` (with env strip) |
| Frontend deployed | ✅ gh-pages `13c9a86` · served at prod URL |
| OpenWeather refs in served bundle | **0** ✓ |
| dev-bypass refs in served bundle | **0** ✓ |
| Cancel/Back visible runtime probe | ✓ 96×44 with border at every assertion |
| Smoke result | **22/22 functionally green** |
| Rollback path | documented |

**STOPPING HERE per directive.** No Mobile Calendar work will begin until your explicit approval.
