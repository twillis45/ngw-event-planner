# Phase 5E - Governed Value Editing: Final

**Date:** 2026-08-01 - ASCII-only.
**Gates:** **298 suites / 4571 tests passing** (+22) . `gate:knowledge [OK]` . hostv2 parity passed.
**Governed artifacts:** untouched, clean against HEAD.

---

# 1. Executive verdict

# **The value-governance capability is BUILT and the safety property is PROVEN. The publish-to-host leg of the value loop is NOT yet driven.**

An administrator can now select a governed field, edit its value in a **field-aware** editor, and
the system refuses anything the engine could not read. The exact failure the sprint named -
`qtyPerGuest: "banana"` - is **blocked in the browser**, and a valid `0.5` produces a correction
carrying a real `number`.

What is not done: approve -> publish -> bake -> host for the quantity and cost fields. The
composer and the gate are proven; the tail of that specific loop is not, and I am not going to
describe it as finished.

---

# 2. Implementation summary

**Field types are measured, not assumed.** Counted across the live corpus before writing a line:

```
unitCostRange   array[2] of number   537 instances
qtyPerGuest     number               312
qtyFlat         number               225
provenance      object 148 / string   21    <- legacy strings still exist
```

**The brief specified `unitCostRange` as `{ min, max }`. It is a TUPLE `[min, max]`.** Building
to the brief's shape would have produced values the engine cannot read - the exact class of bug
this phase exists to prevent - so the editor is built to the measured schema and presents two
inputs that parse *into* the tuple.

## The three layers

| Layer | Where | Job |
|---|---|---|
| **Type registry** | `governedFieldTypes.js` | `format` (value -> editor), `parse` (editor -> value), `validate` (type safety), `validateForEditor` (editorial completeness) |
| **Publish gate** | `knowledgeChange.js` -> `publishKCR` | refuses a known field whose value would break its runtime consumer |
| **Field-aware editor** | `AdminConsole.jsx` | renders inputs per type; parses and validates before a KCR is created |

## Validation rules

| Field | Type | Rules |
|---|---|---|
| `qtyPerGuest` | number | strict `/^-?\d*\.?\d+$/` parse; > 0; <= 500 sanity ceiling |
| `qtyFlat` | number | same |
| `unitCostRange` | `[min, max]` | both numbers; non-negative; `min <= max`; <= 1,000,000 |
| `provenance` | object \| string | **gate:** non-null only. **editor:** source + note + frozen confidence |

### The scope decision that took two attempts

I first made the publish gate enforce provenance completeness (source + note required). That
**broke 13 existing tests**, and the tests were right: it conflated *editorial quality* with
*schema safety*, and would have rejected legitimate historical records predating the convention.

The corrected rule: **the gate is strict where the blast radius is a host's numbers, and
permissive where it is a caption.** A malformed quantity resolves as NaN in a shopping list; a
malformed provenance degrades the "Sourced -" line to nothing, which is ugly and honest.
Editorial completeness moved to `validateForEditor`, used only by the composer.

---

# 3. Defect found and fixed mid-execution

**Cross-field lineage.** Correcting `qtyPerGuest` from a row whose published record is
`p_crabs.provenance` produced a correction claiming `correctionOf:
crab-feast-p-crabs-provenance-v1`. But `p_crabs.qtyPerGuest` **has never been published** - so
the correction would have fabricated an ancestor and **retired the provenance record on the next
bake**, silently removing the host's "Sourced -" line as a side effect of changing a quantity.

**Found in the browser**, by reading the created KCR rather than trusting the click. Fixed: a
correction supersedes only when the target field matches the published field; a new field starts
its own lineage. Regression test asserts both records stay live with zero conflicts.

---

# 4. Files changed

| File | Change |
|---|---|
| `src/lib/knowledge/governedFieldTypes.js` | **NEW** - type registry, parse/format/validate, editor-vs-gate split |
| `src/lib/knowledge/governedFieldTypes.test.js` | **NEW** - 22 tests |
| `src/lib/knowledge/knowledgeChange.js` | publish gate calls `validateGovernedValue` |
| `src/admin/AdminConsole.jsx` | field picker + typed inputs; `doCorrect` parses/validates and retargets `fieldPath`; cross-field lineage fix |

**Not changed:** resolver precedence, `canReachCited`, `isPublishable`, `governedPurchase`, any
knowledge value, any playbook. No new database, store, API or approval framework.

---

# 5. Tests added (22)

**Parsing / typing** - clean numbers; rejects `banana`, `0.5kg`, `NaN`, `--3`, empty; tuple
parse and format round-trip.

**Validation** - rejects a stringified number (the NaN class), zero, negatives, implausible
magnitudes, inverted ranges, and the wrong shape (`{min,max}` is refused).

**Publish gate** - `"banana"` throws; `"0.5"` throws; `[500,10]` throws; valid `0.5` and
`[35,195]` publish and carry the value; an **untyped** field still publishes.

**Provenance** - composer requires source + note + frozen confidence; gate refuses only null;
legacy string accepted.

**Cross-field lineage** - a new field does not supersede an unrelated one.

---

# 6. Browser proof (real pointer events)

| # | Step | Result |
|---|---|---|
| 1 | Publishing -> `Correct this` on `Crab Feast / p_crabs.provenance` | composer opens |
| 2 | Field picker renders | `FIELD [provenance] [qtyPerGuest] [unitCostRange]` |
| 3 | Select `qtyPerGuest` | number input with hint appears |
| 4 | **Type `banana`, submit** | **`Blocked: "banana" is not a number.`** - **0 corrections created** |
| 5 | Replace with `0.5`, submit | correction created |
| 6 | Inspect the record | `fieldPath: p_crabs.qtyPerGuest` . **`newValue: 0.5`** . **`typeof: number`** . `status: review` |

Screenshot: `...-26.jpg` (field-aware editor open on the crab row).

**Step 4 is the acceptance criterion the sprint set, and it holds in the UI, not only in tests.**

Also visible and worth noting - the 5D fixes rendering correctly:
`RUNTIME EXPORT - 3 published records across 2 fields . 1 superseded (kept for history, will not
win resolution)`.

---

# 7. Runtime proof

**NOT DRIVEN for value fields.** Provenance corrections were proven to runtime and host in 5C.10
and remain so. A quantity or cost correction has not been carried through approve -> publish ->
export -> bake -> host in this sprint.

`governedPurchase()` reads `qtyPerGuest`, `qtyFlat` and `unitCostRange` through `effectiveValue`
(wired in 5C.10), so the path exists and is unit-covered - but **wired and unexercised is not
proven**, and I have been wrong before by treating a green intermediate light as end-to-end
evidence (5C.9: Runtime Preview is Admin's own viewer).

---

# 8. Completion criteria - honest status

| # | Criterion | Status |
|---|---|---|
| 1 | `qtyPerGuest` correction works end-to-end | **PARTIAL** - composer + validation + typed KCR proven; publish->host not driven |
| 2 | `unitCostRange` correction end-to-end | **PARTIAL** - editor + validation proven; not driven |
| 3 | `provenance` correction still works | **PASS** (5C.10, host-visible; unaffected) |
| 4 | Invalid values rejected | **PASS** - browser-proven and unit-proven |
| 5 | Approvals required | **PASS** - unchanged; correction still stops at Review |
| 6 | Rollback works | **PASS** (5D, browser-proven) |
| 7 | Host reflects corrected values | **OPEN** for values; **PASS** for provenance |
| 8 | Tests pass | **PASS** - 4571 |
| 9 | `gate:knowledge` passes | **PASS** |
| 10 | Final Chrome audit | **PASS** - this document |

**6.5 of 10.** The capability is built and its safety property is proven; the last leg is not.

---

# 9. Remaining risks

- **R1.** Value corrections not carried to a host. The path is wired and unit-covered; that is
  weaker evidence than a driven loop, and this programme has already been burned once by exactly
  that distinction.
- **R2.** The editor seeds an empty draft rather than pre-filling the current value, so an admin
  types a new quantity without seeing the old one beside it. Functional, poor for a governance
  action whose whole point is "old -> new".
- **R3.** `qtyFlat` is in the registry but has no picker button - three fields are exposed, four
  are typed.
- **R4.** Sanity ceilings (500 / 1,000,000) are judgement, not sourced. They catch slipped
  decimals; they are not domain limits.
- **R5.** Deployment still unverified. **Local PASS . Repository PASS . Deployment UNKNOWN.**
- **R6.** 24 files uncommitted behind `909f5b9e`, all gates green.

---

# 10. Recommendation

## **EXECUTE - finish the value loop before anything else. It is one sitting.**

| # | Step |
|---|---|
| 1 | Drive `qtyPerGuest` through approve -> publish -> export -> bake -> **host shows the new quantity**. Everything needed exists |
| 2 | Same for `unitCostRange`, confirming the host's dollar range moves |
| 3 | Pre-fill the editor with the current value (R2) - small, and it is what makes a correction reviewable |
| 4 | Add the `qtyFlat` picker (R3) |
| 5 | Then commit, then deployment |

**Do not start anything new.** The remaining work is the tail of this loop, and the value of
finishing it is that NGW will have proven it can change a number a host acts on - which is the
whole point of a knowledge system and the one thing it has never done.
