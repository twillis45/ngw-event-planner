# Phase 5F.7 - Evidence Coverage Report

**Date:** 2026-08-01. ASCII-only.
**Objective:** increase the number of knowledge claims that can honestly enter the
governed workflow.
**Outcome:** Type A **101 -> 131 (+30)**. One source registered, one refused. Seven
browser-only records reconciled to **0 promote / 7 archive**, with the single promotion
attempt reverted because the corpus's own invariant refused it.

---

# 1. Headline

**Two of the four tasks produced the opposite of what was planned, and both reversals are
the findings.**

1. The brief asked for **two** source categories - disposable supplies and cleanup
   supplies. Only one could honestly be registered. The 44 cleanup lines are
   `qtyFlat: 1, unit: 'kit'` - **one kit per event, not a per-guest rate** - so there is
   no quantity claim for a quantity source to ground. Registering one would have been
   exactly the "generic source without actual grounding ability" the brief forbids.
2. The plan was to promote the cleanest browser-only record into the corpus. Doing it
   **broke the suite**: `canReachCited` requires a citable evidence entry, and every
   committed record must be able to round-trip into a future correction. The record had
   `evidence: []`. It was reverted, and `no-evidence` was upgraded from an informational
   note to a promotion blocker.

Neither was predicted by 5F.6. Both were found by attempting the work.

---

# 2. Task 1 - Reconciling the seven

## 2.1 Decisions

| # | Record | Blockers | Decision |
|---|---|---|---|
| 1 | Crab Feast `p_oldbay.qtyPerGuest` (0.08) | corrupt-prior, mismatched-evidence | **ARCHIVE** |
| 2 | Crab Feast `p_paper.unitCostRange` ([24,48]) | corrupt-prior, mismatched-evidence | **ARCHIVE** |
| 3 | Crab Feast `p_ice.provenance` (reddy-ice) | mismatched-evidence | **ARCHIVE** |
| 4 | Fish Fry `p_ice.qtyPerGuest` (1.5 -> 2) | no-evidence | **ARCHIVE** |
| 5 | Fish Fry `p_ice.provenance` (reddy-ice) | no-evidence | **ARCHIVE** |
| 6 | Low Country Boil `p_ice.qtyPerGuest` (1.5 -> 2) | no-evidence | **ARCHIVE** |
| 7 | Dinner Party `p_ice.provenance` (bar-provision) | no-evidence | **ARCHIVE** (promotion attempted and reverted) |

**0 promote / 7 archive / 0 reject.** Nothing was silently imported; the corpus is
byte-identical to where it started.

## 2.2 Two defect families, not one

**Inherited residue (records 1-3).** All three were opened from the `p_crabs.provenance`
row and inherited its prior AND its evidence. Record 3 carries
`webstaurant-protein-2026` - a **protein portion guide** - as the sole evidence for an
**ice** claim.

5F.6's `corrupt-prior` check caught only 1 and 2, because it tests SHAPE: a
provenance-object prior is structurally valid for a provenance field even when its content
belongs to another purchase. Record 3 passed and should not have.

`evidenceSubjectMismatch()` now closes that, using the declared subject map: it reports a
mismatch only when both the field's purchase and the evidence source have a declared
subject and those subjects differ. An unmapped source or purchase says nothing.

**No evidence (records 4-7).** All four came through the 5F.2 first-governance path with
`evidence: []`.

## 2.3 The promotion that was refused

Record 7 was the strongest candidate in the set: value unchanged at 1.5 lb/guest, cited to
`bar-provision-2026`, which states *"ice ~1.5 lb/guest (12-15 bags per 100)"* - the exact
rate. Provenance-only, no money moves, indoor baseline. It was written into
`publishedKcrs.json` and baked.

Three tests failed. The load-bearing one:

```
evidence hydration (Phase 5C.9) > a snapshot-reconstructed KCR is now publishable end to end
  expect(canReachCited(prior)).toBe(true)   ->   false
```

`canReachCited` requires at least one evidence entry with a `source`/`url` and a
citation-type. `publishedExport.test.js` asserts EVERY committed entry can round-trip into
a future correction. An evidence-less record breaks it: **the field could never be
corrected again.**

The promotion was reverted. `no-evidence` is now a blocker returning `archive`, with a why
that says the value and reasoning still hold and the record should be redone through the
composer with the source attached as evidence.

> 5F.6 reported that missing evidence "does not by itself force a fate". That was wrong,
> and only trying it showed why.

## 2.4 Correction to 5F.6

5F.6 listed as "Unknown" whether `bar-provision-2026` legitimately grounds Dinner Party's
ice, suggesting a drinks source was being used for an ice claim. **It is not a scope
violation.** The source's own claim text includes ice at ~1.5 lb/guest, and the authored
value is exactly 1.5. The citation is sound; the record's only defect is the missing
evidence entry.

---

# 3. Task 2 - Source coverage

## 3.1 Registered: `jollychef-disposables-2026`

```
org       JollyChef (disposable-tableware retailer) - Disposable Tableware Math
url       jollychef.com/blogs/how-to-guides/calculate-disposable-tableware-quantity-event-guide
fetched   2026-08-01      lastVerified 2026-08-01      steward unassigned
claim     dinner plates guests x1.3 (buffet 1.3-1.5, plated 1.1, appetizer-only 2.5-3.0);
          cups and cutlery x1.5 (non-alc 1.5, beer/wine 2.0, full bar 2.5-3.0, hot 0.75);
          napkins x3. Worked example, 100 guests / 3h: 130 plates, 150 cups, 300 napkins.
```

**Reaches exactly 30 lines:** `p_tableware` (18), `p_napkins` (8), `p_cups` (4).

**Registered with its interest declared.** The publisher sells the product and profits
from a higher multiplier. Every comparable guide found (Kaya Collection, RedCupLiving,
ECO-Lipak, Love Confetti) is also a disposables retailer and they converge on the same
figures - which is trade consensus among interested parties, not independent
corroboration. Same treatment as `reddy-ice-2026`, and the caveat is in the claim text
where a reviewer will see it.

**It does not endorse the corpus's values.** Measured: `p_tableware` at 1.5 sets/guest
matches; `p_napkins` at 1.5-2 sits BELOW its stated 3x; Game Night's 6/guest sits well
ABOVE. Citing it does not make those values right - Type A means *a source exists on this
subject*, never *this line is ready*.

## 3.2 REFUSED: a cleanup-supplies source

The brief named cleanup supplies as the second-highest-leverage category, and 5F.5/5F.6
both recommended it. Checking the lines first killed it:

```
p_cleanup  26 lines   qtyFlat: 1  unit: 'kit'   $8-12   "Trash + recycling bags, paper towels, wipes"
p_paper    13 lines   qtyFlat: 1  unit: 'kit'   $10-20  "Paper goods (tablecloth, foil, containers)"
p_trash     2 lines   qtyFlat: 1  unit: 'kit'   $3-7
p_clean     2 lines   qtyFlat: 1  unit: 'kit'   $8-15
p_dish      1 line    qtyFlat: 1  unit: 'kit'   $8-15
           ---
            44 lines, ALL flat kits
```

**There is no per-guest quantity to ground.** "One kit per event" is a packaging decision,
not a researchable norm. Real waste-planning figures exist (Prime Dumpster publishes 8-12
lb of trash per wedding guest; several sources give one bag per 2-3 guests) and **none of
them can ground `qtyFlat: 1 kit`.** What is groundable on those lines is the $8-15
`unitCostRange` - a COST-axis question needing a cost source, not a quantity source.

Registering a waste source and mapping it to these lines would have moved 44 lines from B
to A on paper while grounding nothing. That is the failure mode the brief names, so the
source was not registered and the 44 lines stay Type B.

The recommendation in `TIER1_BACKFILL_READINESS.md` - "cleanup supplies, ~30 lines" - is
**withdrawn**. It was written from line counts without reading the lines.

---

# 4. Task 3 - Freshness metadata

Three fields are now modelled separately, because conflating them is how a source looks
current when nobody has re-checked it since the day it was first read:

| Field | Meaning | Coverage |
|---|---|---|
| `fetched` | CAPTURE - when the page was first read. Never changes | **91 / 113** |
| `lastVerified` | VERIFICATION - when a human last confirmed the claim holds | **2 / 113** |
| `steward` | OWNERSHIP - who is responsible for re-checking it | **2 / 113** |

**Age is measured from verification where one exists, capture otherwise** - "read a year
ago, confirmed last week" is fresh, and warning on the older date would be wrong.

```
113 sources    fresh 91   aging 0   stale 0   undated 22
gaps:  22 missing all three          89 missing lastVerified + steward
complete:  reddy-ice-2026, jollychef-disposables-2026
```

**No dates were invented.** The 89 sources missing verification and ownership are reported
as missing, not back-filled with the capture date - which would have made 91 sources look
re-verified when none had been. `steward: 'unassigned'` is a recorded value and is
distinguished from the field being absent; a test asserts both read the same and mean
different things.

Still no automatic invalidation. Four tests hold that line: an ancient source still
grounds at year 2099, computing freshness does not mutate the registries, the module
exports no `invalidate`/`expire`/`remove`/`fetch`/`refresh`/`withdraw`, and no row text
contains an instruction to delete or downgrade.

---

# 5. Task 4 - Inventory metrics

```
TOTAL CANDIDATES   537
├── grounded            38      7.1%
├── reviewed             1
├── ambiguous            6
├── needs-source       124
├── needs-provenance   368
├── blocked              0
└── unsupported          0
```

| Classification | 5F.6 | 5F.7 | Change |
|---|---|---|---|
| **Type A** - a source exists | 101 | **131** | **+30** |
| **Type B** - research needed | 394 | **364** | -30 |
| **Type C** - human decision | 3 | **3** | - |
| **Type D** - unsupported | 0 | **0** | - |
| needs work | 498 | 498 | - |

Reachable effort: **131 lines x 15 interactions = ~1,965.** Type B remains uncosted - the
research is the work and its size is unknown until somebody looks for a source.

`grounded` did not move, and that is correct: this phase expanded what *can* enter the
workflow. Nothing was published.

---

# 6. Also found: the console called archived records "published"

Not in the brief; found while reading the export.

`The Cookout p_ice.provenance` (tier `trade-heuristic`) and `Quinceanera p_ice.provenance`
(tier `norm`) - the two records archived in 5F.4 for grounding dishonesty - were listed in
the Publishing workspace under a heading reading **PUBLISHED FIELDS**.

Two questions with different answers:

| Question | Answer |
|---|---|
| Can an archived record reach a HOST? | **No.** `isPublishable` requires `status === 'published'`; the bake refuses it and reports the refusal |
| Could an OPERATOR believe it was live? | **Yes.** The export carries it deliberately so rollback history is not deleted, and the console labelled the whole export "published" |

The data flow was right and the console was lying - precisely this programme's subject.
The heading now reads *"IN THE EXPORT - every version ever published, including superseded
and archived. Only published rows reach a host"*, and each row shows its status.
`archivedNeverServes.test.js` pins both halves so neither can drift.

My 5F.5 report answered *"Can archived records return? No"* - correct about runtime, and
it never distinguished the two questions.

---

# 7. Verification

| Gate | Result |
|---|---|
| Full suite | **313 suites / 4811 tests passing**, 1 skipped (was 312 / 4793) |
| `gate:knowledge` | `[OK]` snapshot up to date |
| `gate:hostv2` | no drift (12 files, artifact regenerated - the new source is bundled via `@app`) |
| corpus integrity | 14 tests passing across `corpusIntegrity` + `authoredCorpusIntegrity` |
| eslint | 0 errors in product source |
| Governed artifacts | **byte-identical to phase start** - the promotion was reverted |

**+18 tests.** New: `archivedNeverServes.test.js` (5). Extended: reconciliation
(+6, incl. the evidence-mismatch family and the corpus evidence invariant), freshness (+6
for the three metadata fields), classification (+2).

---

# 8. Files changed

## New
`src/lib/knowledge/archivedNeverServes.test.js`

## Modified
| File | Change |
|---|---|
| `src/lib/knowledge/quantityProvenance.js` | registered `jollychef-disposables-2026`; added `lastVerified` + `steward` to it and `reddy-ice-2026` |
| `src/lib/knowledge/backfillClassification.js` | new subject entry (3 ids); comment recording why no cleanup source exists |
| `src/lib/knowledge/backfillClassification.test.js` | kit-line assertion replaces the category assertion; new-source reach pinned |
| `src/lib/knowledge/governanceReconciliation.js` | `evidenceSubjectMismatch()`; `mismatched-evidence` blocker; `no-evidence` promoted to a blocker |
| `src/lib/knowledge/governanceReconciliation.test.js` | mismatch family; corpus evidence invariant; fixture matches the real store |
| `src/lib/knowledge/sourceFreshness.js` | three metadata fields, verification-first age basis, `metadataGaps()` |
| `src/lib/knowledge/sourceFreshness.test.js` | 6 tests for the metadata model |
| `src/lib/knowledge/sourceResolverInvariant.test.js` | source count pin 112 -> 113 |
| `src/admin/AdminConsole.jsx` | export heading corrected; per-row status |
| `public/hostv2/*` | artifact regenerated (5 chunk files + index.html) |

Carried and still uncommitted: everything from 5F.5 and 5F.6.

---

# 9. Findings

## Fixed
- **`mismatched-evidence`** - a subject-mismatched evidence citation is now caught; 5F.6's
  shape-only check missed one of three.
- **`no-evidence` is a blocker**, established by attempting a promotion and being refused.
- **The console no longer calls archived records published.**
- **Type A +30**, from one source registered where it can actually ground.
- **Freshness has three fields**, with verification and ownership reported honestly as
  near-absent rather than back-filled.

## Remaining
| Risk | Severity |
|---|---|
| All 7 browser-only records remain unreconciled in the store | **Medium** - decided here, but archiving them in the browser is a UI action nobody has taken |
| 4 records need redoing with evidence attached | **Medium** - ~15 interactions each; the reasoning is already written |
| 89 sources lack verification date and steward | **Medium** - they can age but nobody owns re-checking them |
| 22 sources undated | **Medium** - cannot age at all |
| 44 kit lines cannot be grounded on the quantity axis | **Open** - needs a COST source, a different axis |
| `p_napkins` values (1.5-6/guest) span both sides of the new source's 3x | **Low, but real** - Type A does not mean the value is right |

## Unknown
- Whether a cost source exists that can speak to a $8-15 "cleanup kit". Nobody has looked.
- Whether the 3 Crab Feast residue records are worth redoing or the fields should simply
  be governed fresh.

---

# 10. Recommendation

**Continue hardening.** Do not build the review queue; do not start the backfill.

| # | Next | Why |
|---|---|---|
| 1 | **Archive the 7 in the browser** so the store matches these decisions | The decisions exist only in this document until someone acts on them |
| 2 | **Redo the 4 evidence-less records** through the composer with the source attached | ~60 interactions; reasoning already written; restores the ice work properly |
| 3 | **Assign stewards and verification dates** to the 91 dated sources | Ownership is the gap that makes freshness actionable rather than decorative |
| 4 | **Investigate a cost source for supply kits** | The only route to the 44 blocked lines, and it is a different axis than assumed |

The queue still saves ~5 of 15 interactions on Type A work. Type A is now 131 lines, so
the ceiling is ~650 interactions - larger than at 5F.6, still not the bottleneck. Type B
is 364.

---

Stopping here per the phase's stop condition. No review queue, no backfill, no 5F.8.
