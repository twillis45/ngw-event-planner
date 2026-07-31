# Where We Are -- live status board

**THIS FILE IS THE ANCHOR. Update it at the end of every working session.**
Undated on purpose: there is exactly one of these, and it is always current. Dated
snapshots (`2026-07-17_WHERE_WE_ARE.md`, `2026-07-17_THE_PLAN.md`) are history.

**Last updated:** 2026-07-31

---

## 1. Branch state

**Branch:** `product/decision-soundness-p0` - **HEAD `536e998a`** - tree clean.
**Three commits UNPUSHED. Not merged. Not deployed.**

| Commit | What |
|---|---|
| `536e998a` | Conveyor 1 transport -- published KCRs bake into the bundle, reach `effectiveValue` |
| `a2df2fd2` | Decision Evidence Envelope -- score/rank-reason/axes/citations reach the render boundary |
| `0c89df1a` | Canonical decision identity -- hero, panel and CTA read one payload |

PR #70: https://github.com/twillis45/ngw-event-planner/pull/70 (base `main` @ `5853f2ec`)

**Open decision for the host: push these three, or keep holding?**

---

## 2. Gates (as of `536e998a`)

Jest UTC **4329** - NY **4329** - **287 suites** - backend **202** (pytest) - CRA gate
exit 0 (245/245 baselined) - Playwright **143 passed / 13 skipped** - hostv2-drift
**green** - `gate:knowledge` up to date.

Commands that matter:

```
CI=true TZ=UTC npx react-scripts test --watchAll=false     # never bare `npm test` - it hangs
cd backend && python3 -m pytest -q                          # backend is pytest, not npm
npm run gate:cra          npm run gate:hostv2
npm run bake:knowledge    npm run gate:knowledge
npm run grounding:audit   # THE number - re-run every sprint
PATH=/usr/local/opt/node@20/bin:$PATH                       # Node 20 required
```

---

## 3. The one number to watch

```
GROUNDING COVERAGE -- 4% cited   (8 cited - 40 consensus - 131 synthesized - 541 priced)
```

34 of 39 playbooks are 0% cited. **This is the binding constraint.** Everything about
provenance, explanation and trust is downstream of it.

---

## 4. What is true about the architecture

Full measurement: [`2026-07-31_INTELLIGENCE_MEASURED_STATE.md`](./2026-07-31_INTELLIGENCE_MEASURED_STATE.md).
Four things to hold in your head:

1. **~230 intelligence-bearing modules**, 131 in the decision path. The system is big and
   mostly connected -- 12 of 15 planning domains reach a recommendation.
2. **Evidence does not travel.** 13 grounded axes computed per decision, zero consumers.
   1 of 20 provenance registries reaches the host UI.
3. **`phaseProgress.js` emits 47% of all actions.** It carries no evidence envelope.
4. **~14,000 lines are stranded in the frozen CRA** (`orchestration/`, `plan/`, `slices/`)
   -- either port to hostv2 or delete; leaving them is the dishonest option.

---

## 5. Next actions, in order

1. **Point the research factory at the 34 zero-cited playbooks.** The factory works, is
   governed, and now has transport. It has produced 8 cited items.
2. **Extend the evidence envelope to ladder + phase actions** (`phaseProgress` = 47%).
3. **Prove or retire the 6 silent registry surfaces** (`helpers`, `lodging`,
   `lodging-unpicked`, `money-dates`, `travel-air`, `travel-ground`).
4. **Slice B** -- governed decision defaults reaching `decisionEvidence` and the host
   explanation. Transport is ready; rollback is a redeploy until a runtime endpoint exists.
5. **Decide the fate of `orchestration/` + `plan/`.**
6. **Human validation** -- get one real event professional in front of the fixtures. The
   cheapest fix on this list and the only one that cannot be done in code.

---

## 6. Traps -- do not re-derive these

- **Bare `npm test` HANGS** (watch mode). Always `CI=true`. Backend is **pytest**;
  `demo/backend` has no `package.json`.
- **Node 20 at `/usr/local/opt/node@20/bin`**. `/usr/local/bin/node` v18 has a broken
  esbuild arch.
- **`review-artifacts/` is gitignored** (`.gitignore:26`). Working papers there are
  local-only -- durable findings belong in `docs/architecture/`.
- **Game Night / repast are the HOST'S OWN events** (`gn`, `rp` in `ngw-events` +
  `ngw-hostv2-patch-<id>`), not the `test-*` seeds. `ev-x-repast` has a hardcoded past
  date and renders a recap.
- **Chrome cannot reach 390px by window resize** (~500 min). Use the Playwright spec
  (`hostv2/e2e/decisionIdentity.spec.mjs`) for true device geometry.
- **A JSX comment directly after `return (` breaks the build** -- put it above the return.
- **hostv2-drift**: rebuild with `npm run sync:hostv2` (Node 20) before trusting the gate.
- **Never claim absent/dead/disconnected from one probe.** Three such claims were wrong in
  the 2026-07-31 audit. Close the search space first.

---

## 7. Session update protocol

At the end of every session, update **this file only** (not a new dated one):
branch/HEAD, gate numbers, the grounding number if it moved, what shipped, and the next
action. If a dated snapshot is genuinely needed for history, write it separately and link
it from section 1 -- but this file stays the single current source.
