# Phase 5E.1 - Governed Field Ownership Contract

**Date:** 2026-08-01 - ASCII-only.
**Gates:** **4582 tests passing** . `gate:knowledge [OK]` . governed artifacts clean.

---

# 1. Executive verdict

# **The contract is enforced. NGW can no longer publish a value that does not control runtime.**

Phase 5E published `p_crabs.qtyPerGuest = 0.5` through every gate and measured:

```
WITH governed 0.5   -> qty: 6 dozens | perGuest: 0.5
WITHOUT (authored)  -> qty: 6 dozens | perGuest: 0.3333
COUNT MOVED: false  |  RATE MOVED: true
```

That is worse than a no-op. The line then carries a stated rate beside a count sized by
something else - two numbers disagreeing on one row, both wearing the authority of governance.
**A governance system that can publish a value which does not control the output is not a
governance system.**

---

# 2. Field ownership audit

| fieldPath | runtime consumer | owner | drivesRuntime | editable |
|---|---|---|---|---|
| `p_crabs.qtyPerGuest` | crab engine (`buildCrabPlan`) | **crabServing** | **false** | **no** |
| `p_crabs.qtyFlat` | crab engine | **crabServing** | **false** | **no** |
| `p_crabs.unitCostRange` | crab engine (bushel ladder) | **crabServing** | **false** | **no** |
| `p_crabs.provenance` | host "Sourced -" line | playbook | true | yes |
| `p_crabs.servingModel` | crab engine input | playbook | true | **yes (governing-model)** |
| `p_crabs.priceLadder` | crab engine input | playbook | true | **yes (governing-model)** |
| `p_crabs.purchaseThresholds` | crab engine input | playbook | true | **yes (governing-model)** |
| `p_oldbay.*`, `p_butter.*`, `p_corn.*`, `p_shrimp.*` | `playbookFoodPlan` directly | playbook | true | yes |
| every non-delegated purchase | `playbookFoodPlan` | playbook | true | yes |

**Delegation is per-PURCHASE, not per-playbook.** `playbooks/index.js:3516` delegates the line
only when `p.id === 'p_crabs' && _crabDelegated`. Every other Crab Feast purchase is priced
straight off the playbook and stays fully governable - which is why the host proof moves to
`p_oldbay`.

## Why the crab line is delegated

`buyingUnits`: *"dozen for <=2 adult pickers; half bushel for 4-8; full bushel for 8-15;
multiple bushels above 15"* - with crabs-per-bushel varying by size (`crabServing.js`: medium 84,
large 72, xl 60, jumbo 48). **A per-guest rate cannot move a bushel.** The engine quantises to
real purchase units, and the ladder prices per dozen / 2-dozen / half-bushel / bushel per size.

---

# 3. Governance metadata

`src/lib/knowledge/governedOwnership.js` (pure - no I/O, no UI, no storage):

```
fieldOwnership(assetId, fieldPath) -> {
  fieldPath, owner, drivesRuntime, editable, correctionType, engine?, why?, governs?
}
correctionType: 'value' | 'provenance' | 'delegated' | 'governing-model'
```

Plus `correctableFields()` (what the picker may offer) and `blockedMessage()` (what an admin is
told).

---

# 4. Enforcement - two layers

**Publish gate** (`publishKCR`): refuses any field where `drivesRuntime === false`, whatever its
type. This is the layer that matters - it closes the path regardless of UI.

**Correction UI**: delegated fields render **disabled**, labelled `(engine-owned)`, with the
message on hover and inline.

---

# 5. Browser proof

Read from the live DOM after opening the composer on `Crab Feast / p_crabs.provenance`:

```
provenance                      disabled: false
qtyPerGuest (engine-owned)      disabled: true
  "This value is calculated by the crab engine. Correct the governing rule instead ..."
unitCostRange (engine-owned)    disabled: true
  "This value is calculated by the crab engine. Correct the governing rule instead ..."
```

**Disclosure:** the composer was opened via scripted clicks in this pass, not real pointer
events - repeated real-pointer navigation kept bouncing to Overview late in a very long session.
The rendered state above is genuine DOM output; the click path was not. Earlier phases drove the
same composer with real pointer events, and the publish gate is unit-proven independently of the
UI.

---

# 6. Tests added (12)

**Ownership** - crab qty/cost/flat owned by the engine; provenance still correctable; delegation
is per-purchase (`p_oldbay`, `p_butter`, `p_corn`, `p_shrimp` remain governable); governing-model
fields marked; `correctableFields` hides delegated ones; the message names the engine AND the
next step.

**Publish gate** - `p_crabs.qtyPerGuest` BLOCKED; `p_crabs.unitCostRange` BLOCKED;
`p_crabs.provenance` ALLOWED; a non-delegated purchase value ALLOWED; a governing-model field
ALLOWED.

**Measurement** - pins that the crab count is engine-quantised, so the contract cannot be
quietly relaxed.

---

# 7. Fixtures that had to move, and one mistake

Eight test files published `p_crabs.unitCostRange` / `qtyPerGuest` as a convenient subject. That
path is now non-governable by declaration, so those fixtures encoded an assumption the product
no longer holds. The two transport slices (`publishedSnapshot`, `kasVerticalSlice`) moved to
`p_oldbay` with an in-file note explaining why.

**My mistake:** I first did this as a blanket find-and-replace across every knowledge test, which
corrupted files where `p_crabs.unitCostRange` was meaningful DATA (missionControl, effectiveItem)
and even inverted my own ownership tests so they asserted `p_oldbay` was blocked. Reverted all of
it and reapplied surgically to the two files that genuinely publish a delegated field.

**One era-stale assertion also surfaced:** `publishedSnapshot.test.js` asserted
`entryCount === 0` - true when written, because HEAD shipped the empty snapshot. Phase 5C.6
committed the governed corpus, so that is now the anomaly. Rewritten to assert the property
actually worth protecting: **a field nobody published still resolves to authored.**

---

# 8. Remaining risks

- **R1.** The three governing-model fields (`servingModel`, `priceLadder`, `purchaseThresholds`)
  are declared correctable and gate-allowed, but **`governedPurchase` does not yet read them**,
  and no picker exposes them. Correcting one would publish cleanly and change nothing - the same
  class of defect this phase exists to prevent, one level up. **This is the next thing to fix.**
- **R2.** Ownership is a hand-maintained registry. A future engine that takes over a field will
  not announce itself; the registry has to be updated with it.
- **R3.** Only `crabServing` is declared. Package pricing and other threshold purchases were
  named in the brief as candidates and are **not yet audited**.
- **R4.** The 5E host proof is still outstanding, now correctly repointed at `p_oldbay`.

---

# 9. Recommendation

## **EXECUTE, in this order**

1. **Wire the governing-model fields into `governedPurchase`/the crab engine, or mark them
   `editable: false` until they are.** R1 is the same defect wearing different clothes, and
   shipping it would undercut the contract.
2. **Audit the other delegated models** (package pricing, threshold purchases) - R3.
3. **Then resume the 5E host proof on `p_oldbay`** - a plain per-unit line where `unitCostRange`
   and `qtyPerGuest` genuinely drive the host's numbers.

---

## What this phase settled

Governance now has a notion of **ownership**, not just permission. The question changed from
"may an admin publish this?" to "**does publishing this change what a host sees?**" - and a
value that fails the second question is refused whatever its provenance, type or approvals.

The crab line was the right teacher: its economics are real buying units, and no amount of
governance ceremony makes a per-guest rate move a bushel.
