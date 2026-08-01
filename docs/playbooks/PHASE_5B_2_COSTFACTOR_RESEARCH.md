# Phase 5B-2 -- CostFactor Research Report

**Date:** 2026-08-01 - **READ-ONLY.** No code modified, no KCR created, no claim upgraded.

## Scope statement -- read this before the findings

I can assess **eligibility against the sources NGW already holds**. I cannot conduct new
market research, and the doctrine forbids inventing evidence. So "needs more research" below
means *"no source in the registry supports this, and acquiring one is an analyst task"* -- not
*"I looked and failed."*

---

## 1. Executive Recommendation

# **EXECUTE on 4 of 30. Commission research for 5. Reject or defer 21.**

The decisive finding is a **pattern**, not a count. The 16 costFactor decisions that are
*already grounded* share one shape, and it is narrow:

> `catering-perperson-2026` grounds **service-tier / labor-tier** ratios --
> caterer vs host-cooks vs potluck vs restaurant -- because the source states absolute
> per-person rates for three tiers (full-service $75-150, buffet-with-servers $45-85,
> drop-off $15-35). **Ratios between those tiers are derivable from the source.**
>
> `usda-meat-2026` grounds **protein-tier** ratios, because it states retail prices per cut.

Measured against that pattern, the 30 ungrounded decisions split cleanly:

| Group | Count | Status |
|---|---|---|
| **Service/labor-tier ratios** -- same shape as the 16 already grounded | **4** | **PUBLISH CANDIDATE** |
| Mixed concept -- one option is service-tier, others are menu-type | 1 | Needs decomposition first |
| Seafood / finfish pricing | 6 | **No source** -- USDA covers meat, not fish |
| Beverage cost ratios | 5 | **No cost source exists for beverages at all** |
| Menu / ingredient composition | 9 | Not a commodity-price claim |
| Format / activity / scope | 5 | **Category B judgement -- reject outright** |

**The four candidates are eligible because a structurally identical decision is already
grounded to the same source.** That is the strongest evidence available short of new research:
the precedent exists, was reviewed, and shipped.

---

## 2. Top Publish Candidates

### C1 -- Kwanzaa Gathering / `food` -- **strongest**

```
Claim      : Host cooks the spread = 1.5
             Host cooks mains, guests bring sides + desserts = 1.2
             Source key dishes from Black-owned cooks/caterers (Ujamaa) = 1.4
Source     : catering-perperson-2026
Confidence : medium
Freshness  : annual (2026 catering rates)
Recommend  : PUBLISH CANDIDATE
```

**Why eligible:** structurally identical to **Juneteenth Cookout / `sourcing`**, which is
already grounded to this exact source with the same three-way shape
(*Black-owned caterers 1.35 / host cooks 0.9 / potluck*). Same event family, same cultural
sourcing consideration, same labor-tier logic. The precedent is not analogous -- it is the
same decision expressed for a different occasion.

**Note the direction check:** Kwanzaa prices host-cooks *above* caterer (1.5 vs 1.4) while
Juneteenth prices it *below* (0.9 vs 1.35). That inversion must be explained or corrected
during research -- it is the one thing that could disqualify C1.

### C2 -- Pupusa Gathering / `make_vs_order`

```
Claim      : Make all from scratch (comal day) = 0.75
             Order from a pupuseria = 1.3
Source     : catering-perperson-2026
Confidence : medium
Freshness  : annual
Recommend  : PUBLISH CANDIDATE
```

**Why eligible:** a two-tier DIY-vs-order ratio. Directly analogous to **Game Night /
`food_model`** (potluck 0.5 vs host-provided) and **Card Party / `food_model`** (host spread
1.3 vs potluck 0.45), both grounded to this source. A pupuseria is a drop-off/prepared-food
vendor -- the tier the source prices at $15-35.

### C3 -- Crawfish Boil / `cookmethod`

```
Claim      : Order it boiled by the pound (pickup) = 1.6
Source     : catering-perperson-2026
Confidence : low-to-medium
Freshness  : annual
Recommend  : PUBLISH CANDIDATE (with the 1.6 verified)
```

**Why eligible:** order-vs-DIY labor tier, the same axis the source prices. **Caveat:** 1.6 is
the highest multiplier in the whole set and sits above every grounded analogue (max 1.5). The
ratio needs verification even though the *kind* of claim is supported.

### C4 -- Crab Feast / `steam_vs_order`

```
Claim      : Steam them myself = 0.85
             Buy live, steam in batches = 0.85
Source     : catering-perperson-2026 (+ dmv-crab-2026 for the commodity)
Confidence : medium
Freshness  : annual (catering) / seasonal (crab)
Recommend  : PUBLISH CANDIDATE
```

**Why eligible:** DIY-vs-prepared labor tier. **Flag:** both options carry the identical
factor 0.85, which makes the decision cost-neutral between them. Either that is correct (and
the decision is about effort, not money) or one value is wrong. Research must resolve which --
publishing an unexamined duplicate would ground a possible authoring error.

---

## 3. Needs More Research -- 5

| Decision | Claim | Gap |
|---|---|---|
| Day Party / `food` | Food truck 1.4, Caterer drop-off 1.3, Light bites 0.7 | **Mixed concept.** Drop-off is service-tier (supported); *food truck* is a vendor model the source does not price. Decompose before governing. |
| Graduation / `food_menu` | BBQ/grill 1.1, Drop-off catering 1.3, Taco bar 0.95 | Same mix: one service-tier option among menu-type options. Note this playbook **already has a grounded `food_style`** -- this second decision may be redundant. |
| Get-Together / `menu` | Chicken+ribs 1.15, Mixed grill 1.2, Seafood boil 1.4 | Protein-tier -- the `usda-meat-2026` shape -- but **seafood is not in USDA meat data**. Partial support only. |
| Crab Feast / `where_buy` | Jessie Taylor 1.0, Seafood market 1.05, Waterman/dock 0.85 | `dmv-crab-2026` surveyed four **retail crab houses**. It does not price waterman/dock-direct, so the 0.85 is unsupported by the very source that looks closest. |
| Low Country Boil / `addins` | Blue crab 1.2, Crawfish 1.2, Clams/mussels 1.15 | Needs seafood pricing NGW does not have. `dmv-crab-2026` covers blue crab only, and only in the DMV. |

---

## 4. Rejected Claims

| Decision(s) | Claim type | Reason rejected |
|---|---|---|
| Anniversary `format`, Graduation `format`, Bachelor Party `activity`, Kwanzaa `occasion`, Ethiopian `scope` | Format / activity / scope | **Category B -- planning judgement.** "Intimate seated dinner vs restaurant private room" is a choice about the event, not a commodity with a market price. |
| The Cookout `drinks`, Fish Fry `drinks`, Crab Feast `drinks`, Crawfish `drinks`, Low Country `drinks` | Beverage cost ratios | **No beverage COST source exists.** `bar-provision-2026` is a **quantity** source in `QTY_SOURCES` and is consumed by `isGroundedItemQty`, never by `isGroundedCost`. Citing it here would be a cross-axis error -- exactly what the 5A-4.1 invariant forbids. |
| Fish Fry `fish` (whiting/catfish/porgies) | Finfish pricing | USDA meat series covers beef/pork/poultry. **Finfish is a different price series NGW does not hold.** |
| Fish Fry `starch`, Crawfish `sides`, `heat`, Crab Feast `sides`, Juneteenth `red_table`, Pupusa `fillings`, `curtido_ahead`, Low Country `seasoning` | Menu / ingredient composition | Composition ratios, not commodity prices. Would require a per-ingredient basket the registry does not contain. |
| Ethiopian `injera_source` (teff at home 0.7), `fasting_spread` (vegan only 0.15) | Specialty ingredient | No source covers teff or Ethiopian fasting-menu economics. **0.15 is the most extreme multiplier in the corpus** and is entirely unsourced. |

---

## 5. Evidence Gaps -- the source classes NGW is missing

Ranked by how many decisions each would unblock:

| Missing source class | Would unblock | Note |
|---|---|---|
| **Beverage cost per person** (alcohol vs dry) | **5 decisions** | The largest single gap. A cost analogue to `bar-provision-2026`. |
| **Seafood / finfish retail pricing** | **6 decisions** | Whiting, catfish, porgies, crawfish, clams, shrimp. NOAA and BLS both publish seafood series. |
| **Ingredient-basket composition** | 9 decisions | Hardest to source; may never be governable as a single claim. |
| **Specialty / ethnic ingredient pricing** | 2 decisions | Teff, loroco, ayote. Likely no authoritative US series exists. |

**The beverage gap is the clean win.** Five decisions blocked by one absent source, in a
category where authoritative provisioning data demonstrably exists (a quantity equivalent is
already in the registry).

---

## 6. Recommended KCR Sequence

**Do not create 4 KCRs today.** Create them in this order, with a verification step first:

| Step | Action | Gate |
|---|---|---|
| 0 | **Verify the four ratios against the source.** Confirm C1's host-cooks inversion, C3's 1.6 outlier, C4's duplicate 0.85. | If a ratio is wrong, fix the *claim* before governing it. |
| 1 | **KCR: Kwanzaa `food`** | Strongest precedent. Proves the pattern transfers. |
| 2 | **KCR: Pupusa `make_vs_order`** | Second-strongest; different playbook family. |
| 3 | **Re-measure.** `costGrounded` should flip on 2 decisions. | If runtime impact is not visible, stop before 3 and 4. |
| 4 | KCR: Crab Feast `steam_vs_order`, Crawfish `cookmethod` | Only after step 0 resolves their flags. |

**Then commission beverage cost research** -- one source unblocks five decisions, the best
research-to-unblock ratio available.

---

## 7. FACTS / ASSUMPTIONS / RISKS

### FACTS
- F1. 30 costFactor decisions are ungrounded; all 30 carry `tier: 'synthesized'`.
- F2. 15 of the 16 grounded decisions cite `catering-perperson-2026`; all 15 are
  service/labor-tier ratios. The 16th cites `usda-meat-2026` for a protein-tier ratio.
- F3. `catering-perperson-2026` states three service tiers with absolute per-person rates,
  which is what makes tier ratios derivable.
- F4. `bar-provision-2026` lives in `QTY_SOURCES` and is read by `isGroundedItemQty` -- it is
  not available to `isGroundedCost`.
- F5. Runtime consumer confirmed: `playbooks/index.js:2582`,
  `costGrounded = isGroundedCost(d.costFactorProvenance)`.
- F6. Juneteenth `sourcing` (grounded) and Kwanzaa `food` (ungrounded) have the same
  three-way caterer/host/shared structure.

### ASSUMPTIONS
- A1. That a pupuseria prices like the source's drop-off tier. Plausible; unverified.
- A2. That the already-grounded 16 are grounded *correctly*. I verified the predicate returns
  true and the notes cite real tier data; I did not re-derive each ratio.
- A3. That no seafood or beverage cost source exists anywhere in the 111. I searched
  `COST_SOURCES` and the unified catalogue by axis, not every source's full claim text.

### RISKS
- **R1.** C1's inversion (Kwanzaa host-cooks 1.5 vs Juneteenth host-cooks 0.9) may indicate an
  authoring error in one of them. Governing Kwanzaa without resolving it would ground a value
  that contradicts an already-governed one -- **two published artifacts disagreeing is worse
  than neither being governed.**
- **R2.** C4's duplicate 0.85 across both options may be an authoring slip.
- **R3.** Pattern-matching to a grounded precedent is *strong* evidence but not *direct*
  evidence. The honest confidence for all four is **medium**, and the derivation rule
  (5A-1.5) assigns exactly that -- so the pipeline will grade them correctly by default.
- **R4.** Publishing a 2026 catering rate creates a freshness obligation NGW does not yet
  enforce. `SOURCE_CATALOG.freshnessPolicy` exists and is unused.

---

## 8. Final Assessment

**The 30 are not one population.** Treating them as a single backlog -- which my own Phase 5A-5
report did -- obscured that 4 are near-publishable on existing evidence while 21 are blocked on
source classes NGW simply does not own.

The most useful output of this commission is not the four candidates. It is the discovery that
**one absent source -- beverage cost -- blocks five decisions**, and a second -- seafood pricing --
blocks six. Eleven of the thirty are gated on two research acquisitions, neither of which
requires any engineering.
