# Phase 5E.4 - Runtime Governance Contract Hardening + Governed Field Audit

**Date:** 2026-08-01. ASCII-only.
**Gates:** **300 suites / 4616 tests passing** (+8 suites, +8 tests over 5E.3) .
`gate:knowledge [OK]` . `gate:hostv2` no drift . eslint 0 errors.
**Governed artifacts:** restored to HEAD, clean.

---

# 1. Executive summary

## **The objective is met, and meeting it required fixing two systemic holes that every prior gate had missed - one of them larger than all three previously-found cases combined.**

The rule now holds and is enforced against output:

> NGW cannot claim a field is governed unless changing that field changes what the host sees.

**What was actually wrong when this phase started:**

| # | Hole | Size | Host-visible? |
|---|---|---|---|
| 1 | `playbookFoodPlan`'s SUPPLIES loop never called `governedPurchase()` | **396 dead field/purchase pairs** | **YES** - every supply line in every playbook |
| 2 | `crabPriceLadder()` scanned the AUTHORED playbook | 1 surface | **YES** - hostv2 crab sheet vs shopping list could disagree |
| 3 | `unitCostRange` on 4 channel-priced proteins is owned by `sourcingPrices` | 6 pairs | governed but inert |
| 4 | My own contract test counted `governedFields` bookkeeping as "output moved" | would have masked #3 | - |

Hole #1 means that for the entire life of the governance system, an admin could have
corrected the price of paper towels, mallets, plates, ice or table covering, watched it
pass three reviews and a publish gate, and no host would ever have seen it.

**After the fix: 1,269 of 1,269 rendered field/purchase pairs move host output. Zero dead.**

---

# 2. Objective 1 - the runtime consumer contract test

`src/lib/knowledge/runtimeGovernanceContract.test.js` - 8 tests, permanent.

**It reads nothing that declares governance.** It takes `RUNTIME_CONSUMED_FIELDS` only as
a list of things to *disprove*, injects a value that could not leave output unchanged, and
fails if output is unchanged.

```
Governance contract violation:

Field:            Dinner Party|p_napkins.unitCostRange
Declared governed: true
Runtime effect:    false
Surface:          playbookFoodPlan

Consumer missing or disconnected. An admin can edit, review, approve and publish
this value and no host will ever see the difference. Either wire the consumer or
remove the field from the governed set - do not leave fake governance.
```

## 2.1 It is proven to bite

A guard that cannot fail is not a guard. The supplies fix was **temporarily reverted** and
the test caught it: **264 dead pairs**, correct message, correct first offender. Restored
-> green.

## 2.2 Two design decisions that matter

**Bookkeeping is excluded from the comparison.** `governedFields` records *which* fields
governance supplied, so it changes the instant anything publishes - including when the
published value is inert. My first version compared raw output and therefore let a dead
field prove itself alive *using the act of publishing*. That is the exact false-pass the
file exists to prevent. Excluding it immediately exposed the 6 channel-priced pairs.

**Scope is lines that RENDER.** A line filtered out for this event (non-essential decor,
an unpicked decision branch) is a rendering condition, not a governance failure. Those are
counted and reported (114 at 18 guests), never silently dropped.

## 2.3 Why every previous gate missed all of this

`governedOwnership.test.js` asserts `RUNTIME_CONSUMED_FIELDS` equals
`GOVERNED_PURCHASE_FIELDS`. Both listed the fields. Both were wrong together.

**Two declarations agreeing is consistency, not consumption.** Field names, registries,
comments, docs and UI labels are all claims about the world. Output is the only witness
that cannot agree with itself.

---

# 3. Objective 2 - the audit

Traced from `governedPurchase()` in both directions and verified against output.

| Field | Source | Resolver | Consumer | Host output | Status |
|---|---|---|---|---|---|
| `qtyPerGuest` | `publishedKnowledge.json` | `effectiveValue` | `resolveQuantity` -> food + supply rows | `qty`, `perGuest`, `basis`, `baseQty`, `low`, `high`, `units` | **VALID** |
| `qtyFlat` | same | same | same | same | **VALID** (on lines that use it) |
| `unitCostRange` | same | same | row pricing | `low`, `high`, `perUnitLow`, `perUnitHigh` | **VALID** |
| `priceLadder` | same | same | `resolveBulkPurchase` + `crabPriceLadder` | `bulkRecommendation.price`, crab-sheet reference prices | **VALID** |
| `servingGuide` | same | same | `crabsPerPicker` / `crabsPerBushel` via `entryFor(size, guide)` | `bulkRecommendation` qty/unit/price | **VALID** (wired 5E.3) |
| `provenance` | same | same | `purchaseProvenance` -> `isGroundedItemQty` | `provenance`, `qtyGrounded` -> the "Sourced -" line | **DISPLAY ONLY** |
| `p_crabs.{qtyPerGuest,qtyFlat,unitCostRange}` | - | - | crab engine | quantised to buying units | **DERIVED** - publish refused |
| `p_{protein,ribs,chicken,burgers_dogs}.unitCostRange` | - | - | `srcTierRange` -> `sourcingPrices[tier]` | per-channel price | **DERIVED** - publish refused *(new 5E.4)* |
| `buyingUnits`, `marketComps`, any other `p_*` field | - | - | **none** | none | **INVALID** - publish refused |

**No field remains in the governed set without a verified runtime consumer.**

## 3.1 On `provenance` being DISPLAY ONLY

Measured: governing it changes `provenance` and `qtyGrounded` and no number. That is
correct and it is still real governance - it drives the "Sourced -" caption a host reads.
It is classified separately so nobody mistakes a caption change for a plan change.

---

# 4. Objective 3 - false governance removed

| Finding | Option taken | Why |
|---|---|---|
| Supply lines ungoverned (396 pairs) | **A - wire the consumer** | The fields were right; the loop was the bug. The comment above it had always claimed supplies get "the EXACT same row functions as food" - they did not |
| `crabPriceLadder()` authored-only | **A - wire the consumer** | Two host surfaces disagreeing on the costliest item is worse than either being wrong alone |
| Channel-priced proteins | **C - `editable: false`, engine-owned** | `sourcingPrices` legitimately owns per-channel pricing. Adding it to the governed set would be new capability, which this phase forbids. Recorded as a Tier-2 candidate for a later phase |

The delegation fallback is an id list, which is a *declaration* - so it is pinned two ways:
a test asserts it equals the set of purchases that actually author `sourcingPrices`, and
the contract test independently checks output. Where the caller has the purchase object
(the composer, the sweep), ownership is decided by what the line actually carries.

---

# 5. Objective 4 - crab ownership model

`docs/playbooks/CRAB_OWNERSHIP_MODEL.md`. The chain, field by field, with the threshold
behaviour that makes crabs an outlier:

```
guest count -> serving model -> total crabs -> bushel/dozen conversion -> price ladder -> host cost
```

The document's most useful row is a **negative** result:

| Governed change | Total crabs | Purchase | Price |
|---|---|---|---|
| authored | 84 | 2 bushels | $690 |
| `withSides` -> 3 | 63 | **1 bushel** | **$345** |
| `perBushel` -> 30 | 84 | **3 bushels** | **$1,035** |
| `perBushel` -> 48 | 84 | 2 bushels | **$690 - unchanged** |

A real, sourced, correct correction can move nothing because the ceiling absorbs it. That
is threshold economics, not a dead wire - and it is why the contract test uses values that
cannot be absorbed.

---

# 6. Objective 5 - provider governance

`docs/playbooks/PROVIDER_GOVERNANCE_MODEL.md`. **Data model only. No UI, no providers added.**

Audit of `groundingSources.js`:

```
20 axes . 111 sources
  with publisher / note / grounded   24  (22%)
  UNSPECIFIED tier                   87  (78%)
```

**The finding: the two axes the backfill needs are the two least equipped.** `Cost` and
`Quantity` have **3 sources each - 6 between them - and not one is grounded.** Every
grounded source is a military-ceremony regulation or a safety/travel authority. The
commercial food sources the corpus actually leans on (Captain White's, Cameron's,
WebstaurantStore) are **not in the registry at all** - they are free-text strings inside
individual provenance blocks, so nothing can expire them, cross-reference them, or record
that one was wrong.

Recommended record adds the fields that would have caught the Cameron's fabrication:
`supports` / `refuses` claim types, `scope`, `evidenceType`, `freshnessDays`, `failures[]`,
and a `silence` record for providers that publish nothing. Enforcement goes at the publish
gate, not in a screen.

---

# 7. Objective 6 - backfill queue validated

Three corrections made to the queue's own figures:

1. **Tier 1 is 237, not 248.** Seven purchases are now delegated; four never render.
2. **Its premise was half true when written.** It claimed the 248 had verified consumers
   while the entire supply half was dead. Now true and enforced.
3. **Ordering confirmed** - evidence primitive, then runtime importance, then provider
   availability, then freshness risk. Not count, not ease.

**Blocking dependency added:** provider governance must land before Tier 1 research begins.

---

# 8. Chrome verification - the full loop, on the capability this phase added

Driven with real pointer events on a **SUPPLY** line, because that is what 5E.4 fixed.

| # | Step | Result |
|---|---|---|
| 1 | Composer -> purchase picker -> `p_paper` | field row: `provenance . qtyPerGuest . unitCostRange`, governing fields correctly absent |
| 2 | `unitCostRange` | pre-filled `8` / `20`, `current: $8-$20` |
| 3 | Corrected to `24` / `48` with a stated defect | correction created, `status: review`, `correctionOf: null` |
| 4 | SME / Editorial / Governance | all three approved in the UI |
| 5 | Mark approved -> Publish | `status: published` |
| 6 | Export -> `publishedKcrs.json` | 5 records, `p_paper.unitCostRange = [24,48]` |
| 7 | `npm run bake:knowledge` | 4 entries, snapshot `50cf8d4d` |
| 8 | **hostv2 :5199** | see below |

**Host result - the line:**

```
Newspaper / brown kraft paper table cover          $24-$48
essential
1 roll . $24-$48/roll . Hardware store, Party store, Online, Amazon
```

**Host result - the rollups, which moved by exactly the delta:**

```
Supplies group   $57-$173  ->  $73-$201     (+16 / +28 = the p_paper delta exactly)
Summary line     supplies $55-$175  ->  supplies $75-$200
AUTHORED FILE    unitCostRange: [8,20]  UNCHANGED
```

Before 5E.4 this correction would have published successfully and changed nothing.

Also re-verified live: the composer renders correctly after a JSX restructure, crab
delegation still shows `(engine-owned) [DISABLED]`, and the 5E.3 honesty message renders -
*"a newly governed field, so it starts its own lineage and supersedes nothing."*

---

# 9. Files changed

| File | Change |
|---|---|
| `src/lib/playbooks/index.js` | supplies loop resolves through `governedPurchase` + carries `provenance`/`qtyGrounded`/`governedFields`; `crabPriceLadder()` governed |
| `src/lib/knowledge/governedOwnership.js` | `ENGINES.sourcingPrices`; `CHANNEL_PRICED_PURCHASES`; `fieldOwnership(assetId, fieldPath, purchase)` |
| `src/lib/knowledge/runtimeGovernanceContract.test.js` | **NEW** - 8 tests, the permanent guard |
| `src/admin/AdminConsole.jsx` | ownership decided by the actual purchase object |
| `docs/playbooks/CRAB_OWNERSHIP_MODEL.md` | **NEW** |
| `docs/playbooks/PROVIDER_GOVERNANCE_MODEL.md` | **NEW** |
| `docs/playbooks/SAFE_RESEARCH_BACKFILL_QUEUE.md` | revalidated |

**Not changed:** resolver precedence, `canReachCited`, `isPublishable`, approval rules, any
knowledge value, any playbook value. No providers added. No research started. No UI built.

---

# 10. Completion criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Every governed field audited | **PASS** - 1,269 pairs across 39 playbooks, plus a cross-surface check |
| 2 | Runtime contract test exists | **PASS** - and proven to fail on a real regression |
| 3 | No governed field lacks runtime impact | **PASS** - 0 dead pairs |
| 4 | Crab ownership model documented | **PASS** |
| 5 | Provider governance model documented | **PASS** - data model only, as instructed |
| 6 | Research queue validated | **PASS** - 3 corrections, blocking dependency added |
| 7 | All tests green | **PASS** - 300 suites / 4616 tests |
| 8 | `gate:knowledge` / `gate:hostv2` | **PASS** / **PASS** |
| 9 | Chrome verification, host not Runtime Preview | **PASS** - hostv2, full loop |
| 10 | Full report | **PASS** - this document |

**10 of 10.**

---

# 11. Remaining risks

- **R1. The contract test covers `playbookFoodPlan` and `crabPriceLadder`. Other surfaces
  are not covered.** Measured: `playbookBudgetCategories`, `playbookTasks`,
  `playbookSetupPreview`, `nextUpcomingTask`, `topPlaybookDecision` all ignore governance.
  **None are imported by hostv2** - they are consumed by the frozen CRA (`ClientIntakeFlow`,
  `CommandCenter`, `App.js`) or by nothing at all (`playbookTasks` has no consumer
  outside tests). So no *live* host surface is affected today, and CRA is donor-only per
  CLAUDE.md. **But if any of those is ever ported to hostv2, it arrives ungoverned**, and
  `playbookBudgetCategories` computes budget from `unitCostRange` - the shape of a
  shopping-list/budget disagreement. Extending the contract test to a surface registry is
  the natural next hardening.
- **R2. 114 purchases never render in the shopping list at any tested guest count** (89
  non-essential, 25 decision/region gated). Governing them is inert because the LINE is
  inert. Reported by the test, not failed on. If that number grows, governance quietly
  stops mattering for more of the corpus.
- **R3. Tier 2 governing-field corrections still not driven to a host.** `priceLadder`
  and `servingGuide` corrections from 5E.3 remain in Review in browser localStorage.
  Wired and unit-proven; not host-driven.
- **R4. Sanity ceilings (500 / 1,000,000) remain judgement, not sourced.**
- **R5. Deployment unverified.** Local PASS . Repository PASS . Deployment UNKNOWN.
- **R6. ~50 files uncommitted** behind `909f5b9e`, all gates green. Includes a stray
  `published-kcrs.json` at the repo root - a stale lossy export (10-field
  `reconstructedFromSnapshot` records plus a leaked `correctionOf`) that nothing reads.
  It should be deleted before commit so it cannot later be mistaken for the corpus.

---

# 12. Recommended next phase

## **Commit now. The loopholes are closed and the tree has been uncommitted across five phases.**

Then, in order:

1. **Provider governance implementation** (`PROVIDER_GOVERNANCE_MODEL.md` steps 1-4).
   The registry plus publish-gate checks. This is the blocking dependency for all
   research and it is the last structural gap between NGW and volume.
2. **Extend the contract test to a surface registry** (R1) - so "governed" means governed
   on *every* host surface, not just the one this phase happened to audit.
3. **Drive one Tier 2 correction to a host** (R3) - the crab line's governance route has
   still never been walked end to end.
4. **Then** Tier 1 research, job 1.

Do not start the 537-line backfill until 1 is done. The bottleneck was never knowledge
acquisition; it was proving NGW can tell the difference between knowledge that exists and
knowledge that controls the product. That is now provable - and the proof is a test that
fails, not a document that asserts.
