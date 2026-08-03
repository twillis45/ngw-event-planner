# The Crab Ownership Model

**Date:** 2026-08-01. ASCII-only.
**Purpose:** so a future admin knows *change this field because it changes X*, never
*change this field because it exists*.

Crabs are an outlier and generic food logic does not describe them. A steak is bought by
the pound at a price per pound. **A blue crab is bought by the bushel** - a real,
indivisible container whose crab count changes with crab size - and the price is a ladder
per size and grade. Every governance mistake this programme has made on the crab line
came from applying per-pound thinking to per-bushel economics.

---

# 1. The chain

```
guest count
     |                      guestCountResolved -> proteinGuests -> _qtyGuests
     |                      (PICKERS, not heads: kids and non-pickers removed)
     v
serving model               crabServing.js  CRAB_SERVING_GUIDE.bySize[size]
     |                      withSides [low,high] . mainOnly [low,high] . perBushel [low,high]
     |                      crabsPerPicker() takes the TOP of the range
     v
total crabs needed          ceil(pickers x crabsPerPicker)
     |
     v
bushel / dozen conversion   resolveBulkPurchase()
     |                      <=12 crabs        -> 1 dozen
     |                      <=24 crabs        -> 2 dozen
     |                      <=perBushel/2     -> 1 half bushel
     |                      otherwise         -> ceil(total / perBushel) bushels
     v
price ladder                priceLadder[ladderKey][perDz | per2Dz | perHalfBushel | perBushel]
     |                      ladderKey comes from the host's crab_size DECISION
     v
host cost                   bulkRecommendation { qty, unit, unitLabel, price }
```

Two inputs the host controls sit outside this chain and change the answer: the **crab
size decision** (`crab_size`, default Large Males) picks the ladder row, and the **picker
count** decides how many crabs are needed at all.

---

# 2. Field by field: what it does, and what it does NOT do

| Field | Role | Governable | Why |
|---|---|---|---|
| `servingGuide.bySize[size].withSides` | crabs one picker eats when there are sides - **the crab-feast default** | **YES** | drives total crabs, therefore the bushel count and the price |
| `servingGuide.bySize[size].mainOnly` | crabs per picker when crabs are the whole meal | **YES** | same path, other branch |
| `servingGuide.bySize[size].perBushel` | crabs in a bushel of this size | **YES** | the divisor that turns crabs into bushels |
| `priceLadder[key].perDz / per2Dz / perHalfBushel / perBushel` | dealer price for each buying unit | **YES** | the multiplier on the chosen unit |
| `priceLadder[key].approxPerBushel` | fallback bushel count when the sourced table is silent on a size | YES | only reached for an unknown `servingKey` |
| `priceLadder[key].servingKey` | which serving row this ladder row maps to | YES | mis-set, it prices XL crabs off medium servings |
| **`qtyPerGuest`** | a per-guest rate | **NO - DELEGATED** | **a per-guest rate cannot move a bushel.** Measured in 5E: publishing `0.5` moved the stated rate and left the count at 6 dozen |
| **`qtyFlat`** | a flat count | **NO - DELEGATED** | same reason |
| **`unitCostRange`** | flat $/unit | **NO - DELEGATED** | the ladder prices this line; a flat range is read by nothing |
| `provenance` | the "Sourced -" caption | YES - **DISPLAY ONLY** | changes what a host reads, never what they buy |

The publish gate **refuses** the three delegated fields and names the alternative. That
is not a limitation to work around; it is the contract. `blockedMessage()` sends the
admin to `priceLadder` / `servingGuide`.

---

# 3. Thresholds are the whole point

The conversion step is why crabs resist generic logic. Between 12 and 13 crabs the
purchase unit changes shape, and between `perBushel/2` and `perBushel/2 + 1` it changes
again. A 5% change in crabs-per-picker can change nothing at all, or it can add a whole
bushel.

Measured on an 18-guest Crab Feast, Large Males:

| Governed change | Total crabs | Purchase | Price |
|---|---|---|---|
| authored (`withSides` 4, `perBushel` 72) | 84 | 2 full bushels | $690 |
| `withSides` -> 3 | 63 | **1 full bushel** | **$345** |
| `perBushel` -> 30 | 84 | **3 full bushels** | **$1,035** |
| `perBushel` -> 48 | 84 | 2 full bushels | $690 (unchanged - 84/48 and 84/72 both ceil to 2) |

**The fourth row is the lesson.** A real, sourced correction can be published, be
correct, and move nothing - because the ceiling absorbed it. That is not fake governance;
it is threshold economics. Never conclude a wire is dead from one value: the 5E.4 contract
test uses values that could not possibly be absorbed.

---

# 4. Size is two different vocabularies

They are deliberately separate and mapped by `servingKey`:

| Ladder key (a DEALER GRADE) | -> servingKey (a SIZE) | inches |
|---|---|---|
| `medium` | `medium` | 5-5.5" |
| `largeFemale`, `largeMale` | `large` | 5.5-6" |
| `xlFemale`, `xlMale` | `xl` | 6-6.5" |
| `jumboMale` | `jumbo` | 6-6.75" |

Female and male crabs at the same grade cost very differently and eat the same. Merging
the vocabularies would force one to be wrong.

---

# 5. Honesty already recorded in the data - do not paper over it

- **`xl` is `tier: 'interpolated'`.** No vendor publishes an extra-large per-person
  figure. We filled the gap and the file says so. Backfilling it means either finding a
  publisher that does not appear to exist, or inventing a number behind a citation.
- **`large.perBushelDissent: [48, 60]`.** Harbour House puts a large-crab bushel a full
  tier below the 72 the shopping list plans against. Unresolved. **This is the highest-value
  open research question on the crab line**, because section 3 shows the bushel count is the
  input with the sharpest threshold behaviour.
- **`jumboMale` has no `perBushel`.** It is sold by the dozen. A blank is not a zero, and
  the ladder editor deletes the key rather than writing `0` - a `0` would read as a free
  bushel.
- **Two DMV vendors publish nothing** (Jessie Taylor, Captain Billy's). "They would not
  quote" is a finding. A number attributed to them is not.

---

# 6. Surfaces that must agree

Both read the ladder, and until 5E.4 only one was governed:

| Surface | Reads | Governed |
|---|---|---|
| shopping list `bulkRecommendation` | `governedPurchase(p_crabs).priceLadder` | since 5E.2 |
| hostv2 crab sheet reference prices ("male $72") | `crabPriceLadder()` | **since 5E.4** |

Before the fix, a published ladder correction moved the shopping list and left the crab
sheet on the authored price: two host-visible prices for the costliest item, disagreeing,
both authoritative. Pinned by a cross-surface test.

---

# 7. For the next admin

**To make a crab feast cost more or less per crab** -> `priceLadder`, the row matching the
host's chosen grade.

**To change how many crabs a person eats, or how many fit a bushel** -> `servingGuide`,
the row matching that grade's `servingKey`. This is what moves the COUNT.

**To fix the sentence under the number** -> `provenance`.

**Anything else on `p_crabs` is calculated.** If the console says `(engine-owned)`, that
is the system telling you the truth, not blocking you.
