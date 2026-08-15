# The grounding worklist - measured, 2026-08-15

Produced by walking every `purchases` line in all 39 playbooks through
`classifyClaim` - the same function the host surface calls - rather than by
counting statuses in source text. Method note at the bottom.

---

## The four numbers

```
537   priced lines in `purchases`
 54   already read "Directly sourced" to a host          10%
236   have a `where` that SPANS a discount and a premium channel
206   of those are NOT yet sourced                        <- the worklist
 54   cannot be cited at all without a schema change      <- the blocker
```

**"Directly sourced" is 10%, not the 4.4% the audit reports as `cited`.** Both are
true and they measure different things: `grounding:audit` counts
`verificationStatus === 'cited'`, while the host label also turns on for
`researched` lines whose sources resolve in a real registry. The number that
describes what a HOST sees is 54 of 537.

---

## The worklist: 206 spanning, unsourced lines

The channel-span test earns its place here. Every wrong band this pass has found
shares one cause - the item's own `where` names a DISCOUNT channel and a PREMIUM
one, and the authored range covers only one of them, so whichever the host picks
the number is wrong for half of them. It is greppable and it PREDICTS: `p_apps`,
`p_coffee`, `p_bread` and `p_signage` were all flagged from `where` alone before
a source was opened, and all four were wrong.

Priority order by count of spanning-unsourced lines:

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

## The blocker: 54 lines cannot be cited at all

A purchase line makes TWO claims - how much to buy, and what it costs - and has
ONE `provenance` slot. On 54 lines that slot already holds a legitimate QUANTITY
claim (`~0.5 lb grazing per guest`, `~1.5 lb ice per guest`, `2-4 oz per person`),
usually at `tier:'trade-heuristic'` with `established-consensus`.

Citing the PRICE on those lines means overwriting the quantity claim. Found live
on `bacheloretteParty p_apps`, which looked like a free citation - same item type
as anniversary's charcuterie board, same unit, sources already registered - and
was left alone because taking it would have deleted authored knowledge to move a
counter.

**This is the same two-axis problem that produced the `directCitationEligible`
fix on 2026-08-14**, where a price cited to `COST_SOURCES` was being judged
against the QUANTITY registry and rendered "Needs confirmation". That one was a
predicate bug. This one is in the data model, and it is a schema question rather
than a research one: either a line carries `provenance` plus `costProvenance` as
separate blocks (the pattern `costFactorProvenance` already uses on decisions),
or provenance becomes a list.

**Until that is decided, the practical ceiling is 537 - 54 = 483 citable lines.**

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
