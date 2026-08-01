# Phase 5F.2 - Source Governance: Report

**Date:** 2026-08-01. ASCII-only.
**Baseline:** `a8f82dac` (acquisition capability guard).
**Gates:** 303 suites / 4659 tests passing . `gate:knowledge [OK]` . `gate:hostv2` no drift . eslint 0 errors.

---

# 1. Existing source systems - audited

| System | Size | Imported by | Cited in corpus | Can ground a host claim |
|---|---|---|---|---|
| `providers.js` | 16 families | admin console only | **0 of 16** | **No** |
| `providerMonitor` | 379 lines | admin only | - | No |
| `providerHealth` | 81 lines | admin only | - | No |
| `researchBlueprint` | 274 lines | admin, missionControl, campaignRunner | - | No |
| `campaignRunner` | 353 lines | admin, missionControl | - | No |
| `groundingSources.js` | 112 | App, decisionEvidence, publishedExport | union view | **No** - projection, not authority |
| **~20 per-axis `*_SOURCES`** | ~107 | their own predicates | yes | **YES** |
| evidence objects | 0 in store | created by campaignRunner | no | **No** |

```
Declared capability:  provider intelligence feeding governed knowledge
Actual runtime impact: none - zero imports from hostv2, the playbooks engine,
                       or any knowledge-runtime file
```

## 1.1 The Phase 5F correction

5F called `groundingSources.js` a rival vocabulary. **It is a union projection** - its
own header says so, and it imports the 20 axis registries to build itself. NGW already
had the right architecture; the earlier report mis-read it. Correcting this changed the
design of this phase: nothing new was built, because the authority already existed.

## 1.2 QTY_SOURCES - the one that matters

- **Schema:** `{ org, url, fetched, claim }` per id. Every field is present on all 4.
- **Registration:** a code change to `quantityProvenance.js`. Deliberate - deciding who
  may be believed should not be a text box. It needs a review path, not removal.
- **Consumers:** `isGroundedItemQty` -> `qtyGrounded` -> hostv2's "Sourced -" line.
- **Validation:** `tier === 'researched'` AND **every** cited id resolves. `.every()`, so
  one bad id ungrounds the whole claim.
- **Ownership:** the predicate. There is no second reader.

## 1.3 Evidence objects

- **Creation path:** `campaignRunner` -> `createEvidence`. Store holds **0**.
- **Consumers:** none on the governed path.
- **Relationship to KCR:** a KCR carries `evidence[]`, but the publish gate checks
  `provenance.sources[]`, not evidence records.
- **Relationship to host grounding:** none. `isGroundedItemQty` never sees them.

---

# 2. Authority decision

## **The per-axis registry that a field's predicate reads IS the approved-source list for that field.**

No new registry. Full model: `SOURCE_AUTHORITY_MODEL.md`.

`sourceAuthority.js` is a ~150-line pure module that maps field -> axis -> registry ->
predicate. It holds no data of its own; `SOURCE_AXES.quantity.registry` **is**
`QTY_SOURCES` by reference, pinned by a test.

---

# 3. What was built

| File | Change |
|---|---|
| `src/lib/knowledge/sourceAuthority.js` | **NEW** - axis map, `approvedSourcesFor`, `validateSourcesFor`, `wouldGround` |
| `src/lib/knowledge/sourceAuthority.test.js` | **NEW** - 14 tests |
| `src/admin/AdminConsole.jsx` | free-text source box **replaced** by an approved-source picker with a live grounding verdict; `validateSourcesFor` also enforced at submit |

## 3.1 The defect closed

Free text allowed `usda-meat-2026` (real, but a COST source) on a purchase provenance.
It published, passed three review gates, baked - and then `isGroundedItemQty` refused
it, `qtyGrounded` stayed false, the host showed no source, and **nothing reported an
error**. A silent ungrounding is indistinguishable from never doing the work.

Now, in the composer, before anything is created:

> `"usda-meat-2026" is a Cost & pricing source and cannot ground a quantity & serving
> guidance claim - isGroundedItemQty would reject it and the host would show no source.`

and for a valid selection:

> `Will ground - qtyGrounded -> the host's "Sourced -" line on a shopping row`

Both come from running the **real predicate**, so the message cannot be merely plausible.

---

# 4. Runtime consumers

```
QTY_SOURCES  ->  isGroundedItemQty  ->  qtyGrounded  ->  hostv2 "Sourced -" line
COST_SOURCES ->  isGroundedCost     ->  costGrounded ->  decision cost factors
```

Verified live this phase, end to end, on a previously-ungoverned asset.

---

# 5. Rejected architectures

A new unified registry (forbidden, and would be a fourth vocabulary with no predicate);
promoting `groundingSources` (a projection - would ground claims on 112 mostly-bare
ids); promoting `providers.js` (0 of 16 cited); one flat allow-list (would let a fire
code ground a serving quantity); auto-setting `tier: 'researched'` on selection
(selecting a source is not judging that it supports the claim - pinned by a test);
free text with a warning (a warning that can be ignored is how 8 unresolvable URLs got
into the corpus).

---

# 6. Browser proof - the full operator path

Driven with real pointer events, on an asset that **had never been governed**:

```
Acquisition -> filter Fish Fry -> Ice p_ice -> provenance . missing-provenance
  -> "FROM ACQUISITION - never governed"
  -> APPROVED SOURCES - Quantity & serving guidance . grounded by isGroundedItemQty
       bar-provision-2026        captured 2026-07-16
       reddy-ice-2026            captured 2026-08-01
       webstaurant-portions-2026 captured 2026-07-16
       webstaurant-protein-2026  captured 2026-07-16
  -> select reddy-ice-2026 -> "Will ground - qtyGrounded -> the host's Sourced line"
  -> claim note + confidence + reason
  -> correction created: tier=researched, sources=["reddy-ice-2026"], correctionOf ABSENT
  -> SME + editorial + governance -> Mark approved -> Publish
  -> export (8 records) -> bake (snapshot 8e68a877, 7 entries) -> hostv2
```

**Host output:**

```
BEFORE   31.5 lbs . 1.5 lb/guest . qtyGrounded=false . no Sourced line
AFTER    42 lbs   . 2 lb/guest   . qtyGrounded=true

  Ice  essential                                    $8-$17
  42 lbs . Grocery, Gas station
  2 lb/guest x 21 guests . typical . often forgotten
  Sourced - Reddy Ice publishes 1-2 lb of ice per person; its own worked
  outdoor-BBQ example computes to 2.1 lb/guest (50 guests = 15 seven-pound
  bags = 105 lb). A Fish Fry is an outdoor propane-fryer cook, so the outdoor
  case applies. CAVEAT: a packaged-ice vendor profits from a higher figure -
  treat 2 lb as ceiling-leaning planning, not a measured mean.

AUTHORED FILE   qtyPerGuest: 1.5, provenance: null   UNCHANGED
```

The caveat is the part worth noting: a human wrote "a packaged-ice vendor profits from
a higher figure" and it is now on the host's screen. No automated pipeline produces
that sentence.

---

# 7. Stop conditions

| Condition | Status |
|---|---|
| One source registry is clearly authoritative | **PASS** - per-axis, predicate-owned; documented |
| Admin can select trusted sources | **PASS** - picker with org, capture date, claim on hover |
| Source-field compatibility enforced | **PASS** - picker + submit gate; wrong-axis named specifically |
| Host grounding still works | **PASS** - driven end to end after the change |
| Providers have a defined role | **PASS** - watchdogs (freshness / availability / change detection), not content |
| Free-text citations removed | **PASS** - the input is gone |

---

# 8. Remaining gaps

- **Freshness is recorded but not enforced.** `reddy-ice-2026` is captured `2026-08-01`;
  nothing will ever say it is a year old. This is the first real job for the monitor.
- **~8 raw URLs still in the corpus** `sources[]` arrays. They have never grounded.
  Needs a lint plus a migration decision: register or remove.
- **13 other axes** have registries and predicates but no picker - the composer only
  corrects purchase fields.
- **Cost axis is effectively 2 sources**, one having had its grounding withdrawn in 5C.1.
- **Registering a source is still a code change** - correct for now, but it is the
  throughput ceiling on any large backfill.

---

# 9. Phase 5F.3 readiness

**Ready.** All six stop conditions pass.

`p_ice` across the remaining playbooks is now doable entirely through the tool:
asset picker reaches all 39, source picker offers the two registered sources that
bracket the corpus (`bar-provision-2026` at ~1.5 lb/guest general,
`reddy-ice-2026` at ~2 outdoor), and the correction workflow is proven on both
lineage origins.

**One judgement to make before starting, not during:** the 29 `p_ice` lines are not 29
identical corrections. They split indoor(1.0-1.5) / outdoor(2.0-2.5), and a few
(Housewarming 1.25, Sweet 16 1.25) sit cleanly in neither. That classification should
be decided and written down first, or the backfill will quietly round toward whichever
source was selected most recently.
