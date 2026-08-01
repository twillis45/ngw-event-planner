# Phase 5C - Trust Repair Inventory

**Date:** 2026-08-01 - **READ-ONLY.** No code modified, no KCR created, no tier upgraded,
no predicate touched. ASCII-only.

Scope: every published KCR artifact (2) and every grounded costFactor decision (16),
audited at the level of the individual multiplier - **40 claim legs**.

Legend: **D** DIRECT - **Dv** DERIVED - **A** ANALOGOUS - **U** UNSUPPORTED

---

## Section 1 - Priority A: Published Artifacts

These are the entire published corpus. Both required arithmetic, not inspection.

### 1.1 `p_crabs.provenance` (Crab Feast) - **REPAIR**

```
Claim ID       : Crab Feast / p_crabs.provenance
Published value: qtyPerGuest = 0.3333 dozen = 4.0 blue crabs per guest
Current tier   : researched / confidence medium / verificationStatus cited
Current source : webstaurant-protein-2026  (QTY axis - correct axis)
Evidence type  : ANALOGOUS  (recorded in 5B-5 as DERIVED - corrected below)
```

**Source text, relevant clause:**
> "...~1 lb for a barbecue (higher for bone-in - pork ribs 8-16 oz, bone-in ham 5-8 oz vs
> boneless 4-5 oz, **crab legs 16-24 oz**, T-bone 12-16 oz - because bone/shell is much of
> the weight)."

**Arithmetic check.** At ~1/3 lb per whole large male blue crab:

| Quantity | Weight | vs source band (16-24 oz) |
|---|---|---|
| **Published 4 crabs/guest** | 1.3 lb = **21 oz** | INSIDE |
| 6 crabs | 2.0 lb = 32 oz | outside |
| 9 crabs (playbook's own rule of thumb) | 3.0 lb = 48 oz | outside |

**Problem 1 - the source is the wrong instrument, and it biases low.** The band is for
**crab legs** (snow/king), which are almost entirely leg meat. **Whole blue crab** carries
carapace and viscera and has a far lower meat-to-shell ratio, so the same picked yield
requires *more* whole-crab weight, not the same. Applying a crab-leg band directly to whole
blue crab under-portions by construction. **4 crabs landing inside the band is arithmetic
coincidence, not evidential support** - and the conversion is nowhere recorded.

**Problem 2 - it contradicts the playbook's own domain knowledge.** Three figures inside one
playbook:

| Location | Figure | Per adult picker |
|---|---|---|
| `knowledge` block | "~9 crabs per adult picker" | **9.0** |
| `knowledge` block | "bushel of ~5-7 dozen feeding ~8-12" | 5.0 - 10.5 |
| `p_crabs.note` | "bushel of Large Males (~72 crabs) feeds ~12-15 adults" | 4.8 - 6.0 |
| **Published value** | 4.0 / guest -> at ~2/3 adult pickers | **6.0** |

The published value is coherent with `p_crabs.note` and with the low end of the bushel band.
It conflicts with the playbook's stated Maryland rule of thumb by **~1.5x**. The `knowledge`
block itself is internally inconsistent (~9 vs 5.0-10.5).

**Consequence if wrong:** crabs are THE meal and the largest line in the event. Under-buying
is not a rounding error to a host.

**Problem type:** source scope mismatch + missing derivation + internal contradiction.
**Disposition: REPAIR.** Re-ground to regional crab-feast guidance (the playbook already holds
it), record the adult-picker conversion explicitly, and reconcile the ~9 figure. Do **not**
withdraw - the value is defensible; its citation is not.

---

### 1.2 `p_wine.provenance` (Retirement Party) - **REPAIR**

```
Claim ID       : Retirement Party / p_wine.provenance
Published value: qtyPerGuest = 0.4 bottle
Published claim: "wine carries ~40% of the drink load: a 750ml bottle (5 glasses)
                  supports ~0.4 bottle/guest over 3 hours when beer is also served"
Current source : bar-provision-2026  (QTY axis - correct axis)
Evidence type  : UNSUPPORTED AS WRITTEN
```

**Source text:**
> "~1 drink/guest/hour ... a mixed bar skews **~40% beer** with beer+wine ~75% of volume;
> **wine ~1 bottle per ~2.5 drinking guests per hour (= ~1/2 bottle per drinker;** a 750ml
> bottle pours ~5 servings)"

**Two independent failures:**

1. **The 40% belongs to beer.** Source: ~40% beer, beer+wine ~75%, implying wine ~35%. The
   published claim reassigns beer's share to wine.
2. **The stated arithmetic does not produce the published value.**
   `3 h x 1 drink/h = 3 drinks; x 40% = 1.2 glasses; / 5 per bottle = 0.24 bottles/guest.`
   Published value is **0.4**, not 0.24.

**Cross-playbook check - the same source, two different values.** Four playbooks cite
`bar-provision-2026` for bottles of wine per guest:

| Playbook | qtyPerGuest | Matches source's ~1/2 bottle/drinker? |
|---|---|---|
| Anniversary | **0.5** | yes |
| Vow Renewal | **0.5** | yes |
| Housewarming | 0.4 | no |
| **Retirement Party (PUBLISHED)** | **0.4** | no |

**The published artifact is on the side that deviates from its own source, while two
unpublished siblings match it exactly.**

**Is 0.4 defensible?** Yes, by a route the artifact does not state: `0.5 per drinker x ~80%
drinkers = 0.4 per guest`. Retirement Party also carries `p_nonalc` at 2.5 (vs 2.0 in
Anniversary and Vow Renewal) and an extra `p_fav_drink` line, so a slightly lower wine share
is plausible. **None of that is recorded**, and the note argues the opposite direction
("an older daytime crowd often skews wine-heavy" would raise wine, not lower it).

**Problem type:** unsupported value as stated + missing derivation + unexplained divergence
from sibling claims.
**Disposition: REPAIR.** The number likely survives; the published rationale does not. Rewrite
the derivation, state the drinker-rate assumption, and reconcile against the 0.5 siblings.

---

## Section 2 - Priority B: CostFactor Grounding Repair

### 2.1 What `catering-perperson-2026` supports, definitively

| SUPPORTED | NOT SUPPORTED |
|---|---|
| full-service $75-150/person | **potluck** - word absent from the source |
| buffet with servers $45-85 | **guest contribution / cost-shifting** of any kind |
| drop-off buffet $28-50 | **DIY savings percentages** - "cheaper still", no number |
| drop-off $15-35 | restaurants, food trucks, pitmasters, platters as priced categories |
| full-service / drop-off = 2-4x | any absolute DIY baseline |
| ordering: DIY < drop-off < buffet < full-service | |

### 2.2 The 16 grounded decisions

Verdict = weakest leg.

| # | Decision | Claim legs | Source | Current | Correct | Disposition |
|---|---|---|---|---|---|---|
| 1 | Baby Shower `food_style` | drop-off 1.35 **A** / potluck 0.55 **U** / platters 1.15 **A** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 2 | Get-Together `food_style` | pitmaster 1.4 **A** / potluck 0.75 **U** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 3 | Graduation `food_style` | drop-off 1.3 **A** / potluck 0.55 **U** / trays 1.1 **A** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 4 | Game Night `food_model` | potluck 0.5 **U** | catering | grounded | **UNSUPPORTED (all legs)** | **WITHDRAW grounding** |
| 5 | Bridal Shower `food_style` | caterer 1.35 **A** / potluck 0.55 **U** / restaurant 1.4 **A** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 6 | Gender Reveal `food_style` | catering 1.3 **A** / potluck 0.55 **U** / trays 1.1 **A** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 7 | Engagement `food_style` | caterer 1.4 **A** / potluck 0.6 **U** / restaurant 1.5 **A** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 8 | Vow Renewal `food_style` | host cooks 0.7 **A** / potluck 0.55 **U** / restaurant 1.15 **A** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 9 | The Cookout `grill_master` | pitmaster 1.4 **A** | catering | grounded | **ANALOGOUS (clean)** | **DOWNGRADE only** |
| 10 | The Cookout `cooking_model` | host all 1.3 **A** / potluck 0.55 **U** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 11 | Card Party `food_model` | host spread 1.3 **A** / potluck 0.45 **U** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 12 | Juneteenth `sourcing` | Black-owned 1.35 **A** / host all 0.9 **A** / potluck 0.7 **U** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |
| 13 | Juneteenth `menu` | brisket 1.2 **U** / mixed+seafood 1.25 **U** / lighter 0.75 **A** | usda-meat | grounded | **mostly UNSUPPORTED** | **WITHDRAW grounding** |
| 14 | Crab Feast `crab_size` | Medium 0.55 **Dv-FAIL** / LgFemale 0.75 **Dv** / XL 1.55 **Dv** / Jumbo 2.0 **Dv** | dmv-crab | grounded | **DERIVED, 1 leg wrong** | **REPAIR the Medium leg** |
| 15 | Low Country `cook` | caterer 1.5 **A** | catering | grounded | **ANALOGOUS (clean)** | **DOWNGRADE only** |
| 16 | Repast `food_source` | dish-sharing 0.9 **U** / catered 1.3 **A** / restaurant 1.4 **A** | catering | grounded | ANALOGOUS + 1 U | **DOWNGRADE + split** |

### 2.3 Roll-up

```
40 claim legs
   DIRECT       0
   DERIVED      4   (crab_size; 1 of the 4 does not reproduce)
   ANALOGOUS   22
   UNSUPPORTED 14

16 decisions
   REPAIR              1   (#14 crab_size Medium leg)
   WITHDRAW grounding  2   (#4 Game Night, #13 Juneteenth menu)
   DOWNGRADE only      2   (#9, #15 - clean analogous, no potluck leg)
   DOWNGRADE + split  11   (analogous hierarchy retained, potluck leg ungrounded)

2 published artifacts
   REPAIR              2   (p_crabs, p_wine)
```

**Nothing is deleted. Nothing loses its value.** Every disposition is a relabelling or a
rationale rewrite. That is what makes this sprint safe to execute incrementally.

### 2.4 Detail on the two WITHDRAWs

**#4 Game Night `food_model`** - single leg, potluck 0.5, cited to a source with no potluck
content. Nothing survives as analogous because there is no hierarchy leg to retain.

**#13 Juneteenth `menu`** - cited to `usda-meat-2026`:
- *brisket 1.2* - the source prices **brisket ~$4.50/lb** and **pork chops ~$4.33/lb**. Within
  ~4%. The source does not support a 20% premium, and the note's characterization of brisket as
  "a premium beef cut" is contradicted by the source's own figure.
- *mixed grill + seafood 1.25* - the source is a **meat** series with **no seafood**.
- *lighter chicken spread 0.75* - **A**. The source does state chicken is the most affordable
  meat, so the direction holds; the magnitude does not.

### 2.5 Detail on the REPAIR

**#14 Crab Feast `crab_size`** - the only decision in the corpus that records its method
("cost factor ratios use market midpoint, ~$85/dz Large Male as 1.0"), and therefore the only
one that can be checked:

| Size | Source range | Midpoint | Implied ratio | Claimed | Result |
|---|---|---|---|---|---|
| Large Male | $72-98 | $85.0 | 1.00 | 1.00 | baseline |
| Large Female | $52-75 | $63.5 | 0.75 | 0.75 | reproduces |
| XL Male | $109-150 | $129.5 | 1.52 | 1.55 | reproduces |
| Jumbo Male | $149-188 | $168.5 | 1.98 | 2.00 | reproduces |
| **Mediums** | **$32-75** | **$53.5** | **0.63** | **0.55** | **FAILS by ~13%** |

Repair: set Mediums to ~0.63, or record why the midpoint method does not apply to that size.

---

## Section 3 - Detected Contradictions (cross-claim)

These are machine-detectable without reading any source text.

### C1 - Potluck: one source, eight values

| Value | Decisions |
|---|---|
| 0.45 | Card Party |
| 0.50 | Game Night |
| 0.55 | Baby Shower, Graduation, Bridal Shower, Gender Reveal, Vow Renewal, The Cookout |
| 0.60 | Engagement Party |
| 0.70 | Juneteenth |
| 0.75 | Get-Together |
| 0.90 | Repast (dish-sharing) |

12 decisions, one cited source, **8 distinct values spanning 2x**. If the source produced them
they would agree.

**Exhaustive registry sweep:** "potluck" appears in exactly one source claim in all of NGW -
the **USDA FSIS "Cooking for Groups"** guide in `foodSafetyContext.js`, on the **food-safety
axis**, with no cost content. **No cost source anywhere covers potluck.**

### C2 - Wine bottles/guest: one source, two values

Anniversary 0.5 and Vow Renewal 0.5 (match source) vs Housewarming 0.4 and Retirement Party
0.4 (published, does not match). See 1.2.

### C3 - Beer per guest: one source, wide spread - **likely justified**

| Playbook | qtyPerGuest | citing bar-provision-2026 |
|---|---|---|
| Bachelor Party | **6** cans | yes |
| Watch Party | 4 drinks | yes |
| Crawfish Boil | 4 drinks | (no provenance) |
| Housewarming | 1.5 cans | yes |

A 4x spread. **But the source itself says "~5-6 drinks/guest over a 4-5h event"**, so a long
bachelor party at 6 and a short housewarming at 1.5 are both plausible - the variance tracks
event duration and intensity, which the source explicitly parameterizes.

**Design consequence:** an automated same-source-different-value check must distinguish
**unexplained** variance from **justified** variance, or it will generate noise and be ignored.
The justification has to be a recorded field, not a reviewer's memory.

### C4 - Crab quantity: internal contradiction inside one playbook

~9 crabs/adult (knowledge block) vs 4.8-6.0 (p_crabs note) vs 6.0 implied by the published
value. See 1.1.

---

## FACTS / ASSUMPTIONS

### FACTS (measured or computed this session)
- F1. 40 legs: 0 DIRECT, 4 DERIVED, 22 ANALOGOUS, 14 UNSUPPORTED.
- F2. `catering-perperson-2026` carries 14 of 16 grounded decisions.
- F3. Potluck: 12 decisions, 8 distinct values, 0 cost-source coverage. The only potluck source
  in NGW is USDA FSIS, on the food-safety axis.
- F4. Wine: Anniversary 0.5, Vow Renewal 0.5, Housewarming 0.4, Retirement Party 0.4 - all
  citing `bar-provision-2026`, which states ~1/2 bottle per drinker.
- F5. `p_wine` published arithmetic yields 0.24, not the published 0.4; the ~40% figure is the
  source's **beer** share.
- F6. `p_crabs` 0.3333 dz = 4.0 crabs/guest = 21 oz at ~1/3 lb/crab; the playbook's own
  knowledge block states ~9 crabs per adult picker.
- F7. `crab_size`: 3 of 4 ratios reproduce from the stated midpoint method; Mediums is off ~13%.
- F8. `usda-meat-2026` prices brisket ~$4.50/lb vs pork chops ~$4.33/lb and contains no seafood.

### ASSUMPTIONS (flagged, not proven)
- A1. That a whole large male blue crab is ~1/3 lb. Used in F6. **Not sourced** - it is my
  figure, and the repair should establish it properly.
- A2. That ~2/3 of crab-feast guests are adult pickers. Used to reconcile 4.0/guest to
  6.0/picker. **Not sourced.**
- A3. That a labor-tier catering source cannot support a potluck cost-shift claim. My
  judgement; it is the load-bearing call behind 14 UNSUPPORTED legs.
- A4. That C3's beer spread is justified by duration. Plausible from the source text;
  not confirmed against each playbook's stated duration.
