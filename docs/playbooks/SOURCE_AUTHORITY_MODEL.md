# Source Authority Model

**Date:** 2026-08-01. ASCII-only. Phase 5F.2 Step 2.
**Rule obeyed:** no new source registry was created.

---

# 1. The correction to Phase 5F

Phase 5F reported "three disconnected source vocabularies" and implied
`groundingSources.js` was a rival authority. **That was wrong**, and the correction
changes the whole design.

`groundingSources.js` opens by saying what it is:

> "this unions the per-axis `*_SOURCES` registries - the exact citations a grounded
> decision points at via its `sources` ids - so the admin can audit, in ONE place,
> every source the engine actually stands on."

It **imports 20 registries and unions them**. It is a read-only projection for audit,
not a competitor. NGW already had the right shape; 5F mis-read it.

---

# 2. The actual architecture

```
  ~20 PER-AXIS REGISTRIES              each owned by exactly ONE predicate
  QTY_SOURCES        (4)  -> isGroundedItemQty
  COST_SOURCES       (3)  -> isGroundedCost
  TIMING_SOURCES    (10)  -> isGroundedTiming
  LEGAL_SOURCES      (3)  -> isGroundedLegal
  CULTURAL_SOURCES   (6)  -> isGroundedCulture
  INCIDENT_SOURCES  (26)  -> (context surface)
  ... 14 more
        |
        |  union, read-only
        v
  groundingSources.js  (112)     admin audit projection
```

**A source is trusted FOR AN AXIS, never in general.** That is not fragmentation, it
is the correct shape: a meat-price series has no standing over a serving quantity,
and a fire code has none over a price. Fifteen predicates enforce fifteen separate
questions, and each reads only its own registry.

`providers.js` is **not** in this picture. Its 16 entries are acquisition FAMILIES
(authority tier + freshness defaults for handed-in records); none is a citable source
id, and none is cited anywhere in the corpus.

## 2.1 The authority rule

> **The per-axis registry that a field's grounding predicate reads IS the approved
> source list for that field.**

No new structure is needed to answer "what source may support this correction?" - the
answer was already determined by which predicate the host runs. `sourceAuthority.js`
only makes it *answerable by a UI, before publish instead of after*.

---

# 3. Field -> axis mapping

| Field | Axis | Predicate | Registry |
|---|---|---|---|
| `p_*.provenance` | quantity | `isGroundedItemQty` | `QTY_SOURCES` |
| `p_*.qtyPerGuest` | quantity | same | same |
| `p_*.qtyFlat` | quantity | same | same |
| `p_*.unitCostRange` | quantity | same | same |
| `p_*.priceLadder` | quantity | same | same |
| `p_*.servingGuide` | quantity | same | same |
| `*.costFactorProvenance` | cost | `isGroundedCost` | `COST_SOURCES` |
| anything else | none | - | claims no authority |

## 3.1 Why even `unitCostRange` is a QUANTITY-axis claim

The subtlety that governs the whole picker: **a purchase's value fields do not carry
their own sources.** A purchase has ONE `provenance` block, and `isGroundedItemQty`
reads it. So every citation on a purchase line is judged on the quantity axis, whatever
value field prompted the correction. `isGroundedCost` guards a different thing
entirely - a decision's `costFactorProvenance`.

Naming that explicitly matters, because "unitCostRange is about cost, so a cost source
should ground it" is the intuitive and wrong answer, and acting on it produces a claim
that publishes and never grounds.

---

# 4. Source authority record

Each entry already carries what a reviewer needs. `reddy-ice-2026`, registered 5F:

```
id        reddy-ice-2026
org       Reddy Ice LLC (packaged-ice manufacturer) - How Much Ice You Need for a Party
url       https://www.reddyice.com/how-much-ice-you-need-for-a-party/
fetched   2026-08-01                      <- a capture DATE, not "recent"
claim     States 1-2 lb of ice per person. Its own worked OUTDOOR BBQ example is
          50 guests = 15 seven-pound bags = 105 lb, i.e. 2.1 lb/guest ... Vendor-
          published and commercially interested in a higher number - corroborating,
          not independent.
```

Axis-level policy lives in `SOURCE_AXES`:

| | quantity | cost |
|---|---|---|
| **supports** | portion guides, serving guides, per-guest planning rates, operational guidance | retailer pricing, vendor pricing, market price series |
| **refuses** | retail price, vendor price, legal/safety requirements | serving quantities, portion guidance |
| **predicate** | `isGroundedItemQty` | `isGroundedCost` |
| **host impact** | `qtyGrounded` -> the "Sourced -" line on a shopping row | `costGrounded` on a decision's cost factors |

---

# 5. The defect this closes

The composer took a **free-text source id**. Typing `usda-meat-2026` - a real id, but a
COST source - produced:

1. correction created, no complaint;
2. three review gates passed;
3. published, exported, baked;
4. `isGroundedItemQty` requires EVERY cited id to resolve in `QTY_SOURCES`;
5. it does not, so `qtyGrounded` stayed **false**;
6. hostv2 rendered **no** "Sourced -" line;
7. **nothing, anywhere, reported an error.**

A silent ungrounding is indistinguishable from never having done the work. The same
path swallowed the ~8 raw URLs currently sitting in `sources[]` arrays in the corpus -
those claims have never grounded.

## 5.1 Enforcement, in two places

| Where | What |
|---|---|
| **Picker** | options come from the registry the predicate reads, so what can be cited and what can ground are the same list by construction. Free text is gone |
| **Submit** | `validateSourcesFor` runs again in `doCorrect` before the KCR is created |

Two places on purpose: a UI that merely omits an option is a suggestion. The draft is
still plain state, so the gate belongs where the record is made.

The picker also shows the verdict live, using the **real predicate**:

> `Will ground - qtyGrounded -> the host's "Sourced -" line on a shopping row`

or, for a wrong-axis id:

> `"usda-meat-2026" is a Cost & pricing source and cannot ground a quantity & serving
> guidance claim - isGroundedItemQty would reject it and the host would show no source.`

**`unknown` and `wrongAxis` are separated deliberately.** "That id does not exist" and
"that id is real but is the wrong kind of source" are different mistakes, and an
operator can only fix the second if told which it is.

---

# 6. Rejected architectures

| Rejected | Why |
|---|---|
| **A new unified "trusted source registry"** | Explicitly forbidden, and it would have been a fourth vocabulary with no predicate reading it - the exact fault this phase found in `providers.js` |
| **Promote `groundingSources.js` to authority** | It is a union projection. Pointing a predicate at 112 mostly-bare ids would ground claims on sources with no publisher, no date and no claim text |
| **Promote `providers.js` to source ids** | 0 of 16 are cited anywhere; they are acquisition families, not citations |
| **One flat allow-list across all fields** | Would let a fire code ground a serving quantity. Axis separation is the safety property |
| **Let the picker set `tier: 'researched'` automatically** | Selecting a source is not the same as judging that it supports the claim. Tier stays a human decision; pinned by a test |
| **Free text with a warning** | A warning that can be ignored is how the corpus acquired 8 unresolvable URLs |

---

# 7. Provider role - decided

**Providers become watchdogs, not content generators.**

```
        TRUSTED SOURCE REGISTRY  (per-axis, predicate-owned)
                    |
                    | monitored by
                    v
        PROVIDER MONITOR
          + freshness checks      (does this source need re-reading?)
          + availability checks   (is the URL still live?)
          + change detection      (has the published figure moved?)

   NOT:  provider -> evidence -> claim -> host
```

The audit basis: no provider module is imported by hostv2, the playbooks engine or the
knowledge runtime; 0 of 16 provider ids are cited; and the fetchers were fabricating
federal citations until Phase 5F.1 deleted them.

What survives the audit intact is `providerMonitor.js` (379 lines of freshness/overdue
rules) - aimed at exactly the gap the source registry has. `QTY_SOURCES` records *what
a source said when we read it* and has no opinion on whether that reading has gone
stale. `reddy-ice-2026` is captured `2026-08-01`; nothing today will ever tell anyone
it is a year old.

**That is the provider's real job.** Not intake - surveillance of what we already trust.

---

# 8. Migration needs

1. **~8 raw URLs in `sources[]`** resolve nowhere and have never grounded. They must be
   either registered as real sources or removed. Needs a lint.
2. **`freshnessDays` per axis** is not yet enforced. `FAMILY_DEFAULTS` in `providers.js`
   has the numbers; nothing reads them for a source registry entry.
3. **The Cost axis has 3 sources** and one of them (`usda-meat-2026`) had its grounding
   withdrawn in 5C.1. Effectively two.
4. **13 other axes** have registries and predicates but no picker; the composer only
   corrects purchase fields today.
