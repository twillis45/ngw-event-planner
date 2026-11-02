# Money semantics trace

**Status: evidence complete for the four required states.** Depth note: vendor
and food/shopping money are traced to source; lodging cost and cost-sharing are
traced to their authorities but not line-by-line.

---

## 1. The four states, as the repository defines them

| State | Authority | Rule as written |
|---|---|---|
| **Desired** | `budgetFor.js:58 budgetFor`, `:77 budgetTotal`, `:83 budgetBasis`, `:92 hostSetOverallBudget` | What the host said they want to spend. `budgetFor` exists because **five readers had each picked a different rule** for "what is the budget" (its header records the measured damage). |
| **Expected / planning estimate** | `priceLayers.js:67 PRICE_LAYERS`, `:128 priceForLine`, `:232 layerForLine`, `:318 layerCoverage`; `budgetEstimator/`; `playbookFoodPlan` | Ranked provenance: `national(0) → regional(1) → store(2)`. An estimate always knows which layer it came from. |
| **Committed** | `vendorMoney.js:35 vendorIsCommitted` → `workstreams.isVendorBooked`; `:65 vendorCommittedCost` | "Committed = the host is on the hook for it. Booked (Contracted / Deposit Paid / Confirmed / Booked / Paid) means the cost is owed. **'Considering' and 'Quoted' are not money yet — they are shopping.**" |
| **Spent** | `vendorMoney.js:40 vendorPaid`; budget row `actual` (`hostSpending.js:92 rowsActual`) | "**An unpaid deposit is not a partial payment — nothing has left the account.**" `balancePaid` → full cost; `depositPaid` → `depositAmt`; else 0. |

Derived: `vendorMoney.js:48 vendorBalance` = cost − paid, floored at 0;
`:57 vendorOutstanding(event)` = Σ balance over committed vendors only.

---

## 2. The distinctions the redesign must not blur

Each is encoded and each has a recorded reason.

**Quote ≠ committed.** `Considering` and `Quoted` are excluded from every money
total by `vendorIsCommitted`. A redesign that shows "quoted" inside a committed
figure breaks the stated contract.

**Deposit ≠ partially spent.** An unpaid deposit contributes **0** to spent and
the **full** cost to balance. Deliberately conservative.

**Estimate ≠ spent.** Food planning money comes from `playbookFoodPlan` through
`hostSpending`; actual purchases land in budget-row `actual`. They are separate
inputs to the same hub.

**A guessed headcount must not become money.** `hostSpending.js` gates the food
contribution behind `hasRealCount` (`guestCount > 0 || guestEstimate > 0 ||
guests[].length || guestCountResolved(ev).resolved`): "that guess is fine for a
labeled preview, but it must NOT become budget money."

**No kitchen, no groceries.** Measured on the Santa Fe 80th: **$333 of
groceries budgeted for a kitchen the app had already said does not exist**,
because the food sheet honoured the kitchen gate and the budget did not. Fixed.
Deliberately *not* replaced with a restaurant figure, because "all 226 cost
citations in the corpus price GROCERY lines."

**One vocabulary.** `vendorMoney.js` exists because App.js used
`STAGES.indexOf(status) >= 2` with a list lacking `Booked` and `Paid` — both
live synonyms V2 writes. Those vendors returned `-1` → not committed → **"money
vanished from the ledger because two files disagreed on a word."**

---

## 3. Provenance for prices

`PRICE_LAYERS` ranks national/regional/store, `layerForLine` resolves which
applies, `layerCoverage`/`coverageNote` report how much of a list is covered,
and `priceVintage.js` carries age. `storeKey` (`priceLayers.js:87`) is "THE ONE
KEY" matching store prices back to plan lines — written as a function because
"two copies of a key is the same defect as two copies of a fact."

**Redesign requirement:** a price shown without its layer and vintage is a
downgrade in truthfulness, not a visual simplification.

---

## 4. Known weaknesses

| Weakness | Evidence | Severity |
|---|---|---|
| `guestEstimate` read raw by 38 modules vs 3 via `guestCountFor`; `guestEstimateSource` used in 1 file | greps | **High** — money derived from an invented count can reach a caterer (`guestCountFor.js` header documents exactly this: "for about 40 guests" in an outward draft) |
| Food money depends on `hasRealCount`, but the 38 raw readers do not share that gate | greps | Medium |
| Cost sharing (`costSharing.js`) and lodging cost traced to authority only | not line-traced | Low (flagged, not resolved) |

---

## 5. Verdict against brief rule "no parallel spending math"

**Currently honoured at the hub.** `hostSpending` explicitly reuses the same
`playbookFoodPlan` the food panel renders — "single source, no parallel math" —
and reads `budgetTotal` rather than re-deriving it. The risk is not that
parallel math exists today; it is that a redesign introduces it by computing a
"simple total" in a component. **Invariant #5 covers this.**
