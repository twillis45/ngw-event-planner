# 07 — QA Results (Phase 8)

All commands run on this machine against the working tree at `097ce84e` (+2 uncommitted files).
Node v16.16.0 / npm 9.6.6. Raw output under `evidence/`.

| Check | Command | Result | Failures | Evidence |
|---|---|---|---|---|
| Unit/integration tests | `CI=true npx react-scripts test --watchAll=false` | **PASS** exit 0 | 0 — 4229 tests, 282 suites | `evidence/07_jest_raw.txt` |
| CRA production build (CI semantics) | `CI=true npm run build` | **FAIL** exit 1 | "Treating warnings as errors because process.env.CI = true"; 237 lint warnings | `evidence/02_build_cra_raw.txt` |
| CRA production build (dev semantics) | `npm run build` | PASS exit 0 | 0 (warnings not fatal) | `evidence/02_build_cra_noci.txt` |
| hostv2 build + parity gate | `cd hostv2 && npm run build` | **PASS** exit 0 | 0 — built in 6.88s | `evidence/07_hostv2_build.txt` |
| Parity drift gate (standalone) | `node src/parity/check-parity.mjs` | **PASS** exit 0 | 0 — 3 kit atoms locked, 5 hero CSS selectors token-clean | `evidence/07_qa.txt` |
| hostv2 E2E (Playwright) | `cd hostv2 && npm run test:e2e` | **BLOCKED** exit 1 | Cannot run locally: "Playwright requires Node.js 18 or higher", shell is 16.16.0 | `evidence/07_e2e.txt` |
| Type check | — | **N/A** | No `tsconfig.json`; project is JavaScript | — |
| Lint (dedicated) | — | **N/A** | No `lint` script; lint runs inside react-scripts via eslint-webpack-plugin | — |
| Migration governance | `npm run check:migrations` | PASS exit 0 | 0 — "no new shared-table migrations" | `evidence/07_migrations.txt` |
| Grounding coverage audit | `npm run grounding:audit` | Ran, exit 0 | **4% cited** overall | `evidence/07_grounding.txt` |
| CRA dev server | `BROWSER=none npm start` | PASS | "Compiled with warnings", 1 warning; HTTP 200 on :3000 | `evidence/04_cra_dev.log` |
| hostv2 dev server | `npx vite --port 5199` | PASS | ready in 301ms; HTTP 200 on :5199 | `evidence/04_hostv2_dev.log` |
| Dead-code / unused-export check | — | **N/A** | No supported command in repo | — |
| Accessibility check | — | **N/A** | No automated a11y command in repo | — |

---

## Q1 — KNOWN DEFECT · the CRA production build fails under CI semantics and CI never catches it
`CI=true npm run build` exits 1 with 237 lint warnings promoted to errors.
`.github/workflows/checks.yml` runs the jest suite and the **hostv2** build + E2E, but
**never runs the CRA production build**. `.github/workflows/pages.yml` only publishes the
already-built `gh-pages` branch — it does not build either.

Consequence: **the shipped CRA bundle is produced on a developer machine** via
`npm run deploy` (→ `predeploy` → `npm run build`, without `CI=true`) and pushed to
`gh-pages`. No CI gate exercises it. Any environment that sets `CI=true` — GitHub Actions,
Netlify, Vercel, most containers — cannot currently build this app.
Severity: **High** (release-process risk, not a runtime defect).

## Q2 — KNOWN DEFECT · E2E cannot be run locally on the documented toolchain
Playwright requires Node ≥18; the local shell is 16.16.0. CI pins Node 20, so the E2E
job does run there. The suite's local unverifiability means the Layer-2 board matrix
(loop-advance, rendered-copy lint, pinned geometry, fold peek) was **not verified by this
audit**. Severity: **Medium** (verification gap, not a product defect).

## Q3 — VERIFIED FACT · grounding coverage is 4%
`npm run grounding:audit`: **8 cited · 40 consensus · 131 synthesized · 541 priced items ·
39 playbooks → 4% cited.** At least 12 playbooks are at 0% (anniversary, babyShower,
bachelorParty, bacheloretteParty, boardMeeting, bridalShower, cardParty, conference,
crawfishBoil, dayParty, elopement, …). No playbook exceeded 0% in the "lowest-grounded" list
printed by the tool.
This matters because the product's stated north star is an intelligence that shows its
sources; priced items are host-visible numbers. Severity: **High** for AI-truthfulness claims.

## Q4 — VERIFIED FACT · 237 lint warnings, none gating
Unused vars/imports dominate (`no-unused-vars` across `src/plan/*`, `src/slices/*`,
`src/App.js`). Not runtime-breaking, but they are what makes Q1 fail.

## Q5 — Runtime console/network
CRA dev server compiled with **1 warning**; both servers returned HTTP 200. Browser console
and network inspection is recorded in Phase 7, not here.

## Not tested / could not verify
- Offline behaviour — not claimed anywhere in repo; not tested.
- Authentication edge cases — requires Supabase credentials not present in this environment.
- Backend Python tests (`backend/tests`) — not run; no documented local runner exercised in this audit.
- Deployed-bundle correspondence — I did not verify that production serves this commit.

## Method and limits
Every result above is from a command executed during this audit on this tree. Nothing is
carried over from prior sessions. No application code was modified. The two uncommitted
files present at audit start (`hostv2/src/HostShellV2.jsx`,
`src/lib/__tests__/heroComposition.test.js`) were left untouched and are included in all runs.
