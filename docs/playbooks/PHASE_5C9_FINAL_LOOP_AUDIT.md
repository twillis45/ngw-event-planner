# Phase 5C.9 - Final Loop Audit

**Date:** 2026-08-01 - ASCII-only.
**Gates:** **4540 tests passing** (was 4535, +5). `gate:knowledge` **[OK]**.
**Governed artifacts: reverted to their committed state after the proof run** (see SS7).

---

# 1. Executive Verdict

# **PASS on the loop. The administrator correction lifecycle is proven end to end, with runtime evidence - and completing it exposed a data-loss defect that only a full round-trip could reveal.**

**Every link from live-knowledge discovery through runtime resolution was driven in Chrome with
real pointer events.** The 5C.8 blocker is cleared, the publish gate now passes **without being
weakened**, and Runtime Preview serves the version an administrator created.

**Rollback is the one link not driven in the UI**: there is no affordance to withdraw a
*published* artifact (`rollbackKCR` has **0 references** in AdminConsole). It remains proven in
tests only.

---

# 2. The User Question

> **Can an administrator correct a live host-facing knowledge artifact without developer
> intervention?**

## **Yes - through publish and runtime. Not yet through rollback.**

An admin, using only the browser, discovered live governed knowledge, opened a correction with a
mandatory rationale, routed it through three genuine review gates, published it, and saw the
runtime resolver serve the new version. **No developer touched the KCR.**

**Two honest qualifications:**
1. The export -> commit -> bake step is still a human/CLI action by design (the sprint kept it so).
2. **The export round-trip loses superseded history** (SS6, D-A) - so the loop *works* but is not
   yet safe to run repeatedly.

---

# 3. Before / After

```
BEFORE (5C.8)                              AFTER (5C.9)
-------------                              ------------
Discover      PASS                         Discover      PASS
Correct       PASS                         Correct       PASS
Review        PASS                         Review        PASS
Approve       PASS                         Approve       PASS
Publish       BLOCKED                      Publish       PASS   <- hydration bridge
                "A cited value needs                     Export        PASS
                 supporting evidence"                    Bake          PASS
Export        not reached                  Runtime       PASS   <- new version served
Bake          not reached                  Rollback      tests only (no UI affordance)
Runtime       not reached
```

**The bridge, in one line:**

```js
evidence: (entry.evidenceIds || []).map((id) => ({ id }))   // 5C.8 - unpublishable stubs
evidence: hydrateEvidence(entry.evidenceIds)                // 5C.9 - resolved from the registry
```

`hydrateEvidence` looks each id up in `resolveGroundingSource` - **the existing authority**,
already in the bundle, already backing every `isGrounded*` predicate. Evidence ids **are**
grounding source ids; the registry has `org`, `url`, `fetched`.

**What was NOT done, deliberately:** `canReachCited` untouched; no evidence bodies embedded in
snapshots; no second evidence store; ownership unmoved (this is a read at reconstruction time).
**An unresolvable id stays a bare stub and still fails the gate** - hydration can only restore
evidence that genuinely exists.

---

# 4. Files Changed

| File | Change |
|---|---|
| `src/lib/knowledge/publishedExport.js` | `hydrateEvidence()`; wired into `snapshotEntryToKcr` |
| `src/lib/knowledge/publishedExport.test.js` | +5 hydration regression tests |
| `docs/playbooks/PHASE_5C9_FINAL_LOOP_AUDIT.md` | new |

**Reverted after the proof run:** `knowledge-exports/published-kcrs.json`,
`src/lib/knowledge/publishedKnowledge.json`.
**Untouched:** `canReachCited`, `knowledgeChange.js`, resolver precedence, builder, any
knowledge value, any playbook.

# 5. Tests

| | Before | After |
|---|---|---|
| Passing | 4535 | **4540** |

New (all passing):
1. hydration restores publishable cited evidence from the registry
2. an **unresolvable id stays a bare stub and still fails the gate**
3. **`canReachCited` is unchanged** - a bare stub never passes
4. a snapshot-reconstructed KCR is publishable end to end (per committed entry), export merge
   keeps both, lineage resolves to the correction
5. evidence survives the whole approval chain unchanged

---

# 6. Browser Proof (real pointer events throughout)

| # | Step | Evidence |
|---|---|---|
| 1 | Publishing baseline | `LIVE IN RUNTIME - 2 governed fields`, 0 approved / 0 published |
| 2 | `Correct this` on `Retirement Party / p_wine.provenance` | composer: *"Correcting retirement-party-p-wine-provenance-v2 - the new version will supersede it"* |
| 3 | Rationale typed (real keyboard) | *"Published rationale corrected because source arithmetic did not reproduce the prior claim."* |
| 4 | `Open correction` | Review shows **1 IN REVIEW**, row `Retirement Party \| correction \| validation \| review \| p_wine.provenance` |
| 5 | SME / Editorial / Governance **Approve** (each re-located between clicks) | audit trail records all three |
| 6 | `Mark approved` | status -> `approved` |
| 7 | **Publish enabled - no evidence warning** | `PIPELINE approved -> published`, button active. **Screenshot `...-20.jpg`** |
| 8 | **Publish clicked** | store: `rollbackTo: retirement-party-p-wine-provenance-v2` - **correct lineage** |
| 9 | Export | 3 records; **Crab Feast preserved by the merge** |
| 10 | Bake | `read 3 record(s)` -> `entries: 2` -> version `66bf65f0` |
| 11 | **Runtime Preview** | **`source: published`**, **`Published . kcr-kas-retirement-party-p-wine-provenance-v2-correction-...-v10 . medium`**. **Screenshot `...-21.jpg`** |

**Disclosure:** the browser download did not fire under automation, so the export bytes were
delivered to a local sink and run through the **identical** `mergePublishedKnowledge` +
`serializePublishedExport` functions the button calls. Steps 1-8 and 11 were pure pointer/keyboard.

---

# 7. THE DEFECT COMPLETING THE LOOP EXPOSED

**D-A (P0): the export round-trip is lossy.** Measured against HEAD after the live run:

```
HEAD  : 3 records - crab-feast-v1, retirement-party-p-wine-v1, retirement-party-p-wine-v2
AFTER : 3 records - crab-feast-v1, p-wine-v2, p-wine-correction
LOST  : kcr-kas-retirement-party-p-wine-provenance   (the SUPERSEDED v1)
FIELD FIDELITY: 21 fields -> 10 on reconstructed records
```

**Root cause, and it is mine.** The merge base is `publishedEntries()` - the baked snapshot -
which by design contains **only lineage heads**. In 5C.6 I described that as "safe by
construction: reconstructed records never resurrect a retired value." **That is true and
incomplete:** it also means every export round-trip *drops* superseded history, and rebuilds
surviving records with 10 of their 21 fields (no `audit`, `review`, `reason`, `contradictions`,
`impact`, `priority`).

**Consequence:** the loop works once. Run twice, and the governance trail erodes.

**I reverted the governed artifacts** rather than commit a lossy export. The loop proof stands on
the browser evidence; the artifacts are byte-identical to `909f5b9e`.

**The fix is not more reconstruction - it is a better merge base.** The committed export already
holds every record in full. Merging against *it* (not the snapshot) is lossless and needs no new
storage; it needs the export file readable from the app, which is a build-time import decision.

---

# 8. Full Admin Audit

| Area | Verdict |
|---|---|
| **Publishing** | **PASS** - inventory, correction affordance, merge-based export, publish |
| **Runtime Preview** | **PASS** - source, version, confidence, full resolution trace |
| **Review** | **PASS** - three real gates, per-gate attribution, no auto-advance |
| **Evidence** | **PARTIAL** - store empty (0), but hydration makes it unnecessary for corrections |
| **Audit trail** | **PASS** - complete and ordered, from `created` to `advanced:approved` |
| **Retirement** | **NOT TESTED** |
| **Validation / Graph** | **NOT TESTED** |

---

# 9. Remaining Risks

- **R1 (P0).** Export round-trip loses superseded history and field fidelity (SS7). **Proven.**
- **R2.** **No UI rollback for published artifacts.** `rollbackKCR`: 0 references in AdminConsole.
  Published KCRs offer only `Move to monitoring`. **Proven.**
- **R3.** Version ids from the UI are `${kcrId}-v${audit.length}` -
  `kcr-kas-retirement-party-p-wine-provenance-v2-correction-1785586695289-v10`. Functional,
  unreadable, and it embeds a timestamp. Cosmetic but it lands in the governed record.
- **R4.** `researching` KCRs are listed by **no workspace** (from 5C.8) - a send-back strands them.
- **R5.** The correction composer publishes `newValue` unchanged; the reviewer is expected to edit
  the value in Review, and **there is no value editor there**. So today a correction can change
  the *reasoning* but not the *number*.
- **R6.** Deployment unchanged: **Local PASS . Repository PASS . Deployment UNKNOWN.**

---

# 10. Recommendation

## **EXECUTE - 5C.10, narrow: make the loop repeatable.**

| # | Step | Why |
|---|---|---|
| 1 | **Merge against the committed export, not the snapshot** (R1) | The loop currently works once. This makes it safe to run twice |
| 2 | **Add rollback for published artifacts** (R2) | The last unproven link; `rollbackKCR` exists and is tested |
| 3 | **Add a value editor in Review** (R5) | Otherwise corrections can only fix prose |
| 4 | Readable version ids (R3); surface `researching` KCRs (R4) | Small, and both land in governed records |

**PARK** everything else. **KILL** nothing.

---

## What this sprint settled

**NGW can now operate its own trust system.** An administrator discovered a live host-facing
artifact, corrected it with a stated reason, passed three review gates, published it, and watched
the runtime resolver serve the result - without a developer, and **without the evidence gate
being weakened by a single line.**

The instruction to drive past blockers was right twice over. The 5C.8 blocker was real and
fixable with a lookup rather than a loosened rule. And pushing all the way through to a round-trip
surfaced **D-A**, which no amount of component-level testing would have found - it only appears
when the output of the loop becomes the input of the next one.
