# C4 — First Source-Built Demo Deployment

**Date:** 2026-07-31 · **Base:** `main` · **Profile:** `demo`

---

## 1. Recommendation

**PARTIAL ACCEPT.**

The release chain now works end to end and **fixed a live production outage**.
One acceptance criterion cannot pass from `main`, and one is environment-limited:

- ✅ Merged, dispatched, all gates green, Pages deployed, provenance stamped,
  `/hostv2/` loads, demo behaviour correct, no live calls, rollback verified.
- ❌ **Solemn protection is not in production.** It lives on
  `grounded-decision-surface` and has never been merged to `main`, so the
  artifact built from `main` cannot contain it. Verified in production: a repast
  still renders *"a few decisions are past their easy window"* and
  *"past its window"*.
- ⚠️ **Mobile at 390 px not verifiable** — the browser in this environment has a
  minimum window width; the narrowest achieved was 614 px.

### The headline finding

**Production `/hostv2/` was completely broken before this deployment.** Every
event — solemn and non-solemn alike — hit the React error boundary:

```
ReferenceError: Cannot access 'Qn' before initialization
  at HostShellV2-fa43cc82.js:79:100165          ← the laptop-built artifact
[ErrorBoundary] caught: …
```

That was the *previously deployed, laptop-built* bundle. A `main`-built bundle
does not crash — proven locally before dispatching, and confirmed in production
after. The first source-built deployment therefore **restored a dead host
surface**, which is precisely the class of failure the source-built chain exists
to prevent.

---

## 2. Merge

| | |
|---|---|
| PR | **#63** — *ci: enable manual source-built demo deployment* |
| Method | **merge commit** (repository convention: 59 merge commits; no branch protection) |
| Merge SHA | **`e619ec48302bd2c00f8837e7bc125437ab9653da`** |
| Merged at | 2026-07-31T11:56:37Z by `twillis45` |
| Source commits | `9d8fcbea`, `8f1f66d2`, `ab9c02df` |
| Resulting `main` | `e619ec48` |

Merging deployed nothing. The only automatic run was `Checks` (push trigger);
`pages-from-source.yml` did not self-start.

### Pre-merge gates

- `CI` scoping: **no** workflow-level env, **no** job-level `CI` in either job;
  `CI: ''` on exactly one step (*Build release artifact*). Jest still runs
  `CI=true`; backend has no override; Playwright lives in `checks.yml`, untouched.
- `pages.yml` **byte-identical** to `main`, before and after.
- `workflow_dispatch` only — no schedule, push, or pull_request trigger.
- Permissions minimal: `contents: read`, `pages: write`, `id-token: write`.
- `deploy` job pins the `github-pages` environment explicitly.

---

## 3. Workflow

| | |
|---|---|
| Run ID | **30629097970** |
| URL | https://github.com/twillis45/ngw-event-planner/actions/runs/30629097970 |
| Event | `workflow_dispatch` · profile **`demo`** |
| Commit | `e619ec48302bd2c00f8837e7bc125437ab9653da` |
| Started | 2026-07-31T12:01:31Z |

| Step | Result |
|---|---|
| Backend tests (incl. AI auth + SSRF gates) | ✅ |
| Unit suite (Jest, `CI=true`) | ✅ |
| Validate release configuration (`--mode=demo`) | ✅ |
| Build release artifact (hostv2 + CRA) | ✅ |
| Record the deployed commit | ✅ |
| Verify CRA/hostv2 configuration parity | ⏭️ **skipped** — live-only, correct for demo |
| Verify demo artifact carries no live configuration | ✅ |
| Scan artifact for server secrets | ✅ |
| Upload Pages artifact | ✅ |
| **Deploy to Pages** | ✅ |

Playwright is not part of this workflow; it runs in `checks.yml` and passed on
the PR (2 runs, both green).

---

## 4. Configuration (names only)

Live values **absent** at every layer, verified before dispatch:

| Layer | State |
|---|---|
| Repository variables | **none** |
| Repository secrets | **none** |
| Environment `github-pages` | 0 variables, 0 secrets |
| Environment `main - ngw-events-api` | 0 variables, 0 secrets |
| Organization variables | n/a (personal repo) |
| Hardcoded in workflow | none — `vars.*` references only |

`REACT_APP_API_BASE_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`
and `REACT_APP_AUTH_REDIRECT` were **not set**. The build job additionally binds
all four to `''` unless `release_profile == 'live'`, and the build job declares no
`environment`, so environment scoping could not reach it either — three
independent layers.

Demo validation output: *"demo release: open, localStorage-only. NOT
live-production capable — by design."*

Profile stamp: **`release_profile=demo`**.

---

## 5. Production smoke test

Surface: `https://twillis45.github.io/ngw-event-planner/hostv2/`

| Surface | Check | Result | Evidence |
|---|---|---|---|
| Provenance | `RELEASE_SHA.txt` reachable | ✅ | HTTP 200 |
| Provenance | SHA equals deployed commit | ✅ | `e619ec48302bd2c00f8837e7bc125437ab9653da` |
| Provenance | Profile stamp | ✅ | `release_profile=demo` · `capability=open-demo-localstorage-only` |
| Provenance | Stale laptop asset gone | ✅ | `index-f2a5ab3d.js` → `index-5d0ac30d.js` |
| Host | `/hostv2/` loads | ✅ | HTTP 200, renders |
| Host | No blank screen / fatal error | ✅ | **outage fixed** (see §1) |
| Host | Elegant default without `?elegant=1` | ✅ | elegant hero renders |
| Host | `?elegant=0` opt-out works | ✅ | "V2 PREVIEW / Sections" chrome |
| Host | Direct refresh on `/hostv2/` | ✅ | reload renders |
| Demo | No login wall | ✅ | welcome screen, "Start my event" |
| Demo | No account creation requested | ✅ | none present |
| Demo | Local persistence | ✅ | guest count 50→57 survived reload |
| Demo | No live Supabase/API calls (fresh visitor) | ✅ | only `fonts.googleapis.com` + own origin |
| Demo | No false cloud-sync claim | ✅ | no sync affordance surfaced |
| Workflow | Board / hero / next action render | ✅ | "20 DAYS · JUNETEENTH COOKOUT / Add a rain backup." |
| Console | Fatal errors | ✅ none | after deployment |

### ⚠️ A network observation worth recording

On a browser carrying **prior state for this origin**, `/hostv2/` produced
**11 requests to `…supabase.co` and 4 to `…onrender.com`**, and localStorage held
an `sb-…-auth-token` from an earlier session.

With storage cleared — a true first-time visitor — those drop to **zero**: only
Google Fonts and own-origin assets.

So the **deployed artifact is clean**, but a returning browser can still emit
live calls. The exact mechanism (which code path supplies a project URL the
bundle does not contain) was **not determined** and is recorded here rather than
guessed at. It should be pinned down before live mode is considered.

---

## 6. Solemn verification — **FAILED, by scope not by defect**

Banned phrases checked: `past its window`, `past their easy window`, `overdue`,
`is late`, `was due`.

**In production (built from `main`):** `past its window` **and**
`past their easy window` both render on a repast four days out —
*"Mostly on course — a few decisions are past their easy window."*

Cause: `main` contains **none** of the solemn work — no guards, and
`src/lib/solemn.js` does not exist there. Confirmed in source before dispatching.
The fix is committed on `grounded-decision-surface` (`9bb3c7fa`) and verified
working against a locally built shell, but it has never been merged.

This deployment is **not a regression** — the previously deployed artifact had no
solemn protection either, and in any case crashed before rendering.

**Non-solemn control:** a cookout renders normally with no crash and correct
overdue treatment.

---

## 7. Responsive verification

| Viewport | Achieved | Overflow | Hero | CTA | Result |
|---|---|---|---|---|---|
| Laptop 1440×900 | 1585 px | none | visible | 37 controls | ✅ |
| Tablet 768×1024 | 768×847 | none | visible | 23 visible, first in viewport | ✅ |
| Mobile 390×844 | **not reachable** — min window width; narrowest 614 px | none at 614 | visible | — | ⚠️ **unverified at 390** |

No horizontal overflow at any width tested. No clipped fixed controls observed.

---

## 8. Console and network

- Fatal console errors after deployment: **none**.
- Failed requests: none on a clean visit.
- CORS errors: none. Asset 404s: none. Hydration failures: none.
- Analytics: no PostHog/Sentry requests (no DSN/key configured).
- **Before** deployment: two fatal errors per load — the `ReferenceError` and the
  ErrorBoundary catch (§1).

---

## 9. Rollback

**Verified available and unused.**

| | |
|---|---|
| Previous known-good | `gh-pages` branch at `61f6d661` — **unchanged by this deployment** |
| Automatic path | `pages.yml`, byte-identical to pre-merge `main`, still active |
| Restore method | re-run `npm run deploy` (pushes `build/` to `gh-pages`), or dispatch `Deploy Pages` |
| Requires | a workflow dispatch or branch update — **no** Pages configuration change |

⚠️ Rolling back would restore the **broken** laptop-built bundle. Given the
outage this deployment fixed, rollback is available but would be a regression.

---

## 10. Remaining issues (recorded, not fixed)

1. **Food-domain next-action gap at T-4 … T-1** — `phaseProgress` reports `food`
   open while `nextActions` drops the domain.
2. **Circular menu ask** — "Decide the menu" offers service-mode options with a
   dietary-needs helper line, one already marked "chosen".
3. **`??` ask-builder defect** — hostv2 appends `?` to a label already ending in one.
4. **Mixed-calendar fixture backlog** — 49 test files.
5. **hostv2 environment-capture footgun** — `sync:hostv2` can bake a laptop's
   `.env` into the tracked artifact.

New, recorded here for the first time:

6. **`main` lacks all solemn protection** — the single largest gap between the
   working branch and what users actually run.
7. **Returning-browser live calls** — see §5.
