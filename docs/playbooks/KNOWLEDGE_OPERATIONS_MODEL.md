# Knowledge Operations Model

**Date:** 2026-08-04. ASCII-only. Phase 5F.4 Tasks 2-4.
**Status:** MODEL AND DESIGN ONLY. No batch operation is implemented.

---

# 1. Why this exists

Seven corrections have now been driven end to end. The measured shape of the work is not
what "237 corrections" implies:

| | Count | Share |
|---|---|---|
| **Provenance-only** - value already correct, lineage missing | 5 | **71%** |
| **Value correction** - the number is wrong | 2 | 29% |
| **Unknown** - evidence conflicts or is absent | 6 of 29 ice lines | - |

**The backlog is mostly trust restoration, not numeric correction.** That single fact
changes what should be built: accelerating value corrections would be dangerous and would
also address less than a third of the work.

---

# 2. Work types

## Type A - Provenance-only

The authored value is already correct. What is missing is lineage.

```
Value:   2 lb/guest        (unchanged)
Need:    a trusted source + a researched tier
Moves:   qtyGrounded false -> true, and the host's "Sourced -" line appears
```

- **Human decides:** does this source's scope actually reach this event?
- **Human does NOT decide:** what the number should be.
- **Blast radius:** a caption. Nothing a host buys changes.
- **Reversible:** rollback restores the prior provenance; the number never moved.
- **Observed: 5 of 7.**

## Type B - Value correction

The authored number is wrong.

```
Value:   1.5 -> 2 lb/guest
Moves:   31.5 lbs -> 42 lbs, $6-13 -> $8-17
```

- **Human decides:** what the number should be, AND that the source supports it.
- **Blast radius:** real money on a host's shopping list.
- **Observed: 2 of 7** (Fish Fry, Low Country Boil).

## Type C - Unknown

Evidence conflicts, is absent, or the source's scope does not reach the case.

- **Human decides:** that a decision cannot yet be made.
- **Correct output:** `requires human decision`, recorded with the blocker.
- **Observed: 6 of 29** ice lines - including two the registered sources cannot reach at
  all (dry events).

**Type C is not a backlog of work. It is a backlog of MISSING SOURCES**, and each entry
names one. That makes it the most valuable list in the system, not the least.

---

# 3. Scaling rules

## 3.1 SAFE grouping requires all five to match

```
1. FIELD              p_ice.provenance
2. SOURCE set         ["reddy-ice-2026"]
3. EVIDENCE REASON    "outdoor melt allowance"
4. TIER               researched
5. CORRECTION INTENT  provenance-only (Type A) - no value moves
```

**Tier is in the list because of a measured defect.** The Cookout published at
`trade-heuristic` and Quinceanera at `norm`, both citing approved sources, both
`qtyGrounded=false`. If grouping had existed before the tier gate, one click would have
shipped that defect across six outdoor playbooks at once.

> **A workflow that scales a defect is a regression.** Tier was invisible; now it is a
> grouping key and a publish gate.

## 3.2 VALID example

```
GROUP    Outdoor ice provenance restoration
field    p_ice.provenance
source   reddy-ice-2026
tier     researched
reason   Outdoor melt allowance; authored value already at the outdoor baseline
intent   provenance-only
assets   Get-Together, Reunion, Juneteenth Cookout, Day Party, Graduation, The Cookout
```

One reviewer answers one question - *does Reddy Ice's outdoor case support a 2.0 lb/guest
baseline for these six outdoor cooks?* - and it is genuinely the same question six times.

## 3.3 INVALID example - "all ice records"

| Reason it cannot group |
|---|
| indoor rests on `bar-provision-2026`, outdoor on `reddy-ice-2026` - **different sources** |
| dry events (Repast, Game Night) have **no source support at all** |
| Low Country Boil was a **value change** - Type B |
| Sweet 16 and Housewarming are **1.25 hedges** - the midpoint of "1-1.5", not a baseline |
| Crawfish Boil's 2.5 **exceeds every registered source** |

## 3.4 Which types may share a workflow

| Combination | Allowed | Why |
|---|---|---|
| A + A, all five keys matching | **Yes** | the review question is literally the same question |
| B + B | **No** | each value is its own claim. No source says "these three are wrong by the same amount" |
| A + B | **No** | different blast radius. Batching a money-moving change with a caption change hides the one that matters |
| C + anything | **Never** | Type C is the ABSENCE of a decision. There is nothing to approve |

## 3.5 Hard boundaries, whatever the implementation

- Grouping accelerates **mechanics**, never judgement.
- **Any value change leaves the group.** Type B is always reviewed alone.
- The group's reason is written **once, by a human**, and applies verbatim to every member.
- A rejected member **leaves the group** and becomes individual; it does not fail the group.
- Each member publishes as its **own KCR with its own lineage**. A group is a review
  convenience, never a storage unit.
- **Size is capped and visible.** A reviewer approving 40 things has not reviewed 40 things.
- Every existing gate still runs **per record** - type, ownership, grounding-honesty.

---

# 4. Measurement framework (Task 3)

## 4.1 Measured cost, from 7 corrections

| Stage | Interactions | Class |
|---|---|---|
| Open Acquisition, filter to asset | 2-3 | mechanical |
| Read row, pick field | 1 | **judgement** |
| Open composer | 1 | mechanical |
| Select source | 1 | **judgement** |
| Choose tier | 1 | **judgement** *(new in 5F.4)* |
| Write claim note | 1 | **judgement** |
| Set confidence | 1 | **judgement** |
| Write reason | 1 | **judgement** |
| Submit | 1 | mechanical |
| SME / editorial / governance | 3 | mechanical - identical every time |
| Mark approved | 1 | mechanical |
| Publish | 1 | mechanical |
| Export + bake | shared | mechanical, amortised |
| **Total** | **~15** | **6 judgement / ~9 mechanical** |

## 4.2 The ratio that matters

**~60% of every correction is mechanical, and the mechanical part is IDENTICAL across
records.** Three approval clicks, Mark approved, Publish: five interactions that carry no
decision at all.

At ~15 interactions each:

| Scope | Interactions |
|---|---|
| Remaining ungrounded ice (11) | ~165 |
| Tier 1 backfill (237) | **~3,500** |

## 4.3 What that says about acceleration

| Layer | Accelerate? |
|---|---|
| The 5 identical approval/publish interactions | **Yes** - carries no decision |
| Navigation and record opening | **Yes** - mechanical |
| Source selection | **No** - scope judgement |
| Tier selection | **No** - a claim about evidence quality |
| Claim note and reason | **No** - the reviewable artifact |
| Whether the value is wrong | **No** - the whole point |

## 4.4 Failure points observed (operator surface, not governance)

| Failure | Count | Cause |
|---|---|---|
| Coordinate drift after re-render | ~8 | pixel clicks after filter/scroll changed layout |
| Stale element refs | ~4 | React re-render invalidated refs |
| Synthetic click did not register | 1 | scripted `.click()` instead of a real pointer event |
| Wrong field clicked | 1 | three same-looking buttons per row |

No gate was ever bypassed by any of these.

---

# 5. Review Queue - PROPOSAL ONLY (Task 4)

**Not built. Not approved. Design only.**

```
REVIEW QUEUE

  GROUP   Outdoor ice provenance restoration
  Field   p_ice.provenance          Type  A (provenance-only)
  Source  reddy-ice-2026            Tier  researched
  Reason  Outdoor melt allowance; authored value already at the outdoor baseline

  REQUIRED HUMAN DECISION
    Confirm event classification for each candidate.

    [ ] Get-Together        outdoor 87 / indoor 5     2.0 lb/guest
    [ ] Reunion             outdoor 68 / indoor 10    2.0
    [ ] Juneteenth Cookout  outdoor 48 / indoor 5     2.0
    [ ] Day Party           outdoor 32 / indoor 3     2.0
    [ ] Graduation          outdoor 31 / indoor 3     2.0
    [ ] The Cookout         outdoor 86 / indoor 2     2.0

  6 candidates . 0 confirmed . cap 10
  [ Confirm selected ]   [ Remove from group ]
```

## 5.1 Explicitly NOT allowed

- **No "Approve all."** Every candidate is ticked individually. The acceleration is that
  the reviewer answers ONE question instead of six, not that they answer none.
- **No auto-classification.** The outdoor/indoor counts are shown as a *hint for a human*.
  This phase demonstrated why: signal counts put Anniversary at 12/12 and Quinceanera at
  8/8, and no threshold resolves those honestly.
- **No auto tier upgrade.** The tier is a group KEY, chosen once by the human who wrote
  the reason.
- **No value changes in a group, ever.**
- **No skipped gates.** Each member still runs type, ownership and grounding-honesty at
  publish, individually.

## 5.2 What it would actually save

Per record: ~5 of ~9 mechanical interactions (three approvals, mark approved, publish).
Judgement interactions are unchanged by design.

For the 11 remaining ice provenance-only items: **~165 interactions -> ~90**. Real, but
not transformational - and that is the honest number to decide against.

---

# 6. The rule this phase earned

> **Never multiply an uncertain decision.**

Grouping is safe only where the uncertainty has already been removed - one field, one
source, one tier, one reason, no value change. Everywhere else, the correct throughput is
one at a time, and the correct answer to "can we go faster" is sometimes no.
