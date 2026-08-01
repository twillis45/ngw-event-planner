# Phase 5A-4 -- Source Identity Audit

**Date:** 2026-08-01 - **READ-ONLY. No code modified, no migration created.**
**Question:** how do we eliminate competing source registries without breaking grounding?

---

# Headline: the premise needs correcting before the design

The brief describes "competing source registries" and a prose-vs-id failure across a large
corpus. Measured, three of those assumptions do not hold:

1. **The registries do not compete.** `SOURCE_CATALOG` rates provider FAMILIES; the per-axis
   `*_SOURCES` maps hold CITATIONS. The code states the distinction explicitly, and their id
   spaces are **disjoint (0 overlap)**. Two layers, not two competitors.
2. **A unifier already exists.** `groundingSources.js` unions **20 axis registries / 111
   sources** into one normalized shape. It is a READ layer, not a validation layer -- and that
   gap is the real finding.
3. **The problem is far smaller than 368 items.** Of 537 purchases, **45** carry a non-empty
   `sources[]`. **38 (84%) fully resolve.** **7 do not.** Zero are partially resolved.

The actual defect is not identity collision. It is **absent identity** -- 492 of 537 priced
items cite nothing at all -- plus **7 items that cite raw URLs and prose instead of ids**.

---

# 1. Current State Map

```
                          EVIDENCE (KCR)
                                |
                                v
                       KCR proposal.newProvenance
                          { tier, confidence,
                            verificationStatus,
                            sources[] }
                                |
                    publishKCR -> bake -> snapshot
                                |
                                v
                        effectiveValue()
                                |
                   +------------+------------+
                   |                         |
          published/override            AUTHORED playbook
             provenance                  purchase.provenance
                   |                         |
                   +------------+------------+
                                |
                                v
                    purchaseProvenance()   [playbooks/index.js]
                                |
                                v
                      isGroundedItemQty(prov)
                                |
                                v
                   prov.sources.every(s => !!QTY_SOURCES[s])
                                            ^
                                            |
                              DIRECT MAP LOOKUP - 3 entries


   SEPARATE, PARALLEL, AND NOT ON THIS PATH:

   SOURCE_CATALOG (22 provider families)          groundingSources.js
        |                                          unions 20 axis registries
        +--> getSource / validateSource            -> 111 normalized sources
        +--> sourcesForDomain / ForProvider        -> groundingSourceCatalog()
        |                                          -> groundingSourceStats()
        +--> consumed by: AdminConsole,                   |
             groundingSources.js                          +--> consumed by:
                                                               AdminConsole (display)

   NOTHING connects groundingSourceCatalog() to any isGrounded* predicate.
```

**The one-line diagnosis:** every `isGrounded*` predicate resolves against its own small map
by direct key lookup. The unified catalogue that already knows all 111 ids is used for
*display*, never for *validation*.

---

# 2. Registry Inventory

| Registry | Location | Purpose | Shape | Consumers | Status |
|---|---|---|---|---|---|
| `SOURCE_CATALOG` | `sourceCatalog.js` | rate provider FAMILIES | `id, name, family, authority, domain[], coverage, reliability, freshnessPolicy, commercialBias, regionalScope[], seasonal, licensing, evidenceTypes[], confidenceContribution, url, notes` | AdminConsole, groundingSources | **22 entries. Not on any grounding path.** |
| `COST_SOURCES` | `costProvenance.js` | cost citations | `org, url, fetched, claim` | `isGroundedCost`, `costSourcesFor`, groundingSources | 3 entries. **On the grounding path.** |
| `QTY_SOURCES` | `quantityProvenance.js` | quantity citations | `org, url, fetched, claim` | `isGroundedItemQty`, `qtySourcesFor`, groundingSources | 3 entries. **On the grounding path.** |
| `TIMING_SOURCES` | `timingProvenance.js` | timing citations | same family | `isGroundedTiming`, groundingSources | 10 entries. On the path. |
| 16 further axis registries | `culturalContext`, `accessibilityContext`, `legalContext`, `venueContext`, `weatherContext`, `humanContext`, `dietaryContext`, `budgetContext`, `childcareContext`, `militaryRetirement`, `destinationContext`, `incidentContext`, `foodSafetyContext`, `fireSafetyContext`, `bookingRiskContext`, plus `tableTypes`, `lodgingIntel` | per-axis citations | same family | one `isGrounded*` each, + groundingSources | **20 axes / 111 sources total** |
| `groundingSourceCatalog()` | `groundingSources.js` | **union of all axes** | normalized `{ id, title, publisher, tier, canonTier, tierLabel, grounded, note }` | AdminConsole only | **Already the unifier -- read-only** |
| `groundingDoctrine.js` | -- | `normalizeTier`, `tierInfo`, `isGroundedTier` | tier ladder | groundingSources | The one canonical tier vocabulary |

**Measured tier distribution across the 111 unified sources:**
`unspecified 87 - established-consensus 18 - cited 4 - researched 2`

---

# 3. Source Identity Problems

## Duplicate identity -- **NOT FOUND**

**FACT.** Zero ids appear in more than one axis registry (0 of 111). Zero axis ids collide
with `SOURCE_CATALOG` ids. The two id spaces are disjoint by construction: `SOURCE_CATALOG`
names providers (`bls-cpi`, `usda-ers`, `sysco-pricing`, `servsafe`), the axes name citations
(`webstaurant-protein-2026`, `bar-provision-2026`, `theknot-vendors`).

The brief's example -- `"WebstaurantStore"` vs `"webstaurant-protein-2026"` -- is a
**provider-vs-citation** relationship, not a duplicate. WebstaurantStore is not in
`SOURCE_CATALOG` at all.

## Missing identity -- **CONFIRMED, and it is the real problem**

**FACT.** Of 537 purchases: 169 have a provenance object; only **45** have a non-empty
`sources[]`; **492 cite nothing**.

Of the 45 that do cite:

```
ALL ids resolve      : 38   (84%)
SOME resolve (mixed) :  0
NONE resolve         :  7   (16%)
```

The 7 non-resolvers use **raw URLs and prose names** where a registry id belongs -- 10 distinct
strings, e.g. `https://www.eatlikenoone.com/chicken-prices-at-costco...` (3x),
`https://www.beyondforest.org/post/costco-meat-prices` (2x), and the `p_crabs` DMV retailer
names from the brief.

**This is 7 items, not 368.** The scaling risk is that 492 items have no identity to
consolidate, not that existing identities conflict.

## Shape mismatch -- **CONFIRMED, but the adapter already exists**

`SOURCE_CATALOG` entries and axis entries have different shapes, as the brief says. But
`groundingSources.js` **already normalizes all 20 axes** into
`{ id, title, publisher, tier, canonTier, tierLabel, grounded, note }`. The normalizer is
built, tested by use, and consumed by Admin. It has simply never been offered to the
predicates.

---

# 4. Recommendation

## Option A -- Expand `COST_SOURCES` / `QTY_SOURCES`

**Benefits:** zero architectural change; each addition is a one-line map entry; grounding
behaviour provably unchanged for the 38 resolving items.
**Risks:** entrenches 20 parallel maps; adding a source to two axes means duplicating it; the
shape mismatch with `SOURCE_CATALOG` persists forever.
**Migration cost:** near zero.
**Long-term:** it is the status quo. Scales linearly in maintenance.
**Verdict: PARK.** Correct for the 7 broken items today; wrong as the model for hundreds.

## Option B -- Replace everything with `SOURCE_CATALOG`

**Benefits:** one registry, one shape, rich metadata.
**Risks:** **high, and structural.** `SOURCE_CATALOG` models providers; the axes model
citations. Collapsing them loses the distinction between *"USDA is a reliable publisher"* and
*"this specific 2026 USDA table says beef is $9.64/lb."* Every one of **15 `isGrounded*`
predicates** would change simultaneously; **all 111 ids** would need re-homing; 38 currently-
grounded items are at risk of silently ungrounding.
**Migration cost:** very high.
**Long-term:** a worse model wearing a tidier name.
**Verdict: KILL.**

## Option C -- Resolver layer over the existing registries

**Benefits:** additive; the unifier (`groundingSourceCatalog`) already exists and already
normalizes all 20 axes; predicates can adopt it one axis at a time; `SOURCE_CATALOG` keeps its
distinct provider role and can later be *linked* to citations rather than merged with them.
**Risks:** a resolver that is more permissive than the current map lookup would silently
ground things that are not grounded today -- the one failure mode that must not ship.
**Migration cost:** low, and reversible per-axis.
**Long-term:** one identity surface, 20 registries reduced to data.
**Verdict: EXECUTE -- but not yet. See section 8.**

---

# 5. Proposed Future Model (design only)

```
        20 axis registries (data)              SOURCE_CATALOG (providers)
                  |                                      |
                  +------------------+-------------------+
                                     |
                             resolveSource(id)
                                     |
              +----------------------+----------------------+
              |                      |                      |
     isGroundedItemQty       isGroundedCost         13 other predicates
```

## `resolveSource(id)` responsibilities

**Must:**
- return the citation record for a known id, or `null` -- never throw, never guess
- be **exactly as strict as today's map lookup**: unknown id -> `null` -> ungrounded
- carry the axis it came from, so a cost claim cannot be grounded by a timing citation
- expose the normalized shape `groundingSources` already produces
- optionally link a citation to its `SOURCE_CATALOG` provider **without requiring one**

**Must not:**
- accept a URL or prose string as an id (that is the 7-item data defect, not a resolver job)
- infer a tier
- widen what counts as grounded

**The safety property that makes this shippable:** for the 111 ids that resolve today,
`resolveSource(id) !== null` must be true for exactly the same set. That is a testable
equivalence, not a judgement call.

---

# 6. Migration Strategy (sequence only, not implemented)

| Phase | Step | Reversible? |
|---|---|---|
| 1 | Add `resolveSource()` beside the existing maps. **No predicate changes.** Gate: for all 111 ids, resolver and map agree; for a sample of unknown ids, both return falsy. | trivially |
| 2 | Move **one** predicate -- `isGroundedItemQty` -- to the resolver. Gate: the 38 resolving purchases keep the identical grounded/ungrounded verdict, asserted item-by-item. | revert one line |
| 3 | Move `isGroundedCost`. Same equivalence gate. | per-axis |
| 4 | Move the remaining 13 predicates, one per change. | per-axis |
| 5 | Only once all predicates route through the resolver: collapse the axis maps into one data file. **Retirement is last, never first.** | data-only |

**Separately, and not part of consolidation:** fix the 7 items citing URLs/prose. That is a
data correction, and -- as 5A-2 and 5A-3 proved -- it can be done through the **governed KCR
path without editing playbook files**.

---

# 7. Risk Review

| Risk | Assessment |
|---|---|
| **Breaking existing KCR artifacts** | LOW. The two published KCRs cite `webstaurant-protein-2026` and `bar-provision-2026`; both are registry ids that resolve today and would resolve through any faithful resolver. |
| **Breaking authored playbooks** | LOW **if** the resolver is strictly equivalent. 38 purchases currently ground; a permissive resolver could ground more (silently wrong), a stricter one fewer (visible regression). The Phase-1 equivalence gate exists to catch both. |
| **Stale source ids** | MEDIUM, and **pre-existing**. 87 of 111 sources carry no tier and there is no freshness enforcement. `SOURCE_CATALOG` has `freshnessPolicy`; the axis registries have only a `fetched` date nobody checks. Consolidation is the moment to expose this -- it does not create it. |
| **Source provenance rollback** | LOW. Rollback operates on the published snapshot, not on registries. Proven in 5A-2/5A-3 and unaffected. |
| **Governance impact** | NONE if scoped as above. The resolver sits below `effectiveValue()`, downstream of every review gate. It changes how an id is *looked up*, never whether a KCR may publish. |

---

# FACTS / ASSUMPTIONS / RISKS

## FACTS (verified in code this session)
- F1. 20 axis registries, **111 source ids**, unioned by `groundingSources.js`.
- F2. `SOURCE_CATALOG` = **22** provider entries with `validateSource`.
- F3. **0** id collisions across axes; **0** overlap with `SOURCE_CATALOG`.
- F4. **0** registry ids contain whitespace -- no prose ids in any registry.
- F5. 537 purchases -> 169 with provenance -> **45 with sources[]** -> **38 resolve, 7 do not, 0 mixed**.
- F6. The 7 failures cite raw URLs and prose names (10 distinct strings).
- F7. **15** `isGrounded*` predicates exist; the playbook engine calls **15** of them.
- F8. Every predicate resolves by direct map key lookup against its own axis registry.
- F9. `groundingSourceCatalog()` is consumed by AdminConsole only -- no predicate uses it.
- F10. Tier coverage across the 111: **87 unspecified**, 18 established-consensus, 4 cited, 2 researched.

## ASSUMPTIONS (not proven here)
- A1. That `groundingSources.js`'s normalizer is lossless for every axis. It is used for
  display; I did not diff every axis entry against its normalized form.
- A2. That no consumer outside `src/` depends on the axis maps' raw shape.
- A3. That the 7 URL/prose citations are recoverable -- the underlying research may be real,
  but I did not verify each URL resolves to a live, citable source.

## RISKS
- R1. A permissive resolver silently grounds what is not grounded -- the one unacceptable
  outcome. Mitigated by the strict-equivalence gate in Phase 1.
- R2. Consolidation could be mistaken for fixing the 7 broken citations. It is not: those are
  data, and remain broken after any registry change.
- R3. 87 untiered sources are a latent trust problem that consolidation will make visible.
  That is a benefit, but it will look like a regression in any Admin health readout.

---

# 8. Final Recommendation

## Decision: **PARK -- for one measured reason, with an explicit unpark condition.**

Option C is the right architecture and I would execute it -- but **not as the next step**,
because the evidence says it is not the binding constraint.

**The measured constraint is coverage, not identity.** 492 of 537 priced items cite nothing.
Only 45 cite anything, and 84% of those already resolve correctly. A resolver layer would
improve the experience of **7 items** while 492 remain unsourced. Consolidating identity
before there is identity to consolidate is architecture ahead of need -- which the brief itself
warns against.

**What to do instead, in order:**

1. **Fix the 7 broken citations through the governed KCR path.** This needs no new
   architecture -- 5A-2 and 5A-3 proved the mechanism, and 5A-3's second artifact already
   demonstrated correcting a data defect without touching a playbook file. It also converts
   the abstract question into 7 concrete cases.
2. **Then re-measure.** If backfill pushes `sources[]` coverage from 45 toward several
   hundred, the 20-map model becomes a real maintenance cost and Option C's value is
   demonstrated rather than assumed.

**Unpark condition, stated so it is testable:** when **either** more than ~100 purchases carry
a non-empty `sources[]`, **or** a single source id needs to exist in more than one axis
registry, execute Option C starting at Phase 1. The second condition is the sharper trigger --
it is the first moment the current model is genuinely wrong rather than merely repetitive.

**What is NOT deferred:** the strict-equivalence gate from Phase 1 is worth writing now, even
parked. It is a pure test -- for all 111 ids, resolver and map agree -- and it makes the
eventual migration a mechanical change against a proven invariant instead of a judgement call.
