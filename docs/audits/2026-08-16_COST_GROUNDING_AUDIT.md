# Cost grounding - what is covered, what is not, 2026-08-16

Measured by walking `ALL_PLAYBOOKS[].purchases[]` and classifying each line through
`isGroundedCost` and `classifyClaim` - the same functions the host surface calls -
rather than by counting statuses in source text. Numbers re-measured at the end of
the session, not carried forward from earlier in it.

---

## The headline numbers

```
537   priced lines in `purchases`
206   cost-cited, and ALL 206 resolve in COST_SOURCES (zero unresolvable)
 38   quantity-cited
311   still uncited on either axis
 60   registered cost sources (was 43 at the start of the day)

196 of 429 food-plan rows read as sourced to a host   45.7%
```

Session movement: **63 cost blocks -> 206**, host-visible **22.5% -> 45.7%**.

Host label distribution across the 429 rendered rows:

```
Price directly sourced   151      Planning baseline        193
Directly sourced (both)   27      Practitioner guidance     22
Amount directly sourced   18      Cultural tradition        18
```

Confidence split on the 206 cost blocks: **161 medium, 45 low**. Every `low` is a
declared SUM - a band covering more than one separately-priced family - and says so
in its own claim text.

---

## THE BIGGEST OUTSTANDING PROBLEM IS NOT COVERAGE. IT IS GEOGRAPHY.

Every one of the 206 citations is a NATIONAL band or a single-retailer shelf price.
The engine has no geographic adjustment of any kind: no regional multiplier, no
state or metro cost index, nothing keyed on `venueState`. Grepped for
`costOfLiving`, `regionalMultiplier`, `geoMultiplier`, `regionalCost`, `costIndex`,
`metroMultiplier` - no hits. `RESEARCH_DOCTRINE.md` does not mention geography.

The registered sources THEMSELVES document how large the resulting error is:

| Source | Spread it records |
|---|---|
| `beer-budget-2026` / state data | Illinois $16.43 -> Alaska $33.62 a 24-pack - **105%** |
| `wine-statewide-2026` | Massachusetts $10.97 -> Mississippi $15.51 - **41%** |
| `spirits-budgetbar-2026` | NC control-state prices, "vary by state and exclude tax" |
| `ice-warehouse-2026` | warehouse 10-12c/lb vs convenience 43c/lb - **4x** by channel |
| `catering-perperson-2026` | full-service $75-150, regionally driven |

So the corpus can be simultaneously well-cited and materially wrong for a given
host. A Manhattan or Anchorage host is being shown a national average with no
signal that it does not describe their market.

**The input already exists.** Events carry `venueCity` and `venueState`, and
`wine-statewide-2026` is already a state-level source sitting in the registry
unused for adjustment. What is missing is the multiplier and the honesty line -
either adjust the band or tell the host the band is national.

This is the single highest-value next piece of work on cost, and it is worth more
than the remaining 311 citations combined: a wrong number presented confidently is
the failure mode this whole programme exists to prevent.

---

## Coverage by category

```
beverage    97 of 138   70%    <- the alcohol push landed here
cleanup     27 of  37   73%
food        35 of 173   20%    <- the big remaining seam
rental      14 of  29   48%
decor       22 of  78   28%
logistics   11 of  82   13%    <- the weakest, and mostly not groundable
```

Beverage and cleanup are close to done. Food, decor and logistics carry 252 of the
311 outstanding lines between them.

---

## What was researched and registered today (17 new sources)

All fetched, all with real figures read from the source:

- `ribs-retail-2026`, `chicken-retail-2026` - corroboration for pork and bone-in
  chicken, which had ONE source each and so were non-compliant with the pricing
  policy's `minCorroboration: 2`
- `catering-chefry-2026` - second catering source, same reason
- `ice-retail-2026`, `ice-warehouse-2026` - **28 lines named ice and none could be
  cited**; the only ice source in the registry was a QUANTITY claim (lb/guest)
- `beer-retail-2026`, `beer-budget-2026` - beer had been recorded as ungroundable
  after two 403s, which was a fetch failure written down as an absence of evidence
- `seltzer-retail-2026` - the last drink family with no source
- `bourbon-entry-2026`, `bourbon-shelf-2026` - both spirits sources cover vodka,
  gin, tequila and rum by name and NEITHER carries whiskey or bourbon
- `liquor-shelf-tiers-2026` - bottom shelf $10-30, mid ~$25-50, top $50-200+
- `costco-deli-2026`, `costco-prepared-2026` - prepared sides bought made
- `bls-produce-2026`, `usda-produce-outlook-2026` - per-POUND produce
- `mixers-retail-2026`, `foil-wrap-2026` - both had been called unresearchable

---

## Corrections to earlier findings, made this session

**1. "Finished dishes cannot be grounded" was too broad.** The 2026-08-15 worklist
ruled home-cooked-by-finished-weight ungroundable because USDA publishes nothing for
"the ingredients for coleslaw per finished pound". True for lines pricing INPUTS -
`theCookout p_slaw` is literally "Coleslaw ingredients". But plenty of lines price
THE DISH AS BOUGHT and say so in `where`: `juneteenthCookout p_potatosalad` is
"Potato salad" from Grocery/caterer. Delis sell exactly that, by the pound.
The rule is not about the dish. It is: **a line that buys the dish can cite a
prepared-food price; a line that buys the inputs cannot.** The applier now enforces
this by refusing any line whose text contains "ingredient".

**2. "No published source" often meant "two hosts refused me".** Beer, mixers and
foil were all recorded as unresearchable. All three were behind Walmart and Amazon,
which bot-check a fetcher. Target does not. Three families unblocked by changing
retailer, not by finding new evidence.

**3. A government source is not automatically sufficient - the UNIT is what
matters.** USDA ERS was the obvious produce source and does not fit: it publishes
per-CUP-EQUIVALENT for 2023 and omits collard greens, red potatoes and strawberries
entirely, while the corpus prices per pound. The BLS Average Price series (APU) is
per pound, monthly, current - the same institution class, the right quantity. This
is the corpus's own standing finding restated: a mismatched citation with a
government source attached is the most convincing kind and the worst.

---

## Outstanding: 311 lines, by shape

**Top remaining families:** paper goods 8, decorations 3, collard greens 3, propane
3, candles 4 across two spellings, name tags 2, black-eyed peas 2, corn on the cob 2.
The long tail is genuinely long - most families are now ones and twos.

**Groundable with research still to do:**
- Produce per pound beyond potatoes: collard greens, sweet corn, sweet potatoes,
  strawberries, cabbage. BLS APU covers some commodities; the specific series for
  each still needs locating.
- Propane, candles, name tags, markers - ordinary retail, almost certainly findable
  on a fetchable retailer.

**Blocked by SHAPE, not by evidence:**
- **Paper-goods kits (8+).** These bundle foil, parchment, ziplocks, tablecloths,
  Sterno and serving spoons. Foil is now priced; the rest are not, and a band that
  is a sum needs every addend. Citing one component would be the decoration this
  corpus declines by rule.
- **Ingredient-framed dishes (~10).** Priced as inputs to cook. Correctly refused,
  and permanently so unless a recipe-cost model is authored - which would be a
  derivation and must never be labelled a citation.
- **Two brown-liquor lines.** Both bundle mixers with spirits; mixers are now
  sourced, so these are newly unblocked and simply not yet applied.

**Refused on purpose, not outstanding:** the six cultural slots named by the review
board - `p_watermelon`, `p_libation`, `p_unitycup`, `p_reddrink`, `p_veganwat`,
`p_zawadi`. Verified zero violations. `Kwanzaa p_libation` was correctly skipped by
the mixed-drink pass on its own rule.

---

## Method and its limits

Coverage is measured two ways and they do not agree, on purpose:

- **206 of 537** counts authored purchase lines carrying a grounded cost block.
- **196 of 429** counts what a HOST actually sees on a rendered food plan, which
  applies playbook filters and governed overlays.

Quote the second when describing the product. The first is an inventory number.

`confidence: 'low'` is not a weaker citation - it marks a band that is a SUM of
separately-priced families. All 45 declare the sum in their claim text.
