# The grounding worklist - measured, 2026-08-15

Produced by walking every `purchases` line in all 39 playbooks through
`classifyClaim` - the same function the host surface calls - rather than by
counting statuses in source text. Method note at the bottom.

---

## The four numbers

Re-measured after the 2026-08-15 grounding push (`013a93f6` .. `1b831bde`):

```
537   priced lines in `purchases`
121   read "Directly sourced" to a host          22.5%   (was 54)
183   spanning a discount and a premium channel, NOT sourced
      of those:
       16   slot holds a CULTURAL claim    protected
       42   slot holds a QUANTITY claim    protected
      125   slot is free - but:
             42   multi-component KIT        ungroundable, shape 1
             10   home-cooked BY WEIGHT      ungroundable, shape 2
             73   everything else            <- the real remainder
```

**QUOTE 22.5%, NOT 17.9%.** `grounding:audit` counts `verificationStatus === 'cited'`
and reports 17.9%. The host label also turns on for `researched` lines whose sources
resolve in a real registry, so what a HOST actually sees is 121 of 537. Both are true;
only one describes the product.

**Of the 73 remaining, perhaps 25-30 are realistically groundable** - desserts, beer,
partial tableware, buffet trays. The rest are the no-source commodity class.

---

## The worklist: 175 spanning, unsourced lines with a free slot

The channel-span test earns its place here. Every wrong band this pass has found
shares one cause - the item's own `where` names a DISCOUNT channel and a PREMIUM
one, and the authored range covers only one of them, so whichever the host picks
the number is wrong for half of them. It is greppable and it PREDICTS: `p_apps`,
`p_coffee`, `p_bread` and `p_signage` were all flagged from `where` alone before
a source was opened, and all four were wrong.

Priority order below is by RAW spanning-unsourced count and has NOT been adjusted
for slot occupancy — `Juneteenth Cookout` in particular is mostly blocked (its red
foods, half-smokes and red drink all carry cultural claims), so it is a poor first
target despite topping the list. Re-rank by free-slot count before working it.

| Lines | Playbook | Priced |
|---:|---|---:|
| 14 | Juneteenth Cookout | 25 |
| 12 | Engagement Party | 17 |
| 12 | Holiday Party | 20 |
| 10 | Retirement Party | 18 |
| 10 | Vow Renewal | 20 |
| 9 | Gender Reveal | 15 |
| 9 | Kwanzaa Gathering | 17 |
| 8 | Baby Shower | 12 |
| 8 | Bridal Shower | 15 |
| 7 | Dinner Party | 17 |
| 7 | Birthday | 12 |
| 7 | Graduation | 13 |

---

## The blocker: 40 spanning lines have an OCCUPIED slot

A purchase line makes TWO claims - how much to buy, and what it costs - and has
ONE `provenance` slot. Among the 215 spanning-unsourced lines, **40 already have
that slot occupied**: 24 by a QUANTITY claim (`~0.5 lb grazing per guest`,
`2-4 oz per person`, usually `tier:'trade-heuristic'`), and **16 by a CULTURAL
claim**.

**The cultural 16 are the ones to be most careful with, and they are not a schema
problem — they are a doctrine problem.** `juneteenthCookout` carries
`tier:'cultural-tradition'` blocks with insider-verified claims and real
`sufficientWhen` lines: half-smokes anchored to Ben's Chili Bowl as the DC
sausage; the red drink traced to the kola nut and hibiscus carried through the
diaspora; watermelon documented as an early Juneteenth red food "served with
dignity, a tradition, not a stereotype". The roster's own discipline for
culturally-specific playbooks says author render-first from insider experts and
attach no fabricated citations. **Overwriting one of those slots with a per-pound
grocery price to move a coverage counter would delete cultural scholarship for a
percentage point.** Do not do it. If those prices are ever wanted, they need the
second slot, not the first.

The QUANTITY 24 are the milder case, but the same rule applies. Found live on
`bacheloretteParty p_apps`, which looked like a free citation - same item type as
anniversary's charcuterie board, same unit, sources already registered - and was
left alone because taking it would have deleted an authored `~0.5 lb grazing per
guest` claim to move a counter.

**This is the same two-axis problem that produced the `directCitationEligible`
fix on 2026-08-14**, where a price cited to `COST_SOURCES` was being judged
against the QUANTITY registry and rendered "Needs confirmation". That one was a
predicate bug. This one is in the data model, and it is a schema question rather
than a research one: either a line carries `provenance` plus `costProvenance` as
separate blocks (the pattern `costFactorProvenance` already uses on decisions),
or provenance becomes a list.

**Until that is decided, 40 of the 215 spanning lines are off the table, and the
worklist is 175.** The same occupancy exists outside the spanning set too, so the
corpus-wide ceiling is below 537 by more than these 40.

---

## Three shapes of ungroundable, all found by trying

1. **NO PUBLISHED SOURCE.** Candles, napkins, cleaning supplies, A/V gear. Beer returns
   403 from both candidate sources. Evidence is scattered retail listings; summing them
   produces a decoration.
2. **MULTI-COMPONENT KIT (42 lines).** Nobody sells a "cleanup kit" or a "signage kit",
   so any band is a SUM of separately-priced parts. Where the components are genuinely
   priced this is still citable, but only at `confidence: 'low'` with the sum declared -
   which is exactly how the cleanup and signage families were handled.
3. **HOME-COOKED BY FINISHED WEIGHT (10 lines).** The sharpest of the three, because it
   has an authoritative source that does not fit. The corpus prices INGREDIENTS to cook
   at home: `crabFeast p_sides` is "Cabbage/carrot for slaw, potatoes for salad";
   `theCookout p_potato_salad` is "Potato salad ingredients". USDA ERS prices raw
   commodities individually ($0.31/lb potatoes, $0.32/lb watermelon) and publishes
   nothing for "the ingredients for coleslaw per finished pound". Citing the USDA range
   there would be a decoration WITH A GOVERNMENT SOURCE ATTACHED - the most convincing
   kind, and the worst.

---

## The class boundary: not everything left is groundable

Anniversary stopped at 12 of 18 sourced, and the remaining six were not a
backlog - they were a class:

```
p_beer  p_candles  p_napkins  p_paper  p_clean  p_avgear
```

Every item that COULD be grounded had a real industry source behind it - The
Knot, Zola, the International Charcuterie Association, bakery and florist
pricing guides, party-rental catalogues. These six have none: beer returns 403
from both candidates, and the rest are grocery and hardware commodities or a
four-component electronics kit whose only evidence is scattered retail listings.
Summing four listings into a "kit" price produces a decoration, not a citation.

So the ceiling is lower again than 483. **Event-industry items are groundable;
household commodities largely are not**, and that should be stated before anyone
reads the coverage percentage as a target to be driven to 100%.

---

## What made this fast, and what it cost

**Batch by SOURCE FAMILY, not by playbook.** Research a family once, apply it everywhere
it legitimately fits, in one pass. That took the rate from ~4 items an hour to 32 in a
single pass, and no verification was dropped for it - the engine suite still runs per
batch, every touched file is parse-checked, and the e2e matrix still runs on the built
bundle before any push.

**The applier enforces what was learned rather than trusting memory.** It refuses any
slot already holding a `claim`, preserves an existing `note`, rejects apostrophes in
authored text, refuses to write a double-escape, cross-checks `confidence` against the
prose, and supports a CONFIRMATION - a citation where the band does not move, which is
the common case rather than the edge.

Two of those rules exist because the tool caught what scanning missed:
`retirementParty p_wine` and `housewarming p_cleanup` both read as free to a
700-character window scan and hold real quantity claims under brace-matching.

---

## Three reuses declined, and why they matter

Reuse is the cheap half of this work - `bacheloretteParty p_bubbly` was cited
with ZERO new registry entries, from the champagne/sparkling pair already
registered for wedding and anniversary, and its band still moved. But reuse is
only legitimate when the source's CLAIM covers the item:

| Source | Looks like it covers | Actually |
|---|---|---|
| `reddy-ice-2026` | ice price | a QUANTITY claim (lb/guest) |
| `jollychef-disposables-2026` | paper goods price | a QUANTITY claim (counts/guest) |
| `selfsupplied-bar-2026` | beer price | CORKAGE ($1.50-3/beer), not retail |

Each would have passed every gate in the repo. None of them prices the thing.

---

## Method

Walked `ALL_PLAYBOOKS[].purchases[]` for `unitCostRange`, classified each
`provenance` through `classifyClaim`, and tested `where` against a
discount/premium channel vocabulary.

**537 here vs 541 in `grounding:audit`.** The audit walks nested structures
(including `alternatives`) and this walks `purchases` only. The four-line gap is
not reconciled and the numbers above should be read as "of the 537 purchase
lines", not "of everything priced".
