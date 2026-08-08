# The admin backlog points away from the work — and the fix is governed, not a code edit

_2026-08-07. Task #10. Attempted, reverted, and this is why._

## The finding

`isGroundedItemQty` (`src/lib/knowledge/quantityProvenance.js:104`) is the sole
predicate behind `fieldState`, and therefore behind everything the admin console
shows an operator as outstanding. It tests:

```js
prov.tier === 'researched'
  && Array.isArray(prov.sources) && prov.sources.length > 0
  && prov.sources.every((s) => !!QTY_SOURCES[s])
```

Measured against the real corpus, that inverts the backlog:

```
crabFeast.p_crabs       cited      tier: primary      4 sources  -> needs-research
crabFeast.p_softdrinks  researched tier: researched   1 source   -> correctable
```

The best-evidenced item in the product — four named DMV vendors, phone numbers,
dated July 2026 quotes — is sent back for research, while a single-source price
reads as done. An operator working this backlog would re-research the crab
pricing and never see the 39 uncorroborated ones.

Three separate disagreements with doctrine:

1. **It tests ONE TIER STRING.** `groundingDoctrine.js` exists precisely so every
   axis stops doing that — `isGroundedTier` is "the one uniform test every axis
   should use". `primary` is not even mapped in `TIER_ALIASES`, so first-hand
   dated evidence scores as ungrounded.
2. **It ignores CORROBORATION.** `RESEARCH_POLICIES.pricing.corroborationRequired`
   is `true` — "always corroborate across >=2 sources". `sources.length > 0`
   lets 39 single-source claims pass.
3. **It demands QTY_SOURCES registry ids**, while the cited corpus carries raw
   URLs and named vendor strings. Real evidence fails on its FORMAT.

## Why the fix was reverted

Changing the predicate broke **19 suites / 59 tests**, and one of them is named:

> `4 — NO TRUST EXPANSION: grounding outcomes are unchanged`

That is a governance decision encoded as a test. The corpus's grounding
outcomes are deliberately frozen, and a predicate edit is exactly what it is
built to stop. It was right to fail.

One of my three edits also deserved to fail on its own merits. To let the crab
vendors' named-source strings resolve I allowed "any string >= 12 characters" to
count as a source — which breaks `a partially-resolving source list never
grounds`, and would let an unverifiable string ground a price. That is trust
expansion wearing the costume of a fix.

## What the change actually requires

Not a code edit — a governed one, in this order:

1. **Rule on what `grounded` means for a priced claim.** Basis via the canonical
   ladder (`isGroundedTier`) rather than a literal tier, and corroboration at
   `>=2` per the pricing policy. Both are doctrine-backed today; neither is
   implemented.
2. **Map `primary` (and probably `culture-bearer`) onto the ladder.** A named,
   dated first-hand quote is `GROUNDING_TIERS.cited` by its own definition
   ("a specific, dated, authoritative source is named"). Unmapped tiers stay
   visible by design — this one looks missed, not excluded.
3. **Decide the source FORM question.** Either register the cited URLs and vendor
   strings as QTY_SOURCES entries (keeps resolution strict, which the
   partially-resolving test demands), or define a second resolvable form with a
   real validator — never a length heuristic.
4. **Then re-baseline `NO TRUST EXPANSION` in the same commit**, deliberately,
   with the new outcomes stated. That suite is the record of what the corpus is
   allowed to claim; moving it silently would be the actual defect.

Step 3 is the load-bearing one: until the 4 crab sources and the other cited
URLs exist as registered sources, no predicate change can score them as grounded
without weakening resolution for everything else.

## Already landed

- 541/541 priced items labelled, 0 unlabelled, 21 authored string forms intact.
- `researchPolicyCompliance.test.js` — a ratchet at 39 uncorroborated / 43
  undated, so the gap is visible and cannot grow.
- `grounding:audit` (text) and `grounding:census` (objects), cross-checking.
