# Phase 5A-5 -- Governed Knowledge Coverage Audit

**Date:** 2026-08-01 - **READ-ONLY.** No resolver built, no registry migrated, no predicate
modified, no playbook edited.
**Question:** where does governed knowledge create the most trust per unit of effort?

---

# Current Coverage

Every knowledge claim in the corpus, counted:

| Category | Total Claims | Provenance | Source IDs | Grounded |
|---|---|---|---|---|
| Purchase -- priced (cost claim) | 537 | 169 (31%) | 45 (8%) | **38 (7%)** |
| Purchase -- quantity claim | 537 | 169 (31%) | 45 (8%) | **38 (7%)** |
| Decision -- costFactors | 46 | **46 (100%)** | 16 (35%) | **16 (35%)** |
| Decision -- all | 215 | 46 (21%) | 16 (7%) | 16 (7%) |
| Task -- timing guidance | 488 | **0** | 0 | 0 |
| Vendor guidance | 197 | **0** | 0 | 0 |
| Risk | 263 | **0** | 0 | 0 |
| Contingency | 191 | **0** | 0 | 0 |
| Milestone | 382 | **0** | 0 | 0 |
| Playbook knowledge block | 39 | 39 (100%) | 8 (21%) | n/a |

**Corpus totals -- 2,312 distinct claims:**

```
with a provenance object : 254   (11%)
with any source id       :  69   ( 3%)
grounded                 :  54   ( 2.3%)
```

Note the purchase rows describe the *same* 537 objects: one `provenance` block serves both
the cost and quantity claim. That is itself a finding -- see G3.

## What the shape of this table says

**One category is genuinely governed.** `costFactors` decisions are at **100% provenance
coverage and 35% grounded** -- the residue of the Wave-2i grounding work. It proves the model
works when someone drives a category to completion.

**Five categories have literally zero.** Tasks, vendors, risks, contingencies and milestones --
**1,521 claims, 66% of the corpus** -- carry no `provenance` field at all. Not sparse: absent.
There is nothing to consolidate, resolve, or migrate there; the field does not exist.

**The 2.3% grounded figure is not a sourcing failure.** 169 claims carry researched provenance;
only 45 cite an id, and only 38 resolve. The knowledge was done. The *identity* was not
recorded.

---

# Highest Value Gaps -- top 25

Ranked by **blast radius x consequence**, not by alphabet or by how easy they are:

- **USES** -- how many of the 39 playbooks share this purchase id. One governed fix lands in
  all of them.
- **ESS** -- how many mark it `essential: true`. Essential items drive the budget the host
  plans against.
- **MAX$** -- the highest `unitCostRange` upper bound across its uses.

Scope: **237 distinct priced purchase ids, 219 fully ungrounded.**

| # | Uses | Ess | Max $ | ID | Claim |
|---|---|---|---|---|---|
| 1 | **26** | 26 | 50 | `p_cleanup` | Trash + recycling bags, paper towels, wipes |
| 2 | **18** | 17 | 3 | `p_tableware` | Plates, cups, napkins, cutlery |
| 3 | 13 | 13 | 25 | `p_paper` | Paper goods (cocktail napkins, parchment) |
| 4 | 15 | 2 | **1500** | `p_decor` | Decorations (balloons, banner, theme kit) |
| 5 | 9 | 9 | **700** | `p_cake` | Cake or cupcakes |
| 6 | 11 | 5 | 22 | `p_dessert` | Bakery tart or cake |
| 7 | 8 | 8 | 8 | `p_water` | Table water service |
| 8 | 8 | 7 | 30 | `p_coffee` | Coffee + tea + cream/sugar |
| 9 | 8 | 7 | 25 | `p_napkins` | Cloth or premium paper napkins |
| 10 | 10 | 0 | 80 | `p_flowers` | Centerpiece flowers |
| 11 | 6 | 4 | 60 | `p_champagne` | Champagne / sparkling for the toast |
| 12 | 8 | 2 | 6 | `p_candles` | Candles (taper/tealight) |
| 13 | 9 | 0 | 22 | `p_favors` | Party favors / goodie bags |
| 14 | 4 | 1 | **4000** | `p_signage` | Anniversary signage + photo display |
| 15 | 4 | 4 | 12 | `p_apps` | Cheese & charcuterie spread |
| 16 | 4 | 4 | 11 | `p_food` | Quiche, fruit & sandwiches |
| 17 | 4 | 4 | 8 | `p_snacks` | Chips, crackers, pretzels |
| 18 | 4 | 4 | 4 | `p_greens` | Collard greens (+ smoked turkey) |
| 19 | 4 | 4 | 1 | `p_togo` | To-go containers + foil |
| 20 | 4 | 3 | 30 | `p_serveware` | Serving setup (warming trays) |
| 21 | 5 | 2 | 8 | `p_bread` | Bread / rolls |
| 22 | 4 | 3 | 1 | `p_cups` | Disposable cups |
| 23 | 4 | 2 | 50 | `p_guestbook` | Guest book / sign-in |
| 24 | 3 | 3 | 50 | `p_condiments` | Condiments + toppings |
| 25 | 3 | 3 | 50 | `p_fuel` | Charcoal / propane + lighter |

## The leverage is concentrated, and that is the finding

**The top 3 ids alone cover 57 purchase instances across the corpus** -- `p_cleanup` (26),
`p_tableware` (18), `p_paper` (13). All three are `essential` in nearly every use, so they
enter every budget the host plans against.

Three governed KCRs -- **not 219** -- would move the most-shown, most-shared, budget-bearing
claims in the product from ungrounded to grounded. Measured against the 5A-2/5A-3 pattern
(one KCR per field, no playbook edit), that is three artifacts for 57 instances.

**A second, cheaper win:** `p_cleanup`, `p_tableware`, `p_paper`, `p_water`, `p_cups`,
`p_togo` are commodity supplies whose per-guest quantities are exactly what
`webstaurant-portions-2026` already covers -- a source id that **already exists and already
resolves**. No new source research is required for six of the top twenty-two.

## Also P1, and cheaper than it looks

**30 of 46 `costFactors` decisions are ungrounded** -- every one already has a
`costFactorProvenance` object, so the field exists and only the source id is missing. This is
the highest-completion-percentage category in the corpus (100% provenance) sitting one id away
from grounding. It is a smaller, better-defined target than the purchase backlog.

---

# Do Not Touch

Governance adds little or nothing here. Listed with the reason, so this is a decision rather
than an omission:

| Category | Claims | Why not |
|---|---|---|
| **Milestone** | 382 | Scheduling scaffolding ("6 weeks out: confirm headcount"). Derived from the event date, not from external fact. There is no source to cite. |
| **Contingency** | 191 | Conditional planning advice ("if it rains, move to the covered patio"). Judgement, not claim. Citing it would imply an authority that does not exist. |
| **Risk** | 263 | Same shape as contingency. The *mitigation* may cite (food safety, fire safety registries exist), but the risk statement itself is a hazard the host already understands. |
| **Task -- timing** | 488 | **Partial exception.** Most are workflow sequencing, not fact. But `TIMING_SOURCES` has 10 entries and `isGroundedTiming` exists -- so a small subset (vendor lead times, booking windows) is genuinely citable. Treat as P2, not P1, and only for lead-time claims. |
| **Playbook knowledge block** | 39 | Already 100% provenance-covered; 8 carry sources. Editorial framing, not per-claim fact. |
| **Decision -- non-costFactor** | 169 | Preference elicitation ("buffet or plated?"). There is no correct answer to cite. |

**Governance effort spent on 1,521 zero-provenance claims in these categories buys nothing**,
because the claims are not the kind of thing that has a source.

---

# FACTS / ASSUMPTIONS / RISKS

## FACTS (measured this session)
- F1. 2,312 claims; 254 (11%) with provenance; 69 (3%) with source ids; 54 (2.3%) grounded.
- F2. `costFactors` decisions: 46/46 provenance, 16/46 grounded -- the only governed category.
- F3. Tasks (488), vendors (197), risks (263), contingencies (191), milestones (382) have
  **zero** provenance objects. 1,521 claims, 66% of the corpus.
- F4. 237 distinct priced purchase ids; **219 fully ungrounded**.
- F5. Top 3 shared ids cover **57 purchase instances**; all three are near-universally `essential`.
- F6. One `provenance` block serves both the cost and the quantity claim on a purchase.
- F7. 30 of 46 costFactor decisions have a provenance object but no resolving source id.

## ASSUMPTIONS (not proven)
- A1. That `webstaurant-portions-2026` genuinely covers commodity supply quantities. Its claim
  text is about portions; I did not verify it supports per-guest counts for napkins or bags.
- A2. That shared purchase ids mean shared *claims*. Two playbooks may use `p_cleanup` with
  different quantities; a single governed value may not be correct for both.
- A3. That milestone/contingency/risk content is genuinely uncitable. I read their shape, not
  every one of the 836 entries.

## RISKS
- R1. **A2 is the real one.** If `p_cleanup` quantities legitimately differ by event type, one
  governed value across 26 playbooks would be *wrong* in some of them -- trading ungrounded for
  incorrect. Must be checked per id before publishing.
- R2. Chasing the 2.3% figure toward 100% would spend most of the effort on claims that cannot
  have sources (F3 + Do Not Touch). The metric is misleading as a target.
- R3. F6 means one governed provenance implicitly grounds two different claim types. A source
  that justifies a *price* is not automatically a source for a *quantity*.

---

# Recommendation

## Decision: **EXECUTE -- narrowly.**

Not the resolver. Not the 219-item backfill. **The top 3 shared ids, as 3 governed KCRs.**

The reasoning is the ratio the brief asked for -- trust per unit of governance effort:

- **3 artifacts -> 57 purchase instances**, on items that are `essential` in nearly every use
  and therefore enter the budget the host plans against. Nothing else in the corpus has that
  leverage ratio.
- **The mechanism is proven and idle.** 5A-2 and 5A-3 demonstrated KCR -> snapshot -> runtime on
  two artifacts, across two playbooks and two categories, with rollback and CI enforcement.
  The pipeline is built and currently carrying two entries.
- **No new source research is needed** for most of them -- `webstaurant-portions-2026` already
  exists and resolves (subject to A1).
- **It converts an abstract question into evidence.** After 3 artifacts we will know the real
  cost per governed claim, and whether A2 (shared id, shared claim) holds. Both are currently
  guesses, and both gate any larger backfill.

**Then re-measure before going further.** If A2 fails -- if `p_cleanup` needs different values
per playbook -- the entire "shared id" leverage argument collapses and the priority order in
this document must be rebuilt around single-playbook, high-cost items (`p_signage` $4000,
`p_decor` $1500, `p_cake` $700) instead.

**PARK:** the resolver migration (unchanged from 5A-4/5A-4.1 -- the unpark trigger is >~100
items with `sources[]`, which 3 artifacts will not reach).

**KILL:** any goal expressed as a coverage percentage across all 2,312 claims. 66% of the
corpus cannot have sources, so the number can never approach 100 and pursuing it would spend
governance effort where it buys no trust at all.
