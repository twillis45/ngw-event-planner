# Phase 5C - Governed Knowledge Loop: Complete Summary

**Arc:** 5C.1 -> 5C.10, one session, 2026-08-01. ASCII-only.
**Final state:** **297 suites / 4540 tests passing** . `gate:knowledge [OK]` . hostv2 parity gate passed.
**Committed:** `909f5b9e`. Everything after that is working-tree and uncommitted.

---

## The one-line result

**A governed knowledge change now reaches a host.** An administrator can find a live
host-facing artifact, correct it with a stated reason, pass three review gates, publish it, and
the runtime serves it - and the shopping list a host reads says where the number came from.

At the start of this arc, none of that was true. The pipeline existed and had never carried
anything to a person.

---

## What was actually broken (found, in order)

| # | Defect | Where it hid |
|---|---|---|
| 1 | `p_wine` published a derivation whose arithmetic did not reproduce (it attributed the source's ~40% **beer** share to wine; its own method yields 0.24, not the 0.4 published) | 5C.1 - found by hand-checking division |
| 2 | Admin's publish handler passed `prevVersion: k.rollbackTo` - the **grandparent**. Invisible on a first publish, wrong on **every correction** | 5C.4 |
| 3 | Snapshot selection was **array-order-wins** (`byKey.set`), not lineage | 5C.2 |
| 4 | `knowledge-exports/` was **untracked**; HEAD shipped the **empty snapshot** (`3350e13d`). No deployed build had ever carried governed knowledge | 5C.5 |
| 5 | The export was a **destructive replacement** - one Admin publish would have deleted governed knowledge Admin had never heard of | 5C.5 |
| 6 | Admin could not **see** live published knowledge, so it could not correct it | 5C.5 |
| 7 | Correction KCRs never reached Review (stale component state) | 5C.7 -> fixed 5C.8 |
| 8 | Publish blocked: reconstructed evidence was `{ id }` stubs, so `canReachCited` (rightly) refused | 5C.8 -> fixed 5C.9 |
| 9 | **Nothing in the host app read governed knowledge at all** - 0 refs to `effectiveValue`, `publishedSnapshot`, `qtyGrounded` in any render surface | 5C.9 -> fixed 5C.10 |

**Defects 2, 5 and 9 were mine**, introduced earlier in the same arc. Each was found by pushing
the loop one step further, not by re-reading the code.

---

## What was built

| Component | File | What it does |
|---|---|---|
| **Lineage selection** | `publishedSnapshotBuild.mjs` | Selects the head of the lineage, not the last array element. Order-independent; reports `superseded` and `conflicts`. Rollback = absence of a supersessor |
| **Correction path** | `correctionWorkflow.js` | `openCorrection` (stops at Review, cannot self-approve) + `correctPublishedKCR` (scripted, walks all gates). `lineageOf` for read-side |
| **Export** | `publishedExport.js` | Pure serializer, byte-identical output. `mergePublishedKnowledge` (union by id - **cannot drop a field**), `snapshotEntryToKcr`, `publishedInventory`, `hydrateEvidence` |
| **Evidence bridge** | `publishedExport.js` | `hydrateEvidence` resolves evidence ids through `resolveGroundingSource` - the **existing** authority. `canReachCited` untouched |
| **The last mile** | `playbooks/index.js` | `governedPurchase()` resolves `unitCostRange`, `qtyPerGuest`, `qtyFlat`, `provenance` through `effectiveValue`. Applied once, at the food-plan map |
| **Admin UI** | `AdminConsole.jsx` | Live inventory ("what is live?"), `Correct this` + inline composer, merge-based export, `verify ->` into Runtime Preview, lineage fix |
| **Host UI** | `HostShellV2.jsx` | One muted line: `Sourced - <note>`, shown only when the quantity is genuinely grounded |
| **Integrity checks** | `trustIntegrityChecks.js` | 4 reporting-only checks (same-source-different-values, claim-type mismatch, missing derivation, unevaluated sufficiency) |

---

## The chain, end to end

```
KCR  ->  review (SME + editorial + governance)  ->  publish
     ->  export (merge, never replace)          ->  commit
     ->  npm run bake:knowledge                 ->  publishedKnowledge.json
     ->  effectiveValue (override > published > authored)
     ->  governedPurchase()                     ->  playbookFoodPlan()
     ->  the host's shopping list
```

**Every arrow was driven live in Chrome with real pointer events**, except commit and bake,
which are deliberately human/CLI steps so a bad publish is caught in a diff.

---

## Proof

**Live in the host app** (`hostv2`, current source, My Crab Feast):

```
Blue crabs                                     $192-$1,128
6 dozens . $32-$188/dozen . Captain White's Seafood...
Sourced - Per-guest crab quantity grounded to the
WebstaurantStore protein portion guide (fetched 2026-07-16).
```

**A/B proof it is governed, not authored:**

| | `qtyGrounded` | note shown |
|---|---|---|
| With the snapshot | **true** | WebstaurantStore protein portion guide |
| Snapshot emptied | **false** | reverts to the authored Captain White's block |

The authored `p_crabs.provenance` is a *different record entirely* (DMV crab pricing, tier
`primary`). Remove the published artifact and the line disappears.

**It discriminates:** Old Bay, apple-cider vinegar and butter show no `Sourced` line - only the
field with a published KCR does.

**Clean-checkout reproducibility:** `git archive HEAD` -> `npm run bake:knowledge` ->
`[OK] snapshot is up to date`, same hash `23817229`.

---

## Knowledge corrected along the way

| Claim | Outcome |
|---|---|
| `p_wine` derivation | Corrected and republished as v2 through the governed API; runtime verified |
| Juneteenth `menu` | **Grounding withdrawn** - the cited source prices brisket within ~4% of pork and holds no seafood |
| Crab `crab_size` Medium ratio | **Documented as an editorial blend**, not corrected - the `priceLadder` showed the two methods diverge only for Mediums (2.3x source spread) |
| Potluck multipliers (12 decisions, 8 values) | Identified as ungrounded - **no cost source in NGW covers potluck** |

---

## Corrections I made to my own reporting

Recorded because they affect how much weight the rest deserves.

1. **"Runtime serves 2 published artifacts"** (5C.1-5C.4) - true **locally only**. HEAD shipped
   the empty snapshot. I never checked what was committed.
2. **"An admin cannot see published truth"** (5C.2) - wrong. Runtime Preview already did this;
   I generalised from Publishing's zero-counter without opening it.
3. **"Studio makes zero backend calls"** (5C.2) - overstated. `kcrStore` is server-first with a
   localStorage fallback.
4. **"HostShellV2:9357 renders purchase provenance"** - wrong surface. That is the **itinerary**
   provenance.
5. **Runtime Preview as host proof** (5C.9) - it is Admin's own viewer over the same artifact.
   It proves the bake landed, not that a host sees it. That distinction produced 5C.10.
6. **`--check` exit 0 on drift** - a shell artifact (`$?` captured `tail`). Re-tested: exit 1.
   I nearly reported a fifth P0 that did not exist.

**The pattern in 2, 3 and 5 is the same:** inferring a system-wide absence from one surface's
zero-state. The rule that would have caught all three is to check the reader before concluding
about the writer.

---

## Still open

| # | Item | Severity |
|---|---|---|
| **1** | **Export round-trip is lossy** - the merge base is the snapshot (heads only), so superseded history is dropped and reconstructed records carry 10 of 21 fields. **The loop works once.** Fix: merge against the committed export | **P0** |
| 2 | **No UI rollback** for a published artifact - `rollbackKCR` has 0 references in AdminConsole. Proven in tests only | High |
| 3 | **Corrections cannot change a value** - the composer publishes `newValue` unchanged and Review has no value editor. Today a correction fixes reasoning, not numbers | High |
| 4 | Governed **values** (`unitCostRange` etc.) are wired but **unexercised** - no KCR has published one | Medium |
| 5 | `researching` KCRs are listed by no workspace - a send-back strands them | Medium |
| 6 | Version ids are `${kcrId}-v${audit.length}` - functional, unreadable, timestamp-bearing | Low |
| 7 | Evidence store holds 0 records; server path 401s under dev bypass | Medium |
| 8 | **Deployment UNKNOWN** - never fetched the deployed bundle. Local PASS . Repository PASS . Deployment UNKNOWN | - |

---

## Recommended next

1. **Fix the lossy round-trip (#1)** - until then the loop is single-use.
2. **Value editor in Review (#3)** - otherwise governance can only correct prose.
3. **UI rollback (#2)** - the logic exists and is tested.
4. Then commit the working tree; 15 files are uncommitted behind `909f5b9e`.

---

## Documents

`docs/playbooks/`: `PHASE_5C_1_EXECUTION_REPORT` . `PHASE_5C_2_ADMIN_FULL_BROWSER_AUDIT` .
`PHASE_5C_3_ADMIN_RUNTIME_TRUTH_CONNECTION_PLAN` . `PHASE_5C_4_PUBLISH_LOOP_REPORT` .
`PHASE_5C5_ADMIN_RUNTIME_LOOP_PROOF` . `PHASE_5C6_BASELINE_REPORT` .
`PHASE_5C6_TRUST_FOUNDATION_REPORT` . `PHASE_5C7_GATE_ANALYSIS` .
`PHASE_5C7_CORRECTION_LOOP_REPORT` . `PHASE_5C8_COMPLETE_LOOP_AUDIT` .
`PHASE_5C9_FINAL_LOOP_AUDIT` . `PHASE_5C_TRUST_REPAIR_INVENTORY` .
`PHASE_5C_TRUST_REPAIR_STRATEGY` . this summary.

---

## The lesson worth keeping

Every defect in the list above was found by **driving the loop one step further**, never by
re-reading code. The publish gate refusing an unsubstantiated claim (5C.8) and the round-trip
dropping history (5C.9) are both invisible to component tests - they only appear when the
output of the loop becomes the input of the next one.

And the last one, #9, hid behind a green light: Admin's Runtime Preview showed `published` at
every stage, which I read as proof the host could see it. It was proof the **bake** had landed.
The host was never wired at all.
