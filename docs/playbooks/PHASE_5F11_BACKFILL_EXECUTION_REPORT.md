# Phase 5F.11 - Controlled Backfill Execution

**Date:** 2026-08-02. ASCII-only.

---

# Production Status

```
Published records (corpus):   6      -> 5 governed fields  (was 3 -> 2)
Grounded lines:              42 of 537   7.8%   (was 38, 7.1%)
Archived records:            13      all with a stated reason, none deleted
Blocked records:              2      the 1.5 -> 2 ice increases, human decision
Remaining gaps:             495      A 128 / B 364 / C 3 / D 0
```

Corpus, snapshot, and host output agree. `gate:knowledge` OK, `gate:hostv2` no drift.

---

# Wave 0 - COMPLETE and committed

```
d02d8c0b  feat(knowledge): Wave 0 — first governed knowledge reaches production
```

## Three records committed, all provenance-only

| Event | Field | Source | Old | New | Decision | Result |
|---|---|---|---|---|---|---|
| Fish Fry | `p_ice.provenance` | reddy-ice-2026 | none | researched | ground authored value | **published, host-verified** |
| Dinner Party | `p_ice.provenance` | bar-provision-2026 | none | researched | ground authored value | **published, host-verified** |
| Crab Feast | `p_ice.provenance` | reddy-ice-2026 | none | researched | ground authored value | **published, host-verified** |

**No quantity moved.** 1.5, 1.5 and 2 lb/guest are exactly what the playbooks authored;
each sits inside its source's stated range. `wave0HostProof.test.js` asserts the value
is unchanged at the source, so a future edit cannot quietly move one while keeping the
citation.

## Nine records retired

Three carried priors and evidence inherited from the `p_crabs` row they were opened
from. Four had no evidence at all. Two predated the evidence fix. Each retired through
`published -> monitoring -> archived` with a stated reason; all remain in the export as
history.

## Two records deliberately NOT recreated

Fish Fry and Low Country Boil `p_ice.qtyPerGuest`, both 1.5 -> 2 lb/guest. Rule 3: an
upward value change resting on a commercial practitioner source is flagged for human
review. Both figures sit inside Reddy Ice's own stated 1-2 lb range, so the authored 1.5
stands and nothing is lost by waiting.

---

# The defect Wave 0 caught, and why it justified the whole exercise

A proposal carries provenance twice, and different layers read different halves:

```
GOVERNANCE / HOST   proposal.newValue        tier + sources -> isGroundedItemQty
TRANSPORT / BAKE    proposal.newProvenance   -> entry.provenance, entry.evidenceIds
```

The composer never set the second. Measured on the first promotion attempt:

```
snapshot entry           evidenceIds: []   verificationStatus: 'synthesized'
snapshotEntryToKcr(...)  nothing to hydrate
canReachCited(...)       FALSE  -> the field could never be corrected again
```

**A host would have seen the "Sourced -" line and been right**, because that reads
`newValue`. Invisible from the front, fatal from the back.

Three records were reverted, `provenanceMirror()` was added and wired into both composer
paths, and all three were rebuilt and republished through the fixed path. Every snapshot
entry now carries its evidence ids and reads `cited`.

Doing this on three records instead of a hundred and twenty-eight is the argument for
Wave 0 preceding Tier 1.

---

# Two more integrity seams closed

**The inventory reported authored provenance, not effective.** Found immediately after
Wave 0 committed: `grounded` stayed at 38 while `reviewed` went 1 -> 4, so the three
lines governance had just fixed were counted as "published here, does not ground". The
inventory was doing the exact thing this programme exists to prevent - reporting
something other than what the runtime serves. `lineState` now reads the governed
provenance overlaid on the authored one. **Grounded is 42, not 38.**

**A false positive in the declared subject map.** The correct Dinner Party record was
reported `mismatched-evidence` because the map assumed one source per subject, and
`bar-provision-2026` is a drinks guide whose claim also states an ice rate. Sources may
now cover several subjects. A check that cries wolf on good work is worse than no check.

**`review -> archived` had no control**, so a record that should never publish could only
be bounced back to `researching` forever.

---

# Provider Coverage Matrix

No providers were added this phase. Adding one was not justified: the blocker below is
classification, not source availability.

| Provider | Axis | Claim type | Class | Interest | Limitations | Freshness | Coverage |
|---|---|---|---|---|---|---|---|
| `reddy-ice-2026` | quantity | planning_guidance | commercial_practitioner | **yes** | disclosed | fetched + verified 2026-08-01, steward unassigned | `p_ice` (18) |
| `jollychef-disposables-2026` | quantity | planning_guidance | commercial_practitioner | **yes** | disclosed | fetched + verified 2026-08-01, steward unassigned | `p_tableware` 18, `p_cups` 4, `p_napkins` 8 |
| `bar-provision-2026` | quantity | - | undeclared | unknown | - | fetched 2026-07-16 | drinks + `p_ice` (indoor) |
| `webstaurant-protein-2026` | quantity | - | undeclared | unknown | - | fetched 2026-07-16 | protein (11) |
| `webstaurant-portions-2026` | quantity | - | undeclared | unknown | - | fetched 2026-07-16 | sides (29) |
| 8 federal food-safety | safety | - | government | no | - | fetched 2026-07-28 | safety guidance |

**103 of 113 sources carry no class.** Undeclared is reported as a gap, never read as
"verified independent" — a test asserts an undeclared source cannot lift the commercial
restriction.

---

# Backfill Results

```
Records processed:        12   (3 published, 9 retired)
Values changed:            0
Provenance-only updates:   3
Human decisions pending:   2   (the 1.5 -> 2 ice increases)
```

---

# STOP — Tier 1 Batch 1 requires a decision I am not permitted to make

Wave 0 took the three ice lines whose event type is unambiguous: Fish Fry is an outdoor
propane fry, Crab Feast an outdoor summer cook, Dinner Party the indoor baseline with
zero outdoor signal.

**26 ice lines remain. 24 of them carry BOTH outdoor and indoor signals.**

```
Get-Together        outdoor 98 / indoor  5      qty 2
Reunion             outdoor 70 / indoor 12      qty 2
The Cookout         outdoor 79 / indoor  5      qty 2
Gender Reveal       outdoor 19 / indoor 13      qty 1
Sweet 16            outdoor  8 / indoor 11      qty 1.25
Quinceanera         outdoor  8 / indoor 11      qty 1.5
Low Country Boil    outdoor  5 / indoor  6      qty 1.5
Card Party          outdoor  1 / indoor  1      qty 1.5
...
```

Grounding each line requires deciding whether the event is indoor or outdoor, because
that is what selects the source and the rate. **The directive forbids AI deciding event
classification**, and 5F.6 already measured why: signal counts put Anniversary at 12/12
and Quinceanera at 8/8, and no threshold resolves those honestly.

A second judgement sits behind it. The authored quantities span 1, 1.25, 1.5, 2 and 2.5
lb/guest, while `reddy-ice-2026` states 1-2:

- **Crawfish Boil authors 2.5**, above everything any registered source states. It cannot
  be grounded to one.
- **Housewarming and Sweet 16 author 1.25**, the midpoint of a "1-1.5" hedge rather than a
  source-stated rate.
- **Repast, Game Night and Gender Reveal author 1**, and Repast is a dry indoor event no
  registered source reaches.

## What I need

For each remaining ice line: **indoor or outdoor**, which selects the source. A single
pass over 26 rows. I will then execute the whole batch without further questions.

Alternatively, a rule you are willing to stand behind - for example *"an event whose
playbook mentions grilling or a yard is outdoor"* - and I will apply it mechanically and
show you every line it classified.

**This is the only thing blocking Tier 1.** Batch 2 (disposables, 30 lines via
`jollychef-disposables-2026`) has no equivalent ambiguity and could run first if you
prefer - place settings do not depend on whether the event is outdoors.

---

# Verification

| Gate | Result |
|---|---|
| Full suite | **318 suites / 4874 tests passing**, 1 skipped |
| `gate:knowledge` | `[OK]` |
| `gate:hostv2` | no drift |
| eslint | 0 errors in product source |
| Host proof | 10 tests against real `playbookFoodPlan` output |

---

# Remaining Risks

| Risk | Severity |
|---|---|
| 2 flagged ice increases undecided | **Low** - authored values stand, nothing wrong is live |
| 103 sources undeclared, 22 undated, 2 owned | **Medium** - freshness cannot warn on what it cannot age |
| 364 Type B lines have no source | **High for coverage**, zero for host truth |
| Crawfish Boil 2.5 exceeds every source | **Low** - correctly left ungrounded |
| Store holds 227 seeded drafts | **Low** - intake noise, excluded from review by design |

---

# Final Recommendation

## READY WITH LIMITATIONS

**What is production-ready.** The governed path works end to end and is proven at the
host: three records travelled source -> evidence -> tier -> review -> publish -> bake ->
snapshot -> predicate -> rendered Sourced line, with the value unchanged and the
commercial caveat carried into the note a host reads. Every published record can be
corrected again. Corpus, snapshot and host agree.

**The limitation is coverage, not correctness.** 42 of 537 lines are grounded. The other
495 are honestly labelled: 364 have no source in existence yet, 128 have one and await
classification, 3 need a decision. Nothing claims to be grounded that is not.

**Not blocked by capability.** Nothing above needs new architecture. Tier 1 needs one
pass of human classification, and Batch 2 needs nothing at all.
