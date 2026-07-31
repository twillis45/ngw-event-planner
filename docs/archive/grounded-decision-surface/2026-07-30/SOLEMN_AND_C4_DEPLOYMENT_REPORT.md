# Solemn Protection & Manual C4 Deployment — Report

**Date:** 2026-07-31 · **Branch:** `grounded-decision-surface` · **Baseline:** `c03923ab`

---

## 1. Recommendation

**PARTIAL ACCEPT.**

- **E1/E2 — solemn protection: complete**, and it found more than expected.
- **E3 — production variables: resolved by host ruling.** No variables set; the
  public site stays the open demo. The workflow gained explicit `demo` / `live`
  release profiles instead.
- **E4/E5 — manual dispatch and production smoke test: BLOCKED**, not skipped.
  GitHub only registers `workflow_dispatch` workflows that exist on the
  **default branch**. `pages-from-source.yml` lives only on
  `grounded-decision-surface`, so the API returns
  `HTTP 404: workflow pages-from-source.yml not found on the default branch`.
  Reaching `main` requires a merge, and changing triggers is explicitly out of
  scope — so the sprint stops here by its own rule.

Nothing about the live site changed. Rollback was never needed.

---

## 2. Solemn fix

### Original harm

A repast four days out — a family that had just buried someone — was told its
decisions were late: *"a few decisions are past their easy window"*, over copy
implying the host was responsible for planning the food, when `repast.js` records
as researched cultural fact that the family does **not** cook; the church or
repast committee carries the meal.

### Exact code change

`planHeroCopy` was corrected in an earlier sprint, but **hostv2 does not consume
`planHeroCopy`** — and hostv2 is now the authoritative surface. Three separate
expressions produced backward, accusing language:

| # | Surface | Text | Guarded by |
|---|---|---|---|
| 1 | hero slips clause | "a few decisions are past their easy window" | pre-existing (`&& !solemn`) |
| 2 | hero due chip | "past its window" | **new** (`if (solemn && a.dueInDays < 0) return null`) |
| 3 | decision row late chip | "past its window" / "overdue" | **new** (`(r.status !== 'overdue' \|\| solemn)`) |

Only #1 was guarded before this sprint. Reading the source found #1. **Driving
the built shell found #2** — it was still printing over the hero — and inspecting
one altitude down found #3. Source review missed both because each is a separate
expression with its own condition; only rendered output showed the harm.

All three read the shared classifier (`@app/lib/solemn`) — one derivation, no
second regex — and suppress only the **overshoot**.

### Runtime before / after (built bundle, repast fixture 4 days out)

**Before**
```
4 DAYS · REPAST
Who provides the food?
past its window                      ← blame
Let the church / repast committee bring it — our pick
```

**After**
```
4 DAYS · REPAST                      ← forward runway preserved
Who provides the food?               ← decision still named, as a question
Tap one to settle it — nothing else changes.
Let the church / repast committee bring it — our pick
2 of 5 plan parts handled            ← count still grounded
WORTH KEEPING AN EYE ON
The grieving family is being asked to cook or coordinate the meal
```

Zero matches for `past its window`, `past their easy window`, `overdue`,
`is late`, `was due`. The decision is not hidden, the count is not invented, and
the risk register still names the real risk.

### Non-solemn regression check

- A non-solemn game night still renders its due chip (**"due today"**) — the
  mechanism is alive.
- The **same** fixture renamed to "Memorial Game Night" (now solemn) still
  renders **"due today"** while printing no backward phrase — proving the change
  is surgical: only the overshoot is dropped, forward states survive.
- Every guard only ANDs an extra condition, so non-solemn behaviour cannot
  change by construction.
- Structural tests pin all three altitudes and go **red** when any guard is
  reverted (verified by mutation).

### A mistake made and corrected

The solemn commit synced `public/hostv2` from my working tree. `git status` was
clean apart from the solemn files — but Vite's `loadEnv` also reads `.env.local`
and `.env.production.local`, which are **gitignored and therefore invisible to
`git status`**. Those local values were baked into a tracked artifact, CI built
different bytes, and `hostv2-drift` correctly went red.

The gate did its job: this is exactly the "shipped bundle does not correspond to
its source" class it exists to catch, caught before any deployment.

Checked before correcting, since a committed bundle is public: **no
`service_role` JWT** (7 anon-role keys only, public by design),
`REACT_APP_PLANNER_TOKEN` empty locally so nothing leaked, and
`REACT_APP_AUTH_BYPASS` did not bake in as a value. No credential exposure — but
the artifact was unreproducible, which is reason enough. Rebuilt from
`git archive HEAD`, producing `HostShellV2-ac0ed959.js`, the exact hash CI
expected.

**Follow-up, not absorbed:** `npm run sync:hostv2` should build with `REACT_APP_*`
stripped so a tracked artifact can never capture a laptop's environment. Today
the only thing between `.env.local` and a committed bundle is CI noticing after
the fact.

---

## 3. Production variables

**None were set.** Host ruling: the public site stays the open,
localStorage-only demo; the omission in `.env.production.local` is intentional
product behaviour.

Verification performed on the candidate values before the ruling (names and
results only — no values recorded):

| Variable | Source | Validation | Alignment |
|---|---|---|---|
| `REACT_APP_API_BASE_URL` | `.env.local` (development) | https ✓ · not localhost ✓ · no trailing `/api` ✓ · `/health` → `200 {"ok":true,"service":"ngw-events-api"}` | production Render service |
| `REACT_APP_SUPABASE_URL` | `.env.local` (development) | https ✓ · valid project ref | — |
| `REACT_APP_SUPABASE_ANON_KEY` | `.env.local` (development) | decodes to **`role: anon`**, not `service_role` ✓ | project ref **matches** `REACT_APP_SUPABASE_URL` ✓ |
| `REACT_APP_AUTH_REDIRECT` | not set | — | host chose `…/ngw-event-planner/hostv2/` **for live mode only**, recorded in the readiness checklist |

The decisive fact: `.env.production.local` declares **none** of the three. The
values above exist only in the development file.

---

## 4. Workflow run

**No run.** Dispatch is blocked:

```
gh workflow run pages-from-source.yml --ref grounded-decision-surface -f release_profile=demo
HTTP 404: workflow pages-from-source.yml not found on the default branch
```

Registered workflows: `Checks`, `Deploy Pages` (`pages.yml`),
`pages-build-deployment`. `pages-from-source.yml` is absent because it has never
been on `main`.

### Local demo-profile simulation (best available evidence)

Run from a pristine `git archive HEAD` export of `909ff46b`, reproducing the
workflow's steps in order:

| Step | Result |
|---|---|
| `validate-production-config --mode=demo` | **PASS** (exit 0) — "NOT live-production capable — by design" |
| `npm run release` | **PASS** (exit 0) |
| demo artifact carries no live config | **PASS** — no concrete Supabase host, API origin, or JWT in executed bundles |
| `release_profile=demo` stamp | **PASS** |
| commit SHA stamp | **PASS** (`909ff46b8d03`) |
| artifact secret scan | **PASS** |
| hostv2 bundle | `HostShellV2-ac0ed959.js` |

Two false positives were found and fixed while building this check, both worth
recording because each would have failed every clean build:

1. Matching `supabase.co` hit the **`"*.supabase.co"` wildcard allowlist** that
   legitimately lives in source. Tightened to a concrete
   `https://<ref>.supabase.co`.
2. Scanning `build/` matched dependency **JSDoc examples**
   (`xyzcompany.supabase.co`) inside a **source map**. Scoped to executed `*.js`,
   excluding `*.map`.

Both re-verified with positive controls: a planted live project URL is caught.

---

## 5. Production smoke test

**Not performed** — nothing was deployed. The checks below ran against the
**locally served built bundle** (`http://localhost:8099/ngw-event-planner/hostv2/`),
which is the same artifact content, not the production origin.

| Check | Result | Evidence |
|---|---|---|
| `/hostv2/` loads | PASS (local) | rendered host shell, event title in `h1` |
| Elegant mode default without `?elegant=1` | PASS | `elegantMode = q.get('elegant') !== '0'` |
| No blank screen | PASS | full hero + plan + risk register rendered |
| No console errors | PASS | zero errors/exceptions captured |
| Solemn: decision still named | PASS | "Who provides the food?" |
| Solemn: no blame language | PASS | 0 matches across 5 banned phrases |
| Solemn: calm runway present | PASS | "4 DAYS · REPAST" |
| Solemn: grounded counts only | PASS | "2 of 5 plan parts handled" |
| Non-solemn overdue intact | PASS | due chip renders for a non-solemn event |
| Release provenance on the live site | **NOT VERIFIED** | nothing deployed |
| Responsive sanity | **NOT VERIFIED** | deferred with the deployment |

---

## 6. Rollback readiness

**Rollback was never required — nothing was deployed.**

- Known-good deployment: the current GitHub Pages site, published from the
  `gh-pages` branch by `pages.yml`, which was **not modified** in this sprint.
- Rollback path: re-run `npm run deploy` (whose `predeploy` is now
  `npm run release`), or re-publish the existing `gh-pages` branch. Repository
  Pages source is unchanged.
- Once the source-built path is usable, re-dispatching with
  `release_profile=demo` is the intended rollback from a live release.

---

## 7. Remaining issues (recorded, not fixed)

1. **Circular food decision** *(reported by the host mid-sprint)* — an ask titled
   **"Decide the menu"** offers options that choose the **service mode**
   ("We'll cook it" / "A caterer handles it" / "Potluck"), with a helper line
   about **dietary needs** — three different questions under one title — and one
   option already reads **"chosen"** while the row is still presented as a live
   ask. Out of scope here; likely related to #2.
2. **Food-domain next-action gap at T-4 … T-1.** `phaseProgress` reports `food`
   open while `nextActions` drops the domain entirely in the final week.
3. **Mixed-calendar fixture backlog** — 49 test files still build dates by mixing
   local arithmetic with UTC serialization. Green today, latent tomorrow.
4. **Source-built workflow is still manual** *and currently undispatchable* until
   it reaches the default branch.
5. **Tracked hostv2 artifact model remains** until C4 is trusted; `sync:hostv2`
   can still capture a laptop's `.env` (see §2).
6. **Double question mark** — a solemn-adjacent hero rendered
   "How will you honor the history??" because hostv2's ask builder appends `?` to
   a label already ending in one. The CRA copy engine fixed this; hostv2 did not.

---

## 8. Commits

| SHA | Purpose |
|---|---|
| `9bb3c7fa` | `fix: protect solemn events from overdue hero language` |
| `28ad832f` | `fix: rebuild tracked hostv2 artifact from pristine committed source` |
| `909ff46b` | `build: add demo and live release profiles to the source-built workflow` |
| *(this doc)* | `docs: record solemn protection and manual deployment` |

Four commits where the sprint allowed two. The correction commit could not be an
amend — the flawed commit was already pushed and rewriting history is out of
bounds — and the profile commit exists because the host's mid-sprint ruling
added scope. Each is a single coherent concern.
