# Deterministic Test & Production Configuration — Implementation Report

**Date:** 2026-07-31 · **Branch:** `grounded-decision-surface` · **Baseline:** `a1682b74`

---

## 1. Recommendation

**ACCEPT** for D1, D2 and D3 as scoped. C4 (Pages activation) remains deferred by
instruction and is **not** triggered here.

One material finding is reported rather than fixed, and one honest limit is
stated rather than papered over — both in §7.

---

## 2. Starting state

Root `/Users/toddwillis/Code/ngw-event-planner/demo`, commit `a1682b74`, behind
0 / ahead 0, no dev servers or watchers. Exactly two modified files, both
pre-existing solemn work:

```
 M hostv2/src/HostShellV2.jsx                    one-line `&& !solemn` guard + comment
 M src/lib/__tests__/heroComposition.test.js     widened assertion + 2 structural tests
```

Both characterized before editing. The added solemn tests are **source-regex,
not date-dependent** — the date-dependent solemn failures came from the
*committed* suite.

---

## 3. D1 — Jest determinism

### Root causes (three, all in fixtures — none in product code)

1. **Mixed calendars** (2 copies): `x.setDate(x.getDate()+d)` uses **local**
   components; `toISOString()` serializes **UTC**. Near midnight they disagree by
   a day, so `iso(4)` — meant as a 4-day lead — silently became 5 west of UTC.
2. **A hardcoded future date** (`'2026-08-04'`) measured against a moving now: a
   20-day lead when written 2026-07-15, down to 4 by 2026-07-31.
3. **Collection-time fixtures** (`const EVENTS = [...]`) evaluated before
   `beforeEach`, which would have defeated fake timers entirely.

Both CI's failure and the local failure were reproduced **on one machine by
varying only `TZ`**, which is what proved these were fixture bugs.

### Product code deliberately unchanged

`src/lib/dates.js` is already correct and pinnable — it reads `Date.now()` (its
own comment: *"time you cannot pin is time you cannot check"*) and compares local
midnight to local midnight. Freezing `Date.now()` is sufficient. **No production
date behavior was modified.**

### The fix

`src/testUtils/frozenClock.js` (placed outside `__tests__` so Jest does not
collect it as a suite) exporting `useFrozenClock()` and `daysFromNow()`. Frozen
instant is **midday UTC**, so the frozen "today" is the same calendar day in
every real zone (UTC-12..UTC+14). `daysFromNow()` uses local components
throughout, so the **lead** is exactly `n` everywhere even though the literal
string differs — which is the invariant assertions actually care about.

Applied to both suites, with fixtures made lazy and **precondition assertions**
added so a drifted fixture fails loudly instead of passing vacuously.

### Evidence

| Run | Result |
|---|---|
| `heroComposition` under UTC / New_York / Sydney / Kiritimati (UTC+14) | 44 passed each |
| `oneAttentionLedger` under UTC / New_York / Sydney | 7 passed each |
| **Full suite `TZ=UTC`** | **282 suites / 4230 tests / exit 0** |
| **Full suite `TZ=America/New_York`** | **282 suites / 4230 tests / exit 0** |

First fully-green run of this suite.

---

## 4. D2 — the five correctness exceptions

| Warning | Determination | Fix |
|---|---|---|
| `no-dupe-keys` ×2 `src/App.js` | Later value wins (`C.muted`; the conditional). First is dead copy-paste base idiom | Removed the dead first key — behavior-preserving |
| `no-dupe-keys` `MembersModal.jsx` | Later conditional wins **and its fallback is `'none'`** — identical to the dead first value | Removed the dead first key |
| `no-unreachable` `simulation.js` | `void opts;` sat after `return`; it existed only to mark an unused param used | Removed it **and the unused param it masked** — deleting it alone would have created a new `no-unused-vars` warning |
| `no-script-url` `lodgingBookmarklet.js` | A bookmarklet **is** a `javascript:` URL; the string is returned for the bookmarks bar, never assigned to `location` or evaluated | One targeted `eslint-disable-next-line` with rationale |

Baseline **250 → 245**, `temporaryCorrectnessExceptions` count **0**, gate exit 0.

A self-caught error worth recording: the first bookmarklet attempt placed the
disable directive above *more comment lines*, so it applied to a comment rather
than the `return`. The gate caught it; fixed.

---

## 5. D3 — the public configuration contract

### Two explicit modes

| Mode | Public config | Meaning |
|---|---|---|
| `--mode=verification` | may be blank | ordinary CI compile; runs as the open localStorage-only demo; explicitly **not** production-capable |
| `--mode=production` | **required** | fails loudly rather than degrading silently |

### `scripts/validate-production-config.mjs`

Requires the three public production values in production mode; rejects an
**explicit prohibited list** (`REACT_APP_PLANNER_TOKEN`, `REACT_APP_AUTH_BYPASS`,
`REACT_APP_BYPASS_ROLE`, service-role keys, provider secrets, database URLs) in
**both** modes; adds a secondary net for secret-shaped names/values, including
decoding a Supabase JWT to reject a `service_role` token specifically. **Values
are never printed** — names and fixed reasons only.

Full classification of all 27 variables: [`docs/release/PRODUCTION_CONFIG.md`](../../release/PRODUCTION_CONFIG.md).

### Workflow wiring

`pages-from-source.yml` (still `workflow_dispatch` only) reads public values from
GitHub **repository variables** (`vars.*`, not `secrets.*` — they are public by
definition once compiled) at **job scope**, so hostv2 and CRA both inherit them.
It then validates in production mode, runs gates, builds both, verifies **both
bundles** received the config, stamps `RELEASE_SHA.txt`, and scans the artifact.

### Two layers, on purpose

`validate-production-config.mjs` controls **names** *before* the build (after
compiling, the value is already in the artifact). The artifact scan controls
**value shapes** on `build/`. The scan deliberately does **not** match variable
names: a bundler leaves the bare identifier in output even when the variable is
unset (`process.env.X` → `{}.X`), so name-matching failed every clean build. That
false positive was found and corrected during verification rather than shipped.

---

## 6. Verification evidence

| Check | Result |
|---|---|
| verification mode, blank config | **exit 0** + explicit "NOT production-capable" note |
| production mode, all required present | **exit 0** |
| production mode, drop `REACT_APP_API_BASE_URL` / `_SUPABASE_URL` / `_SUPABASE_ANON_KEY` | **exit 1** each, naming the missing variable |
| `REACT_APP_PLANNER_TOKEN` set | **exit 1** in *both* modes |
| `SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `MY_SECRET`, `sk_live_…`, `postgresql://…` | **exit 1** each |
| secret value echoed in output | **0 occurrences** |
| production-equivalent `npm run release` | exit 0 |
| CRA bundle carries API base + anon key | ✓ |
| **hostv2 bundle carries the same values** | ✓ (configuration parity) |
| artifact stamped with commit SHA | ✓ `a1682b74…` |
| artifact scan, clean build | clean |
| artifact scan positive controls (`sk-`, `sk_live_`, `postgresql://u:p@h`, `ghp_`, `xoxb-`, PEM) | **caught, all 6** |
| public PostHog `phc_` key | correctly **not** flagged (public by design) |

All probe values removed afterwards; `public/hostv2` never regenerated from the
dirty tree.

---

## 7. Findings reported, not absorbed

**A real product defect (D1 investigation).** The `food` domain is represented in
`nextActions` at leads 30→5 but **missing at 4/3/2/1**, while `phaseProgress`
still reports food open — the exact "two ledgers, the wrong one speaks" class
`oneAttentionLedger` exists to catch. The clock was frozen at the author's
intended 20-day lead rather than at a date that hides this. **Not fixed —
out of scope, and the highest-value follow-up.**

| lead | open phase ids | nextActions domains | missing |
|---:|---|---|---|
| 5 | datetime, food, shopping, rain | decision, rain, food, shopping, date | — |
| 4 | datetime, food, shopping, rain | plan, decision, rain, shopping, date | **food** |

**An honest limit on D1.** 58 test files still read the real clock and **49 use
the same mixed-calendar antipattern**. The suite is green in both timezones
today, but that debt is latent. Two were fixed (the two that were failing); the
shared helper is ready for a sweep. The "no hidden reliance on the real current
date" bullet is **not** closed repo-wide, and is not claimed to be.

---

## 8. Commit boundaries (nothing committed)

| # | Message | Content |
|---|---|---|
| 1 | `test: make the Jest suite deterministic across date and timezone` | `src/testUtils/frozenClock.js`, `oneAttentionLedger.test.js`, **D1 hunks only** of `heroComposition.test.js` |
| 2 | `fix: clear the five release-blocking correctness warnings` | `src/App.js`, `MembersModal.jsx`, `simulation.js`, `lodgingBookmarklet.js`, `ci/cra-warning-baseline.json` |
| 3 | `ci: enforce the public production configuration contract` | `scripts/validate-production-config.mjs`, `pages-from-source.yml`, `.env.example`, `docs/release/PRODUCTION_CONFIG.md`, `RELEASE_INTEGRITY.md`, this report |
| 4 | *(deferred)* solemn commit | `HostShellV2.jsx` guard + the 2 unstaged solemn hunks — left for its owner |

`heroComposition.test.js` is **partially staged**: D1 hunks in commit 1, the two
solemn hunks left unstaged. Verified in a pristine HEAD export that the staged
D1 state parses and passes 49/49 in both timezones against HEAD's
`HostShellV2.jsx` — which is what CI will actually check out.

---

## 9. Remaining blocker before manual C4 deployment

**Set the GitHub repository variables.** `pages-from-source.yml` now validates in
production mode, so it will fail fast until `REACT_APP_API_BASE_URL`,
`REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` exist under
Settings → Secrets and variables → Actions → **Variables**. That is the intended
behavior — a release must not be publishable without them — but it means the
first manual dispatch will fail unless they are set first.
