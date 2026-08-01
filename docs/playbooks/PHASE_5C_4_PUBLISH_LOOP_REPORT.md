# Phase 5C.4 - Knowledge Publish Loop Implementation Report

**Date:** 2026-08-01 - ASCII-only.
**Gates:** **297 suites / 4520 tests passing** (11 new). `npm run gate:knowledge` -> `[OK]
snapshot is up to date`. No new KCRs, no published knowledge files modified, no resolver change,
no migrations, no new API, no evidence model.

**Evidence classes:** **PROVEN** (driven in Chrome) - **VERIFIED IN CODE** - **UNKNOWN**

---

## 1. Executive Summary

The publish loop is connected. Admin now projects its published KCRs into exactly the file the
bake consumes, and can jump from Publishing to Runtime Preview to verify any field against what
hosts actually see. **The bake stays a deliberate human step** - download, commit, `npm run
bake:knowledge` - so a bad publish is caught in a diff rather than discovered by a host.

**The most consequential change is the smallest.** `prevVersion: k.rollbackTo` ->
`k.publishedVersion` in the publish handler. That defect was invisible on a first publish
(both null) and broke on every re-publish - which is to say, on **every correction**. The
regression suite reproduces the old behaviour explicitly before asserting the fix, because a
test that only asserts the fix cannot show the bug was real.

**Honest limit up front:** the export button renders and is correctly **disabled**, because the
browser's KCR store holds **0 published KCRs**. Nothing has ever been published through Admin.
So the export mechanism is **VERIFIED IN CODE and byte-proven in tests**, but the click-to-file
path is **UNKNOWN** - it cannot be driven until something is published through the UI, which
this phase was told not to do.

---

## 2. Task 1 - Publishing lineage fix

**File:** `src/admin/AdminConsole.jsx` (publish handler)

```diff
- prevVersion: k.rollbackTo || null
+ prevVersion: k.publishedVersion || null
```

**Why it mattered.** `rollbackTo` is the version the current one *already replaced* - the
grandparent. Passing it meant a re-publish chained the new version past its parent and left the
parent unsuperseded. Since `publishedSnapshotBuild` now selects **by lineage**, that produced
**two live heads on one field** - the exact failure the Phase 5C.2 builder work was meant to
prevent.

### Regression tests (5, all passing)

| Test | Proves |
|---|---|
| first publish identical old vs new | **why the defect survived review** - both null, no observable difference |
| OLD behaviour reproduced | parent unsuperseded -> `superseded: 0`, `conflicts: 1` |
| NEW behaviour | `rollbackTo === 'v1'`, `conflicts: 0`, resolves to the newer value |
| **three-version chain, three array orders** | resolves to `THREE`; `['v1','v2']` superseded; order-independent |
| rollback the head of a 3-chain | restores **v2**, not v1 |

All five drive the real `publishKCR` through the same expression the UI uses, so they test the
handler's contract rather than a restatement of it.

---

## 3. Task 2 - Publishing export

**New file:** `src/lib/knowledge/publishedExport.js` - a **pure serializer**. No I/O, no clock,
no fetch, no storage. The UI does the download; the bake does the build; a human commits between.

| Export | Purpose |
|---|---|
| `publishedKcrsForExport(kcrs)` | filter to published-with-proposal, sort by (assetId, fieldPath, publishedVersion) |
| `serializePublishedExport(kcrs)` | 2-space indent + trailing newline - **matches the committed artifact exactly** |
| `exportSummary(kcrs)` | records / fields / **heads vs superseded**, so a publisher sees what will actually win |

**Determinism is the contract that makes the export reviewable.** A re-export of unchanged
knowledge must produce an empty `git diff`, or reviewers learn to skim past it.

### Export tests (6, all passing)

| Test | Proves |
|---|---|
| **re-serializing the committed export is BYTE-IDENTICAL** | empty-diff contract holds against the real file |
| export -> `buildSnapshot` reproduces the committed snapshot | including `snapshotVersion` hash |
| only published-with-proposal exported | drafts, approved, no-proposal, no-assetId all excluded |
| ordering stable regardless of input order | reversed input -> identical bytes |
| summary separates heads from superseded | 3 records, 2 fields, **1 superseded** (p_wine v1) |
| **export is pure - does not touch disk** | file byte-identical before and after |

---

## 4. Task 3 - Verification path

Two routes added to Publishing:

1. **`Verify in Runtime Preview ->`** - workspace jump. **PROVEN.**
2. **Per-field `verify ->`** rows - prefills `setRtType(assetId)` / `setRtField(fieldPath)`,
   clears the stale result, then navigates. **VERIFIED IN CODE, UNKNOWN in UI** - the row list
   only renders when published KCRs exist in the store, and there are none.

### Chrome proof

| Step | Result | Class |
|---|---|---|
| Publishing renders new surface | 4 KPIs incl. **IN EXPORT (HEADS)** / **SUPERSEDED (HISTORY)** | **PROVEN** |
| Banner corrected | now says nothing reaches a host "until the export below is committed and baked" | **PROVEN** |
| `RUNTIME EXPORT - 0 published records across 0 fields` | honest-empty; **export button correctly disabled** | **PROVEN** |
| `Verify in Runtime Preview ->` | navigated to Runtime Preview | **PROVEN** |
| Runtime Preview resolve `Crab Feast / p_crabs.provenance` | **source: published**, `crab-feast-p-crabs-provenance-v1`, confidence medium, full resolution trace | **PROVEN** |
| Console errors from the Admin app | **none** - all 27 exceptions came from the previously-loaded `:4178` hostv2 page and are extension-connection noise | **PROVEN** |
| 227 KCRs load after async fetch | backlog intact | **PROVEN** |

**The old banner was wrong and is now fixed.** It claimed "Publishing writes an override record
that the runtime resolver applies." It does not - `applyOverride` has zero production callers.
That sentence was the single most misleading string in the console: it described a wire that
did not exist.

---

## 5. Task 4 - Correction workflow UI audit (read-only)

**`correctPublishedKCR` has 0 references in AdminConsole** (VERIFIED IN CODE).

But the audit turned up something better than "the UI is missing": **Admin already has a
correction route**, through status transitions -

```
published --[Move to monitoring]--> monitoring --[Open a revision]--> revision
         --[Re-research]--> researching -> grounded -> review -> approved -> Publish
```

**With the Task 1 fix, that existing route now produces correct lineage** - the re-publish
supersedes its own prior version. Before this phase it would have produced two live heads.

### The gap that remains, and it is not the one expected

The two paths differ in **history**, and the difference has a runtime consequence:

| | Admin revision route | `correctPublishedKCR` |
|---|---|---|
| KCR identity | **same record**, status cycles backward | **new record** (`${prior.id}-correction`) |
| Prior published value | survives only in `audit[]` | **survives as its own published record** |
| During revision | status is `revision`, **not `published`** | prior stays `published` throughout |
| **Export impact** | **the field DROPS OUT of the export entirely** | prior remains exported |

**That is the real finding.** `publishedKcrsForExport` filters on `status === 'published'`. While
a KCR sits in `revision`, its field has **no published record at all** - so a rebake during a
revision would drop the governed value and hosts would fall back to the authored default,
silently, mid-correction.

`correctPublishedKCR` does not have this problem by construction: it leaves the prior published
and adds a superseding record.

**Recommended (not built here):** surface `correctPublishedKCR` as a "Correct this" action on
`published` KCRs, and treat the existing monitoring/revision route as what it is - a route for
*withdrawing* knowledge, not correcting it. **No backend work.** The logic is built and has 11
passing tests from Phase 5C.2.

---

## 6. Files Changed

| File | Change | Risk |
|---|---|---|
| `src/admin/AdminConsole.jsx` | lineage fix; export + verification UI; corrected banner; import | Med - UI only, no resolver path |
| `src/lib/knowledge/publishedExport.js` | **NEW** - pure serializer | Low - no callers outside Publishing |
| `src/lib/knowledge/publishedExport.test.js` | **NEW** - 11 tests | None |

**Not changed, deliberately:** `knowledgeOverride.js` (resolver), `publishedSnapshotBuild.mjs`,
`scripts/bake-published-knowledge.mjs`, `knowledge-exports/published-kcrs.json`,
`publishedKnowledge.json`, any playbook data, any cost factor.

---

## 7. Status Summary

| Item | Class |
|---|---|
| Lineage fix correct across 1-, 2- and 3-version chains, order-independent | **VERIFIED IN CODE** (5 tests) |
| Old lineage bug was real (two live heads) | **VERIFIED IN CODE** (reproduced) |
| Export is byte-identical to the committed artifact | **VERIFIED IN CODE** |
| Export reproduces the committed snapshot through the bake | **VERIFIED IN CODE** |
| Publishing surface renders; export disabled at 0 records | **PROVEN** |
| Publishing -> Runtime Preview navigation | **PROVEN** |
| Runtime Preview resolves published knowledge with version + trace | **PROVEN** |
| No console errors from the Admin app | **PROVEN** |
| **Export button click -> downloaded file** | **UNKNOWN** - needs a published KCR in the store |
| **Per-field `verify ->` rows** | **UNKNOWN** - list is empty until something is published |
| **Full loop: publish in Admin -> export -> commit -> bake -> host** | **UNKNOWN** - never driven end to end |

---

## 8. Risks

- **R1.** The loop is **not yet proven end to end**. Every link is tested; the chain is not.
  Driving it requires publishing a KCR through Admin, which this phase forbade.
- **R2.** The revision route drops a field out of the export mid-correction (SS5). **Pre-existing,
  not introduced here** - but the export makes it consequential, because now something consumes
  that filter.
- **R3.** Export is a manual download-and-commit. Intentional, and the safest first shape, but it
  means published-in-Admin and live-for-hosts can diverge until someone runs the bake. The
  Publishing copy states this explicitly rather than implying immediacy.
- **R4.** `?admin=1` dev bypass is not production auth. Whether a real admin session can reach
  `/api/admin/kcrs` is **UNKNOWN** (the Audit tab returns 401 under bypass).

## 9. Next

1. **Prove the loop end to end** - publish one KCR through Admin, export, commit, bake, confirm
   in Runtime Preview and in a host surface. This is the only remaining UNKNOWN that matters.
2. **Surface `correctPublishedKCR`** as "Correct this" on published KCRs (SS5). No backend work.
3. **Then** reconsider `--from-api` (Phase 5C.3 Option A2) - only after the manual loop has run
   cleanly at least twice.
