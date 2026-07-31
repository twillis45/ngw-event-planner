# Solemn Protection — Production Deployment

**Date:** 2026-07-31 · **PR #64** · **Merge `1bf26588`** · **Profile:** `demo`

---

## 1. Recommendation

**ACCEPT.**

Every acceptance criterion passed. Production no longer tells a grieving family
they are late.

The harm, as it read in production **before** this deployment:

> "Mostly on course — **a few decisions are past their easy window**."
> "**past its window**"

And **after**, on the same repast fixture at all three viewports:

```
4 DAYS · REPAST
Who provides the food?
Let the church / repast committee bring it   ← our pick
2 of 5 settled
```

Zero banned phrases. The decision is still named, the count is still grounded,
and the culturally correct proposal still leads.

---

## 2. Mutation evidence — each guard proven independently

Both guards were neutralised **one at a time**, so neither can be carried by the
other. Restored exactly after each.

### Mutation A — slips guard removed (`if (od && !solemn)` → `if (od)`)

```
✓ the shell can tell a solemn event from an ordinary one
✕ SURFACE 1 — the overdue-count clause is suppressed on a solemn event
✓ SURFACE 2 — the hero due chip drops the overshoot on a solemn event
✓ only the OVERSHOOT is dropped — forward states still print
✕ non-solemn events are untouched — every guard only ADDS a condition
Tests: 2 failed, 3 passed
```

Failing assertion: `Expected pattern: /if \(od && !solemn\) slips\.push\(/`
**Due-chip protection remained intact** (SURFACE 2 green).

### Mutation B — due-chip guard removed (`if (solemn && a.dueInDays < 0) return null;` deleted)

```
✓ the shell can tell a solemn event from an ordinary one
✓ SURFACE 1 — the overdue-count clause is suppressed on a solemn event
✕ SURFACE 2 — the hero due chip drops the overshoot on a solemn event
✓ only the OVERSHOOT is dropped — forward states still print
✕ non-solemn events are untouched — every guard only ADDS a condition
Tests: 2 failed, 3 passed
```

Failing assertion: `Expected pattern: /if \(solemn && a\.dueInDays < 0\) return null;/`
**Slips protection remained intact** (SURFACE 1 green).

The fifth test fails in both cases by design — it asserts *both* guards, so it is
a whole-fix gate rather than a per-surface one. Attribution stays unambiguous
because SURFACE 1 and SURFACE 2 each name their own pattern.

### Post-mutation

Both guards restored: **5 passed, 5 total** · `git status` empty ·
`git diff --check` clean · no mutation artifacts committed · PR diff unchanged.

---

## 3. Merge

| | |
|---|---|
| PR | **#64** — *fix: protect solemn events from blame language* |
| PR head SHA | `541a20a999ef820cbfb70b1c5c63d1947ea34f9a` |
| Method | merge commit (repository convention) |
| Merge SHA | **`1bf2658819efead73fd36497ec39f7e93e44a611`** |
| Resulting `main` | `1bf26588` |
| Merged | 2026-07-31T12:30:58Z by `twillis45` |

Pre-merge confirmations: mergeable/CLEAN · checks green · 0 reviews, 1 comment
(automated Supabase integration notice, not a review) · changed files limited to
`hostv2/src/HostShellV2.jsx`, `src/lib/__tests__/solemnBlameLanguage.test.js`,
`public/hostv2/` · `src/lib/solemn.js` **not** included · `pages.yml` untouched ·
no live configuration.

One check needed reading rather than trusting: a grep for live config matched 5
times in the PR diff. All five were `{}.REACT_APP_API_BASE_URL` — the bare
identifier a bundler leaves when the variable is **unset**, with no value
attached. Decisive checks on the artifact confirmed: no concrete Supabase host,
no JWT, no backend origin.

---

## 4. `main` CI on the merge commit

Run **30630902947** — `jest` ✅ · `e2e` ✅.

⚠️ Scope note: `main`'s `checks.yml` has only those two jobs. The `backend`,
`cra-build` and `hostv2-drift` jobs exist only on `grounded-decision-surface` and
are **not** yet on `main`. Backend tests, Jest and the CRA build are nevertheless
executed by the deployment workflow itself, and all three were verified locally
before merge (Jest 271/4045 green in both UTC and America/New_York, backend 147
passed, CRA build exit 0, hostv2 drift clean).

---

## 5. Deployment

| | |
|---|---|
| Run ID | **30631257775** |
| URL | https://github.com/twillis45/ngw-event-planner/actions/runs/30631257775 |
| Ref / profile | `main` · **`demo`** |
| Commit | `1bf2658819efead73fd36497ec39f7e93e44a611` |
| Started → completed | 2026-07-31T12:36:52Z → 12:39:32Z |

All stages passed: backend tests · unit suite · demo configuration validation ·
release build (hostv2 + CRA) · SHA/profile stamping · demo no-live-config check ·
artifact secret scan · Pages upload · **Pages deployment**.
*Verify CRA/hostv2 configuration parity* **skipped** — live-only, correct for demo.

Repository variables and secrets were **0** at dispatch time; no
`REACT_APP_API_BASE_URL`, `_SUPABASE_URL`, `_SUPABASE_ANON_KEY` or
`_AUTH_REDIRECT` was set or used.

---

## 6. Deployed artifact identity

Verified from the **public** site, not the workflow result:

```
1bf2658819efead73fd36497ec39f7e93e44a611
release_profile=demo
built 2026-07-31T12:39:14Z from 1bf2658819efead73fd36497ec39f7e93e44a611
capability=open-demo-localstorage-only (NOT live-production capable)
```

- SHA **equals the merge commit** ✓
- Asset hash **changed**: `index-5d0ac30d.js` → `index-d1cbd794.js` ✓
- No stale laptop-built artifact remains ✓
- Deployed shell (`HostShellV2-f3362c8f.js`, 821 KB): **0** concrete Supabase
  hosts, **0** JWT-shaped strings, **0** backend origins, **0** secret patterns ✓

The deployed shell hash differs from the committed artifact
(`HostShellV2-c241908d.js`) because CI builds from a clean `npm ci` tree; the
drift gate compares source to artifact, and it passed.

---

## 7. Production verification (clean browser context per run)

| Surface | Check | Result | Evidence |
|---|---|---|---|
| Solemn | decision visible | ✅ | "Who provides the food?" |
| Solemn | "past their easy window" | ✅ absent | 0 hits |
| Solemn | "past its window" | ✅ absent | 0 hits |
| Solemn | blame "overdue" / "is late" / "was due" | ✅ absent | 0 hits |
| Solemn | calm runway | ✅ | "4 DAYS · REPAST" |
| Solemn | event label appropriate | ✅ | "Repast for Deacon Willie Hayes" |
| Solemn | grounded settled/open count | ✅ | "2 of 5 settled" |
| Solemn | culturally appropriate provider guidance | ✅ | "Let the church / repast committee bring it — our pick" |
| Solemn | crash / error boundary | ✅ none | |
| **Non-solemn** | ordinary overdue treatment survives | ✅ | "a few decisions are past their easy window" **and** "Was due 5 days ago." |
| Non-solemn | suppression did not leak | ✅ | game night unchanged |
| Demo | login wall | ✅ none | |
| Demo | localStorage persistence | ✅ | guest count 50→57 survived reload |
| Demo | false cloud-save claim | ✅ none | |

## 8. Viewports (Playwright device emulation)

| Viewport | Overflow | Clipped CTAs | Clipped rows | Clipped fixed | Hero clipped | Failed requests |
|---|---|---|---|---|---|---|
| 390×844 | none | 0 | 0 | 0 | no | 0 |
| 768×1024 | none | 0 | 0 | 0 | no | 0 |
| 1440×900 | none | 0 | 0 | 0 | no | 0 |

## 9. Console and network

- **Supabase calls: 0 · backend calls: 0 · analytics calls: 0** — in every clean
  context, at every viewport.
- Failed requests: **0**. Missing assets: none.
- Fatal console errors: **none**.
- One benign, non-fatal browser notice recorded separately: *"Blocked call to
  navigator.vibrate because user hasn't tapped on the frame yet"* — Chrome's
  user-activation policy under automation, not an application error.

This resolves the open question from the previous deployment: the earlier
Supabase/backend requests came from **leftover origin state**, not the artifact.
A clean context makes zero such calls.

---

## 10. Rollback

Available and unused.

| | |
|---|---|
| Prior known-good | `gh-pages` at `61f6d661` — unchanged |
| Prior demo release | `e619ec48` — re-dispatchable with `release_profile=demo` |
| Automatic path | `pages.yml`, unchanged and still active |
| Method | re-dispatch `pages-from-source.yml` at the prior SHA, or `npm run deploy` |
| Requires | a workflow dispatch — **no** Pages configuration change |

Rolling back would restore the blame language, so it is available but undesirable.

---

## 11. Remaining (recorded, not touched)

Security convergence, `src/lib/solemn.js` extraction, food-domain T-4…T-1 gap,
circular menu ask, `??` ask-builder defect, 49-file date backlog, CRA warning
cleanup. `main` and `grounded-decision-surface` still differ by ~73 commits.
