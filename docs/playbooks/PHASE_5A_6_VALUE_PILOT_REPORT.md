# Phase 5A-6 Completion Report -- Governed Knowledge Value Pilot

**Date:** 2026-08-01 - **No KCR created. No playbook edited. No registry or predicate changed.**
**Why:** the pre-publication safety rule fired on all three candidates. Publishing any of them
would have violated the rule the phase was built around.

---

## 1. Recommendation

# **STOP -- for this pilot as scoped.**

Not "park the infrastructure" and not "pick different items." The pilot cannot run because
**the research the highest-leverage claims need has not been done**, and the phase forbids
inventing it. That is the finding, and it is more useful than a published artifact would have
been.

Three independent blockers, each verified:

| Candidate | Blocker |
|---|---|
| `p_cleanup` | claim equivalence **PASSES** for quantity -- but **no qualifying source exists** |
| `p_tableware` | claim equivalence **FAILS** -- 5 different per-guest quantities |
| `p_paper` | claim equivalence **FAILS** -- 4 units, 3 quantity models, 13 distinct items |
| Group B (30 costFactors) | **all 30 self-declare `tier: 'synthesized'`** -- they need research, not a source id |

---

## 2. Claims Evaluated

| ID | Uses | Shared Claim? | Decision |
|---|---|---|---|
| `p_cleanup` | 26 | **YES (quantity only)** | **BLOCKED -- no source** |
| `p_tableware` | 18 | **NO** | **REJECT** |
| `p_paper` | 13 | **NO** | **REJECT** |
| 30 costFactor decisions | 30 | n/a | **DEFER -- needs research** |

### Claim Analysis -- `p_cleanup`

```
Purchase ID    : p_cleanup
Current uses   : 26        Essential count: 26 / 26

QUANTITY CLAIM (what purchase.provenance actually grounds)
  qtyFlat      : 1           IDENTICAL across 26
  qtyPerGuest  : undefined   IDENTICAL across 26
  unit         : "kit"       IDENTICAL across 26
  category     : "cleanup"   IDENTICAL across 26
  essential    : true        IDENTICAL across 26

VARIATION FOUND (not grounded by this block)
  unitCostRange: 12 distinct ranges  ([8,15] x6, [8,16] x4, [8,12] x2, ...)
  item text    : 21 distinct strings across 26 uses
  where        : 5 variants
  buyAt        : 2 variants (T-3d x25, T-1d x1)

Shared claim   : YES -- for the quantity claim, which is the one this field grounds
Reason         : "one cleanup kit per event, regardless of guest count" holds in all 26.
                 Cost and contents vary, but isGroundedCost reads costFactorProvenance
                 on DECISIONS, never a purchase's provenance block.

Blocker        : NO QUALIFYING SOURCE. All three QTY_SOURCES are food/drink portion
                 guides (protein portions, side portions, drink provisioning). None
                 covers cleanup supplies. Publishing would require citing an
                 irrelevant source or inventing one - both forbidden.
```

### Claim Analysis -- `p_tableware`

```
Purchase ID    : p_tableware
Current uses   : 18        Essential count: 17 / 18

qtyPerGuest    : VARIES(5)  -> 1.5 x10, 2 x4, 2.5 x2, 3 x1
unit           : VARIES(4)  -> "set", "plates/cups", "pieces", "place settings/cups"
category       : VARIES(2)  -> "rental" x15, "logistics" x3
essential      : VARIES(2)
unitCostRange  : VARIES(9)
item text      : VARIES(16) -> "Disposable plates, cups, napkins, cutlery"
                            vs "Plates, cups, napkins, cutlery + linens"

Shared claim   : NO
Reason         : The per-guest quantity differs by a factor of TWO (1.5 vs 3), and the
                 category split (rental vs logistics) means some uses are a rental
                 dependency and others a shopping line. "Disposable" and "+ linens" are
                 not the same product. One governed value would be WRONG in most uses.
```

### Claim Analysis -- `p_paper`

```
Purchase ID    : p_paper
Current uses   : 13        Essential count: 13 / 13

qtyPerGuest    : VARIES(3)  -> undefined x11, 1 x1, 3 x1
qtyFlat        : VARIES(2)  -> 1 x11, undefined x2
unit           : VARIES(4)  -> "kit", "roll", "set", "ft"
category       : VARIES(3)  -> "logistics" x10, "decor" x2, "cleanup" x1
item text      : VARIES(13) -> THIRTEEN distinct strings across THIRTEEN uses

Shared claim   : NO
Reason         : Every use has a different item description. The unit is inconsistent
                 (a "kit" and a "roll" and "ft" are not comparable), and the category
                 spans logistics, decor and cleanup. This is 13 claims sharing a key,
                 not one claim used 13 times.
```

### Group B -- the 30 ungrounded costFactor decisions

```
UNGROUNDED : 30 of 46
WHY        : { "tier='synthesized'": 30 }   <- ALL of them, one reason
```

**This corrects my own Phase 5A-5 statement.** I wrote that these were *"one id away from
grounding"* because every one already has a `costFactorProvenance` object. That was wrong.
The object exists, but its `tier` is **`synthesized`** -- an honest self-report that no
research was done. `isGroundedCost` requires `tier === 'researched'`, so no source id can
rescue them.

**Group B needs new research, not correction.** Answering the brief's question directly:
not source-id correction, not evidence attachment, not KCR publication -- **research**.

---

## 3. KCR Artifacts Created

**None.**

The phase instruction was explicit: *"Do NOT publish until claim equivalence is proven."* For
two candidates equivalence is disproven. For the third it is proven and the source is missing.
Creating an artifact anyway would have meant citing a portion guide for trash bags.

The pipeline remains at **2 published artifacts** (`p_crabs.provenance`,
`p_wine.provenance`), both still passing.

---

## 4. Product Impact

**Zero -- measured, not assumed.** No recommendation, explanation, budget figure or confidence
signal changed, because nothing was published.

The impact this phase *did* produce is a corrected plan:

| | Phase 5A-5 said | Phase 5A-6 measured |
|---|---|---|
| Pilot scope | 3 KCRs -> 57 instances | **1 candidate survives, and it is blocked** |
| `p_tableware` | high-value target | **rejected -- not one claim** |
| `p_paper` | high-value target | **rejected -- 13 claims sharing a key** |
| Group B | "one id away from grounding" | **all 30 need research** |
| Binding constraint | selecting the right knowledge | **the research itself is missing** |

---

## 5. Risks

### FACTS (verified this session)

- F1. `p_cleanup`: quantity fields identical in 26/26; `unitCostRange` varies across 12
  distinct ranges; item text varies across 21 distinct strings.
- F2. `p_tableware`: `qtyPerGuest` takes 5 distinct values (1.5 / 2 / 2.5 / 3); `category`
  splits rental (15) vs logistics (3).
- F3. `p_paper`: 13 distinct item texts across 13 uses; 4 distinct units; 3 categories.
- F4. All 30 ungrounded costFactor decisions carry `tier: 'synthesized'`.
- F5. `purchase.provenance` is consumed by exactly two readers -- `isGroundedItemQty`
  (quantity) and `HostShellV2:9357` (renders `provenance.note`). **`isGroundedCost` reads
  `costFactorProvenance` on decisions and never a purchase's block.**
- F6. `QTY_SOURCES` holds 3 ids, all food/drink portion guides. No source in any of the 111
  covers cleanup supplies, tableware or paper goods.

### CORRECTION to a prior report

Phase 5A-5 recorded (F6) that *"one provenance block serves both the cost and the quantity
claim."* **That is wrong** and is withdrawn. Purchase provenance grounds **quantity only**.
The distinction matters: it is why `p_cleanup` survives equivalence at all -- its cost varies
12 ways, but cost is not what this field grounds.

### ASSUMPTIONS (not proven)

- A1. That "one cleanup kit per event" is *correct*, not merely *consistent*. All 26 agree,
  but agreement across copies of an unsourced assumption is not evidence -- it may be one
  author's guess propagated 26 times.
- A2. That the 21 differing `item` texts describe the same underlying kit. They overlap
  ("bags, paper towels, wipes" vs "bags, paper towels, foil") but I did not verify the sets
  are equivalent.
- A3. That no source outside the 111 registry entries covers these categories. I searched the
  registries, not the wider evidence corpus.

### RISKS

- R1. **A1 is the sharp one.** Governing a claim that 26 playbooks agree on would make a
  possibly-wrong assumption look *researched*. That is worse than leaving it ungrounded --
  it converts an honest gap into a false assurance, which is precisely the trust damage this
  whole programme exists to prevent.
- R2. `provenance.note` renders in the UI (F5). A single governed note across 26 playbooks
  with 21 different item texts would display the same sentence under materially different
  items.
- R3. Chasing "shared id" leverage biases toward generic commodity lines -- exactly the claims
  least likely to have authoritative sources. The high-value, well-sourced claims (crab
  pricing, wine provisioning) are **playbook-specific**, which is the opposite of the
  leverage heuristic 5A-5 proposed.

---

## 6. Next Decision Gate

**Recommendation: CHANGE STRATEGY.**

The evidence points somewhere other than all four options in the brief.

**Do not expand governance** -- there is nothing qualified to publish.
**Do not continue this pilot** -- its three candidates are exhausted.
**Do not stop the programme** -- the pipeline works, proven twice.

**Change the selection criterion.** The 5A-5 heuristic (*maximum reuse*) selects commodity
supplies, which are the claims least likely to have an authoritative source. Both artifacts
that *did* publish successfully were **single-playbook, domain-specific claims backed by a
real source that already existed** -- DMV crab retail pricing, and wine provisioning.

**The criterion that actually predicts success is source availability, not reuse.**

Concretely, the next step is a **source-first** pass rather than a claim-first one: take the
111 registry sources, and for each ask which claims it could ground. That inverts the search
and returns only claims that are publishable today. It needs no new architecture, no
migration, and no research budget -- and it will produce a candidate list where the blocker
this phase hit cannot occur by construction.

If that pass returns too few candidates to matter, the honest conclusion is that **NGW's
knowledge layer is source-constrained, not infrastructure-constrained** -- and the next
investment is research acquisition, not engineering.

---

## Deferred (unchanged)

- source resolver migration (PARK -- trigger: >~100 items with `sources[]`, or one id needed
  in two axes)
- registry consolidation
- 219-item purchase backfill
- `unitCostRange` runtime wiring
- recommendation-engine and AI-reasoning integration
