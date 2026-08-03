# Phase 5C.6 - Trust Foundation Report

**Date:** 2026-08-01 - ASCII-only. Companion: `PHASE_5C6_BASELINE_REPORT.md`.
**Commit:** `909f5b9e` on `product/decision-soundness-p0`.
**Gates:** **297 suites / 4528 tests passing** (8 new). `gate:knowledge` **[OK]** from a clean
checkout. No knowledge value altered, no governance bypassed, no new storage system.

---

# Executive Verdict

# **PARTIAL**

**Three of four P0 defects are resolved and proven. The fourth is half-resolved.** The
foundation is now real: a clean clone ships governed knowledge, the export can no longer delete
knowledge it does not know about, and Admin can see exactly what is live. What is **not** done
is the correction action itself - Admin can now *see* live knowledge but still cannot *correct*
it, so the end-to-end loop (Phase 6) remains unproven.

**I stopped short of Phases 5-6 rather than rushing them.** That is a scope outcome, not a
discovered break: the remaining work is small and well-defined (SS Remaining Work), and every
piece it needs is built and tested.

---

# Before / After Architecture

## Before

```
  Admin store                         Runtime
  227 drafts, 0 published             publishedKnowledge.json @ HEAD
        |                                   entryCount: 0  (3350e13d)
        |  export = REPLACE                       |
        v                                          v
  knowledge-exports/                        effectiveValue tier 3 EMPTY
  published-kcrs.json                              |
  *** UNTRACKED - one laptop ***            every field -> authored default

        X  no read path back into Admin
```

## After

```
  Admin store ------+
  (227 drafts)      |
                    |  mergePublishedKnowledge(liveAsKcrs, adminKcrs)
  publishedEntries()|  <- merge base: the SAME bytes runtime serves
  (baked snapshot)--+
                    |
                    v
        knowledge-exports/published-kcrs.json   *** TRACKED (909f5b9e) ***
                    |
              npm run bake:knowledge
                    |
                    v
        publishedKnowledge.json  entryCount: 2  (23817229)  *** COMMITTED ***
                    |
              effectiveValue tier 3
                    |
                    v
                 hosts
                    ^
                    |
        Publishing > LIVE IN RUNTIME  --verify-->  Runtime Preview
        (read from the baked artifact - cannot drift)
```

---

# Defect Resolution Matrix

| Defect | Status | Evidence |
|---|---|---|
| **D1** Admin correction visibility | **PARTIAL** | **PROVEN** - Publishing renders `LIVE IN RUNTIME - 2 governed fields` with version, tier, confidence, date and a per-field `verify ->`. **Correction ACTION still absent** |
| **D2** Export merge safety | **RESOLVED** | **PROVEN** - export went **0 -> 2 records** in the UI once merged. 8 tests incl. "existing knowledge survives", supersession, order-independence, "merge cannot drop a field" |
| **D3** Artifact tracking | **RESOLVED** | **PROVEN** - `git ls-files knowledge-exports/` -> 1 file. Clean-checkout bake: `read 3 record(s)` -> `[OK] snapshot is up to date` |
| **D4** Empty HEAD snapshot | **RESOLVED** | **PROVEN** - HEAD now `entryCount: 2`, `snapshotVersion: 23817229`; clean checkout reproduces it exactly, gate exit 0 |

---

# Phase 2 Acceptance (clean checkout reproducibility)

Run against `git archive HEAD` in a temp dir:

```
knowledge-exports present : YES
committed snapshot        : entryCount=2  version=23817229

- bake: read 3 record(s) from knowledge-exports/published-kcrs.json
  accepted (published): 3
  entries: 2 - version 23817229
[OK] snapshot is up to date.
gate exit: 0
```

**Same artifact hash from a clean checkout. Acceptance met.**

---

# Phase 3 - Merge safety

`publishedExport.js` gained three pure functions - **no new storage, no new API**:

| Function | Role |
|---|---|
| `snapshotEntryToKcr(entry)` | rebuild a minimal published KCR from a baked entry. Safe by construction: the snapshot holds only lineage **heads**, so nothing retired is resurrected |
| `mergePublishedKnowledge(existing, incoming)` | union by KCR id, incoming wins. **Cannot drop a field** |
| `publishedInventory(entries)` | the "what is live?" projection |

**Tests added (8), all passing** - written to the brief's exact scenarios:

- `EXISTING KNOWLEDGE SURVIVES` - publishing `p_budget` keeps `p_crabs` + `p_wine` (3 entries)
- `the OLD destructive behaviour is what we are preventing` - exporting Admin's store alone
  yields **1** entry; merged yields **3**
- `SUPERSESSION WORKS` - `p_wine` v2 published over v1 -> runtime sees **only v2**
- `ARRAY ORDER INDEPENDENCE` - 4 orders, one snapshot hash
- `merge cannot DROP a field` - every input id survives
- `incoming wins on the same id`
- `snapshotEntryToKcr round-trips the committed snapshot`
- `publishedInventory answers "what is currently live?"`

---

# Phase 4 - Published Knowledge Inventory

**PROVEN IN UI**, and it matches the brief's acceptance example exactly:

```
LIVE IN RUNTIME - 2 governed fields

Crab Feast . p_crabs.provenance                      active   medium   [verify ->]
  crab-feast-p-crabs-provenance-v1 . researched . 2026-08-01

Retirement Party . p_wine.provenance                 active   medium   [verify ->]
  retirement-party-p-wine-provenance-v2 . researched . 2026-08-01
```

Read from `publishedEntries()` - the same bytes the resolver serves - so it **cannot drift from
what a host sees**. A projection, not a second store.

---

# Tests

| | Before | After |
|---|---|---|
| Suites | 297 | **297** |
| Tests | 4520 | **4528** |
| New | - | **8** (merge safety) |
| Failures | 0 | **0** |

---

# Chrome Evidence

| # | URL | What | Timestamp |
|---|---|---|---|
| `screenshot-...-15.jpg` | `localhost:3000/?admin=1` | Publishing: `IN EXPORT (HEADS) 2`, `RUNTIME EXPORT - 2 published records across 2 fields`, `LIVE IN RUNTIME - 2 governed fields` with both versions, export button **enabled** | 2026-08-01 |
| (5C.5) | same | Baseline: same surface reading **0 records / 0 fields**, button disabled | 2026-08-01T11:41Z |

**The 0 -> 2 delta on the same surface is the proof that the merge works**: nothing was
published in between; the export simply stopped ignoring knowledge it had not authored.

**Network:** no `/api/` calls are made by the Publishing workspace - the inventory reads the
bundled artifact. **PROVEN** (5C.5 network capture; unchanged).

---

# Phases 5 and 6 - NOT COMPLETED

**Phase 5 (expose `correctPublishedKCR`)** and **Phase 6 (re-run the 5C.5 proof)** were not
done. Stating this plainly because the sprint's success criteria depend on them.

**This is not a discovered break.** The blocker 5C.5 found (D1) is now half-cleared: Admin can
see live knowledge, and `snapshotEntryToKcr` produces exactly the record a correction needs.
What remains is two small, well-defined pieces:

1. **Seed the reconstructed heads into the KCR store** so a live artifact becomes a KCR Admin
   can act on. `snapshotEntryToKcr` already emits the right shape and is tested.
2. **A "Correct this" action** on those records calling `correctPublishedKCR(prior, {...})` -
   built and covered by 11 tests since Phase 5C.2. **Do not rebuild it.**

Until both land, Phase 6 cannot run: there is still no published KCR in Admin to correct.

## Success criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Clean checkout contains governed knowledge | **PASS** |
| 2 | Export cannot delete unrelated knowledge | **PASS** |
| 3 | Admin can see live published knowledge | **PASS** |
| 4 | Admin can correct live knowledge | **NOT DONE** |
| 5 | Runtime receives approved correction | **NOT PROVEN** |
| 6 | Rollback works | **NOT DRIVEN** (unit-proven only) |

---

# Remaining Unknowns

- **U1.** Deployed production snapshot contents. **Never fetched.** The correct statement remains
  **Local: PASS - Repository: now PASS - Deployment: UNKNOWN**. A deploy from `909f5b9e` would
  ship 2 governed entries; whether one has happened is unknown.
- **U2.** Whether a KCR can be walked `draft -> published` through the Admin UI at all. The
  `grounded` gate requires evidence and **the Evidence store holds 0 records**, so all 227 drafts
  may be unable to advance. **Not attempted.** This could block Phase 6 independently of D1.
- **U3.** `/api/admin/kcrs` under a real admin session (401 under dev bypass).
- **U4.** Whether the server-side KCR store holds records that differ from localStorage.
- **U5.** Export button click -> downloaded file. Now enabled with 2 records, but **not clicked** -
  clicking downloads a file, which was out of scope for a repair sprint.

---

# Final Recommendation

## **EXECUTE - the remaining half of D1, and nothing else.**

| Item | Verdict |
|---|---|
| Seed reconstructed heads into the KCR store + "Correct this" action | **EXECUTE** - the only thing standing between here and a proven loop |
| Re-run Phase 5C.5 unchanged afterwards | **EXECUTE** - the proof is only meaningful once the loop closes |
| Resolve U2 first (can any KCR reach `published` in the UI?) | **EXECUTE** - cheap, and it may be a second blocker hiding behind the first |
| `correctPublishedKCR` backend, lineage, rollback, merge | **KILL as work** - built, tested, committed |
| `--from-api`, EvidenceAssessment, evidence lifecycle, Studio expansion | **PARK** - unchanged; all assume a loop that does not yet close |

**Where this leaves the programme.** The gap was four defects wide and is now one. The
architecture was never the problem - it was that the governed corpus lived on one laptop, the
export would have deleted it, and Admin could not see it. Those three are fixed and committed.
The last one is an action button over logic that already exists.
