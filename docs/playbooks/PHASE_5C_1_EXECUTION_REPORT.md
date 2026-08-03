# Phase 5C.1 - Trust Repair Execution Report

**Date:** 2026-08-01 - ASCII-only.
**Gates:** 295 suites / **4499 tests passing**. `npm run gate:knowledge` -> `[OK] snapshot is up
to date`. No new KCRs, no new playbooks, no migrations, no predicate behaviour changes.

> **UPDATE 2026-08-01 - see `docs/playbooks/PHASE_5C_2_ADMIN_FULL_BROWSER_AUDIT.md`.**
> SS9's recommended 5C.2 step **5C.2-a (publish a governed KCR v2 for `p_wine`) is COMPLETE**:
> the correction path was built, v2 published through the governed API, runtime verified to
> serve it, and rollback proven. R1 ("repair C is not live") is **CLOSED**.
> SS9's research items are dispatchable from Admin's Campaign Research, not new work.


---

## 1. Executive Summary

Three of four repairs landed. **One did not reach runtime, and I can prove it did not.**

| Repair | Outcome |
|---|---|
| A - crab_size Medium ratio | **DONE - documented as an exception, value unchanged** (evidence changed my recommendation) |
| B - Juneteenth `menu` grounding | **DONE - withdrawn; grounded count 16 -> 15** |
| C - Retirement `p_wine` derivation | **PARTIAL - playbook repaired, but the published override still shadows it at runtime** |
| D - Crab Feast quantity | **NOT MODIFIED, as instructed** - and my prior claim about it was overstated |

**The most important line in this report:** repair C is not live. `p_wine.provenance` is a
published KCR override, and `purchaseProvenance()` -> `effectiveValue()` returns the override in
preference to the playbook's inline provenance. I corrected the playbook; a host would still see
the defective reasoning. Fixing it properly requires republishing the KCR, which this phase
forbids. **Proven live, not inferred** - see SS4.

---

## 2. Files Changed

| File | Change |
|---|---|
| `src/lib/playbooks/data/crabFeast.js` | Repair A - documented the Medium-ratio exception in `crab_size.costFactorProvenance.note`. **No value changed.** |
| `src/lib/playbooks/data/juneteenthCookout.js` | Repair B - `menu.costFactorProvenance` tier `researched` -> `synthesized`, confidence -> `low`, `sources` removed, note rewritten with the withdrawal reason. **No costFactor value changed.** |
| `src/lib/playbooks/data/retirementParty.js` | Repair C - `p_wine.provenance.claim` / `.note` / `.sufficientWhen` rewritten with a correct derivation. **No quantity changed.** |
| `src/lib/knowledge/costProvenance.test.js` | Grounded-count floor 16 -> 15. **A test changed to accommodate my own edit - flagged in SS6.** |
| `src/lib/knowledge/trustIntegrityChecks.js` | NEW - four pure check functions + proposed source-coverage map. Read by nothing in runtime. |
| `src/lib/knowledge/trustIntegrityChecks.test.js` | NEW - report-only harness. Asserts check *behaviour*, never finding counts. |
| `docs/playbooks/TRUST_INTEGRITY_CHECKS.md` | NEW - check documentation + current report. |
| `docs/playbooks/PHASE_5C_1_EXECUTION_REPORT.md` | NEW - this file. |

## 3. Files Deliberately NOT Changed

| File | Why |
|---|---|
| `src/lib/knowledge/publishedKnowledge.json` | A **baked artifact**. Hand-editing it would drift the bake gate and bypass governance. |
| `knowledge-exports/published-kcrs.json` | Editing a published KCR record post-publication would change governed content **without review** - precisely what this programme exists to prevent. |
| `p_crabs` quantity (`crabFeast.js`) | Instructed not to modify until yield evidence exists. See SS5. |
| `isGroundedCost` / `isGroundedItemQty` and all predicates | "No predicate behaviour changes." |
| Anniversary / Vow Renewal `p_wine` | Task C said *validate against* them, not change them. Finding recorded in SS4. |
| Source registry (`costProvenance.js` etc.) | Task 3 is a **proposal**; no runtime change authorised. |

---

## 4. Repair Detail

### Repair A - crab_size Medium: **recommendation reversed by evidence**

Phase 5C recommended correcting Medium from 0.55 to ~0.63. **Inspecting the file changed that**,
and the change is worth recording because it shows why "read before editing" is a rule.

`p_crabs` carries a `priceLadder` with single-vendor prices (Captain's White, July 2026) that the
5B-5 audit never saw. Ratios against Large Male = $72:

| Size | priceLadder ratio | Range-midpoint ratio | Claimed |
|---|---|---|---|
| Large Female | 0.722 | 0.747 | 0.75 |
| XL Male | 1.514 | 1.524 | 1.55 |
| Jumbo Male | 2.069 | 1.982 | 2.00 |
| **Mediums** | **0.444** | **0.629** | **0.55** |

For three sizes the two methods agree within ~3 points, so the claimed value is safe either way.
**Medium is the only size where the methods diverge sharply** - because its source range
($32-75) is a **2.3x spread** versus ~1.4x for every other size. Cheap mediums are a loss-leader
at some dealers and near-large price at others.

0.55 is the mean of the two methods (0.537). It is **an editorial blend, not a derivation** -
which is exactly what the note failed to say.

**Action taken: documented the exception, left the value alone.** Correcting to the midpoint
0.63 would have *raised* the modelled cost of the budget option a stretched host is most likely
to choose, on the strength of a method the claim does not actually follow. Documenting is the
lower-risk repair and preserves rollback trivially.

### Repair B - Juneteenth `menu`: grounding withdrawn

Two independent failures, both verified against the cited source:

- **Brisket:** `usda-meat-2026` prices brisket ~$4.50/lb and pork chops ~$4.33/lb - **within ~4%**.
  It cannot support a ~20% premium over a ribs/chicken/links base. The prior note called brisket
  "a premium beef cut"; the source's own premium cuts are ribeye ~$14.24 and strip ~$13.56.
- **Seafood:** the source is a meat series and contains **no seafood**, so that leg was
  ungroundable under any reading.

`tier` -> `synthesized`, `sources` removed, claim prefixed `PLANNING MODEL (not researched)`.
**All three multipliers unchanged.** Check 2 confirms the repair: it returned 1 finding before,
0 after.

### Repair C - Retirement `p_wine`: repaired in the playbook, **shadowed at runtime**

The corrected derivation:

```
Source: ~1/2 bottle per DRINKING guest (bar-provision-2026)
This line is expressed per GUEST -> 0.5 x ~80% drinking rate = 0.4 bottle/guest
The ~80% rate is an ASSUMPTION, not sourced - now stated as the one unverified step.
```

Withdrawn from the prior claim: *"wine carries ~40% of the drink load."* Wrong twice - the source
assigns ~40% to **beer** (beer+wine ~75%, implying wine ~35%), and the stated arithmetic
(3h x 1/h x 40% / 5 glasses) yields **0.24**, not the 0.4 published.

**Then the runtime check, run live rather than reasoned about:**

```
PLAYBOOK inline claim   : "Source states ~1/2 bottle of wine per drinking guest..."   <- repaired
EFFECTIVE runtime claim : "At ~1 drink/guest/hour, wine carries ~40% of the drink..."  <- defective
OVERRIDE WINS = true
```

**The published KCR override still carries the defective text and wins.** Repair C is therefore
**cosmetic until a governed v2 is published.** I did not republish, and did not hand-edit the
export, because both would change published content outside review.

**Sibling validation produced a finding that reverses the naive reading.** Anniversary and Vow
Renewal both carry `qtyPerGuest: 0.5` while their claims say "per **drinking** guest". Their
field applies to *all* guests, so they do **not** apply the drinker discount their own claims
imply. **Retirement's 0.4 is the more careful value; only its reasoning was broken.** The three
lines differ in unit convention, not substance. Not changed - out of scope.

### Repair D - Crab Feast quantity: not modified, **and my prior claim was overstated**

Instructed to hold until yield evidence exists. Holding was correct, and reading the file shows
my Phase 5C framing was wrong in a way I should correct plainly.

I wrote that `p_crabs` "biases the host toward under-buying the main dish of the event." The file
says `qtyPerGuest: 4/12` is a **documented fallback**, with a comment stating the operative crab
count comes from the crab engine (`crabPlan` -> `crabServing`), which is size-aware and
picker-aware, and that the fallback "only fires where the crab engine cannot."

`crabServing.js` carries seven real sources including Maryland DNR. So the 4-crab figure is not
what a host normally sees, and **the under-buying risk I ranked as the top host-facing item is
materially smaller than I stated.** The published KCR grounds the fallback's provenance.

The genuine open item is narrower: **whole blue crab picked-yield per crab is still unsourced**
(my ~1/3 lb figure was my own), and the `knowledge` block's "~9 crabs per adult picker" is
inconsistent with `p_crabs.note`'s ~4.8-6.0. Both remain open.

---

## 5. Before / After Evidence Status

| Measure | Before | After |
|---|---|---|
| Grounded costFactor decisions | 16 | **15** |
| Claim legs in the grounded population | 40 | **37** |
| - DIRECT | 0 | 0 |
| - DERIVED | 4 | 4 |
| - ANALOGOUS | 22 | **21** |
| - UNSUPPORTED | 14 | **12** |
| Check 2 findings (claim-type mismatch) | 1 | **0** |
| Published artifacts with a defective rationale | 2 | **2** (1 repaired upstream, still shadowed) |
| Claims with a documented derivation exception | 0 | **1** |
| Automated integrity checks | 0 | **4 (reporting only)** |

**Grounded count fell by one, deliberately.** Per the decision standard: the goal is fewer claims
NGW cannot defend. Two UNSUPPORTED legs left the grounded population and no value changed for any
host.

---

## 6. Process Disclosures

Recorded because they affect how much weight this report deserves.

1. **I changed a test to accommodate my own edit.** `costProvenance.test.js` asserted
   `grounded >= 16`; repair B makes it 15. I lowered the floor to 15 with an in-file comment
   giving the withdrawal reason and an explicit instruction that it is a ratchet - not to be
   lowered again without the same written justification, and expected to rise as claims are
   re-grounded. **This is the correct fix, but it is still me editing a gate my own change
   broke, and it should be reviewed as such.**

2. **I made a scope-creep edit and reverted it.** While repairing `p_wine` I normalised
   `confidence: 'med'` -> `'medium'` (5A-1 froze the vocabulary to high|medium|low). It broke two
   rollback assertions in `governedProvenanceSlice.test.js`, which check that the *authored*
   value returns on rollback. Changing an authored value alters rollback semantics - out of scope
   under "preserve rollback ability". **Reverted; `'med'` restored.** The inconsistency is real
   (the frozen vocabulary applies to KCR proposals, not inline playbook provenance) and is left
   as an open item rather than fixed sideways.

3. **The checks found four groups my manual audit missed** - `caterer`, `host-cooks`,
   `restaurant`, `p_protein`. The hand audit found potluck and wine because it was looking for
   them; the check found the rest because it was not looking for anything in particular.

4. **One check finding was investigated and dismissed.** 12 purchases cite raw Costco URLs as
   source ids. All 12 carry `tier: 'trade-heuristic'` and all 12 return `grounded = false` -
   honest self-declaration, not a trust defect. Registry hygiene only.

---

## 7. Source Metadata Proposal (task 3 - documentation only, no runtime change)

Exported as `PROPOSED_SOURCE_COVERAGE` in `trustIntegrityChecks.js` so check 2 is runnable.
**Read by no predicate and absent from the source registry.**

### `catering-perperson-2026`

```
supportsClaimTypes  : ['catering-service-tier-price']
excludedClaimTypes  : ['diy-cost', 'potluck-cost', 'guest-contribution-cost',
                       'ingredient-price', 'beverage-cost']
supportedSegments   : ['full-service', 'buffet-with-servers', 'drop-off-buffet', 'drop-off']
unsupportedSegments : ['host-cooked', 'potluck', 'restaurant', 'food-truck', 'pitmaster',
                       'platters']
```

**Would have prevented:** all 12 potluck legs and every DIY-magnitude claim. The source names DIY
only as *"cheaper still"* - a direction with no number - and never mentions potluck at all.
**This single declaration is the highest-leverage item in the proposal.**

### `usda-meat-2026`

```
supportsClaimTypes  : ['meat-retail-price']
excludedClaimTypes  : ['seafood', 'produce', 'prepared-food-price', 'catering-service-price']
supportedSegments   : ['beef', 'pork', 'poultry']
unsupportedSegments : ['seafood', 'shellfish', 'finfish']
```

**Would have prevented:** the Juneteenth `menu` seafood leg, mechanically, at authoring time
rather than by audit three phases later. **This is the only proposal already validated** - check
2 detects the violation when the map is supplied.

### `dmv-crab-2026`

```
supportsClaimTypes  : ['blue-crab-retail-price']
excludedClaimTypes  : ['live-crab-price', 'crab-yield', 'serving-quantity',
                       'other-seafood-price']
supportedSegments   : ['steamed-retail', 'medium', 'large-female', 'large-male', 'xl-male',
                       'jumbo-male']
unsupportedSegments : ['live-buy', 'waterman-dock-direct', 'wholesale']
geographicLimits    : ['DMV']
seasonal            : true   (survey stamped July 2026)
```

**Would prevent:** grounding `steam_vs_order` or `where_buy`'s dock-direct factor to it - both
need a live-buy price this source does not contain. `crab-yield` is excluded explicitly because
the open `p_crabs` question is a *yield* question, and this source prices crabs without saying
what meat comes out of one.

---

## 8. Remaining Risks

- **R1 - Repair C is not live.** The published override still serves the defective rationale.
  This is the top open item and needs a governed KCR v2.
- **R2 - Whole blue crab picked-yield is still unsourced.** My ~1/3 lb figure is mine. Repair D
  cannot be done properly without it, and the `knowledge` block's ~9/picker still conflicts with
  `p_crabs.note`'s ~4.8-6.0.
- **R3 - Checks 3 and 4 are at 42 and 53.** Gating either now would start the build red.
- **R4 - `varianceReason` does not exist**, so check 1 cannot distinguish honest variance from
  sloppy variance. Four of its seven findings may be legitimate.
- **R5 - The 21 ANALOGOUS legs still render as "grounded" to runtime.** No relabelling reached
  the UI in this phase; the evidence-strength distinction is still invisible to hosts.
- **R6 - Concentration untouched.** `catering-perperson-2026` now carries 14 of 15 grounded
  decisions - the ratio got *worse*, because the withdrawal removed the one usda-meat claim.
- **R7 - The confidence vocabulary is split.** `'med'` persists in inline playbook provenance
  while KCR proposals are frozen to `'medium'`. Not fixed here (see SS6.2).

---

## 9. Recommendation for Phase 5C.2

**Theme: make the repairs reach the host, then gate one check.**

| Step | Work | Gate |
|---|---|---|
| **5C.2-a** | **Publish a governed KCR v2 for `p_wine.provenance`** carrying the corrected derivation | Closes R1. Also the first end-to-end exercise of the pipeline for a *correction* rather than a new claim - which is the rollback path nobody has driven |
| **5C.2-b** | **Acquire whole blue crab picked-yield** (hours) | Closes R2, unblocks repair D, retires my unsourced 1/3 lb |
| **5C.2-c** | **Add `varianceReason` to the provenance shape** and record reasons for the 4 plausibly-justified check-1 groups | Closes R4; makes check 1 gate-ready |
| **5C.2-d** | **Move `PROPOSED_SOURCE_COVERAGE` into the source registry** and gate **check 2 only** | Check 2 is at 0 findings - it can gate today without starting red. **Gate the check that is already clean.** |
| **5C.2-e** | Decide the runtime display policy for ANALOGOUS before relabelling 21 legs | Closes R5 - and the decision must precede the relabel, or the count drop lands with no explanation |

**Do not** gate checks 3 or 4, expand governance, or create new claims until 5C.2-a lands.
Publishing more claims through a pipeline that cannot yet correct a published one compounds the
problem this phase exists to reduce.

**The single most valuable thing in 5C.2 is 5C.2-a**, and not because of the wine. NGW has proven
it can *publish* governed knowledge. It has never proven it can *fix* published governed
knowledge. Until that path is driven, every artifact in the snapshot is effectively write-once -
and this phase found defects in both of them.
