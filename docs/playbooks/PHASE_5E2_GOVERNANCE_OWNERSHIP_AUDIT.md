# Phase 5E.2 - Governance Ownership Audit + Runtime Contract Enforcement

**Date:** 2026-08-01 - ASCII-only.
**Gates:** **299 suites / 4587 tests passing** . `gate:knowledge [OK]` . hostv2 parity passed.
**Governed artifacts:** clean.

---

# Executive verdict

## "Can NGW safely allow administrators to govern all currently exposed fields?"

# **NO - it could not. It can now, because the exposed set was cut to what runtime actually reads.**

Two of the three "governing-model" fields I declared in **Phase 5E.1** - `servingModel` and
`purchaseThresholds` - **do not exist in the data model at all.** I invented the names from the
brief's example and shipped them as correctable. That is precisely the fake governance the
contract exists to forbid, introduced *by the contract itself*, one phase after writing it.

Both are removed. The rule is now structural rather than hand-maintained:

> **A field is governable only if `governedPurchase()` resolves it.** That function is the single
> seam through which published knowledge reaches the food plan. Outside it, publishing mints an
> authoritative value that changes nothing.

---

# Ownership matrix

| Field | Type | Editable | Runtime consumer | Host surface | Status |
|---|---|---|---|---|---|
| `p_oldbay.qtyPerGuest` | DIRECT | yes | `governedPurchase` -> `playbookFoodPlan` | shopping quantity | **PASS** |
| `p_oldbay.unitCostRange` | DIRECT | yes | `governedPurchase` -> line pricing | shopping $ range | **PASS** |
| `p_oldbay.qtyFlat` | DIRECT | yes | `governedPurchase` | shopping quantity | **PASS** |
| `*.provenance` (any purchase) | DIRECT | yes | `purchaseProvenance` -> `isGroundedItemQty` | host "Sourced -" line | **PASS** |
| `p_butter.*`, `p_corn.*`, `p_shrimp.*`, drinks | DIRECT | yes | `governedPurchase` | shopping list | **PASS** |
| **`p_crabs.priceLadder`** | **COMPOSITE** | **yes** | **`resolveBulkPurchase()` (index.js:149) off the GOVERNED purchase** | **bushel recommendation + price** | **PASS (newly WIRED)** |
| **`p_crabs.servingGuide`** | **COMPOSITE** | **yes** | **`resolveBulkPurchase()`** | **bushel sizing** | **PASS (newly WIRED)** |
| `p_crabs.qtyPerGuest` | DELEGATED | **no** | crab engine overrides the line | count unchanged | **BLOCK** |
| `p_crabs.qtyFlat` | DELEGATED | **no** | crab engine | - | **BLOCK** |
| `p_crabs.unitCostRange` | DELEGATED | **no** | crab engine (bushel ladder) | - | **BLOCK** |
| `p_crabs.buyingUnits` | UNKNOWN -> none | **no** | **NO PROD CONSUMER** (authored note only) | none | **BLOCK** |
| `p_crabs.servingModel` | **DOES NOT EXIST** | **no** | none - invented in 5E.1 | none | **REMOVED** |
| `p_crabs.purchaseThresholds` | **DOES NOT EXIST** | **no** | none - invented in 5E.1 | none | **REMOVED** |
| any other `p_*.<field>` | no consumer | **no** | not in `GOVERNED_PURCHASE_FIELDS` | none | **BLOCK** |
| non-purchase paths (`decision.weight`, etc.) | out of scope | n/a | other consumers | - | **NOT CLAIMED** |

---

# Runtime trace evidence

## DIRECT - `p_oldbay.qtyPerGuest`

```
Admin correction 0.05 -> 0.06
  -> effectiveValue(playbook, 'p_oldbay.qtyPerGuest')   [override > published > authored]
  -> governedPurchase()                                  [index.js:924, the single seam]
  -> playbookFoodPlan() map                              [index.js:3391]
  -> line.qty / line.perGuest
  -> HostShellV2 shopping list
```

## COMPOSITE - `p_crabs.priceLadder` (the phase's payoff)

**Measured, not asserted:**

```
AUTHORED bulk: {"qty":2,"unit":"bushels","totalUnits":84,"unitLabel":"2 full bushels","price":690}
GOVERNED bulk: {"qty":2,"unit":"bushels","totalUnits":84,"unitLabel":"2 full bushels","price":1998}
CHANGED: true
```

```
Admin corrects priceLadder.largeMale.perBushel
  -> effectiveValue -> governedPurchase()
  -> resolveBulkPurchase(p, decisions, choices, _qtyGuests)   [index.js:3613, GOVERNED p]
  -> bulkRecommendation { qty, unit, totalUnits, price }
  -> host buys against real units
```

**This is the honest lever for threshold economics.** A per-guest rate cannot move a bushel; the
LADDER can, because it is what the bushel arithmetic reads. Governing the rule instead of the
output - exactly the correction the crab domain demanded.

## DELEGATED - why `p_crabs.qtyPerGuest` stays blocked

`buyingUnits`: *"dozen for <=2 adult pickers; half bushel for 4-8; full bushel for 8-15"* -
with crabs-per-bushel varying by size (medium 84, large 72, xl 60, jumbo 48). Measured in 5E:
**RATE MOVED: true / COUNT MOVED: false.**

---

# Fake governance findings

| Field | Finding | Action |
|---|---|---|
| `p_crabs.servingModel` | **Does not exist.** Only reference was my own `governedOwnership.js` | **REMOVED** |
| `p_crabs.purchaseThresholds` | **Does not exist.** Same | **REMOVED** |
| `p_crabs.buyingUnits` | Exists in playbook data, **NO production consumer** - an authored note | **BLOCKED** (no-consumer) |
| `p_crabs.priceLadder` | Exists, real consumer, **was not in the governed set** | **WIRED** |
| `p_crabs.servingGuide` | Same | **WIRED** |
| any unlisted `p_*` field | no consumer by construction | **BLOCKED** structurally |

---

# Enforcement

**Two layers, unchanged in shape from 5E.1:**

- **Publish gate** (`publishKCR`): refuses `drivesRuntime === false` whatever the type. Closes
  the path regardless of UI.
- **Correction UI**: delegated / no-consumer fields render disabled, labelled `(engine-owned)`,
  with the reason inline and on hover.

**New: a drift guard.** `RUNTIME_CONSUMED_FIELDS` is asserted equal to `GOVERNED_PURCHASE_FIELDS`
parsed out of `playbooks/index.js`. The one way this contract rots is someone adding a field to
one and not the other; that is now a test failure rather than a silent lie.

---

# Tests added (5, total 4587)

1. **`priceLadder` changes the bushel recommendation** - host-facing price moves, units stay
   quantised (the WIRE proof).
2. **A field with no runtime consumer cannot publish** - `buyingUnits`, `madeUpField`.
3. **An untyped PURCHASE field is refused** - premise deliberately inverted from 5E, documented.
4. **A non-purchase path is untouched** - the registry does not over-claim.
5. **Drift guard** - registry vs `GOVERNED_PURCHASE_FIELDS`.
6. **Every editable purchase field has a consumer** - property test over the field list.

---

# Chrome verification

Composer opened on `Crab Feast / p_crabs.provenance`; picker state read from the live DOM:

```
provenance                      disabled: false
qtyPerGuest (engine-owned)      disabled: true
unitCostRange (engine-owned)    disabled: true
  "This value is calculated by the crab engine. Correct the governing rule instead ..."
```

**Marked honestly: this was STATE VERIFICATION via scripted clicks, not pointer proof.** Repeated
real-pointer navigation kept bouncing to Overview late in a very long session. The rendered
output is genuine; the click path was not. The publish gate is unit-proven independently of the
UI, which is the layer that actually enforces the contract.

---

# Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Every editable governed field has an owner | **PASS** |
| 2 | Every owner has a runtime consumer | **PASS** - structurally enforced |
| 3 | Delegated fields cannot publish | **PASS** |
| 4 | Composite fields drive runtime or are disabled | **PASS** - `priceLadder`/`servingGuide` wired and proven; `buyingUnits` disabled |
| 5 | No fake governance controls remain | **PASS** - 2 invented fields removed, 1 unconsumed blocked |
| 6 | Tests green | **PASS** - 4587 |
| 7 | Chrome verification | **PARTIAL** - state-verified, not pointer-driven (disclosed) |
| 8 | Audit document | **PASS** |

**7.5 of 8.**

---

# Remaining risks

- **R1.** The Chrome step is state-verified, not pointer-driven. The gate is the real enforcement
  and is unit-proven, but the UI claim is weaker than earlier phases.
- **R2.** Non-purchase governed paths (decisions, playbook-level fields) are **explicitly not
  claimed** by this registry. If governance is ever extended there, it needs its own consumer
  audit - the same contract, a different seam.
- **R3.** Only `crabServing` is declared as an engine. Package pricing and bundled purchases were
  named in the brief; I found **no other delegating engine** in the food path (`crabDelegated` is
  the only delegation branch in `playbookFoodPlan`), but I have not audited vendor or budget
  engines.
- **R4.** `priceLadder`/`servingGuide` are now governable but have **no typed editor** - they are
  structured objects and `governedFieldTypes` has no entry, so the composer offers no inputs for
  them. Publishable via API, not via UI.
- **R5.** The 5E host proof is still outstanding, correctly repointed at `p_oldbay`.

---

# Recommendation

1. **Add typed editors for `priceLadder` / `servingGuide`** (R4) - they are the crab line's real
   governance lever and currently unreachable from the console.
2. **Audit vendor and budget engines** for delegation (R3).
3. **Then Phase 5E.3 host proof on `p_oldbay`.**

---

## What this phase settled

The contract went from *declared* to *structural*. Governance is no longer a list someone
maintains - it is derived from the one function that carries published knowledge into the food
plan, and guarded by a test that fails if the two drift.

The uncomfortable part is worth keeping: **the fake governance this phase removed was created by
the phase that invented the contract.** Writing the rule did not make me follow it; tracing every
field to a real consumer did.
