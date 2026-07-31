# 01 — Current State (Phase 1)

## Repository truth
| | |
|---|---|
| Repo path | `/Users/toddwillis/Code/ngw-event-planner/demo` (git root is `demo`, **not** the parent) |
| Branch | `grounded-decision-surface` |
| Commit | `097ce84ee2f9ee0b2b63013a507d6d1f883094a8` (`097ce84e`) |
| Commit date | 2026-07-30T17:09:14-04:00 |
| Upstream | `origin/grounded-decision-surface` — 0 ahead, 0 behind |
| Working tree | **NOT clean** — 2 modified files |

Modified at audit start, both audited as-is, neither authored by this audit:
- `hostv2/src/HostShellV2.jsx` — +9/-1, adds `&& !solemn` to the overdue-slips guard
- `src/lib/__tests__/heroComposition.test.js` — +23/-1, widens the matching gate

No branch switch, reset, stash, commit, merge or push was performed. No application code was modified.

## Runtime verification — both apps were actually run
| App | Command | Result | URL |
|---|---|---|---|
| hostv2 (Vite prototype) | `cd hostv2 && npx vite --port 5199` | **SUCCESS** — ready in 301ms | http://localhost:5199 → HTTP 200 |
| CRA planner | `BROWSER=none npm start` | **SUCCESS** — "Compiled with warnings" (1) | http://localhost:3000 → HTTP 200 |

Both were driven in Chrome. **No console errors** in either after reload.

## Build status
- `npm run build` → **exit 0**
- `CI=true npm run build` → **exit 1**, 237 lint warnings promoted to errors
- `cd hostv2 && npm run build` (includes the parity gate) → **exit 0**

## Toolchain
Local Node **v16.16.0** / npm 9.6.6. CI pins Node 20. Consequence: hostv2's Playwright E2E
**cannot run locally** (requires ≥18) and was not verified by this audit.

## Environment
27 distinct `REACT_APP_*` variables are referenced in `src/` + `hostv2/src`; **6** appear in
`.env.example`. The 11 `REACT_APP_PI_*` feature flags are undocumented. No secret values were
inspected or recorded. The running CRA displayed an **"AUTH BYPASS · DEV ONLY"** badge, so no
authenticated behaviour was verifiable.

## Stack (verified from manifests)
- Root: CRA `react-scripts` 5.0.1, React 19.2.6, `@supabase/supabase-js`, `@sentry/react`,
  `posthog-js`, `papaparse`, `qrcode`, `xlsx`. Dev dep: `gh-pages`.
- `hostv2/`: separate Vite 4 app, React 19, `@playwright/test`. Scripts: `dev`, `build`
  (runs `check-parity.mjs` first), `preview`, `test:e2e`.
- `backend/`: Python — `app/`, `migrations/`, `tests/`, `requirements.txt`. Not exercised.

## Deployment (verified from `.github/workflows/`)
- `checks.yml` — jest (`CI=true react-scripts test`) + hostv2 build & Playwright. **Does not
  build the CRA app.**
- `pages.yml` — publishes the **already-built** `gh-pages` branch. Does not build.
- Therefore the shipped CRA bundle is built on a developer machine by `npm run deploy`
  (`predeploy` → `npm run build`, without `CI=true`). No CI gate covers it.

## Evidence
`evidence/01_manifests.txt`, `01_runtime_env.txt`, `02_build_cra*.txt`, `03_workflows.txt`,
`04_runtime_servers.txt`, `04_cra_dev.log`, `04_hostv2_dev.log`.
