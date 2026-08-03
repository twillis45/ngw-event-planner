# Phase 5E Baseline Release - Governance Commit Review

**Date:** 2026-08-01. ASCII-only.
**Baseline:** `909f5b9e` -> this commit.
**Scope:** phases 5C.1 through 5E.4 - the governed knowledge loop, from correction through
publish to a host, plus the contract that keeps it honest.

**Verification at time of review:**

```
1. npm test               300 suites / 4616 passed / 1 skipped
2. npm run gate:knowledge  [OK] snapshot is up to date
3. npm run gate:hostv2     no drift (12 files)
4. git status              47 paths, all classified below
5. artifact drift          NONE (see section 4)
```

---

# 1. Per-file classification

## 1.1 COMMIT - required runtime behavior

| # | Path | Why |
|---|---|---|
| 26 | `src/lib/playbooks/index.js` | supplies loop routed through `governedPurchase()` (closed 396 dead pairs); `crabPriceLadder()` governed; `resolveBulkPurchase` passes the governed serving guide |
| 13 | `src/lib/crabServing.js` | `entryFor(size, guide)` + `usableRow()` - the consumer that makes `servingGuide` real |
| 18 | `src/lib/knowledge/knowledgeChange.js` | publish gate: approved-only, cited-needs-evidence, type gate, ownership gate |
| 19 | `src/lib/knowledge/publishedExport.js` | lossless merge base; export order fix (5D/D2) |
| 14 | `src/lib/knowledge/correctionWorkflow.js` | `openCorrection` stops at review; cannot self-approve |
| 11 | `scripts/bake-published-knowledge.mjs` | sole writer of the baked snapshot; `--check` mode |
| 3 | `hostv2/src/HostShellV2.jsx` | the "Sourced -" line; hero-urgency dedup |
| 10 | `public/hostv2/index.html` | rebuilt bundle manifest |

## 1.2 COMMIT - governance contracts

| # | Path | Why |
|---|---|---|
| 40 | `src/lib/knowledge/governedOwnership.js` | **the contract**: a field is governable only with a verified consumer. Crab engine + sourcing-price model delegations |
| 38 | `src/lib/knowledge/governedFieldTypes.js` | typed/row editors + the publish-time type gate |
| 21 | `knowledge-exports/published-kcrs.json` -> `src/lib/knowledge/publishedKcrs.json` | the governed corpus, relocated so the CRA can import it. **Pure rename, 0 insertions / 0 deletions** |

## 1.3 COMMIT - tested architecture

| # | Path | Why |
|---|---|---|
| 44 | `src/lib/knowledge/runtimeGovernanceContract.test.js` | **the phase's most important artifact.** 1,269/1,269 pairs proven against output; proven to fail on a real regression |
| 41 | `governedOwnership.test.js` | delegation + publish-gate refusals + the servingGuide wire |
| 39 | `governedFieldTypes.test.js` | parse/validate/gate, incl. the row editors |
| 42 | `governedProvenanceSlice.test.js` | provenance publish slice |
| 43 | `provenanceOwnership.test.js` | provenance ownership rules |
| 45 | `sourceResolverInvariant.test.js` | source resolution invariants |
| 15,16,17,20,22 | `correctionWorkflow` / `costProvenance` / `kasVerticalSlice` / `publishedExport` / `publishedSnapshot` tests | updated for the above; includes the anti-hand-edit test |
| 1 | `.github/workflows/checks.yml` | `gate:knowledge` runs in CI before the suite |

## 1.4 COMMIT - operator workflow

| # | Path | Why |
|---|---|---|
| 12 | `src/admin/AdminConsole.jsx` | correction composer, purchase picker, typed + row editors, rollback, export, honest lineage messaging |

## 1.5 COMMIT - host proof + corpus repairs

| # | Path | Why |
|---|---|---|
| 32-37 | `public/hostv2/assets/*` (6 new) | the build matching committed source; `gate:hostv2` green |
| 4-9 | `public/hostv2/assets/*` (6 deletions) | superseded chunks of the same build |
| 23,24,25 | `crabFeast.js`, `juneteenthCookout.js`, `retirementParty.js` | Phase 5C.1 trust repairs. **All 170 value literals verified byte-identical to `909f5b9e`** - only evidence prose, tiers and claims changed |

## 1.6 COMMIT - architecture documentation

| # | Path | Why |
|---|---|---|
| 30 | `docs/playbooks/` (39 files) | phase records + the four load-bearing docs (see 3.4) |
| 31 | `docs/product/phase5-validation-plan.md` | the plan these phases executed against |

## 1.7 COMMIT - coupled set (separate workstream, cannot be split)

| # | Path | Note |
|---|---|---|
| 2 | `docs/audits/INDEX.md` | adds a "Ported from artifacts" table |
| 27,28,29 | Mobbin / Blink / Lodging competitive reads | **the index links all three** |

**These four are competitive-UX research, not governance.** They are in this commit only
because `INDEX.md` references the three docs: committing the index without them produces
three broken links. **Either commit all four or park all four** - committing the index
alone is the one option that is wrong. Defaulting to commit; say the word and I will hold
all four back and drop the INDEX hunk instead.

## 1.8 PARK - not in this commit because it was never built

Nothing on disk is parked. The parked items are **scope**, and each has a doc that ships
so the decision is recorded rather than forgotten:

| Parked scope | Recorded in |
|---|---|
| The 537-line research backfill | `SAFE_RESEARCH_BACKFILL_QUEUE.md` |
| Provider intelligence (registry, freshness, claim-type enforcement) | `PROVIDER_GOVERNANCE_MODEL.md` - **data model only, no code** |
| `sourcingPrices` as a governed field | `PHASE_5E4...md` section 4 - would be new capability |
| Automated gating of the trust integrity checks | `TRUST_INTEGRITY_CHECKS.md` - reporting-only by design |
| Tier 2 crab corrections to a host | `PHASE_5E4...md` R3 |

**One file deserves naming here:** `trustIntegrityChecks.js` (#46, with its harness #47)
has **zero runtime consumers**. That is by design and declared in both its header and its
doc: reporting only, gates nothing, asserts nothing about counts. It is committed because
its harness runs and its findings are real - but a module with no consumer is exactly what
this phase spent itself hunting, so it is flagged rather than left to be discovered. The
distinction that makes it legitimate: it is a **diagnostic library**, not a governed value
claiming to reach a host.

## 1.9 DELETE - executed during this review

| Path | Disposition |
|---|---|
| `published-kcrs.json` (repo root) | **DELETED** |

A stale browser download referenced by no code or config. Strictly worse than the tracked
corpus - 10/22/10 fields against 21/21/21, carrying **2 lossy `reconstructedFromSnapshot`
records and 1 leaked `correctionOf`**, precisely the two defects the 5D/D2 and 5E.3 fixes
eliminated. Left in place it would eventually be mistaken for the corpus and silently
reintroduce both. Backed up outside the repo before removal.

**No other deletions.** Swept for and found none: `.log`, `.tmp`, `.bak`, screenshots,
`.DS_Store`, scratch files, or `zz*` probe tests. All scratch work was written outside the
repo.

---

# 2. Committed scope - what the system can now do

## 2.1 The chain reaches a host

```
Observation -> Evidence -> Finding -> KCR
  -> SME / editorial / governance review (no self-approval)
  -> publish -> export -> bake -> snapshot
  -> effectiveValue() -> governedPurchase()
  -> playbookFoodPlan -> hostv2
```

Driven end to end in the browser, twice, on two different field classes:

| Field | Before | After | Surface |
|---|---|---|---|
| `p_oldbay.qtyPerGuest` | 0.05 -> `1.1 lbs` `$4-$10` | 0.08 -> `1.7 lbs` `$7-$15` | hostv2 Food (5E.3) |
| `p_paper.unitCostRange` | `[8,20]` -> `$8-$20` | `[24,48]` -> `$24-$48` | hostv2 Supplies (5E.4) |

Both times the authored playbook was **unchanged**. Supplies rollups moved by exactly the
delta (`$57-$173 -> $73-$201`) - the arithmetic check that the number travelled rather
than merely differing.

## 2.2 The rule, enforced against output

> NGW cannot claim a field is governed unless changing that field changes what the host sees.

**1,269 of 1,269 rendered field/purchase pairs move host output. Zero dead.** The test
reads nothing that *declares* governance; it takes the registry only as a list of things
to disprove. Proven to bite: reverting the supplies fix produced 264 correctly-reported
failures.

## 2.3 Four dead wires closed

| Defect | Size |
|---|---|
| supplies loop never called `governedPurchase()` | **396 dead pairs** - the whole Supplies half of every list |
| `crabPriceLadder()` read the authored playbook | two host surfaces could disagree on the costliest item |
| `servingGuide` read only as a truthiness check | the field that moves the crab COUNT |
| `unitCostRange` on 4 channel-priced proteins | 6 pairs, now declared engine-owned |

---

# 3. Architecture state

## 3.1 Corpus ownership - single owner, verified

```
src/lib/knowledge/publishedKcrs.json        <- the committed export
   |  read by: scripts/bake-published-knowledge.mjs (DEFAULT_IN)
   |           src/lib/knowledge/publishedExport.js (COMMITTED_EXPORT import)
   v
src/lib/knowledge/publishedKnowledge.json   <- the baked snapshot
   |  written by: scripts/bake-published-knowledge.mjs  (SOLE writer)
   |  read by:    src/lib/knowledge/publishedSnapshot.js (SOLE runtime reader)
   v
effectiveValue()  ->  governedPurchase()  ->  playbookFoodPlan  ->  hostv2
```

No duplicates anywhere in the repo. `knowledge-exports/` no longer exists.

## 3.2 Governance precedence

`host-locked -> override (localStorage) -> published snapshot -> authored`.
An empty snapshot means every value is authored - today's behaviour, and a safe default.
A malformed entry is dropped and falls back to authored; nothing here can throw into a
host's render path.

## 3.3 Field classification (the audit result)

| Class | Fields |
|---|---|
| **VALID** | `qtyPerGuest`, `qtyFlat`, `unitCostRange`, `priceLadder`, `servingGuide` |
| **DISPLAY ONLY** | `provenance` - drives the "Sourced -" caption, never a number |
| **DERIVED** | `p_crabs.{qtyPerGuest,qtyFlat,unitCostRange}`; `unitCostRange` on 4 channel-priced proteins |
| **INVALID** | everything else on a `p_*` path - no consumer, publish refused |

## 3.4 The four docs a maintainer actually needs

| Doc | Answers |
|---|---|
| `PHASE_5E4_RUNTIME_GOVERNANCE_CONTRACT.md` | how governance is proven, and what broke |
| `CRAB_OWNERSHIP_MODEL.md` | why crabs resist generic food logic; which field to change and why |
| `PROVIDER_GOVERNANCE_MODEL.md` | what a source may claim (recommendation, not built) |
| `SAFE_RESEARCH_BACKFILL_QUEUE.md` | what may be researched next, in what order |

---

# 4. Artifact drift - none

- **`publishedKnowledge.json`**: clean against HEAD. `gate:knowledge` re-bakes in memory
  and confirms it.
- **`publishedKcrs.json`**: `git diff -M` reports the move as a **pure rename, 0
  insertions / 0 deletions** - byte-identical to its committed content.
- **hostv2 bundle**: rebuilt from committed source; `gate:hostv2` reports no drift; exactly
  one chunk of each kind on disk (no stale accumulation).
- **Demonstration data**: every correction driven during 5E.3 and 5E.4 lives only in
  browser localStorage. **None is being committed.**

---

# 5. Remaining risks

- **R1. The contract test covers two surfaces** - `playbookFoodPlan` and `crabPriceLadder`.
  Five other purchase-reading surfaces ignore governance. **None are imported by hostv2**
  (verified), so no live host surface is affected today. But `playbookBudgetCategories`
  computes budget from `unitCostRange`; if it is ever ported to hostv2 it arrives
  ungoverned and disagrees with the shopping list. **Highest-value next hardening.**
- **R2. 114 purchases never render** in the shopping list at any tested guest count (89
  non-essential, 25 decision/region gated). Governing them is inert because the LINE is
  inert. Reported by the contract test, not failed on.
- **R3. Four knowledge files contain NUL bytes** - `publishedExport.js` (5),
  `publishedSnapshot.js` (2), `knowledgeChange.js` (1), `publishedSnapshotBuild.mjs` (1).
  All are the intentional composite-key separator (`assetId \0 fieldPath`), correct because
  assetIds contain spaces. **The hazard is tooling, not correctness:** `file` reports these
  as `data` and **grep silently skips them**, so an audit can look clean while never having
  read them. This review only found them by reading bytes in Python. Not changed here (no
  code modification); flagged for a follow-up that swaps `\0` for a named constant.
- **R4. Sanity ceilings (500 / 1,000,000) are judgement, not sourced.**
- **R5. Deployment unverified.** Local PASS . Repository PASS . Deployment UNKNOWN.
- **R6. Three code comments name the old corpus path** `knowledge-exports/published-kcrs.json`
  (`checks.yml:46`, `AdminConsole.jsx:3326`, `correctionWorkflow.test.js:187`). Harmless,
  stale, misleading to the next reader.
- **R7. This is a large commit** - 47 paths across five phases. It is a baseline, not an
  incremental change, and should be reviewed as one.

---

# 6. Next phase recommendation

## **Phase 5F - Provider Governance + Surface Coverage**

1. **Provider record + publish-gate checks** (`PROVIDER_GOVERNANCE_MODEL.md` steps 1-4):
   source-known, claim-type-allowed, freshness, plus `providerContract.test.js`. This is
   the blocking dependency for all research and the last structural gap before volume.
   The Cost and Quantity axes - exactly what the backfill needs - have 3 sources each and
   none grounded.
2. **Extend the contract test to a surface registry** (R1), so "governed" means governed
   on every host surface, not only the two audited here. The test exists; it needs a list
   of surfaces instead of a hard-coded pair.
3. **Drive one Tier 2 correction to a host** - the crab line's governance route has never
   been walked end to end, and it is the costliest line NGW prices.
4. **Then** Tier 1 research, job 1 (non-alcoholic servings per guest per hour, ~39 lines
   from one primitive).

Do not start the backfill until 1 is done.

---

# 7. Commit recommendation

## **RECOMMEND COMMIT - 47 paths, one commit, as a baseline.**

| Check | Result |
|---|---|
| `npm test` | 300 suites / 4616 passed |
| `npm run gate:knowledge` | OK |
| `npm run gate:hostv2` | no drift |
| `git status` | 47 paths, every one classified |
| Artifact drift | none |
| Stray / debug / generated leftovers | one found, one deleted |
| Duplicate corpus owners | none |
| Untracked runtime files | all accounted for |

**One open decision** (section 1.7): the four competitive-UX paths - `docs/audits/INDEX.md`
plus the three audit docs it links - are a separate workstream riding along. Commit all
four, or park all four and drop the INDEX hunk. Committing the index alone would leave
three broken links.

Suggested message:

```
feat(knowledge): governed knowledge reaches the host, and cannot claim to without proof

Phases 5C.1-5E.4. A researched correction now travels
correction -> review -> publish -> export -> bake -> hostv2 and changes
what a host is told to buy, with the authored playbook unchanged.

The contract: a field cannot be called governed unless changing it changes
host output. Enforced against OUTPUT by runtimeGovernanceContract.test.js
across 1,269 field/purchase pairs, because two registries agreeing with
each other is consistency, not consumption.

Closes four dead wires, the largest being the entire Supplies half of every
shopping list, which was editable, publishable, approved - and inert.
```
