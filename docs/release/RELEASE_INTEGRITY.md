# Release Integrity

**Established 2026-07-30 (Release Integrity Sprint, Slices C1–C4).**
Baseline commit `04ed31ed`. Originally written on the `grounded-decision-surface`
working branch, which was retired on 2026-07-31 after full convergence; `main` is
now canonical.

This is the runbook for building, gating, and shipping the app. It supersedes
the deployment instructions scattered through `docs/HANDOFF_*.md` — in
particular the manual `rsync` step, which is now a script.

---

## Supported runtimes

| Runtime | Version | Why |
|---|---|---|
| Node | **20** in CI | `checks.yml` / `pages-from-source.yml`. hostv2's Playwright needs ≥18. |
| Node | ≥18 locally for e2e | This machine's default shell Node is 16.16.0, which Playwright refuses. `/usr/local/bin/node` is 18.15.0. |
| Python | **3.12** | Matches `render.yaml` → `PYTHON_VERSION=3.12.7`, which is deployment truth for the backend. |

Backend dependencies are **pinned** (`backend/requirements.txt`). Local machines
often drift ahead of the pins — verify against the pins, not against whatever
`pip` happens to have installed.

---

## Local verification commands

```bash
# Backend (from backend/) — 202 tests, no network, no credentials
python -m pytest tests/ --strict-markers

# Unit suite (from repo root)
CI=true npx react-scripts test --watchAll=false

# CRA production build gate (runs the real build, enforces the warning baseline)
npm run gate:cra

# hostv2 artifact drift gate
npm run gate:hostv2

# hostv2 build + e2e (needs Node ≥18)
cd hostv2 && npm run build && npm run test:e2e
```

### The canonical release command

```bash
npm run release      # build hostv2 → sync into public/hostv2 → CRA production build
```

`npm run release` is the **only** supported way to produce a deployable tree.
`predeploy` now points at it, so `npm run deploy` cannot ship a stale hostv2
bundle even from a laptop.

---

## CI jobs and what each proves

| Job | Runtime | Command | What it gates |
|---|---|---|---|
| `jest` | Node 20 | `CI=true npx react-scripts test --watchAll=false` | Engine + unit proofs (~4,200 tests) |
| `e2e` | Node 20 | `npm run build` + `npm run test:e2e` (hostv2) | Parity gate + Playwright board matrix on the built bundle |
| `backend` | Python 3.12 | `python -m pytest tests/ --strict-markers` | **New.** 202 backend tests including the 49 AI-auth/SSRF security gates |
| `cra-build` | Node 20 | `npm run gate:cra` | **New.** The deployable app actually compiles; no new lint warnings |
| `hostv2-drift` | Node 20 | `npm run gate:hostv2` | **New.** `public/hostv2/` matches a build of the current source |

Before this sprint, none of the last three existed. The backend security tests
written in the previous sprint gated nothing automatically, and **no workflow
ever built the deployable CRA app**.

---

## CRA warning policy — Policy B (explicit baseline)

`CI=true npm run build` currently exits **1** with **245 warnings** across 33
files. Recounted this sprint — the earlier figure of 237 was stale.

| Rule | Count | Category |
|---|---:|---|
| `no-unused-vars` | 227 | Dead code / unused declarations |
| `react-hooks/exhaustive-deps` | 9 | React hook dependency risk |
| `no-mixed-operators` | 6 | Tooling / readability |
| `no-dupe-keys` | 3 | **Correctness risk** |
| `no-useless-escape` | 1 | Tooling |
| `no-unreachable` | 1 | **Correctness risk** |
| `no-script-url` | 1 | **Correctness / security smell** |
| `no-lone-blocks` | 1 | Dead code |
| `import/no-anonymous-default-export` | 1 | Tooling |

Concentration: **`src/App.js` holds 135 (54%)** and `src/admin/AdminConsole.jsx`
holds 57 — together **77%** of all warnings.

**Why Policy B and not a zero-warning gate.** `src/App.js` is frozen by
CLAUDE.md: *"donor-only… Only security/data-loss fixes and shared `lib/` engine
work belong in App.js."* Removing 135 unused declarations from a 45,000-line
frozen file is precisely the sprawling rewrite of frozen donor code that
Policy B exists for, and this is a release-engineering sprint, not a refactor.
Zero-warning remains the goal; Policy B is the honest interim.

**What the gate does** (`scripts/cra-build-gate.mjs`):

- Runs the real production build. **A genuine build error fails the gate
  regardless of the baseline** — the baseline can never hide a broken build.
- Fingerprints every warning as `rule | file | message`.
- **Fails on:** any new warning fingerprint, any count increase on an accepted
  fingerprint, any warning in a file that previously had none, and any real
  build error.
- **Does NOT fail when a baselined warning disappears.** Fixing a warning is the
  outcome we want; a gate that punished it would pressure people to preserve
  dead code or regenerate the baseline reflexively. Resolved entries are printed
  so the baseline can be tidied deliberately (`npm run gate:cra:update`), and
  nobody is ever required to regenerate it merely because they fixed something.

**Why no line numbers in the fingerprint.** Line numbers shift on every
unrelated edit above a warning. A line-based fingerprint would fail constantly
for no real change and train people to regenerate the baseline reflexively,
which destroys its value. Rule + file + message is stable under line shifts and
still catches new warnings, changed categories, and new files.

Warnings are collected with warnings-as-errors disabled, because a build that
aborts at the first warning cannot report the full set. This is **not**
`CI=false` used to dodge the gate: for anything new the check is stricter than
`CI=true`, which only asks *"are there warnings?"* rather than *"are they
exactly the reviewed ones?"*

**Regenerate deliberately:**

```bash
npm run gate:cra:update      # then review the diff to ci/cra-warning-baseline.json
```

**Accepted temporarily, with reasons:**

| Category | Count | Why accepted for now |
|---|---:|---|
| Frozen donor debt (`src/App.js`) | 133 | CLAUDE.md freezes the file; CRA deletion is scheduled post-Sprint-2 |
| Dead code elsewhere | ~92 | Real cleanup, but product-file churn is out of a release sprint's scope |
| Hook dependency risk | 9 | Fixing these changes runtime behaviour and needs per-case review |
| **Correctness risk** | **5** | **Not accepted as permanent — see below** |

### ⚠️ Temporary correctness exceptions — must be fixed before C4 activation

Five baselined warnings are **real defects**, not style noise. They are recorded
under `temporaryCorrectnessExceptions` in `ci/cra-warning-baseline.json`, which
names the exact file for each and is recomputed on every regeneration so they
cannot be lost among 250 entries.

| Rule | Where | Count | Why it is a defect |
|---|---|---:|---|
| `no-dupe-keys` | `src/App.js` | 2 | A duplicate object key silently discards one value |
| `no-dupe-keys` | `src/components/MembersModal.jsx` | 1 | As above |
| `no-unreachable` | `src/lib/knowledge/simulation.js` | 1 | Code after a return — a logic error |
| `no-script-url` | `src/lib/lodgingBookmarklet.js` | 1 | `javascript:` URL — an eval-shaped sink |

**Status: TEMPORARY. These block Slice C4 (source-built Pages deployment
activation)** and must be corrected before deployment is migrated. They were not
fixed in this sprint because two sit in frozen `src/App.js` (lines 7090, 44932)
and this was a release-engineering sprint, not a correctness sprint.

---

## hostv2 artifact model — Model B (tracked + hard drift gate)

hostv2 ships as a static subdirectory of the CRA site:

```
hostv2/src → vite build → hostv2/dist (gitignored)
                            ↓  npm run sync:hostv2
                       public/hostv2/ (TRACKED, 12 files)
                            ↓  react-scripts build copies public/ verbatim
                       build/hostv2/  →  gh-pages  →  Pages
```

**Why `public/hostv2/` is tracked:** CRA copies `public/` into `build/`, and the
live deploy path pushes `build/` to the `gh-pages` branch from a laptop. The
artifact must exist in the repo for that flow to publish a complete site.

**What refreshed it before:** nothing automatic — a manual `rsync` documented
only inside `docs/HANDOFF_hero_composition.md`. That is how it went stale.

**Measured drift at `04ed31ed`:** building from committed source produced
`HostShellV2-f5b498f9.js`; the tracked copy shipped `HostShellV2-d2c51e67.js`.
5 assets missing, 5 stale leftovers, different `index.html`. The published site
was running a bundle that did not correspond to its source. This sprint
regenerated the artifact from committed source and added the gate.

**Why Model B rather than Model A (untracked).** Model A is the better end
state and is the documented next step, but it requires Pages to build from
source. Today Pages publishes a laptop-built branch, so untracking the artifact
would mean any build that skipped the hostv2 step would silently publish a site
with **no hostv2 at all**. Model A becomes correct the moment C4 goes live.

Vite's output here is deterministic — two consecutive builds from identical
source produced byte-identical trees — so exact file comparison is a sound gate,
not a flaky one.

**Regenerate deliberately:**

```bash
npm run sync:hostv2
```

The sync **replaces** the directory (equivalent to `rsync --delete`), so
obsolete hashed assets cannot linger and ship forever.

---

## Required public environment variables

CRA bakes every `REACT_APP_*` into the **public** bundle at build time. Nothing
is hidden from users; treat "secret" as "must never be built at all".

`.env.example` now documents all **27** variables referenced by application
code in `src/` and `hostv2/src/` (21 were
undocumented before this sprint). No values are committed.

| Variable | Class | CI needs it? |
|---|---|---|
| `REACT_APP_API_BASE_URL` | Required for backend features (public URL) | No — build succeeds without it |
| `REACT_APP_SUPABASE_URL` / `_ANON_KEY` | Required for auth (public project values) | No |
| `REACT_APP_OPENWEATHER_KEY`, `_GOOGLE_MAPS_KEY`, `_FDA_API_KEY` | Optional third-party keys | No |
| `REACT_APP_POSTHOG_KEY` / `_HOST`, `REACT_APP_SENTRY_DSN` | Optional analytics/monitoring | No |
| `REACT_APP_INVITE_ONLY`, `_ENABLE_GOOGLE_AUTH`, `_BILLING_LIVE` | Feature flags | No |
| `REACT_APP_PI_*` (11 flags) | Internal rollout flags | No |
| `REACT_APP_AUTH_BYPASS`, `REACT_APP_BYPASS_ROLE` | **Development only** | **Must never be set in a deployed build** |
| `REACT_APP_PLANNER_TOKEN` | Legacy dev gate — secret | **Never** |

The CRA build requires no environment variable to *compile*, which used to mean
a config-less build silently became the localStorage-only demo while looking
like a release.

**RESOLVED 2026-07-31 (Slice D3).** Builds now declare a mode:

| Mode | Public config | Meaning |
|---|---|---|
| `--mode=verification` | may be blank | ordinary CI compile; explicitly **not** production-capable |
| `--mode=production` | **required** | fails loudly if a required value is missing |

Enforced by `scripts/validate-production-config.mjs`, which also rejects
prohibited browser variables (`REACT_APP_PLANNER_TOKEN`, `REACT_APP_AUTH_BYPASS`,
`REACT_APP_BYPASS_ROLE`, service-role keys, provider secrets, database URLs) and
secret-shaped values — printing names only, never values.

Production values are **GitHub repository variables** (`vars.*`, not `secrets.*`
— they are public by design), mapped at job scope in `pages-from-source.yml` so
hostv2 and CRA both inherit them. Full classification of all 27 variables:
[`PRODUCTION_CONFIG.md`](PRODUCTION_CONFIG.md).

---

## Pages deployment

### Live path today (unchanged by this sprint)

```
developer runs:  npm run deploy
   → predeploy = npm run release   (hostv2 → sync → CRA build)
   → gh-pages -d build             (force-pushes the build to gh-pages)
   → gh workflow run pages.yml     (publishes gh-pages contents)
```

`pages.yml` was **not modified**. Rollback is therefore "do nothing".

The one improvement: `predeploy` now runs `npm run release` instead of
`npm run build`, so a laptop deploy always rebuilds and re-syncs hostv2 first.

### Release profiles (2026-07-31)

`pages-from-source.yml` takes a `release_profile` input, default **`demo`**:

- **`demo`** — the live values are forced empty regardless of repository
  variables, and their absence is asserted. The artifact is stamped
  `release_profile=demo` / `capability=open-demo-localstorage-only`, and the
  executed bundles are scanned to prove no concrete Supabase project host, API
  origin, or JWT reached them. This is the current public product.
- **`live`** — requires all three public values and checks coherence (anon role,
  matching project ref, https API without a trailing `/api`). Opt-in per run,
  and gated on [`LIVE_MODE_READINESS.md`](LIVE_MODE_READINESS.md), which is not
  yet worked.

📌 **Platform rule worth remembering:** `workflow_dispatch` only registers
workflows present on the **default branch**. While `pages-from-source.yml` lived
only on a working branch the dispatch API returned 404; PR #63 landed it on
`main`, which is what made manual runs possible.

### Live path — `pages-from-source.yml`

Triggered by **`workflow_dispatch` only**. It runs backend
tests, the unit suite, then `npm run release`, writes `build/RELEASE_SHA.txt`
recording the commit, uploads `build/`, and deploys that exact artifact.

It is deliberately not automatic: a Pages deployment cannot be verified without
actually publishing, and a broken deploy takes the public site down.

**Migration status:**

1. ~~Run `pages-from-source.yml` manually from the Actions tab.~~ Done — it is
   how the public site is now deployed.
2. ~~Confirm the published site, including `hostv2/` and `RELEASE_SHA.txt`.~~
   Done; the first source-built run also fixed a `/hostv2/` crash that a
   laptop-built bundle had shipped.
3. ~~Decide how production `REACT_APP_*` values reach the CI build.~~ Done — the
   `demo` / `live` profiles above. `demo` is the ruling for the public site, so
   no repository variables are set.
4. Uncomment the `push:` trigger on the release branch. **Open** — deliberately,
   until a deploy is worth trusting unattended.
5. Retire `pages.yml` and the `deploy` / `predeploy` scripts. **Open.**

**Rollback at any point:** re-run `npm run deploy` from a laptop, or flip the
repository's Pages source back to the `gh-pages` branch. Because
`pages-from-source.yml` never fires on its own, the existing path stays intact
until step 4.

---

## Known accepted limitations

1. **Pages still publishes a laptop-built branch.** C4 is staged, not live. A
   green CI run proves the app builds; it does not yet prove that what was
   published came from CI.
2. **5 correctness-risk warnings are baselined**, 2 of them in frozen `App.js`.
   Highest-priority follow-up.
3. **Python 3.12 is unverified locally** — this machine has only 3.10.6. The
   suite was verified on 3.10 against the *pinned* dependency set, which is the
   larger risk; the interpreter version is first exercised by CI.
4. **hostv2 e2e is unverified on this machine.** `vite preview` fails with an
   esbuild platform-binary mismatch under the local Node. CI (Node 20, clean
   `npm ci`) installs the correct binary. No hostv2 source, config, or
   dependency was changed this sprint.
5. **The rate limiter and other backend runtime limits** are unchanged; see
   `docs/security/AI_PROXY_AND_DOCUMENT_FETCH_SECURITY.md`.
6. **2 pre-existing Jest failures** in `heroComposition.test.js` ("a solemn day
   is not late") are date-dependent and reproduce at pristine HEAD. They are
   out of scope and were not touched.


---

## Converged to `main` — 2026-07-31

`main` is now canonical for the host experience, the planning libraries, backend
security, and release tooling. Figures above were regenerated against converged
`main`: **245 warnings across 33 files**, and the five-job `checks.yml`
(`jest`, `backend`, `cra-build`, `hostv2-drift`, `e2e`) is live on `main`.

One correction worth carrying: the CRA warning gate was **blind** until
2026-07-31. `react-scripts` colourises its ESLint block when it believes a
terminal is attached, and those ANSI escapes precede `"Line n:n:"`, so the parser
matched nothing and reported zero warnings. It now strips ANSI. If the baseline
ever regenerates to `0 warnings across 0 files`, that is the symptom returning —
not a clean tree.
