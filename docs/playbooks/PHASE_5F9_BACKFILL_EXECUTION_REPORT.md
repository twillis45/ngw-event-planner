# Phase 5F.9 - Backfill Execution Report

**Date:** 2026-08-02. ASCII-only.

---

# Status

## PARTIAL - Steps 1 and 2 complete and proven live. Step 5 (backfill) not started.

**No business decision blocks execution.** The directive resolved the one I raised: the
commercial-practitioner policy is now implemented, enforced and tested. What stopped me
was session budget, not a decision — stated plainly rather than dressed as a blocker.

---

# Step 1 - Commercial practitioner source policy: COMPLETE

## Implemented

`commercialSourcePolicy.js`, enforced at the publish gate beside `groundingHonesty`.

```
SOURCE_CLASSES   independent | government | trade_association | commercial_practitioner
CLAIM_TYPES      planning_guidance | measured_finding | regulatory_requirement | universal_claim
```

Declared on both commercial sources:

```
reddy-ice-2026 / jollychef-disposables-2026
  sourceClass: 'commercial_practitioner'
  claimType:   'planning_guidance'
  limitations: ['commercial_interest_disclosed']
```

## Three enforcement rules, all checkable

| Violation | Fires when |
|---|---|
| `undisclosed-interest` | an interested source does not declare `commercial_interest_disclosed` |
| `overclaimed` | certainty language while EVERY cited source is interested |
| `unsupported-claim-type` | `measured_finding` / `regulatory_requirement` / `universal_claim` on commercial sources alone |

```
ALLOWED   "Reddy Ice recommends approximately 2 lb of ice per person for outdoor planning."
REFUSED   "2 lb/person is proven universally correct."
          -> KCR: The claim uses "proven", "universally" while every cited source has a
             commercial interest in the answer...
```

## The strictness that matters

**An UNDECLARED source does not lift the restriction.** I wrote the test the other way
round first and it failed — the code was right. If "unclassified" counted as independent,
the policy would evaporate exactly where the metadata is weakest: 103 of 113 sources carry
no class yet, so any of them could have been cited to bypass it.

To prove the lift path honestly I classified the eight federal food-safety sources
(USDA FSIS / FDA / CDC) as `government`. The remaining ~103 stay undeclared rather than
guessed.

**18 tests**, including the three the directive required (vendor + disclosed = pass,
vendor + certainty = fail, wrong-axis vendor = fail) and the certainty-pattern list
checked in both directions so ordinary hedged wording ("approximately", "roughly",
"ceiling-leaning") cannot trip it.

---

# Step 2 - Remaining 5F.8 fixes: COMPLETE, driven live

## 2.1 Evidence attachment - proven end to end

`Fish Fry p_ice.provenance` taken through the **entire** lifecycle in the browser:

```
Acquisition picker -> composer (reddy-ice-2026 selected, tier researched)
  -> "Will ground -> the host's 'Sourced -' line"
  -> Open correction        evidence: 1  id=reddy-ice-2026  sourceType=citation  url present
  -> Mark grounded -> Request review
  -> SME / Editorial / Governance approve
  -> Mark approved -> Publish
  -> status=published  version=authored-fish-fry-p-ice-provenance-1785643974492-v13
```

It passed the new commercial-source gate on the way through — a disclosed practitioner
source carrying planning-guidance wording is exactly the admissible case.

**This is the first record the Acquisition workflow has ever produced that satisfies
`canReachCited`** and can therefore enter the corpus.

## 2.2 Archive lifecycle - proven live

```
published -> [Move to monitoring] -> monitoring -> [Archive + required reason] -> archived
audit: advanced:monitoring by admin
       advanced:archived   by admin :: "Published with zero evidence attached, so
                                        canReachCited fails and it cannot enter the corpus..."
```

`published -> archived` remains illegal; the control surfaces the transition that already
existed rather than adding a shortcut.

## 2.3 Orphan states - a bigger defect than the one I was chasing

`KcrTable` renders in four workspaces: Review (`review`, `grounded`), Publishing
(`approved`), Validation (`published`), Retirement (`archived`). **`researching` appeared
in none of them** — so "Send back", the reject action on every review row, moved a record
into a status the console could not display and could not recover.

Found by walking into it: a mis-click during 5F.8 sent a real record to `researching` and
it vanished.

**Fixed, then corrected once.** My first fix listed `draft` too. Measured in the live
store: **227 auto-seeded corpus-dimension drafts against 2 real sent-back records** —
listing both would bury the human work under machine candidates, a different untruth from
the one being fixed. Narrowed to `researching` only, with the reasoning pinned by test so
it cannot be "improved" back.

```
SENT BACK: 2   (both now visible and actionable)
```

## 2.4 Unfinished browser state

| Record | Was | Now |
|---|---|---|
| `Fish Fry p_ice.provenance` (mine, stranded by mis-click) | `researching`, invisible | **published, with evidence** |
| `Crab Feast p_paper.unitCostRange` | `researching`, invisible | visible in Review, awaiting a human |

---

# Step 3-5 - Not reached

| Step | Status |
|---|---|
| 3 Evidence coverage expansion | Classification exists (A 131 / B 364 / C 3 / D 0). Not processed |
| 4 Source expansion | 1 registered in 5F.7 (+30 Type A). Supply kits and dry-event ice not done |
| 5 Controlled backfill | **NOT STARTED** |

---

# Required reporting

## Coverage

```
Total knowledge lines:   537
Grounded:                 38      (7.1%)
Heuristic (needs-source): 124
Unresolved:              368      needs-provenance
Ambiguous:                 6
Archived (store):          3
```

Unchanged from 5F.7 — **nothing was published to the corpus this phase.** The one record
published live sits in the browser store, not yet exported.

## Evidence

```
Sources added:         0 this phase (jollychef-disposables-2026 landed in 5F.7)
Sources rejected:      1  a cleanup-supplies source (5F.7) - the 44 kit lines carry
                          qtyFlat: 1 'kit', so no per-guest claim exists to ground
Commercial sources:    2  reddy-ice-2026, jollychef-disposables-2026 (both disclosed)
Independent sources:   8  federal food-safety (USDA FSIS / FDA / CDC), newly classified
Undeclared:          103  reported as a metadata gap, not guessed
```

## Runtime

```
False Sourced lines:        0   biconditional asserted against real playbookFoodPlan output
Ungrounded published claims: 0   corpus + snapshot both gated
Predicate failures:          0
```

## Operations

```
Repository state:  3 KCRs -> 2 snapshot entries. Clean, gated, unchanged.
Snapshot state:    in sync (gate:knowledge OK)
Browser state:     8 published (5 with citable evidence, 3 without), 3 archived,
                   3 in review, 1 sent back, 227 seeded drafts
                   -> STILL DIVERGENT from repository
Monitor state:     freshness surfaced; 113 sources, 91 dated, 2 verified, 2 owned
```

---

# Production acceptance criteria

## Trust
- [x] Every published claim has evidence or intentional heuristic classification — *in the corpus*
- [x] Every sourced claim passes the runtime predicate
- [x] No commercial source hides commercial interest — now enforced at publish
- [x] No unsupported certainty language — now enforced at publish

## Operations
- [ ] Console counts match reality — improved; browser still ahead of repository
- [ ] Browser / repository / snapshot aligned — **7 browser-only records remain**
- [x] Freshness tracking active
- [ ] Ownership assigned — 2 of 113

## Backfill
- [ ] All eligible Type A completed — 0 of 131
- [x] Type B classified — 364
- [ ] High-value missing sources addressed — 1 of 4 priority categories
- [x] Remaining gaps documented

---

# Files changed

## New
| File | Tests |
|---|---|
| `src/lib/knowledge/commercialSourcePolicy.js` | - |
| `src/lib/knowledge/commercialSourcePolicy.test.js` | 18 |
| `src/lib/knowledge/noOrphanStates.test.js` | 6 |

## Modified
| File | Change |
|---|---|
| `src/lib/knowledge/knowledgeChange.js` | policy enforced at the publish gate |
| `src/lib/knowledge/quantityProvenance.js` | `sourceClass` / `claimType` / `limitations` on both commercial sources |
| `src/lib/knowledge/foodSafetyContext.js` | 8 federal sources classified `government` |
| `src/admin/AdminConsole.jsx` | `researching` surfaced in Review + "Sent back" KPI |
| `public/hostv2/*` | artifact regenerated |

---

# Verification

| Gate | Result |
|---|---|
| Full suite | **317 suites / 4853 tests passing**, 1 skipped (was 315 / 4829) |
| `gate:knowledge` | `[OK]` |
| `gate:hostv2` | no drift |
| eslint | 0 errors in product source |
| Governed artifacts | unchanged |

**+24 tests.** Browser proof in Step 2.

---

# Next action - execution, not decisions

Nothing is blocked. In order:

| # | Action | Cost |
|---|---|---|
| 1 | Retire the 3 evidence-less published records (control now exists) | ~12 interactions |
| 2 | Redo them through the repaired composer | ~45 interactions |
| 3 | Export -> corpus -> bake; verify `canReachCited` on every committed record | ~5 |
| 4 | Retire the 3 Crab Feast residue records (corrupt prior / mismatched evidence) | ~12 |
| 5 | Then Tier 1: 131 Type A lines, grouped by source | ~1,965 |

Step 5 is the backfill proper. It is now genuinely unblocked for the first time: before
this phase the workflow could not produce a promotable record, could not withdraw one, and
lost anything sent back.

---

# What this phase actually establishes

The backfill was never blocked by evidence or by the queue. It was blocked by three
defects in the workflow itself, all found by *using* it rather than reading it:

1. it could not attach evidence, so nothing it produced could enter the corpus
2. it could not retire a published record
3. it lost anything sent back

All three are fixed and driven live. The vendor-source question is answered and enforced
in code rather than in a document. **A backfill started before this phase would have
produced 131 records that could never be committed and never corrected.**
