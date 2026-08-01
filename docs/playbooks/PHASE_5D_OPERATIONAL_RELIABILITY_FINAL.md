# Phase 5D - Operational Reliability Hardening: Final

**Date:** 2026-08-01 - ASCII-only.
**Gates:** **297 suites / 4549 tests passing** (+9) . `gate:knowledge [OK]` . hostv2 parity passed.
**Governed artifacts restored to their committed state** after the destructive rollback test.

---

# 1. Executive Verdict

# **P0 CLOSED. P1 rollback CLOSED. Two further defects found mid-execution and fixed. Three acceptance criteria remain open, and I am naming them rather than claiming them.**

The round-trip is now durable, rollback works from the Admin UI with history and a mandatory
rationale, and **two defects I introduced during this sprint were caught and fixed before the
sprint ended** - one by the UI disagreeing with the data, one by the rollback deleting the thing
it was meant to preserve.

**What I did not finish:** governed value *editing* (P1), the quantity/cost field loops (P2),
and deployment verification (P2). They are open, with reasons, in SS10.

---

# 2. Defects discovered and fixed

| # | Defect | How it surfaced | Fix |
|---|---|---|---|
| **D1 (P0)** | Export round-trip dropped superseded history and 11 of 21 fields | 5C.9 measurement | Moved the export **into `src/`** so the app can import the full corpus; `exportBase()` merges against the **committed export**, not the snapshot |
| **D2** | `exportBase` merge order **backwards** - snapshot reconstructions clobbered full committed records, wiping `rollbackTo` and un-superseding v1 | **The UI told on it**: `IN EXPORT (HEADS) 3 / SUPERSEDED 0` while PUBLISHED FIELDS listed a superseded record | Reconstructions are a **floor**; committed export is authoritative; store wins last |
| **D3** | A rolled-back version **vanished from the export**, making rollback irreversible | Driving the rollback to bake | Export keeps every record that has **ever** been published; the bake still admits only live ones |

**D2 and D3 are mine, introduced in this sprint.** Both were found by continuing to execute
rather than stopping at the first green light.

**D2 is the one worth remembering:** the data was right and the *summary* was wrong, so the
console was telling an admin there were three live heads when there were two. I only caught it
because the KPI disagreed with the list two inches below it.

---

# 3. Fixes implemented

### P0 - round-trip durability

**Root cause was ownership, not logic.** `knowledge-exports/published-kcrs.json` sat outside the
CRA module scope, so the console could not import it and had to rebuild its merge base from the
snapshot - which holds only lineage **heads** and only the 10 fields runtime needs.

```
git mv knowledge-exports/published-kcrs.json  src/lib/knowledge/publishedKcrs.json
```

One file, one owner, readable by both the bake and the console. Then:

| Function | Contract |
|---|---|
| `committedExport()` | the full published corpus, superseded versions included, as a copy |
| `exportBase(store, snapshotEntries)` | `reconstructions <- committed export <- Admin store`. **Order is load-bearing** (D2) |

### P1 - Admin rollback

| Function / UI | Behaviour |
|---|---|
| `lineageHistory(assetId, fieldPath, store)` | walks the chain **backwards from the head via `rollbackTo`** - real lineage, not sort order |
| `rollbackTarget(...)` | what would become live; **null** means the field reverts to its AUTHORED value, which the UI says in `D.bad` because it is a different and more alarming outcome |
| Rollback composer | version history newest-first, explicit target, **mandatory rationale**, confirm/cancel |
| `doRollback` | seeds the head if absent, calls `rollbackKCR` (status -> `revision`, **never delete**), writes the reason onto the record as `ROLLBACK: <reason> (was <version>)` |

---

# 4. Files changed

| File | Change |
|---|---|
| `src/lib/knowledge/publishedKcrs.json` | **moved** from `knowledge-exports/` (git mv, history preserved) |
| `src/lib/knowledge/publishedExport.js` | `committedExport`, `exportBase`, `lineageHistory`, `rollbackTarget`; merge order fixed (D2); export filter widened to preserve withdrawn history (D3) |
| `src/lib/knowledge/publishedExport.test.js` | +9 tests |
| `src/admin/AdminConsole.jsx` | rollback composer + handler; export now uses `exportBase` |
| `scripts/bake-published-knowledge.mjs` | `DEFAULT_IN` -> `src/lib/knowledge/publishedKcrs.json` |
| 3 test files | export path rewired to the new location |

**Not changed:** resolver precedence, `canReachCited`, `isPublishable`, any knowledge value,
any playbook, `governedPurchase`.

---

# 5. Tests added (9)

**Round-trip durability**
- `SECOND correction keeps v1` - reproduces the exact 5C.9 loss, then proves `exportBase` prevents it
- `FULL LINEAGE v1 -> v2 -> v3` - resolves to v3, both ancestors superseded, 0 conflicts
- `ROLLBACK from a 3-deep chain restores v2` - not v1, not authored
- `FIELD FIDELITY` - asserts the reconstruction is lossy **and** that `exportBase` returns the full 21-field record
- `exportBase is DETERMINISTIC and never drops a committed record`
- `a re-export with an empty Admin store is BYTE-IDENTICAL to the commit`

**Regressions for my own defects**
- `a snapshot reconstruction must NOT clobber the full committed record` (D2)
- `a ROLLED-BACK version stays in the export so the rollback is reversible` (D3)
- `a never-published draft is still excluded` (D3 guard - the widened filter must not leak drafts)

---

# 6. Chrome proof (real pointer events)

| Step | Evidence |
|---|---|
| Publishing renders `Rollback` beside `Correct this` | screenshot `...-24.jpg` |
| Rollback composer shows real lineage | `* live retirement-party-p-wine-provenance-v2` / `. retirement-party-p-wine-provenance-v1` |
| Target stated before acting | *"Rolling back makes retirement-party-p-wine-provenance-v1 live again."* |
| Rationale mandatory | `Confirm rollback` disabled until non-empty |
| Rollback executed | *"Rolled back p_wine.provenance - retirement-party-p-wine-provenance-v1 becomes the head on the next bake"* - screenshot `...-25.jpg` |
| PUBLISHED FIELDS updates | `p_wine.provenance -> retirement-party-p-wine-provenance-v1` (was v2) |
| Head count corrects | `IN EXPORT (HEADS) 2` after the D2 fix (was falsely 3) |

# 7. Runtime proof

Export -> bake after the rollback:

```
- bake: read 2 record(s) from src/lib/knowledge/publishedKcrs.json
  accepted (published): 2
  entries: 2 - version 2f48dd01
```

**`2f48dd01` is the pre-v2 snapshot hash** - the rollback restored the byte-exact prior runtime
state. That is the strongest single piece of evidence in this sprint: not "a rollback happened",
but "runtime returned to precisely where it was".

# 8. Rollback proof

| Property | Result |
|---|---|
| Prior version becomes live | **PASS** - v1 head, snapshot `2f48dd01` |
| Nothing deleted | **PASS after D3** - the withdrawn v2 stays in the export |
| Reversible | **PASS** - re-publishing v2 restores it (tested) |
| Rationale recorded | **PASS** - on the record, not just a toast |
| No duplicate heads | **PASS** - 0 conflicts |
| Deterministic | **PASS** - byte-identical re-export |

# 9. Deployment proof

**NOT PERFORMED - documented blocker.**

The deployed bundle was never fetched, and I did not run against production (standing rule: ask
first). The accurate status is unchanged and unglamorous:

**Local PASS . Repository PASS . Deployment UNKNOWN.**

What *is* known: a build from HEAD now carries 2 governed entries (since `909f5b9e`), where
before this arc it carried zero. Whether a deploy has happened since is unverified.

Server-backed KCR path also remains unverified - `/api/admin/kcrs` 401s under the dev bypass, so
the localStorage fallback is the only path exercised.

---

# 10. Acceptance criteria - honest status

| # | Criterion | Status |
|---|---|---|
| 1 | Multiple corrections work sequentially | **PASS** (tests: v1->v2->v3) |
| 2 | Full lineage survives | **PASS** |
| 3 | Rollback works from Admin UI | **PASS** (browser-proven) |
| 4 | Value changes can be governed | **OPEN** - see below |
| 5 | Evidence remains required | **PASS** - `canReachCited` untouched; unresolvable ids still fail |
| 6 | Quantity recommendation verified | **OPEN** |
| 7 | Cost recommendation verified | **OPEN** |
| 8 | Provenance recommendation verified | **PASS** (5C.10, host-visible) |
| 9 | Host sees updated governed values | **PARTIAL** - provenance yes; value path wired but unexercised |
| 10 | Deployment verified | **BLOCKED** - documented (SS9) |
| 11 | All tests pass | **PASS** - 4549 |
| 12 | `gate:knowledge` passes | **PASS** |
| 13 | Final audit | **PASS** - this document |

**9 of 13. I am not going to call that complete.**

### Why 4, 6 and 7 are open rather than done

The correction composer publishes `newValue` **unchanged** - it hands the reviewer the current
value and expects them to edit it in Review, and **Review has no value editor**. So a correction
can today fix reasoning but not a number.

Building that honestly is not a text input. `newValue` is a typed object per field -
`unitCostRange` is a two-number array, `qtyPerGuest` a scalar, `provenance` a structured block -
so the editor needs per-field validation, and `publishKCR` needs to enforce it. Half-building it
would produce a UI that accepts `"0.5"` as a string and publishes a value the engine silently
treats as `NaN`. **That is worse than the current honest gap**, so I stopped at the boundary and
am reporting it rather than shipping something that looks finished.

Criteria 6 and 7 depend on 4: without value editing there is no way to drive a quantity or cost
correction through the real UI, and faking one through a script would prove the engine, not the
loop.

---

# 11. Remaining risks

- **R1.** Governed **values** (`unitCostRange`, `qtyPerGuest`, `qtyFlat`) are wired end to end via
  `governedPurchase` but **no KCR has ever published one**. The path is unexercised.
- **R2.** No value editor in Review (SS10). Corrections fix prose only.
- **R3.** Deployment unverified (SS9).
- **R4.** Server KCR path unverified - 401 under dev bypass.
- **R5.** `researching` KCRs are listed by no workspace; a send-back strands them.
- **R6.** Version ids from the UI embed a timestamp and are unreadable.
- **R7.** Evidence store holds 0 records. Corrections work because `hydrateEvidence` resolves
  from the grounding registry - a *new* claim with a novel source would still need real evidence.

---

# 12. Recommendation

## **EXECUTE - Phase 5E, and make value editing the whole sprint.**

| # | Step |
|---|---|
| 1 | **Typed value editor in Review**, with per-field validation and `publishKCR` enforcing the type. This is criteria 4, 6 and 7 in one piece of work |
| 2 | Drive a **quantity** correction (`qtyPerGuest`) end to end and confirm the host's numbers move |
| 3 | Drive a **cost** correction (`unitCostRange`) and confirm the budget moves |
| 4 | Then deployment verification - it is only meaningful once values move |
| 5 | Commit. **20 files are uncommitted** behind `909f5b9e` with every gate green |

---

## What this sprint settled

The loop is now **durable**, not merely functional. It survives a second correction, a third,
and a rollback, and the governance trail survives with it.

Two of the three defects fixed here were mine, and both were invisible to the tests I had
already written - D2 needed the UI to contradict itself, D3 needed someone to actually roll
something back and look at what was left. That is the argument for driving the loop rather than
auditing it, and it is also the argument for stopping honestly at criterion 4: the next defect
of that kind will be found by building the value editor properly, not by declaring it done.
