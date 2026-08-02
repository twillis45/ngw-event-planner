# Phase A - Strategy and Model Audit

Program: NGW Knowledge Strategy Reset (preserve expert consensus, strengthen
lineage, keep the app decisive).
Scope of this phase: READ ONLY. No runtime code, no data, no corpus was modified.
Measurements are from the live modules via the repo's own loaders, not from grep.

---

## 0. Headline

The two-dimensional model the reset asks for is not an extension. It already
exists in the authored data and was erased downstream.

Playbook authors have been writing `(tier, verificationStatus)` pairs that
separate WHAT KIND of knowledge a value rests on from HOW STRONGLY it is held.
The grounding predicate collapses both to one bit. The host renders that bit as
one word or as silence. Every honesty problem in this program traces to that
collapse, not to missing evidence.

---

## 1. Where evidence basis is represented

Three places, none of them agreeing.

### 1a. `provenance.tier` - the real basis field (authored, 148 lines)

Twelve distinct values are authored across the corpus:

```
  trade-heuristic      53      cultural-tradition   17      culture-bearer  3
  researched           38      estimate             12      matriarch       2
  norm                  8      host-coaching         7      community       1
  heuristic             3      consensus             3      primary         1
```

`groundingDoctrine.js` defines a canonical five-rung ladder
(`cited > established-consensus > researched > synthesized > reasoned`) and a
`TIER_ALIASES` normalizer. It maps 5 of the 12 authored values. The other 7 pass
through `normalizeTier()` unchanged and land off-ladder, where `isGroundedTier()`
returns false by omission rather than by judgment:

```
  host-coaching -> host-coaching      cultural-tradition -> cultural-tradition
  estimate      -> estimate           culture-bearer     -> culture-bearer
  community     -> community          matriarch          -> matriarch
  primary       -> primary
```

45 lines carry an off-ladder basis. `primary` is the sharpest case: it is a
STRONGER basis than `researched`, it carries a source, and it scores as
ungrounded because the ladder has no rung for it.

### 1b. `SOURCE_CLASSES` - basis for EXTERNAL sources only (4 values)

`commercialSourcePolicy.js` (built in 5F.9) already classifies external
publishers: `independent`, `government`, `trade_association`,
`commercial_practitioner`, paired with `CLAIM_TYPES` (`planning_guidance`,
`measured_finding`, `regulatory_requirement`, `universal_claim`).

This is a genuine, enforced, tested basis vocabulary. It has no term for
knowledge that did not come from a publisher.

### 1c. `provenance.sources[]` + `QTY_SOURCES` - the only basis the predicate reads

`isGroundedItemQty` requires `tier === 'researched'` AND every source id
resolving in the `QTY_SOURCES` registry. It reads neither the doctrine ladder nor
`SOURCE_CLASSES`.

**Consequence, measured:** of 12 authored tiers, exactly one can ever ground.
`consensus` (3 lines) is grounded by the doctrine and ungrounded by the
predicate - a live disagreement between two modules that both claim to define
grounding.

---

## 2. Where verification status is represented

`provenance.verificationStatus`, authored on 245 lines:

```
  synthesized 132    researched 64    established-consensus 40    cited 8    partial 1
```

**These two fields are NOT redundant.** Of 148 lines carrying both, only 38
(25.7%) hold the same string. The 110 that differ are coherent, not noisy:

```
  trade-heuristic    / synthesized              24
  trade-heuristic    / established-consensus    23
  cultural-tradition / established-consensus    17
  estimate           / synthesized              12
  norm               / synthesized               8
  host-coaching      / synthesized               7
  trade-heuristic    / cited                     6
  consensus          / synthesized               3
  culture-bearer     / synthesized               3
  matriarch          / synthesized               2
  community          / synthesized               1
  primary            / cited                     1
```

Read the pairs and the authors' intent is unambiguous:

- `cultural-tradition / established-consensus` (17) = "this comes from cultural
  tradition, and within that tradition it is settled." That is a true statement
  and a legitimate basis. Today it scores identically to a blank line.
- `trade-heuristic / cited` (6) = a trade rule of thumb that someone has since
  pinned to a citation. Basis unchanged, verification improved.
- `matriarch / synthesized` (2) = named human authority, not yet corroborated.

The authors were already writing (basis x status). The corpus is more honest than
the layer that reads it.

**What is genuinely missing:** neither field carries RECENCY or CORROBORATION.
`verificationStatus` holds a strength-of-basis word, not "verified when, by whom,
still true?". `sourceFreshness.js` (5F.7) tracks `fetched` / `lastVerified` /
`steward` but does so **per source**, never per claim. Nothing in the model can
express "board authored this in 2024; a 2026 source now agrees with it" - which
is precisely the reset's Part 5 requirement.

---

## 3. Whether consensus can be represented without lying

**Yes - and it nearly already is.** Three of the reset's seven `evidenceBasis`
values have authored representation today:

| Reset value                        | Exists today as                             |
|------------------------------------|---------------------------------------------|
| `direct_authority`                 | `SOURCE_CLASSES.government` (8 federal srcs) |
| `direct_practitioner`              | `primary` tier (1 line)                      |
| `commercial_practitioner_guidance` | `SOURCE_CLASSES.commercial_practitioner`     |
| `multi_source_consensus`           | `consensus` / `established-consensus`        |
| `review_board_judgment`            | `host-coaching`, `norm` (15 lines)           |
| `operational_observation`          | `matriarch`, `culture-bearer`, `community`, `cultural-tradition` (23) |
| `authored_assumption`              | `estimate`, `heuristic`, `trade-heuristic` (68) |

Every one of the seven has a real authored antecedent. Nothing needs to be
invented, and no value needs to be asserted that the corpus cannot support.

The lie today is not in the data. It is that `isGroundedItemQty` reports all 485
non-`researched` lines with one word - "not grounded" - and the host renders that
as nothing at all.

---

## 4. How host labels are produced

One seam, `HostShellV2.jsx:13546`:

```jsx
{it.qtyGrounded && it.provenance && it.provenance.note && (
  Sourced - {it.provenance.note}
)}
```

- One binary gate (`qtyGrounded`), one hardcoded word ("Sourced"), one free-prose
  note authored by hand per record.
- The host never reads `tier`, `verificationStatus`, `sourceClass`, or
  `claimType`. (`.tier` appears elsewhere in HostShellV2 but refers to unrelated
  urgency and market tiers.)
- 52 of 537 lines (9.7%) render the label. **485 render nothing.**

Of the reset's four required host states, exactly one exists, and it is the
rarest. Silence currently carries the meaning "we have no basis for this" for 485
lines whose real basis is board judgment, cultural knowledge, or trade practice.
That silence is the single largest honesty defect in the product, and it is
larger than anything the backfill program was addressing.

**The pattern to extend already exists and is live.** `confidenceGrammar.js`
(imported at `HostShellV2.jsx:142`, rendered at 7594) does exactly the required
job for readiness rows:

```
classifyLevel(row) -> one of six LEVELS -> CONFIDENCE_WORDS[level][persona] -> {word, tier}
```

It is presentation-only ("the engine still owns reality"), persona-worded,
flag-gated, and it exists because of the identical defect one layer up: "the same
`ON TRACK` token today means four different things." It is pointed at readiness,
not at knowledge. The reset's Part 9-14 is the same classifier aimed at
provenance.

---

## 5. Whether canonical claim families already exist

**No structure exists.** No `claimFamily`, `canonicalClaim`, or equivalent
appears anywhere in `src/` or `hostv2/src/`.

But the families themselves are plainly present as repetition. 21 purchase ids
appear in 5 or more playbooks, covering **232 of 537 lines (43%)**:

```
  p_ice        29     p_dessert   11     p_cake     9
  p_cleanup    26     p_sides     11     p_favors   9
  p_tableware  18     p_flowers   10     p_drinks   9
  p_decor      15     p_beer       9     p_wine     8
  p_paper      13     p_water      8
```

### The two pilot families behave very differently, and that is the finding

**`p_ice` - a true canonical family.** 29 playbooks, one unit (`lb`), one
meaning, one use case. Five values:

```
  1 lb    x3   Game Night, Gender Reveal, Repast
  1.25 lb x2   Housewarming, Sweet 16
  1.5 lb  x15  Dinner Party, Birthday, Fish Fry, Quinceanera, ...
  2 lb    x8   Get-Together, Graduation, Reunion, Bachelor Party, The Cookout,
               Day Party, Juneteenth Cookout, Crab Feast
  2.5 lb  x1   Crawfish Boil
```

The spread is not noise - it is an unexpressed adjustment rule. Every 2 lb event
is outdoor, warm-weather, or high-volume; every 1 lb event is small and indoor.
The Juneteenth line says so out loud in its item text: `"Ice (coolers + drinks,
heat-adjusted)"`. The adjustment logic exists, written in prose in a display
string, where no engine can read it. This is exactly the reset's "baseline plus
adjustments" - already decided by the board, just not represented.

**`p_tableware` - NOT one family, and this retroactively explains 5F.11.** 18
playbooks, four different units:

```
  set                     14
  plates/cups              1   (Sweet 16, 2.5)
  place settings/cups      1   (Quinceanera, 2.5, essential:false)
  pieces                   1   (Retirement Party, 6)
```

Contents diverge too. Low Country Boil's "2 set" is *paper towels, napkins, small
bowls, shell buckets* - not a place setting at all. Retirement Party's "6 pieces"
is plausibly the same claim as 1.5 sets in a different unit, but only a human can
rule on that.

Applying the reset's own Part 6 test (same meaning, unit, use case, assumptions,
adjustment logic), `p_tableware` splits into a family of roughly 13 and a
remainder that must stay individually governed. **A family keyed on field name
would have silently governed all 18.** The 19 lines 5F.11 blocked were blocked
for exactly this reason, one line at a time, by hand.

### The malformed group is already visible

`p_cleanup` (26 lines) and `p_decor` (15) carry `qtyPerGuest: undefined` with
unit `kit`. They are not quantified claims at all and cannot be governed as if
they were - the reset's Part 15 "malformed" group, pre-identified.

---

## 6. Whether assumptions and adjustment triggers already exist

Partially, and in the wrong layer.

- `estimatorFactors.js`, `askPlan.js`, `experienceContext.js`, `procurement.js`
  carry condition-driven adjustment machinery for other axes.
- For purchase quantities, the adjustment is **baked into the authored number**
  and the RATIONALE is in the item display string ("heat-adjusted",
  "sturdier disposables", "stuffy - pupusas are heavy").
- Nothing declares "this baseline assumes indoor / moderate weather" or "raise
  when outdoor and above 80F".

So the app cannot today state its own assumption, cannot tell a host what would
change the number, and cannot separate a baseline from a condition. Parts 9-14
require all three.

---

## 7. How authored playbook values are consumed

Chain is intact and well tested; no defect found here.

```
playbook data -> effectiveValue(pb, field, overrides)
                   override > published snapshot > authored
             -> purchaseProvenance(pb, purchase)
             -> playbookFoodPlan() row {qtyGrounded, provenance}
             -> HostShellV2:13546
```

`effectiveValue` resolves override > published > authored, and the loader
re-validates every snapshot entry for traceability. Governance genuinely
overrides authored values at runtime, proven by `wave0HostProof.test.js` against
real `playbookFoodPlan` output.

The seam is sound. What flows through it is one bit.

---

## 8. Findings that change the plan

1. **The reset is a recovery, not an extension.** Two dimensions already exist in
   authored data (`tier` = basis, `verificationStatus` = strength). Phase B
   should formalize and read what is there before adding any field.

2. **`isGroundedItemQty` is the collapse point.** It discards the basis dimension
   entirely by testing `tier === 'researched'`. Every "9.7% grounded" figure this
   program has reported is a measurement of one tier's population, not of
   intellectual basis. Reporting it as "percentage with any intellectual basis"
   would be false - the reset's Part 20 concern, confirmed as live.

3. **Two modules disagree about grounding right now.** `groundingDoctrine.js`
   grounds `established-consensus`; `isGroundedItemQty` does not. 3 lines sit in
   the gap. This must be resolved before either is used to classify anything.

4. **The doctrine ladder is one-dimensional and cannot be fixed by adding rungs.**
   `cultural-tradition` is not weaker `researched`; it is a different kind of
   knowing. Ranking them on one axis is what forced 45 lines off-ladder.

5. **Silence is the biggest lie in the product.** 485 lines render no provenance
   at all. Fixing the label vocabulary reaches 9x more hosts than any further
   backfill would.

6. **Claim families must key on meaning + unit, never field name.** `p_ice`
   passes the test; `p_tableware` fails it 4 ways. A name-keyed implementation
   would mis-govern 5 lines on the pilot alone.

7. **Adjustment logic exists as prose in display strings.** The board already
   decided ice scales with heat and volume. Recovering that is lineage recovery,
   not new judgment.

8. **A proven in-repo precedent exists for the host layer.**
   `confidenceGrammar.js` is the same problem solved one layer up, and is live in
   HostShellV2 today.

---

## 9. Architectural ruling (deliverable #2)

**Extend the existing model by formalizing what authors already write. Do not add
a parallel schema, and do not build a new subsystem.**

Specifically:

1. **Split the vocabulary in two, along the seam the data already uses.**
   `evidenceBasis` (kind of knowing) and `verificationStatus` (how well held,
   how recently). Both already have authored antecedents; the mapping in section
   3 is complete with no invented values.

2. **Unify the two basis vocabularies rather than adding a third.**
   `SOURCE_CLASSES` covers external publishers; the authored `tier` vocabulary
   covers internal bases. Together they cover the reset's seven. A third
   vocabulary would create the same divergence that `groundingDoctrine` and
   `isGroundedItemQty` are in today.

3. **`isGroundedItemQty` keeps its exact current meaning and gets a new name in
   the reporting layer.** It is a correct predicate for "cited to a registered
   source" and every existing gate depends on it. It must stop being read as "has
   an intellectual basis." Rename the *metric*, not the predicate.

4. **Host labels get a `confidenceGrammar`-shaped classifier**: presentation
   only, derived from (basis x status), persona-worded, flag-gated, engine still
   owns reality. Same file shape, same test shape, same off-switch discipline.

5. **Claim families are declared explicitly with meaning + unit + use case, and a
   line joins a family only by human ruling.** No inference from field name. The
   family declaration is the governed artifact.

6. **Baselines and adjustments are separate declared fields.** Recovering the
   board's existing ice logic from prose is a lineage-recovery task with a human
   ruling per family, not an automated derivation.

---

## 10. Honesty boundary (deliverable #3)

What the extended model may and may not assert.

**MAY assert, with the corpus as it stands:**
- The kind of knowledge a value rests on (`evidenceBasis`) - authored on 148
  lines, inferable for the rest only by human ruling.
- That a claim is cited to a registered source - 52 lines, already proven to the
  host.
- That a source carries commercial interest - enforced since 5F.9.
- That a value is a board-authored baseline rather than a sourced finding.

**MAY NOT assert, and must not be built to imply:**
- That an unlabeled line has no basis. It means nobody has recorded one.
- That `cultural-tradition` outranks or underranks `researched`. Different axis.
- Recency or corroboration for any authored value. **No claim-level verification
  date exists anywhere in the corpus.** `sourceFreshness` dates SOURCES only.
  Until claim-level dates exist, `verified_current` and `corroborated` are
  unassertable and must not appear in any host label.
- That a family membership is safe because the field name matches.
- That an adjustment trigger is known when it was only inferred from an item
  string. Prose is a lead for a human ruling, never a fact.

**The line that governs Phase B:** the new model may make the corpus more legible.
It may not make any line look better sourced than it is today. Every value it
reports must be traceable to something a human wrote or ruled - never to a
default filled in to complete a schema.

---

## 11. State at end of Phase A

```
No code, data, or corpus modified. Tree clean.
Measurements taken via the live module loaders (ALL_PLAYBOOKS, isGroundedItemQty,
groundingDoctrine) through a temporary probe, since removed.
```

Deliverables complete: #1 current-state findings, #2 architectural ruling,
#3 honesty boundary.

Outstanding: #4 canonical pilot (Phase C - ice baseline and disposable
place-setting baseline only), #5 host proof, #6 tests, #7 migration plan,
#8 final recommendation.

**Recommended next step:** Phase B, scoped by ruling items 1-3 only (formalize
the two dimensions, unify the basis vocabularies, resolve the
doctrine/predicate disagreement). Phase C's pilot should not begin until the
`p_tableware` family boundary has a human ruling, because the audit shows a
name-keyed family would mis-govern 5 of its 18 lines.
