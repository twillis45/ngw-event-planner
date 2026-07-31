# Release Integrity Sprint — Implementation Report

**Date:** 2026-07-30 · **Branch:** `grounded-decision-surface` · **Baseline:** `04ed31ed`

---

## 1. Recommendation

**PARTIAL ACCEPT.**

Slices C1, C2, C3 are complete, verified, and failure-injected. Slice C4 is
**deliberately deferred**: the source-built Pages workflow is written and staged
as `workflow_dispatch`-only, with a five-step migration plan, but it is not the
live deploy path.

The sprint's own instruction governs this: *"If replacing the existing
deployment flow is too risky for this sprint, implement the complete build-and-
drift gates first and produce a specific migration plan. Do not half-rewrite
deployment."* A Pages deployment cannot be verified without publishing, and a
broken one takes the public site down. `pages.yml` is untouched, so rollback is
"do nothing".

Consequence, stated plainly: three of the four sprint objectives are met. The
fourth — *"a green CI result means the releasable application was actually built
and verified"* — is now **true of the build** but not yet of the **publish**.
CI proves the app builds and that the shipped hostv2 bundle matches its source;
it does not yet prove the published bytes came from CI.

---

## 2. Starting state

| | |
|---|---|
| Repository root | `/Users/toddwillis/Code/ngw-event-planner/demo` |
| Branch | `grounded-decision-surface` |
| Commit | `04ed31eda6cd200dd6a9b77893b795d83978cc24` |
| Remote | behind 0, ahead 0 |
| Dirty files | exactly 2, both expected solemn-context work |

```
 M hostv2/src/HostShellV2.jsx
 M src/lib/__tests__/heroComposition.test.js
```

No other modified or untracked application files. No dev servers or watchers
running (verified: 0 `react-scripts start`, 0 `vite` dev processes).

**Workflow behaviour at baseline.** `checks.yml` ran two jobs — `jest` and
`e2e`. It did **not** run backend tests and **never built the CRA app**.
`pages.yml` published the prebuilt `gh-pages` branch.

**Build behaviour at baseline.** `CI=true npm run build` exited **1** with
**250** ESLint warnings (recounted — the audit's 237 was stale).

**Verified against code, not assumed.** Two audit claims were re-checked and one
was corrected: the warning count is 250, not 237. The stale-artifact claim was
confirmed and quantified independently.

---

## 3. Decisions made

### CRA warning policy — **Policy B (explicit baseline)**

250 warnings; **135 (54%) are in `src/App.js`**, which CLAUDE.md freezes as
donor-only. Deleting 135 unused declarations from a 45k-line frozen file is the
"dangerous or sprawling rewrite of frozen donor code" Policy B exists for, and
this is a release sprint, not a refactor. `src/admin/AdminConsole.jsx` adds 57;
together those two files are 77% of all warnings.

The gate is stricter than a count comparison: fingerprint is `rule|file|message`
with per-fingerprint counts. It fails on new fingerprints, count increases,
warnings in files not already in the baseline, and any real build error. Line
numbers are deliberately excluded — they shift on unrelated edits and would
train reflexive regeneration.

**Corrected on review (2026-07-30):** the first implementation also failed when
a baselined warning *disappeared*, on the theory that an exact baseline stays
honest. That was wrong in practice — it would have pressured developers to
preserve dead code or regenerate the baseline just because they fixed
something. Resolved warnings are now reported and celebrated, never failed.

A genuine build error fails the gate regardless of the baseline. **Proven by
injection.**

### hostv2 artifact model — **Model B (tracked + hard drift gate)**

Model A (untracked) is the better end state but requires Pages to build from
source. While Pages publishes a laptop-built branch, untracking would let any
build that skipped the hostv2 step publish a site with **no hostv2 at all**.
Model A becomes correct the moment C4 goes live.

Vite output here is deterministic (two consecutive builds → byte-identical
trees), so exact file comparison is sound rather than flaky.

### Pages — **deferred, staged**

See §1. `pages-from-source.yml` exists, is `workflow_dispatch`-only, and runs
the full gate chain before publishing an artifact stamped with the commit SHA.

### A constraint that shaped the work

`public/hostv2/` had to be regenerated, but the working tree contains
uncommitted solemn work. Building the artifact from the working tree would have
baked that solemn change into a **tracked, committable** file — committing
solemn work through the back door. The artifact was therefore rebuilt from a
pristine `git archive HEAD` export, and every drift demonstration was run there.

---

## 4. Changes by slice

| Slice | Files changed | Before | After | Verification |
|---|---|---|---|---|
| C1 | `.github/workflows/checks.yml` | Backend tests ran nowhere; 49 security tests gated nothing | `backend` job, Python 3.12, pinned deps, `pytest --strict-markers` | 202 passed in CI-equivalent venv against **pinned** deps, no secrets set; failing assertion → exit 1 |
| C2 | `scripts/cra-build-gate.mjs`, `ci/cra-warning-baseline.json`, `.github/workflows/checks.yml`, `package.json`, `.env.example` | No workflow built the CRA app; `CI=true npm run build` exits 1 | `cra-build` job runs the real build + baseline gate; 27/27 env vars documented | Gate exit 0 clean; exit 1 on a new warning; exit 1 on a syntax error |
| C3 | `scripts/hostv2-artifact.mjs`, `package.json`, `public/hostv2/*` (12 files regenerated), `.github/workflows/checks.yml`, 2 handoff docs | Manual `rsync` in a handoff note; tracked artifact stale vs committed source | `npm run sync:hostv2` / `gate:hostv2`; `hostv2-drift` CI job; `predeploy` → `npm run release` | Gate exit 0 synced, exit 1 drifted, exit 0 restored; `npm run release` end-to-end verified |
| C4 | `.github/workflows/pages-from-source.yml` (new, dispatch-only) | Pages publishes laptop-built `gh-pages` | Staged source-built workflow + migration plan; `pages.yml` untouched | YAML validated; **not executed** — deferred by design |
| Docs | `docs/release/RELEASE_INTEGRITY.md`, this report, 2 handoff docs | Deploy steps scattered; manual rsync canonical | One runbook; conflicting instructions updated in place | — |

---

## 5. CI matrix

| Job | Runtime | Command | What it gates |
|---|---|---|---|
| `jest` | Node 20 | `CI=true npx react-scripts test --watchAll=false` | Engine + unit proofs (~4,200 tests) |
| `e2e` | Node 20 | `npm run build` + `npm run test:e2e` (hostv2) | Parity gate + Playwright matrix on the built bundle |
| **`backend`** | **Python 3.12** | `python -m pytest tests/ --strict-markers` | **202 backend tests incl. 49 AI-auth/SSRF gates** |
| **`cra-build`** | **Node 20** | `npm run gate:cra` | **The deployable app compiles; no new lint warnings** |
| **`hostv2-drift`** | **Node 20** | `npm run gate:hostv2` | **`public/hostv2/` matches a build of current source** |

The `backend` job sets **no secrets** — that absence is itself the proof that
the suite needs none.

---

## 6. Failure injection evidence

Every mutation was restored and re-verified green.

| # | Gate | Mutation | Result |
|---|---|---|---|
| 1 | backend | `assert r.status_code == 404 and False` in `test_ai_auth_and_ssrf.py` | exit **1** → restored, exit 0 |
| 2 | CRA warnings | Added `const __unusedReleaseProbe = 1;` to `src/lib/apiAuth.js` (a file with **zero** baseline warnings) | exit **1**, reported under *"NEW warnings in files that had none"* → restored, exit 0 |
| 3 | CRA build error | Appended invalid JS to `src/lib/apiAuth.js` | exit **1**, *"real build error… baseline does not apply"* → restored, exit 0 |
| 4 | hostv2 drift | Changed a rendered string in `hostv2/src/HostShellV2.jsx` (inside the pristine export) | exit **1**, listed 5 missing / 5 stale / changed `index.html` → restored, exit 0 |
| 5 | CRA warnings | New fingerprint in a file that **already** has baselined warnings (`src/lib/eventMemory.js`) | exit **1**, reported under *"NEW warnings"* → restored, exit 0 |
| 6 | CRA warnings | **Count increase** — same identifier unused in a second scope, 1 → 2 | exit **1**, *"(was 1, now 2)"* → restored, exit 0 |
| 7 | CRA warnings | **Warning REMOVED** — deleted the unused `OUTCOME_KEYS` declaration | exit **0** ✓ *"1 baselined warning no longer occurs — nice."* → restored, exit 0 |

Injections 5–7 were added for the review correction. #7 is the one that changed
behaviour: fixing a warning must never fail the build.

**Two probes that correctly did *not* fail — worth recording.** A trailing
comment and an unused `const` were first appended to `HostShellV2.jsx` and the
drift gate stayed green. That was the gate being right, not blind: minification
strips comments and tree-shaking drops unused declarations, so the emitted
bundle was genuinely byte-identical. Only a change that survives to the output
(a rendered string) produces drift. A weaker probe would have given false
confidence in the *opposite* direction.

---

## 7. Test evidence

| Command | Exit | Result |
|---|---|---|
| `python -m pytest tests/ --strict-markers` (pinned venv, no secrets) | 0 | **202 passed**, 0 skipped, 0 deselected |
| `pytest tests/test_ai_auth_and_ssrf.py tests/test_docusign_send_envelope_auth.py` | 0 | **49 passed** (the security set is included) |
| `npm run gate:cra` | 0 | Build compiled; 250 warnings match baseline |
| `npm run gate:hostv2` (pristine export) | 0 | 12 files, no drift |
| `npm run release` (pristine export) | 0 | `build/hostv2/assets/HostShellV2-f5b498f9.js` present; `build/hostv2` identical to `public/hostv2` |
| `CI=true npx react-scripts test --watchAll=false` | 1 | 4227 passed, **2 failed** (known, pre-existing) |
| `npm run build` (hostv2) | 0 | parity gate + vite build, 6.82s |
| `npm run test:e2e` (hostv2) | 1 | **Environment failure, not a code failure** — see below |

**The 2 Jest failures** (unchanged, untouched):
- `a solemn day is not late › really produces overdue rows — the scenario is not vacuous`
- `a solemn day is not late › anchors FORWARD to the runway, never backward to an overshoot`

Both reproduce at **pristine HEAD** (proven in the previous sprint: 2 failed /
4227 total with every uncommitted change removed). They are date-dependent and
out of scope.

**hostv2 e2e** could not run on this machine: the default shell Node is 16.16.0
(Playwright requires ≥18), and under `/usr/local/bin/node` 18.15.0 the
`vite preview` web server aborts with an esbuild platform-binary mismatch. This
is a local toolchain condition — **no hostv2 source, vite config, or dependency
was changed this sprint** — and CI's Node 20 + clean `npm ci` installs the
correct binary. Reported as unverified locally rather than claimed as passing.

**Python version caveat.** Only 3.10.6 is available locally, so 3.12 itself is
unverified here. The suite was verified against the **pinned** dependency set
(fastapi 0.115.0, httpx 0.27.2, pydantic 2.9.2, asyncpg 0.29.0) in a clean venv,
which was the larger risk — local machines had drifted well ahead of the pins
(fastapi 0.135.1, httpx 0.28.1, pydantic 2.12.5) and `asyncpg` was not installed
at all.

---

## 8. Commit ledger

**No commits were made.** The sprint's closing instruction is *"Do not commit or
push until I review the complete Slice C report."* Proposed boundaries:

| # | Message | Files |
|---|---|---|
| 1 | `ci: run backend tests on every change` | `.github/workflows/checks.yml` (backend job + header) |
| 2 | `ci: gate the CRA production build` | `scripts/cra-build-gate.mjs`, `ci/cra-warning-baseline.json`, `package.json` (gate scripts), `.env.example`, `checks.yml` (cra-build job) |
| 3 | `build: make hostv2 deployment artifacts deterministic` | `scripts/hostv2-artifact.mjs`, `package.json` (sync/release/predeploy), `public/hostv2/*`, `checks.yml` (hostv2-drift job), 2 handoff docs |
| 4 | `docs: release integrity runbook and implementation report` | `docs/release/RELEASE_INTEGRITY.md`, this report, `.github/workflows/pages-from-source.yml` |

Commits 1–3 each touch `checks.yml`; splitting one file across three commits
would create misleading partial hunks. **Recommendation: fold the three CI job
additions into commit 1** (`ci: run backend tests and gate the production
build`), leaving 3 commits total. Awaiting direction.

The fourth commit carries the staged Pages workflow rather than a
`deploy:` commit, because deployment was not migrated.

---

## 9. Remaining limitations

### Blockers (none for this sprint's scope)

None. C1–C3 are complete and enforced.

### High-priority follow-up

1. **5 temporary correctness exceptions — these BLOCK C4 activation.** Recorded
   under `temporaryCorrectnessExceptions` in `ci/cra-warning-baseline.json`,
   recomputed on every regeneration so they cannot be lost among 250 entries:
   `no-dupe-keys` ×2 in `src/App.js` (7090, 44932), ×1 in
   `src/components/MembersModal.jsx`; `no-unreachable` in
   `src/lib/knowledge/simulation.js`; `no-script-url` in
   `src/lib/lodgingBookmarklet.js`. Real defects, not style noise. Left for a
   focused correction per review direction (the default), not fixed here.
2. **Complete the C4 migration** so a green CI run proves the *published* bytes
   came from CI. Five steps in the runbook.
3. **Decide how production `REACT_APP_*` values reach a CI build.** CI currently
   sets none, so a CI-built artifact is not yet a drop-in production bundle.

### Accepted debt

4. `src/App.js` holds 135 baselined warnings; CRA deletion is already scheduled
   post-Sprint-2, which would retire them wholesale.
5. hostv2 e2e unverified locally (environment); Python 3.12 unverified locally.
6. The 2 date-dependent solemn Jest failures remain, untouched.

### Out-of-scope findings, documented not absorbed

7. An empty stray directory `public/hostv2/hostv2/` existed on disk (untracked,
   0 files) — a fossil of a bad manual rsync. Removed as a side effect of the
   canonical sync replacing the tree.
8. `backend/requirements-dev.txt` claims "only pytest is needed", which is true,
   but local environments had drifted far ahead of `requirements.txt` pins. A
   `pip install -r requirements.txt` check would catch that earlier.

---

## 10. Final git state

**Staged:** none.

**Unstaged (modified):**
```
 M .env.example
 M .github/workflows/checks.yml
 M docs/HANDOFF_hero_composition.md
 M docs/HANDOFF_hero_session_consolidation.md
 M package.json
 M public/hostv2/index.html
 D public/hostv2/assets/HostShellV2-d2c51e67.js
 D public/hostv2/assets/InviteV2-01b09aa2.js
 D public/hostv2/assets/eventPool-54836364.js
 D public/hostv2/assets/index-401377fd.js
 D public/hostv2/assets/inviteShared-92deb284.js
 M hostv2/src/HostShellV2.jsx                      ← SOLEMN, untouched
 M src/lib/__tests__/heroComposition.test.js       ← SOLEMN, untouched
```

**Untracked:**
```
?? .github/workflows/pages-from-source.yml
?? ci/cra-warning-baseline.json
?? docs/release/
?? docs/current-state-review/2026-07-30/RELEASE_INTEGRITY_IMPLEMENTATION.md
?? public/hostv2/assets/HostShellV2-f5b498f9.js
?? public/hostv2/assets/InviteV2-b6a067ab.js
?? public/hostv2/assets/eventPool-b8eb1b19.js
?? public/hostv2/assets/index-12d34da1.js
?? public/hostv2/assets/inviteShared-fc3eb73f.js
?? scripts/cra-build-gate.mjs
?? scripts/hostv2-artifact.mjs
```

**Remote:** `origin/grounded-decision-surface` — behind 0, ahead 0 (nothing
committed or pushed).

**The two solemn files were never staged, modified, restored, stashed, or
committed**, and were not used to make any gate green.
