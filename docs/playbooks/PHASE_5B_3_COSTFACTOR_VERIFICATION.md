# Phase 5B-3 — CostFactor Verification Report

**Date:** 2026-08-01 - **READ-ONLY.** No code modified, no KCR created, no tier upgraded.

---

## 1. Executive Recommendation

# **NONE of the four are publish-eligible. 1 REJECT, 3 NEEDS RESEARCH.**

**This reverses my own Phase 5B-2 recommendation.** There I proposed all four as publish
candidates on the grounds that structurally identical decisions were already grounded to the
same source. This phase's instruction — *"do not treat similar decisions as proof"* — is
correct, and applying it dissolves that argument.

Three findings drove the reversal, each verifiable above:

1. **The source gives a DIRECTION but not a MAGNITUDE for the DIY tier.** Its exact words:
   *"host-cooked/DIY is cheaper still."* No number. Every one of the four candidates hinges on
   a DIY-vs-prepared ratio, and **the source prices four catering tiers but never prices DIY.**
2. **Kwanzaa contradicts the source outright** — it prices host-cooking *above* catering, and
   the source states the opposite as its central point. That is a reject, not a research item.
3. **Three of the four already carry author notes saying they need verification.** The
   playbook authors were honest about the gap. My 5B-2 pattern-matching would have overridden
   their own stated caveats — which is precisely the failure mode this gate exists to catch.

---

## 2. Candidate Disposition

| # | Candidate | Source supports claim? | Contradiction | Disposition |
|---|---|---|---|---|
| C1 | Kwanzaa `food` | **NO — inverted** | **YES, with the source** | **REJECT** |
| C2 | Pupusa `make_vs_order` | Direction yes, magnitude no | none | **NEEDS RESEARCH** |
| C3 | Crawfish `cookmethod` | **NO** | none | **NEEDS RESEARCH** |
| C4 | Crab Feast `steam_vs_order` | **NO** | none | **NEEDS RESEARCH** |

---

## 3. Evidence Analysis

### The source, in full

`catering-perperson-2026` (The Catering Finder, fetched 2026-07-16):

> "2026 US catering per person: full-service $75-150; buffet with servers $45-85; drop-off
> buffet $28-50; drop-off $15-35. The food is often identical between drop-off and staffed —
> the price difference is LABOR — so **full-service runs ~2-4x drop-off, and host-cooked/DIY
> is cheaper still.** Add 20-30% for service, gratuity, and tax."

**Derivable from this source:**
- full-service / drop-off = **2-4x** (stated explicitly)
- the four tier price bands, absolutely
- direction: DIY < drop-off < buffet-with-servers < full-service

**NOT derivable:**
- any DIY multiplier. "Cheaper still" has no magnitude.
- anything about seafood, crawfish, crab, or masa.

---

### C1 — Kwanzaa Gathering / `food` → **REJECT**

```
options : Host cooks the spread | Potluck - each family brings a heritage dish
          Host cooks the mains, guests bring sides + desserts
          Source key dishes from Black-owned cooks/caterers (Ujamaa)
default : "Potluck - each family brings a heritage dish"     <- BASELINE = 1.0
factors : Host cooks 1.5 | Mixed 1.2 | Black-owned caterers 1.4
author note: "Host cooks adds 50% cost; mixed adds 20%; catering adds 40%.
              Needs catering/ingredient cost verification."
```

**Derivation attempted:** baseline is potluck. So the claim is
*host-cooks = 1.5x potluck* and *caterers = 1.4x potluck*.

**Therefore the claim asserts host-cooking costs MORE than catering (1.5 > 1.4).**

The source's central assertion is the reverse: the price difference between tiers *is labor*,
and *host-cooked/DIY is cheaper still*. **The claim and the source point in opposite
directions.** No calculation reconciles them.

**Correction to my Phase 5B-2 report.** I flagged an "inversion" between Kwanzaa (host-cooks
1.5) and Juneteenth (host-cooks 0.9) and called it a possible authoring error in one of them.
That framing was wrong: the two decisions have **different baselines** — Kwanzaa's is potluck,
Juneteenth's is a host/bakery hybrid — so the raw numbers were never comparable. The real
problem is not Kwanzaa-vs-Juneteenth; it is **Kwanzaa vs the source.**

**Disposition: REJECT.** Governing this would publish a claim its own cited source
contradicts. The claim itself may need correcting, which is playbook authoring work, not
governance.

---

### C2 — Pupusa Gathering / `make_vs_order` → **NEEDS RESEARCH**

```
options : Make all from scratch (comal day) | Order from a pupuseria
          Hybrid - host makes some, orders the rest
default : "Hybrid"                                            <- BASELINE = 1.0
factors : Make from scratch 0.75 | Order from pupuseria 1.3
author note: "Cost factor heuristics need verification against actual pricing."
```

**Derivation attempted:** order / DIY = 1.3 / 0.75 = **1.73x**.

**Direction: supported.** DIY below prepared — consistent with the source.
**Magnitude: not supported.** The source prices drop-off at $15-35 but gives DIY no number, so
1.73 cannot be derived. It also says nothing about a pupuseria specifically; classifying one
as the drop-off tier is my inference, not the source's.

**What would make it publishable:** a per-person cost for home-made pupusas (masa, quesillo,
chicharron, beans at retail) against a pupuseria per-dozen price. Both are obtainable; neither
is in the registry.

---

### C3 — Crawfish Boil / `cookmethod` → **NEEDS RESEARCH**

```
options : Boil it yourself (propane pot) | Order live + boil yourself
          Order it boiled by the pound (pickup)
default : "Boil it yourself (propane pot)"                    <- BASELINE = 1.0
factors : Order it boiled by the pound 1.6
author note: "Heuristic: ordering cooked crawfish adds ~60% markup. Needs price comparison."
```

**Derivation attempted: none possible.** `catering-perperson-2026` prices *catering service
tiers*, not a commodity seafood boil-and-pickup markup. These are different economics: a
crawfish boiler charges for the boil, not for staffed service.

Using the catering ladder here would be a **category error** — the same shape of mistake as
citing a beverage quantity source for a beverage cost, which 5B-2 rejected.

**What would make it publishable:** live crawfish $/lb vs boiled-pickup $/lb from the same
market. That is one price comparison, and the author already named it.

---

### C4 — Crab Feast / `steam_vs_order` → **NEEDS RESEARCH**

```
options : Steam them myself | Order steamed for pickup | Buy live, steam in batches
default : "Order steamed for pickup"                          <- BASELINE = 1.0
factors : Steam them myself 0.85 | Buy live, steam in batches 0.85
author note: "Heuristic: DIY steaming saves ~15% vs crab-house pickup (propane/pot offset
              by no steaming markup). Needs verification against crab-house vs live-buy
              price spread."
```

**The duplicate 0.85 I flagged in 5B-2 is NOT an error.** With the baseline visible, both
factored options are DIY variants and both carry the same 15% saving against crab-house
pickup. That is coherent, and I withdraw the flag.

**But the 15% is unsourced.** `dmv-crab-2026` surveys four DMV crab houses' *retail steamed*
prices. It contains **no live-buy price**, so the retail-vs-live spread the claim rests on
cannot be computed from it. `catering-perperson-2026` does not cover seafood.

**What would make it publishable:** live blue crab $/dozen from the same DMV vendors already
surveyed. The existing source is one column short of supporting this claim.

---

## 4. Contradictions Found

### Between a candidate and its source — 1

**Kwanzaa `food`** prices host-cooking above catering; `catering-perperson-2026` states DIY is
cheapest. **Blocking.**

### Among claims already governed — a consistency spread worth reviewing

Derived by hand from the extracted decision structures above (not from a clean measurement
run — my automated matcher failed to bind and I have not re-run it). Each decision normalized
to its own baseline, expressed as *potluck cost relative to host-cooks*:

| Governed decision | potluck | host-cooks | potluck / host-cooks |
|---|---|---|---|
| Vow Renewal `food_style` | 0.55 | 0.70 | **0.79** |
| Juneteenth `sourcing` | 0.70 | 0.90 | **0.78** |
| The Cookout `cooking_model` | 0.55 | 1.30 | **0.42** |
| Game Night `food_model` | 0.50 | 1.00 (default) | **0.50** |
| Card Party `food_model` | 0.45 | 1.30 | **0.35** |

**A 2.3x spread across five already-published governed claims** for what is nominally the same
relationship. Some variation is legitimate — a potluck displaces more of a cookout's menu than
of a vow renewal's — but the range is wide enough that it should be explained rather than
assumed.

**This is not a blocker for this phase** (nothing new is being published) but it is a finding
about content already carrying `tier: 'researched'`, and it bears on assumption A2 from 5B-2,
which I flagged then and have not discharged.

---

## 5. KCR Publishing Order

**None. No candidate survives.**

The pipeline stays at 2 published artifacts.

---

## 6. Remaining Research Requirements

Ordered by cost to acquire:

| # | Requirement | Unblocks | Effort |
|---|---|---|---|
| 1 | **Live blue crab $/dozen** from the four DMV vendors already surveyed | C4 | Smallest — extends an existing source by one column |
| 2 | **Live vs boiled crawfish $/lb** from one market | C3 | Small — one comparison |
| 3 | **Home pupusa ingredient cost/person vs pupuseria price/dozen** | C2 | Small-medium |
| 4 | **A DIY/host-cooked per-person cost band** to sit below the drop-off tier | **C2, C3, C4 and every future DIY ratio** | Medium — highest leverage |
| 5 | Resolve Kwanzaa `food` as an authoring question | C1 | Not research — a playbook correction |

**Item 4 is the structural one.** The catering source prices four tiers and stops short of
DIY, which is the tier NGW's hosts most often occupy. Every DIY multiplier in the corpus —
including the five already governed — rests on a number no source supplies. Acquiring one
DIY cost band would ground more claims than the other four items combined, and would let the
existing governed set be re-derived rather than trusted.

---

## 7. FACTS / ASSUMPTIONS / RISKS

### FACTS
- F1. `catering-perperson-2026` states one explicit ratio (full-service ~2-4x drop-off) and
  four absolute tier bands. It gives **no DIY magnitude**.
- F2. Kwanzaa `food`: baseline potluck; host-cooks 1.5 > caterers 1.4 — opposite to the source.
- F3. Kwanzaa, Crawfish and Crab Feast each carry an author note stating verification is needed.
- F4. Crab Feast's duplicate 0.85 is coherent: both factored options are DIY variants.
- F5. `dmv-crab-2026` surveys retail steamed crab prices only — no live-buy column.
- F6. All four candidates carry `tier: 'synthesized'` and `sources: undefined`.

### ASSUMPTIONS
- A1. That a pupuseria prices like the source's drop-off tier. **Mine, not the source's.**
- A2. That the five governed potluck/host ratios are individually defensible despite the 2.3x
  spread. Not verified.
- A3. That the consistency table in section 4 is arithmetically correct — I derived it by hand
  from the extracted structures rather than from a clean automated run.

### RISKS
- **R1.** Publishing C1 would put a governed claim in direct conflict with its own cited
  source — the most damaging possible outcome for a trust system.
- **R2.** The 2.3x spread among governed claims (section 4) may mean some already-published
  grounding is weaker than its `researched` tier implies. Worth a review pass; not urgent,
  since none of it is newly published.
- **R3.** My 5B-2 recommendation would have published all four. The pattern-matching argument
  ("a similar decision is grounded, therefore this one may be") is not evidence, and this gate
  caught it. **The gate earned its place.**
