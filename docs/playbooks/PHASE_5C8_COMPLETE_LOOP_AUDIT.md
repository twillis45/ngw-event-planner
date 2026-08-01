# Phase 5C.8 - Complete Loop Audit

**Date:** 2026-08-01 - ASCII-only.
**Gates:** 4535 tests passing. `gate:knowledge` [OK]. No knowledge value altered, no export
regenerated, no bake run, no resolver change, no new API or database.

---

# Executive Verdict

# **PARTIAL - stopped by a proven architectural blocker at the publish gate.**

The loop was driven end to end with **real pointer events** through six of eight links. It stops
at Publish, and it stops because **the trust system correctly refused to publish**:

```
PIPELINE  approved -> published  .  A cited value needs supporting evidence
[Publish] DISABLED        REVIEW PACKET ... 0 evidence . none
```

**This is the gate working, not failing.** The defect is upstream and it is mine.

---

# The User Question

> **Can an administrator correct a live host-facing knowledge artifact without developer
> intervention?**

**Today: no - for artifacts whose evidence exists only as ids in the baked snapshot.**

An admin can discover live knowledge, open a governed correction, route it through SME +
editorial + governance review, and reach `approved` entirely in the UI. **The publish gate then
correctly blocks**, because the correction inherited *evidence pointers* rather than *evidence
records*, and NGW will not publish a `cited` value it cannot substantiate.

---

# THE BLOCKER (root cause, evidence-backed)

`snapshotEntryToKcr` (my Phase 5C.6 code) reconstructs evidence like this:

```js
evidence: (entry.evidenceIds || []).map((id) => ({ id })),
```

`canReachCited` requires each evidence item to have **`source` or `url`** and a qualifying
**`sourceType`**. A bare `{ id }` has neither, so it returns false and `publishKCR` refuses.

**This is by design, one layer down.** `publishedSnapshotBuild` states it explicitly:

> *"Evidence ids, not evidence bodies - the snapshot is a pointer to the audit trail, never a
> copy of it. The trail stays in KAS where it is governed."*

So the snapshot **deliberately** does not carry publishable evidence. Reconstructing a KCR from
it therefore cannot restore a publishable `cited` artifact. The bodies live in KAS, and Admin's
Evidence store holds **0 records**.

**Why this is architectural, not a bug to patch:** the three available fixes each change a
governance contract, and none should be chosen mid-sprint.

| Option | What it changes | Risk |
|---|---|---|
| A. Populate the Evidence store from KAS | needs the `/api/admin/evidence` path (401 under dev bypass) | Correct, but requires real auth |
| B. Reconstruct at a lower `verificationStatus` than `cited` | a correction would **downgrade** the artifact's grade | **Silently weakens** a published claim |
| C. Require the correcting admin to attach evidence | correction becomes a research task | Honest, heavier UX |

**Recommendation: A, with C as the interim.** **Not B** - it would publish a quieter claim while
looking like a fix, which is the exact failure mode this programme exists to prevent.

---

# Completed Workflow Proof

| Link | Result | Evidence |
|---|---|---|
| **Discovery** | **PASS** | `LIVE IN RUNTIME - 2 governed fields` with version, tier, confidence, date |
| **Correction** | **PASS** | `Correct this` -> composer -> correction KCR created at `review`, `correctionOf: crab-feast-p-crabs-provenance-v1` |
| **Review** | **PASS** | Appeared as `1 IN REVIEW`; SME + Editorial + Governance approved individually; `Mark approved` -> `approved` |
| **Publish** | **BLOCKED** | Publish **disabled**: *"A cited value needs supporting evidence"* |
| **Export** | **NOT REACHED** | requires a published correction |
| **Runtime** | **NOT REACHED** | - |
| **Rollback** | **NOT REACHED** in UI; **PASS** in tests | 3-deep chain, withdrawing v3 restores v2 |
| **Audit trail** | **PASS** | every action recorded, in order (below) |

**The audit trail, read from the live panel** - this is the strongest single artifact produced:

```
created . admin - type=correction trigger=validation
evidence-added . steward
advanced:researching . admin - correction opened
advanced:grounded . admin - evidence carried from superseded version
proposal-set . steward - Published rationale corrected because source arithmetic did not reproduce the prior claim.
advanced:review . admin - correction submitted for review
review:sme . admin - approve
review:editorial . admin - approve
review:governance . admin - approve
advanced:approved . admin
```

Every step is attributed, ordered, and explains itself. **Governance is real.**

---

# Phase 1 - Review queue diagnosis (RESOLVED)

**Cause A: refresh, not filtering.** The Review workspace filters on
`k.status === 'review' || k.status === 'grounded'` - **no campaign or finding linkage**. The
empty-state copy (*"KCRs reach review when a campaign produces a grounded finding"*) is
misleading prose, not a filter.

The real cause was the regression I introduced in 5C.7: the correction handler never re-read
`kcrs` after `upsertKCR`. **Fixed** by calling the component-level `refresh()`. Proven: Review
went `0 IN REVIEW` -> `1 IN REVIEW` with the correction row visible.

---

# Files Changed

| File | Change |
|---|---|
| `src/admin/AdminConsole.jsx` | `await refresh()` after correction upsert (the 5C.7 regression) |
| `docs/playbooks/PHASE_5C8_COMPLETE_LOOP_AUDIT.md` | new (this) |

**Not changed:** `publishedKnowledge.json`, `knowledge-exports/`, resolver, builder, any
knowledge value, any playbook, any test expectation.

# Tests

| | Before | After |
|---|---|---|
| Passing | 4535 | **4535** |

No new tests: the blocker is a design constraint, and a test asserting current behaviour would
lock in the thing that needs deciding.

---

# Chrome Evidence (real pointer events throughout)

| # | Step | Screenshot |
|---|---|---|
| 1 | Publishing with live inventory + `Correct this` | `...-17.jpg` |
| 2 | Composer: *"Correcting retirement-party-p-wine-provenance-v2 - the new version will supersede it"* | `...-17.jpg` |
| 3 | Review: **1 IN REVIEW**, row `Crab Feast \| correction \| validation \| review \| p_crabs.provenance` | `...-18.jpg` |
| 4 | Governance panel, three gates, full audit trail | `...-19.jpg` |
| 5 | **Publish disabled: "A cited value needs supporting evidence"** | `...-19.jpg` |

**Two operator errors of mine, disclosed:** a mis-aimed click hit `Send back` (panel had
re-rendered), leaving one correction at `researching`; and a second `Correct this` landed on the
Crab Feast row rather than Retirement Party. Both were recovered by re-driving, and I switched
to re-locating each button between clicks rather than reusing coordinates.

---

# Full Audit (of what exists)

| Dimension | Verdict |
|---|---|
| **Discovery** | **PASS** - live inventory from the baked artifact; cannot drift from hosts |
| **Correction** | **PASS** - mandatory rationale, lineage preserved, prior seeded |
| **Governance** | **PASS** - review is genuinely required; no auto-advance; per-gate attribution |
| **Publishing** | **CORRECTLY BLOCKED** - refuses a cited value without substantiating evidence |
| **Export** | **PASS (code + tests)** - merge-based, cannot delete unrelated entries |
| **Runtime** | **PASS for existing artifacts** - Runtime Preview resolves published + version + trace |
| **Rollback** | **PASS (tests)**, unproven in UI |
| **Audit trail** | **PASS** - the best-evidenced part of the system |

---

# Remaining Risks

- **R1.** The reconstruction is lossy for evidence and **claims `cited` anyway**. Until fixed, any
  correction of a snapshot-derived artifact dead-ends at publish. **Proven.**
- **R2.** One correction KCR is stranded at `researching`, and **no workspace lists that status**
  (only review|grounded, approved, validation, archived). A KCR sent back from review is
  currently unreachable in the UI. **Proven, and a real gap independent of R1.**
- **R3.** Admin's Evidence store holds 0 records and the server path returns 401 under dev
  bypass, so option A cannot be validated locally. **UNKNOWN under real auth.**
- **R4.** Deployment unchanged: **Local PASS - Repository PASS - Deployment UNKNOWN.**

---

# Recommendation

## **EXECUTE - 5C.9, narrow, in this order**

| # | Step | Why |
|---|---|---|
| 1 | **Decide the evidence contract for corrections** (A / B / C above). Recommend **A**, interim **C**. **Not B.** | Everything else is blocked on it, and B is the tempting wrong answer |
| 2 | **Make `researching` KCRs reachable** (R2) | A send-back currently loses the KCR |
| 3 | Then finish: publish -> export -> bake -> Runtime Preview v2 -> rollback to v1 | The four links still unproven |

**PARK** everything else. **KILL** nothing.

---

## What this sprint actually settled

The mode was "do not stop at the first blocker", and that was right - the first blocker (Review
showing 0) **was** mine and **was** fixable, and pushing past it exposed something far more
valuable underneath.

**NGW's governance is real.** An administrator can discover live knowledge, open a correction
with a stated reason, and walk it through three genuine review gates with a complete attributed
audit trail - all without a developer. **The system then refused to publish a claim it could not
substantiate.** That refusal is the trust model working exactly as designed, and it is a better
outcome than a green loop would have been.

The honest answer to the user question is *"not yet"* - and the reason is a deliberate
architectural choice (snapshots carry evidence pointers, not bodies) colliding with a
reconstruction I wrote that did not respect it.
