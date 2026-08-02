# Knowledge Review Queue - Model

**Date:** 2026-08-01. ASCII-only. Phase 5F.5 Step 5.
**Status:** DESIGN ONLY. Nothing here is implemented, and it is not approved for build.
**Prerequisite:** store/snapshot divergence must be reconciled first. A queue built on
disagreeing inventories multiplies the disagreement.

Supersedes the sketch in `KNOWLEDGE_OPERATIONS_MODEL.md` section 5, which stands as the
measurement that motivates this.

---

# 1. What this may and may not accelerate

Measured over 7 driven corrections: **~15 interactions each, 6 judgement / ~9 mechanical.**

| Layer | Accelerate | Why |
|---|---|---|
| 3 review approvals (SME, editorial, governance) | **Yes** | identical every time, carry no decision |
| Mark approved, Publish | **Yes** | mechanical |
| Navigation, filtering, opening a record | **Yes** | mechanical |
| Source selection | **No** | a scope judgement about whether this source reaches this event |
| Tier selection | **No** | a claim about evidence quality |
| Claim note, reason | **No** | these ARE the reviewable artifact |
| Whether the value is wrong | **No** | the entire point |

**Ceiling: ~5 of ~15 interactions per record.** Roughly a third. Any design claiming more
is accelerating judgement, and is wrong by construction.

---

# 2. Queue states

```
  DRAFT ---------> PROPOSED ---------> UNDER REVIEW ---------> RESOLVED
    |                  |                    |                     |
    |                  |                    |                     +--> each member
    |                  |                    |                          PUBLISHED
    |                  |                    |                          individually
    |                  |                    |
    |                  |                    +--> member REMOVED (becomes individual)
    |                  |
    |                  +--> REJECTED (whole group; grouping key was wrong)
    |
    +--> ABANDONED
```

| State | Meaning | Who moves it |
|---|---|---|
| `draft` | a human is assembling candidates | operator |
| `proposed` | grouping key set, reason written, candidates listed, nothing approved | operator |
| `under-review` | reviewer is ticking members individually | reviewer |
| `resolved` | every member is confirmed, removed, or rejected | reviewer |
| `rejected` | the grouping key itself was wrong; all members return to the backlog | reviewer |
| `abandoned` | dropped before review | operator |

**A group is a review convenience and never a storage unit.** No KCR's identity, lineage
or audit trail refers to a group. Delete every group and the corpus is unchanged.

---

# 3. Grouping rules

## 3.1 All five keys must match

```
1. FIELD              p_ice.provenance
2. SOURCE set         ["reddy-ice-2026"]
3. EVIDENCE REASON    "outdoor melt allowance"
4. TIER               researched
5. CORRECTION INTENT  provenance-only (Type A) - no value moves
```

**Tier is a key because of a measured defect.** The Cookout published at
`trade-heuristic` and Quinceanera at `norm`, both citing approved sources, both
`qtyGrounded=false`. Had grouping existed before the tier gate, one action would have
shipped that defect across six outdoor playbooks.

> **A workflow that scales a defect is a regression.**

## 3.2 What may share a group

| Combination | Allowed | Why |
|---|---|---|
| A + A, all five keys matching | **Yes** | it is literally the same review question, repeated |
| B + B | **No** | each value is its own claim; no source says "these three are wrong by the same amount" |
| A + B | **No** | different blast radius. Batching a money-moving change with a caption change hides the one that matters |
| C + anything | **Never** | Type C is the ABSENCE of a decision. There is nothing to approve |

## 3.3 Hard boundaries

- **Cap of 10 members, always visible.** A reviewer approving 40 things has not reviewed
  40 things.
- **Any value change leaves the group.** Type B is reviewed alone, always.
- **The reason is written once, by a human**, and applies verbatim to every member.
- **A rejected member leaves the group**; it does not fail the group.
- **Every member publishes as its own KCR with its own lineage.**
- **Every per-record gate still runs per record** - type, ownership, grounding-honesty,
  source authority, and (new in 5F.5) `firstGovernanceGuard`.

---

# 4. Approval model

```
  GROUP   Outdoor ice provenance restoration          [proposed]
  Field   p_ice.provenance             Type  A (provenance-only)
  Source  reddy-ice-2026               Tier  researched
  Reason  Outdoor melt allowance; authored value already at the outdoor baseline

  ONE QUESTION FOR THE REVIEWER
    Does Reddy Ice's outdoor case support a 2.0 lb/guest baseline for these cooks?

    [ ] Get-Together        outdoor 87 / indoor 5     2.0 lb/guest    unchanged
    [ ] Reunion             outdoor 68 / indoor 10    2.0             unchanged
    [ ] Juneteenth Cookout  outdoor 48 / indoor 5     2.0             unchanged
    [ ] Day Party           outdoor 32 / indoor 3     2.0             unchanged
    [ ] Graduation          outdoor 31 / indoor 3     2.0             unchanged

  5 candidates . 0 confirmed . cap 10
  [ Confirm selected ]   [ Remove from group ]   [ Reject group ]
```

**No "Approve all" control exists.** Each candidate is ticked individually. The
acceleration is that the reviewer answers ONE question instead of five - not that they
answer none. The five ticks are the audit trail; without them there is no record that a
human considered each asset.

The outdoor/indoor counts are shown as a **hint for a human**, never as a classifier. This
programme measured why: signal counts put Anniversary at 12/12 and Quinceanera at 8/8, and
no threshold resolves those honestly.

---

# 5. Failure handling

| Failure | Behaviour |
|---|---|
| A member fails a per-record gate at publish | that member alone fails, with its gate message. The group continues |
| A member's field became governed since the group was proposed | `firstGovernanceGuard` blocks it; member is removed with the reason shown |
| The store/snapshot divergence changes mid-review | the group is invalidated and returns to `proposed`. **Stale inventory must never silently publish** |
| A reviewer rejects the grouping key | whole group -> `rejected`, all members return to the backlog individually |
| A publish partially succeeds | already-published members stay published. Publishing is per record; there is no group transaction and no rollback-all |
| The reviewer walks away | the group stays `under-review` indefinitely. Nothing times out into an approval |

**There is no partial-success recovery mode, on purpose.** Each member is an independent
KCR; "partial success" is just some records published and others not, which is a legible
state that needs no special machinery.

---

# 6. Audit requirements

Every group must leave enough behind to reconstruct the decision without the group.

| Recorded on each member KCR | Why |
|---|---|
| the group id and its five keys | so a later reader can see it was reviewed as one question |
| the group reason, verbatim | it is the human's actual claim |
| the reviewer, per member, with a timestamp | a tick is an approval and must be attributable |
| that the value did not move | the Type A guarantee, asserted not assumed |

| Must be reconstructible afterwards | |
|---|---|
| which candidates were REMOVED and why | a removal is a judgement and is as informative as an approval |
| whether the group was rejected, and on what grounds | this is how a wrong grouping key becomes a lesson |

**Deleting the group records must not weaken any individual KCR's audit trail.** If it
does, the group has become a storage unit and rule 3.3 has been violated.

---

# 7. Forbidden, restated

No AI approval. No AI classification. No automatic tier upgrades. No automatic publishing.
No generated confidence scores. No "approve all". No group that contains a value change.
No skipped per-record gate.

---

# 8. What this is worth, honestly

For the 11 remaining ungrounded ice provenance items: **~165 interactions -> ~90.**

That is a real saving and a small one. It is stated plainly because the decision to build
this should be made against the true number, and because the same design applied to the
full Tier 1 backlog does not scale the way the raw line count suggests - most of that
backlog is not groupable at all (see `TIER1_BACKFILL_READINESS.md`).

> **Never multiply an uncertain decision.** Grouping is safe only where the uncertainty
> has already been removed: one field, one source, one tier, one reason, no value change.
> Everywhere else the correct throughput is one at a time, and the correct answer to "can
> we go faster" is sometimes no.
