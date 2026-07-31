# Intelligence: Measured State -- 2026-07-31

**Status:** Living supplement to [`INTELLIGENCE_OPERATING_SYSTEM.md`](./INTELLIGENCE_OPERATING_SYSTEM.md)
(FROZEN v1.0). That document says "do not regenerate the intelligence audit -- extend
*this* document as engines ship." This is that extension: **not a new framework, a
measurement of what actually exists.**

**Method:** total census with 100% accounting -- 922 files, every one bucketed; five
reachability roots; depth-1 engine roster; 15-domain sweep; behavioural proof across 117
plans. Full working papers in `review-artifacts/2026-07-31-intelligence-audits/` (that
directory is **gitignored** -- this file is the durable record).

**Read with:** [`KNOWLEDGE_FACTORY.md`](./KNOWLEDGE_FACTORY.md),
[`INTELLIGENCE_READERS_REGISTRY.md`](./INTELLIGENCE_READERS_REGISTRY.md),
[`CONTEXT_INTELLIGENCE.md`](./CONTEXT_INTELLIGENCE.md).

---

## 1. Scale (measured, not estimated)

| Bucket | Files | Meaning |
|---|---|---|
| DECIDE | 131 | reachable from `CommandCenter` / `playbooks` / `surfaceRegistry` |
| shell | 81 | live host product (hostv2) |
| admin | 68 | knowledge factory |
| cra | 72 | frozen legacy app only |
| test | 291 | |
| orphan | 272 | 228 are `scripts/`, 40 non-JS; **4 real JS orphans** |
| **total** | **922** | |

**~230 intelligence-bearing modules.** Prior audits named ~20.

Largest engines in the decision path: `playbooks/index.js` 3,871 - `vendorIntelligence`
1,236 - `lodgingIntel` 1,103 - `vendorAccountability/playbooks` 921 - `eventSolve.mjs` 870
- `vendorQuestions` 606 - `assembleRevealEngines` 547 - `weather` 534 -
`workflowCompression` 476 - `travelPlan` 463 - `seatingPlan` 407 - `phaseProgress` 345.

---

## 2. THE governing number

`npm run grounding:audit` (the repo's own scoreboard, `scripts/groundingAudit.mjs`):

```
GROUNDING COVERAGE -- 4% cited
  8 cited - 40 consensus - 131 synthesized - 541 priced items - 39 playbooks
```

**Only 5 of 39 playbooks have even one cited item. 34 are 0%.**
**96% of the priced canon is model-authored estimate or trade consensus.**

This is the binding constraint on intelligence quality. Carriage, provenance and
explanation work are all downstream of it: perfect delivery of a citation that does not
exist still tells the host "nobody researched this."

**Re-run this number every sprint.** It is the one metric that says whether the knowledge
factory is actually producing.

---

## 3. What is connected, what is not

**12 of 15 planning domains reach a recommendation** -- guests, food, money, time,
vendors, weather, the day, risk, people, place (barely), travel (partial), meaning
(partial). The engine is well connected. Three findings qualify that:

1. **Evidence does not travel with intelligence.** `playbooks/index.js:2528-2578` computes
   **13 grounded axes per decision** (factor, tier, verification status, cited source ids)
   and attaches them to every board row. **Zero consumers outside that file.** Of 20
   provenance registries unioned by `groundingSources.js`, exactly one
   (`DESTINATION_SOURCES`) reaches the host shell.
2. **Location is the sharpest gap.** ~15 modules and a live geocode/forecast backend;
   exactly **two doors** into the decision pipeline (`venueFor`, `travelPlan`).
   **`venueCity` has zero consumers** in `playbooks` / `CommandCenter` / `surfaceRegistry`.
3. **Three subsystems are stranded by deployment, not design.**
   `src/orchestration/` (~1,900 lines: pressure state, cognitive tunneling, trust
   compression, continuity field -- live in CRA via React context, absent from hostv2),
   `src/plan/` (~9,700 lines incl. `DecisionApprovalCenter`), `src/slices/` (~2,600).

---

## 4. Behavioural facts (proven, not inferred)

Across 117 plans (39 playbook types x 3 states):

| Producer | Share of all actions |
|---|---|
| **`phaseProgress.js`** | **47%** |
| foundational ladder | 38% |
| `surfaceRegistry` | 16% |

**`phaseProgress` produces nearly half of everything a host sees.** Any change to it moves
half the product.

**Registry surfaces: 10 of 16 behaviourally proven.** Silent under every fixture built so
far (may be fixture limits, not dead code): `helpers`, `lodging`, `lodging-unpicked`,
`money-dates`, `travel-air`, `travel-ground`.

**Playbook canon:** 8,075 lines - 383 `dependsOn` - 216 weights - 254 defaults - 278 risk
blocks - 216 `difmCapable` - **`culturalContext` in only 5 of 39** - **zero `src:` fields.**

---

## 5. What shipped against this (2026-07-31)

| Commit | What |
|---|---|
| `0c89df1a` | Canonical decision identity -- hero/panel/CTA read one payload (`lib/selectedAction.js`) |
| `a2df2fd2` | **Decision Evidence Envelope** -- board score, rank reason, grounded axes, citations carried to the render boundary (`lib/decisionEvidence.js`). Fixed `raiseAll` silently dropping `priorityScore`/`gateHolder`/`unlocks`/`ask` |
| `536e998a` | **Conveyor 1 transport** -- published KCRs bake into `publishedKnowledge.json`, reach `effectiveValue` as precedence tier 3. Governance enforced on both sides |

---

## 6. Open debt, ranked

| # | Finding | Sev |
|---|---|---|
| G1 | **4% cited** -- 34 playbooks at zero | **P0** |
| D4 | Envelope covers decision actions only; `phaseProgress` (47%) carries none | **P0** |
| D1/D2 | Approved knowledge cannot reach playbooks or decisions | **P0** |
| D3 | 13 grounded axes have no consumer | **P0** |
| D19 | Vendor cluster (~3,500 lines) carries no provenance | P1 |
| D15 | `venueCity` unused by the pipeline | P1 |
| D17/D18 | `orchestration/` + `plan/` stranded in CRA | P1 |
| D5 | No capability identity above the hero | P1 |
| D6 | Outcomes device-local; one learning signal (`attendanceAdjustment`, >=3 events) | P1 |
| D20 | `solemn.js` classification is shell-only | P2 |
| -- | Human validation: board is simulated personas; no fixture reviewed by a real event professional | **P1** |

---

## 7. Corrections to earlier claims (do not repeat these)

- **"No abstention primitive"** -- WRONG. `decisionConfidence.js:41` `DEFERRED_DECISIONS`,
  runtime-connected. Narrow, not absent.
- **"Weather raises nothing"** -- WRONG. Weather reaches actions via `dayBefore` +
  `phaseProgress`. True statement: no weather import in `surfaceRegistry`.
- **"~20 engines"** -- WRONG by ~5x. See section 1.

**Method lesson, recorded so it does not recur:** a positive finding needs one witness; a
**negative finding needs the search space closed**. All three errors were absence claims
from a single probe. Census, never "classify the leftovers" -- a fully disconnected
cluster is invisible to a leftovers sweep.
