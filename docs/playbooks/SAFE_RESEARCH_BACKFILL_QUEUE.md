# Safe Research Backfill Queue

**Date:** 2026-08-01. ASCII-only. **REVALIDATED 2026-08-01 (Phase 5E.4).**
**Purpose:** what NGW may safely research and publish into the governed corpus, in what
order, and what it must not touch yet.

> **5E.4 revalidation - three corrections to this document's own figures.**
>
> 1. **Tier 1 is 237, not 248.** The original count was taken before the ownership
>    contract covered channel-priced proteins and before scoping to lines that actually
>    RENDER. Seven purchases are now delegated to the sourcing-price model and four never
>    reach the shopping list. The dropped 11 were never safely backfillable; the number
>    was wrong in the safe direction, which is still wrong.
> 2. **Tier 1's premise was only half true when written.** It claimed the 248 had a
>    verified consumer. At that moment the entire SUPPLY half of the shopping list was
>    ungoverned - 396 dead field/purchase pairs - so a large share of Tier 1 would have
>    published and changed nothing. Fixed in 5E.4; the claim is now true and enforced by
>    `runtimeGovernanceContract.test.js`.
> 3. **Ordering is confirmed correct, for a reason worth stating.** The queue is ordered
>    by evidence PRIMITIVE, then runtime importance, then provider availability, then
>    freshness risk. It is explicitly NOT ordered by count or by ease. Jobs 1-5 below
>    each ground ~15-39 lines from one verified fact; a per-line sweep would re-research
>    the same figure thirty times and produce thirty citations that can never be
>    expired together.
>
> **Blocking dependency added:** provider governance (`PROVIDER_GOVERNANCE_MODEL.md`)
> must land before Tier 1 begins. The Cost and Quantity axes have 3 sources each and
> none of them grounded, and there is nowhere yet to record what a source may claim.
> Starting research first is how the Cameron's fabrication happened once already.

---

# 0. What "safe" means here

Not "true". Truth is the researcher's job. **Safe** is a property of the FIELD, and it is
the property that decides whether a wrong answer is survivable:

| Test | Question |
|---|---|
| **Consumer** | Does a verified runtime consumer read this field? If not, publishing mints authority that changes nothing. |
| **Blast radius** | How much of a host's plan moves if the value is wrong? One line, or the costliest item on the list? |
| **Detectability** | Would a wrong value be VISIBLE on the surface, or would it hide inside an engine? |
| **Reversibility** | Can rollback restore the prior value without a code change? |

A field passing all four is Tier 1. Failing **Consumer** puts it in Tier 3 regardless of
how good the research is - that is the rule 5E.2 established and 5E.3 had to enforce
against its own registry.

---

# 1. Corpus census (measured 2026-08-01, not estimated)

```
Playbooks                                              39
Purchase lines                                        537
  no provenance at all                368  (69%)
  legacy STRING provenance             21  (4%)
  structured provenance               148  (28%)
Engine-DELEGATED purchase fields (not value-backfillable) 1  (p_crabs)
```

Provenance tiers actually present:

```
trade-heuristic 53 | researched 38 | cultural-tradition 17 | estimate 12
norm 8 | host-coaching 7 | heuristic 3 | consensus 3 | culture-bearer 3
matriarch 2 | community 1 | primary 1
```

**The headline: 69% of the corpus carries no provenance.** That is the backfill target,
and it is large enough that the ORDER matters more than the volume.

---

# 2. Tier 1 - safe to backfill now

**237 purchase lines** qualify (revalidated 5E.4; was 248): `essential` AND costed AND quantified AND not
engine-delegated.

| Property | Status |
|---|---|
| Consumer | `governedPurchase()` resolves `qtyPerGuest`, `qtyFlat`, `unitCostRange`, `provenance` - on FOOD **and SUPPLY** rows since 5E.4, enforced against output by `runtimeGovernanceContract.test.js` |
| Blast radius | ONE shopping line |
| Detectability | the number and its basis both render on the line |
| Reversibility | rollback proven (5D, browser-driven) |

**Proven end to end.** `p_oldbay.qtyPerGuest` 0.05 -> 0.08 travelled correction ->
review -> publish -> export -> bake -> hostv2, moving the host's line from
`1.1 lbs / $4-$10` to `1.7 lbs / $7-$15` with the playbook file unchanged.

Distribution of the 237 (top of the list):

```
The Cookout 16 | Dinner Party 13 | Fish Fry 12 | Juneteenth Cookout 12
Crab Feast 11 | Engagement Party 9 | Retirement Party 8 | Crawfish Boil 8
```

## 2.1 Order within Tier 1

Not by playbook. **By evidence primitive**, because one verified primitive grounds many
lines at once and a per-line sweep would re-research the same fact 30 times:

| # | Primitive | Grounds | Why first |
|---|---|---|---|
| 1 | Non-alcoholic servings per guest per hour | every playbook's soft-drink + ice lines | already partly grounded (`bar-provision-2026` on `p_softdrinks`); extending it is cheap |
| 2 | Ice per guest for an outdoor summer event | ~15 outdoor playbooks | `p_ice` is flagged in-repo as "COMMONLY UNDER-BOUGHT" with no source behind the 2 lb figure |
| 3 | Protein lb per guest, by service style | every food playbook | the single most-repeated unsourced number in the corpus |
| 4 | Sides lb per guest (buffet vs plated) | every food playbook | same shape, same sources, do it in the same pass |
| 5 | Disposable place-settings per guest | ~30 playbooks | cheap to verify, high line count |

**Rule:** a primitive lands in the evidence registry once and the lines cite it. Do not
publish 30 corrections carrying 30 copies of the same claim.

---

# 3. Tier 2 - safe only through the typed editor, and only with a named source

The **engine-governing** fields. Both have typed row editors as of 5E.3 and both are
proven to move host output.

| Field | Moves | Measured |
|---|---|---|
| `p_crabs.priceLadder` | the price of the bushel a host buys | 690 -> 1998 (5E.2 wire test) |
| `p_crabs.servingGuide` | the COUNT - crabs per picker, crabs per bushel | 2 bushels/$690 -> 1 bushel/$345 at 3 crabs per picker |

**Why not Tier 1.** Blast radius is the whole crab line - the costliest item any NGW host
buys - and the value is a nested object where a partial edit is silently discarded by the
engine rather than rejected. Both risks are now handled (row editors keep untouched sizes
verbatim; `validate` mirrors the engine's own `usableRow` check), but the class stays
Tier 2 because a wrong number here is worth hundreds of dollars, not five.

**Preconditions before publishing any Tier 2 correction:**

1. A NAMED dealer or guide, with a capture date. Not a recollection of a price.
2. The size row stated explicitly - `largeMale` is not `large` is not `xlMale`.
3. The correction reviewed by someone who did not research it. The gate enforces this;
   do not work around it.

**Live Tier 2 candidate, already documented in-repo:** `crabServing.bySize.large` records
`perBushelDissent: [48, 60]` - Harbour House puts a large-crab bushel a full tier below
the 72 the shopping list plans against. The dissent has sat unresolved in the data. It is
the correct first Tier 2 job because the research question is already written down.

---

# 4. Tier 3 - do NOT backfill

## 4.1 Engine-delegated fields

`p_crabs.qtyPerGuest`, `p_crabs.qtyFlat`, `p_crabs.unitCostRange`, and - added 5E.4 -
`unitCostRange` on the four **channel-priced proteins** (`p_protein`, `p_ribs`,
`p_chicken`, `p_burgers_dogs`), which price themselves per channel from `sourcingPrices`.

The crab engine quantises to real buying units. A governed per-guest rate moves the
stated rate and leaves the count, putting two disagreeing numbers on one row, both
wearing the authority of governance. **The publish gate refuses these.** Research
belongs in `priceLadder` / `servingGuide` (Tier 2) instead.

## 4.2 Fields with no runtime consumer

Anything on a `p_*` path outside `RUNTIME_CONSUMED_FIELDS`. `buyingUnits` and
`marketComps` are real, useful, in-repo data that **nothing reads**. Publishing a
correction to them would be indistinguishable from progress and would change nothing a
host sees.

**This tier is not stable - it is a work list.** A field belongs in 4.2 only until
someone wires its consumer. `servingGuide` sat in the governed set from 5E.2 with no
consumer behind it and was only found in 5E.3 by testing OUTPUT rather than reading
declarations. Before adding any field to the governed set, run the absurd-value test:
publish a value that could not possibly leave output unchanged, and check that it does
not.

## 4.3 Claims where the honest answer is "no source exists"

`crabServing.bySize.xl` is marked `tier: 'interpolated'` - **no vendor publishes an
extra-large per-person figure.** The row exists because we filled the gap ourselves, and
the file says so.

Backfilling this means either finding a publisher that does not appear to exist, or
inventing a number behind a citation. **The second is the failure mode this entire
programme was built to prevent.** Leave it interpolated and keep saying so.

Same rule for the two DMV vendors recorded as `tier: 'silent'` (Jessie Taylor, Captain
Billy's): they publish nothing. "We called and they would not quote" is a finding worth
recording. A number attributed to them is not.

## 4.4 Legacy string provenance (21 lines)

Upgrading these to structured blocks is a MIGRATION, not research. It is safe work, but
it should not be mixed into a research pass - a schema change and a claim change arriving
in the same correction makes both unreviewable.

---

# 5. The queue

| # | Job | Tier | Lines moved |
|---|---|---|---|
| 1 | Non-alcoholic servings per guest per hour | 1 | ~39 |
| 2 | Ice per guest, outdoor summer | 1 | ~15 |
| 3 | Protein lb per guest by service style | 1 | ~35 |
| 4 | Sides lb per guest, buffet vs plated | 1 | ~35 |
| 5 | Disposable place-settings per guest | 1 | ~30 |
| 6 | Resolve the large-crab bushel dissent (48-60 vs 72) | 2 | 1 (highest value) |
| 7 | Re-verify Captain White's 2026 ladder, all six sizes | 2 | 1 |
| 8 | Migrate 21 legacy string provenance blocks | - | 21 |
| - | `xl` serving row, `buyingUnits`, `marketComps` | 3 | DO NOT |

---

# 6. Standing rules

1. **No consumer, no publish.** Verify by absurd-value test against OUTPUT, never by
   reading a registry - two declarations agreeing is consistency, not consumption.
2. **One primitive, many citations.** Never copy a claim into 30 corrections.
3. **A correction states its defect.** "Updated" is not a reason.
4. **Silence is a finding.** Record that a vendor publishes nothing; never fill the gap.
5. **Interpolated stays labelled.** A gap we filled ourselves is never promoted to cited.
6. **Schema and claim never travel together.** Migrations are their own pass.
