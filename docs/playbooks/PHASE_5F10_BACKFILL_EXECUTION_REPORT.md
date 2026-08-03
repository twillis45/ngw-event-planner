# Phase 5F.10 - Production Baseline + Wave 0 Execution

**Date:** 2026-08-02. ASCII-only.

---

# Checkpoint

Phase 5F.5-5F.9 committed as two clean commits. Commit 1 was verified green **in
isolation** (stash the rest, run the suite) rather than only as part of the final tree.

```
e1246e0a  feat(knowledge): production governance hardening baseline
          18 paths - divergence guard, authored-corpus ratchet, canonical inventory,
          freshness, reconciliation, backfill classification, +5 docs
          verified alone: 312 suites / 4806 tests

e9a903c3  feat(knowledge): repair the acquisition workflow so its output can be committed
          18 paths - evidence attachment, archive lifecycle, orphan states,
          commercial source policy, hostv2 artifact, +2 docs
```

Governed artifacts unchanged across both. Tree clean after commit.

---

# Wave 0

## Task 1 + 3 - Retirement: COMPLETE

Six defective published records retired through `published -> monitoring -> archived`,
each with a stated reason in the audit trail. Nothing deleted.

| Record | Defect | Disposition |
|---|---|---|
| Crab Feast `p_oldbay.qtyPerGuest` | corrupt prior + protein-guide evidence | archived |
| Crab Feast `p_paper.unitCostRange` | corrupt prior + protein-guide evidence | archived |
| Crab Feast `p_ice.provenance` | protein-guide evidence on an ice claim | archived, recreated |
| Fish Fry `p_ice.qtyPerGuest` | no evidence + **upward value change on a commercial source** | archived, **flagged** |
| Low Country Boil `p_ice.qtyPerGuest` | same | archived, **flagged** |
| Dinner Party `p_ice.provenance` | no evidence | archived, recreated |

A seventh — an in-flight `review` record predating the evidence fix — was also retired.

**Rule 3 applied.** The two 1.5 -> 2 lb/guest ice increases rest on a commercial
practitioner source. They were NOT recreated: the authored 1.5 stands until a human
decides. Both sit inside Reddy Ice's own stated 1-2 lb range, so nothing is lost by
waiting.

## Task 2 - Recreation: 3 published, then reverted at the corpus boundary

Three provenance-only records recreated through the repaired composer, each carrying
registry-backed evidence, each taken through SME + editorial + governance to publish:

```
Fish Fry     p_ice.provenance   reddy-ice-2026     authored 1.5 unchanged
Dinner Party p_ice.provenance   bar-provision-2026 authored 1.5 unchanged
Crab Feast   p_ice.provenance   reddy-ice-2026     authored 2   unchanged
```

Store state afterwards: **4 published records, all satisfying `canReachCited`.**

They were promoted to the corpus, baked — **and the suite refused them.** Reverted.

---

# The defect that stopped Wave 0, and why it matters

## What happened

```
snapshot entry           evidenceIds: []   provenance.verificationStatus: 'synthesized'
snapshotEntryToKcr(...)  no evidence ids to hydrate
canReachCited(...)       FALSE
```

## Why

A proposal carries provenance **twice**, and different layers read different halves:

```
GOVERNANCE / HOST   proposal.newValue        tier + sources -> isGroundedItemQty
TRANSPORT / BAKE    proposal.newProvenance   -> entry.provenance, entry.evidenceIds
```

The composer never set `newProvenance`, so `format()` supplied its default
`{verificationStatus: 'synthesized', sources: []}`. The source ids reached the host
correctly and were **lost at the transport layer**.

## Why it is worse than it looks

**A host would have seen the "Sourced -" line and been right.** `isGroundedItemQty` reads
`newValue`, which was correct. Nothing on the front would ever have shown a problem.

What breaks is the back: a snapshot-reconstructed KCR has no evidence to hydrate, so
`canReachCited` fails — and **that field could never be corrected again from the
snapshot.** Publishing three records this way would have quietly made three fields
permanently uncorrectable while looking perfect to every host.

This is the third instance of the same shape in three phases: correct at the point a
human looks, broken at the point the system reads itself.

## Fixed

`provenanceMirror(field, newValue)` mirrors the cited sources into the transport half,
wired into both composer paths. It does not promote an unsourced heuristic to `cited`,
and returns null for non-provenance fields. A test asserts the mirror matches the shape of
the records already in the corpus — the two good committed records carry their sources in
both halves, which is what made the contrast visible.

## Consequence for the three records

They are published in the STORE with the old shape and were correctly kept out of the
corpus. **They must be redone through the now-fixed composer** — the reasoning, sources
and review are all written and can be reused. That is the first action next session.

---

# Also fixed this phase

**A false positive in my own subject map.** The reconciliation banner reported the correct
Dinner Party record as `mismatched-evidence`, because the map assumed one source per
subject and `bar-provision-2026` was declared only for drinks. Its claim text also states
"ice ~1.5 lb/guest", so it genuinely grounds an indoor ice line. Sources may now cover
several subjects (`alsoCovers`). **A check that cries wolf on good work is worse than no
check.**

**`review -> archived` had no control.** Legal in the transition table, absent from the
UI, so a record that should never publish could only be bounced back to `researching`
forever. Hit during Wave 0 on the stale in-flight record. Added, with the same required
reason as every other retirement, and pinned by a test asserting every state that permits
`archived` offers a way to reach it.

---

# Coverage

```
Total knowledge lines:   537
Grounded:                 38     unchanged - nothing reached the corpus
Heuristic (needs-source):124
Unresolved:              368
Archived (store):         13
```

## Evidence
```
Sources added:        0 this phase
Commercial sources:   2  (both disclosed, both policy-enforced)
Independent sources:  8  federal food-safety, classified in 5F.9
Undeclared:         103
```

## Runtime
```
False Sourced lines:         0
Ungrounded published claims: 0
Predicate failures:          0
```

## Operations
```
Repository:  3 KCRs -> 2 snapshot entries. Clean, gated, unchanged.
Snapshot:    in sync
Browser:     4 published (all citable, all with the transport defect), 13 archived,
             2 in review, 1 approved, 227 seeded drafts
             -> STILL DIVERGENT from repository, by design until the records are redone
```

---

# Acceptance criteria

## Wave 0
- [x] no evidence-less published records — store is 4/4 citable
- [x] no residue records — all six retired with reasons
- [ ] **all published records can be corrected again** — the transport defect; fixed in
      code, the three records need redoing
- [ ] repo / snapshot / store agree — blocked by the above

## Tier 1
Not started. Correctly: Batch 1 is ice, and the ice records are exactly the ones that
exposed the defect. Backfilling 131 lines through a composer that silently strips source
ids at the bake would have produced 131 permanently uncorrectable fields.

---

# Files changed (uncommitted)

| File | Change |
|---|---|
| `src/lib/knowledge/sourceAuthority.js` | `provenanceMirror()` |
| `src/admin/AdminConsole.jsx` | mirror wired into both composer paths; `review -> archived` control |
| `src/lib/knowledge/backfillClassification.js` | `alsoCovers` — a source may serve several subjects |
| `src/lib/knowledge/governanceReconciliation.js` | mismatch check honours `alsoCovers` |
| `src/lib/knowledge/evidenceFromSources.test.js` | +5 mirror tests |
| `src/lib/knowledge/governanceReconciliation.test.js` | +1 two-subject test |
| `src/lib/knowledge/noOrphanStates.test.js` | +2 retirement-reachability tests |

## Verification
```
317 suites / 4861 tests passing (was 4853)
gate:knowledge  [OK]
gate:hostv2     no drift
eslint          0 errors in product source
governed artifacts  unchanged
```

---

# Next actions

| # | Action | Blocked? |
|---|---|---|
| 1 | Redo the 3 ice provenance records through the fixed composer | no |
| 2 | Promote to corpus, bake, verify `canReachCited` on all committed records | no |
| 3 | Verify the host "Sourced -" line on a Fish Fry shopping row | no |
| 4 | Tier 1 Batch 1 (ice), then Batch 2 (disposables, ~30 lines) | after 1-3 |
| 5 | The two 1.5 -> 2 ice increases | **human decision** - Rule 3 |

---

# Honest summary

Wave 0 retired every defective record and proved the repaired workflow end to end, then
**stopped one step short of the corpus because the corpus refused what it produced.**

That refusal is the system working. The defect it caught — provenance correct where a
human looks, empty where the machine reads — would have been invisible in every host
check and would have made each backfilled field permanently uncorrectable. Finding it on
three records instead of a hundred and thirty-one is the whole argument for doing Wave 0
before Tier 1.
