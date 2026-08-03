# Phase 5B-5 - Evidence Integrity Assessment

**Date:** 2026-08-01 - **READ-ONLY.** No code modified, no migration, no KCR, no tier changed,
no predicate touched. Existing grounded claims were treated as unverified until checked.

> **CORRECTION 2026-08-01 - see `docs/playbooks/PHASE_5C_2_ADMIN_FULL_BROWSER_AUDIT.md`.**
> The integrity findings here **stand in full** - no tool in NGW checks whether a source
> supports its claim, so the 40-leg classification remains this report's unique contribution.
> What is superseded is the **method**: Admin's Campaign Research surfaces which claims are
> ungrounded per playbook in seconds, so the manual sweep was never necessary for *finding*
> them - only for judging them.


---

## 1. Executive Recommendation

# **The trust model is one layer short, and the missing layer is already half-built.**

Auditing all 16 grounded costFactor decisions at the level of individual multipliers - **40
distinct claim legs** - plus both published KCR artifacts:

```
DIRECT       :  0
DERIVED      :  4   (all from dmv-crab-2026; 1 of the 4 does not reproduce)
ANALOGOUS    : 22
UNSUPPORTED  : 14
```

**Not one governed cost multiplier in NGW is directly stated by its source.** The strongest
class present is DERIVED, and it exists in exactly one decision.

Three findings drive the recommendation:

**1. NGW already wrote down the sufficiency test - and shipped without running it.** Every
grounded claim carries a populated `sufficientWhen` field naming the evidence that would
justify it: *">=2 catering quotes vs. DIY grocery cost confirm the relative cost factors."* In
**every one of the 16**, that evidence was never gathered. The schema is not missing. **The
check is missing.** This is the single most important fact in the audit, because it means the
fix is a verification record against an existing field, not a new evidence model.

**2. The authors were honest in prose and the system ignored it.** Eleven of the 16 notes say
some version of *"the service-level hierarchy follows directly; the per-menu percentages
calibrate that structure."* That is the artifact **declaring its own evidence type** - a
DERIVED hierarchy carrying ANALOGOUS magnitudes. `isGroundedCost` reads neither the note nor
`sufficientWhen`, so all 16 render identically as grounded.

**3. One of the two published artifacts does not reproduce its own stated derivation.**
`p_wine` is analysed in SS3.3. This is in the corpus that survives bake, snapshot, rollback and
CI - which confirms the pipeline is sound and the *content gate* is not.

**Recommendation: EXECUTE an Evidence Assessment layer that extends `sufficientWhen`, before
any further KCR creation.** Your framing is right - the knowledge layer is ahead of its trust
model. But the gap is narrower than it looks, because the vocabulary for closing it is already
in the schema.

---

## 2. Current Trust Model Assessment

### What the system actually verifies today

```
costFactorProvenance
   |
   +-- tier === 'researched'          -> checked
   +-- sources[] non-empty            -> checked
   +-- every id resolves in COST_SOURCES -> checked
   +-- source CONTAINS the claim      -> NOT CHECKED
   +-- claim reproduces from source   -> NOT CHECKED
   +-- sufficientWhen satisfied       -> NOT CHECKED  <- and it is written down
   +-- source still fresh             -> NOT CHECKED
   |
   v
 grounded = true
```

**`isGroundedCost` is a wiring check, not a truth check.** It proves a citation is
well-formed. It cannot distinguish a sourced price from a well-formed guess, and 5B-4 showed
it cannot detect that a source lacks the tier being claimed.

That is not a defect in the predicate - no predicate can read prose and adjudicate support.
**It is a missing layer**, and today nothing occupies it.

### What is genuinely strong (do not rebuild)

| Capability | Status |
|---|---|
| KCR -> review -> publish -> bake -> snapshot -> override -> runtime | Proven twice, with rollback |
| Source identity invariants, cross-axis citation blocked | Proven (5A-4.1) |
| Provenance ownership + confidence grading, `medium` never auto-`high` | Proven (5A-0/1/1.5) |
| CI publication enforcement | Live (5A-3) |
| **`sufficientWhen` on every grounded claim** | **Populated and unread** |
| **`claim` + `note` prose stating the derivation** | **Populated and unread** |

**Three of six trust capabilities already exist as data and are simply not consumed.** This is
the cheapest architectural position NGW could be in.

### The honest summary

NGW can currently say *"we found a source."* It cannot say *"this source supports this exact
recommendation."* The distinction is precisely your standard, and the audit below quantifies
how far apart they are.

---

## 3. Grounded Claim Integrity Audit

### 3.1 What the source actually supports

`catering-perperson-2026` carries **14 of 16** grounded decisions. Verbatim:

> "2026 US catering per person: full-service $75-150; buffet with servers $45-85; drop-off
> buffet $28-50; drop-off $15-35. The food is often identical between drop-off and staffed -
> the price difference is LABOR - so full-service runs ~2-4x drop-off, and host-cooked/DIY is
> cheaper still. Add 20-30% for service, gratuity, and tax."

| Supports | Does not support |
|---|---|
| Four catering tier bands (absolute) | **Any DIY magnitude** - "cheaper still", no number |
| full-service / drop-off = 2-4x | **Any potluck value - the word never appears** |
| Ordering: DIY < drop-off < buffet < full-service | Restaurants, food trucks, pitmasters, platters as priced categories |

### 3.2 The two structural defects

**Defect A - potluck is grounded to a source that never mentions it.**

**12 of 16** grounded decisions carry a potluck-type multiplier. The source contains no potluck
figure, and potluck is not a catering service tier at all: the source's ladder prices **who
performs the labor**, while potluck changes **who bears the cost**. Guests buying and cooking
is a cost-shift, not a labor tier - a different economic mechanism, outside the source's scope.

**Verified exhaustively this session**, across every source-defining file in the knowledge
layer rather than the cost registry alone: the word "potluck" appears in exactly **one** source
claim in all of NGW - `foodSafetyContext.js`, the **USDA FSIS "Cooking for Groups"** guide,
described in-repo as *"the canonical potluck citation."*

**So NGW does hold an authoritative potluck source - on the food-safety axis.** It says nothing
about cost, and citing it for a cost claim is precisely the cross-axis error the 5A-4.1
invariant blocks. Potluck is not unknown to the system; it is **known in the wrong axis for
this purpose**, which is a materially different (and more tractable) problem than an absent
domain.

And the values disagree with each other:

| Value | Decisions |
|---|---|
| 0.45 | Card Party |
| 0.50 | Game Night |
| 0.55 | Baby Shower, Graduation, Bridal Shower, Gender Reveal, Vow Renewal, The Cookout |
| 0.60 | Engagement Party |
| 0.70 | Juneteenth |
| 0.75 | Get-Together |
| 0.90 | Repast (dish-sharing) |

**Eight distinct values for one arrangement, all citing one source.** If the source produced
them they would agree. **This is machine-detectable without reading any source text** - and it
is the basis of the cheapest integrity check NGW can build (SS4.3).

**Defect B - the one non-catering, non-crab claim cites a source that contradicts it.**

Juneteenth `menu` cites `usda-meat-2026` for *"smoked brisket adds ~20% over ribs+chicken+links;
mixed grill **+ seafood** adds ~25%."*

- The source prices **brisket at ~$4.50/lb** and **pork chops at ~$4.33/lb**. By the source's
  own numbers brisket is within ~4% of pork - it does not support a 20% premium. The note
  calls brisket "a premium beef cut," which the source's price contradicts.
- The source is a **meat** series. It contains **no seafood**. The 1.25 leg cannot be grounded
  to it at all.

### 3.3 The two published artifacts

**`p_wine` (Retirement Party) - the published derivation does not reproduce the published
value.**

```
Source (bar-provision-2026): "~1 drink/guest/hour ... a mixed bar skews ~40% BEER with
                              beer+wine ~75% of volume; wine ~1 bottle per ~2.5 drinking
                              guests per hour (= ~1/2 bottle per drinker; 750ml pours ~5)"
Published claim  : "wine carries ~40% of the drink load: a 750ml bottle (5 glasses)
                    supports ~0.4 bottle/guest over 3 hours when beer is also served"
Published value  : qtyPerGuest = 0.4 bottle
```

Two problems:

1. **The 40% belongs to beer.** The source assigns ~40% to beer and beer+wine ~75%, implying
   wine ~35%. The claim reassigns beer's share to wine.
2. **The stated arithmetic yields a different number.** 3 hours x 1 drink/hour = 3 drinks;
   at 40% wine = 1.2 glasses; at 5 glasses/bottle = **0.24 bottles/guest**, not 0.4.

There *is* a route to 0.4 - the source's ~1/2 bottle **per drinker** x an ~80% drinker rate -
but that is a different derivation than the one published, and the 80% is unsourced.
**Disposition: the value may well be right; the published reasoning is wrong.**

**`p_crabs` (Crab Feast) - evidence adequate, derivation unrecorded.**

`webstaurant-protein-2026` does cover shell-on seafood: *"crab legs 16-24 oz ... because
bone/shell is much of the weight."* Published qty is 0.333 dozen = 4 blue crabs/guest ~ 1.3 lb
whole, inside the source's 1-1.5 lb shell-on band. **The evidence supports it** - but the
bridge from *crab legs* to *whole blue crab* (different shell-to-meat ratio) is nowhere
recorded. **Disposition: DERIVED, needs its conversion documented - a documentation gap, not
an evidence gap.**

### 3.4 The one fully-documented claim, and what it proves

Crab Feast `crab_size` is the only costFactor decision whose note states its method:
*"cost factor ratios use market midpoint (~$85/dz Large Male as 1.0)."* **Because the method is
recorded, it can be checked:**

| Size | Source range | Midpoint | Ratio implied | Claimed | Match |
|---|---|---|---|---|---|
| Large Male | $72-98 | $85.0 | 1.00 | 1.00 | baseline |
| Large Female | $52-75 | $63.5 | 0.75 | 0.75 | **reproduces** |
| XL Male | $109-150 | $129.5 | 1.52 | 1.55 | **reproduces** |
| Jumbo Male | $149-188 | $168.5 | 1.98 | 2.00 | **reproduces** |
| **Mediums** | **$32-75** | **$53.5** | **0.63** | **0.55** | **FAILS - off ~13%** |

**Three of four reproduce exactly. One does not.** The finding matters less than the mechanism:
**a recorded derivation converts trust into arithmetic.** The other 15 decisions cannot be
checked this way *because they never say how their numbers were reached*. That is the strongest
possible argument for requiring a derivation record.

### 3.5 Grounding Integrity Scorecard

Verdict = weakest leg. "Legs" = individual multipliers.

| # | Claim (decision) | Source | Current | Evidence Match | Recommendation |
|---|---|---|---|---|---|
| 1 | Crab Feast `crab_size` | dmv-crab | grounded | **DERIVED** 3/4 legs; **Medium leg fails** | **Correct Medium to ~0.63 or record why not** |
| 2 | `p_crabs.provenance` *(published)* | webstaurant-protein | published | **DERIVED**, conversion unrecorded | **Keep; document the crab-leg bridge** |
| 3 | `p_wine.provenance` *(published)* | bar-provision | published | **UNSUPPORTED as written** (beer's 40%; arithmetic gives 0.24) | **Re-derive and re-publish v2** |
| 4 | Juneteenth `menu` | usda-meat | grounded | **UNSUPPORTED** - brisket ~= pork in source; seafood absent | **Withdraw grounding** |
| 5 | Repast `food_source` | catering | grounded | ANALOGOUS x2, **UNSUPPORTED** (dish-sharing 0.9) | Downgrade to ANALOGOUS |
| 6-15 | Baby Shower, Get-Together, Graduation, Game Night, Bridal, Gender Reveal, Engagement, Vow Renewal, Cookout `cooking_model`, Card Party, Juneteenth `sourcing` - **all with a potluck leg** | catering | grounded | ANALOGOUS hierarchy + **UNSUPPORTED potluck leg** | Split: keep hierarchy, ungroundthe potluck leg |
| 16 | Cookout `grill_master` | catering | grounded | **ANALOGOUS** (no potluck leg) | Downgrade to ANALOGOUS |
| 17 | Low Country `cook` | catering | grounded | **ANALOGOUS** | Downgrade to ANALOGOUS |
| 18 | Get-Together `food_style` | catering | grounded | **ANALOGOUS** + potluck leg | Split as above |

**Nothing in the corpus warrants deletion.** The multipliers are plausible planning heuristics;
the defect is that they are labelled as researched evidence. **The fix is relabelling, not
removal** - which is also why this is safe to do incrementally.

---

## 4. Evidence Sufficiency Proposal (design only)

### 4.1 Assessment of the proposed schema

The brief's `EvidenceAssessment` is directionally right and **missing the field that does the
work**. It records *that* someone reviewed, not *why the source supports the claim*. A reviewer
approving `evidenceType: 'derived'` with no derivation leaves the next auditor exactly where I
was on 15 of 16 decisions.

### 4.2 Proposed shape - extends what exists

```
EvidenceAssessment
  claimId              # assetId + fieldPath, the 5A-2 addressing scheme
  sourceId
  evidenceType         # direct | derived | analogous | unsupported
  derivation           # REQUIRED when evidenceType === 'derived'
                       #   inputs[]  : quoted source figures
                       #   method    : the arithmetic, as text
                       #   output    : the value it produces
                       #   -> machine-checkable, as proven in 3.4
  sourceExcerpt        # REQUIRED when direct: the sentence, verbatim
  scopeGap             # REQUIRED when analogous: what the source does NOT cover
  sufficientWhen       # CARRIED FORWARD from the existing field, not reinvented
  sufficiencyMet       # bool | 'not-assessed'   <- the check that was never run
  verificationStatus   # pending | reviewed | approved | rejected
  reviewer / reviewDate / reviewNotes
  freshnessDate + freshnessPolicy   # inherited from SOURCE_CATALOG
```

**Four additions to the brief's version, each earned by a finding above:**

| Field | Justified by |
|---|---|
| `derivation` | SS3.4 - the only checkable claim is the only one that recorded its method |
| `sourceExcerpt` | SS3.1 - "potluck" is absent from the source; an excerpt requirement makes that impossible to miss |
| `scopeGap` | SS3.2 Defect B - forces "this source has no seafood" to be written down |
| `sufficiencyMet` | SS1 - the criterion is already written on all 16 and was never evaluated |

**Would it scale?** Yes, and the corpus is smaller than it looks: **40 claim legs across 16
decisions plus 2 published artifacts.** This is a one-sitting review, not a migration.

### 4.3 The cheap automated check (build this first)

Before any human review, one rule catches Defect A with no source reading at all:

> **Source-consistency invariant:** if N claims cite source S for the same relationship and
> emit different values, at most one can be DIRECT or DERIVED. The rest are ANALOGOUS by
> construction.

Run against today's corpus this flags all 12 potluck legs and their 8 conflicting values
immediately. **It is a unit test over playbook data - no schema change, no migration.**

---

## 5. Source Registry Recommendations

**Strengths.** `SOURCE_CATALOG` already carries `authority`, `freshnessPolicy`, `seasonal`,
`regionalScope`, `commercialBias`, `coverage`, `reliability`, `confidenceContribution` across
22 publisher families. The axis registries enforce single-axis citation. This is a good
skeleton.

**Weaknesses, each tied to a finding:**

| Weakness | Evidence |
|---|---|
| **No `supportsClaimTypes` / `excludesClaimTypes`** | `usda-meat-2026` was cited for a seafood leg. A declared exclusion would have blocked it mechanically |
| **No tier/segment decomposition** | `catering-perperson-2026` prices 4 tiers; nothing records that **DIY and potluck are not among them** |
| Freshness **displayed, never enforced** | Rendered in `AdminConsole.jsx`; read by no gate. A Freshness dimension exists in `dimensions.js` but keys off playbook `governance.lastReviewed` |
| 87 of 111 sources are tier `unspecified` | Registry-wide quality gap |
| **One source carries 14 of 16 claims** | 5B-4 SS0 - concentration risk, unmitigated |

**Recommended metadata additions**, in priority order:

1. **`supportsClaimTypes[]` / `excludesClaimTypes[]`** - the single highest-value field. Turns
   SS3.2 Defect B from a prose judgement into a gate.
2. **`segments[]`** - what the source actually enumerates (`full-service`, `buffet-served`,
   `drop-off-buffet`, `drop-off`). A claim about a segment not listed cannot be DIRECT.
3. **Activate `freshnessPolicy`** by extending the existing Freshness dimension to sources.
4. Geographic applicability - `regionalScope` exists; enforce it (`dmv-crab-2026` is DMV-only).
5. Event-category applicability - **KILL.** No finding in any phase turned on it; it would add
   a matrix nobody has needed.

---

## 6. Evidence Acquisition Workflow

```
  Gap detected                     <- 3 detectors, cheapest first:
  |                                   (a) source-consistency invariant  [automated, SS4.3]
  |                                   (b) sufficiencyMet === false      [automated]
  |                                   (c) analyst judgement
  v
  EvidenceRequest created          <- see fields below
  |
  v
  Research performed               <- human; the only irreducibly slow step
  |
  v
  Source registered + assessed     <- EvidenceAssessment written, derivation REQUIRED
  |
  v
  Claim validated                  <- GATE: sufficiencyMet must be true, or disposition
  |                                   must be 'analogous' (which publishes at lower tier)
  v
  KCR published                    <- existing 5A pipeline, unchanged
  |
  v
  Runtime consumes evidence STRENGTH, not just a boolean
```

**EvidenceRequest object:**

```
  id
  claimId + decisionId          # what is unproven
  currentEvidenceType           # what it is today (from the assessment)
  requiredEvidence              # SEEDED FROM sufficientWhen - already written for all 16
  acceptableSourceTypes         # authority floor, e.g. official | standards
  unacceptableSources           # e.g. single-vendor trade pricing as citation of record
  candidateSources              # from SOURCE_CATALOG
  reviewer
  result                        # what was found
  disposition                   # published | analogous-retained | rejected | abandoned
  costToAcquire                 # hours | days | weeks - lets the queue be triaged
```

**The workflow's most valuable property: `requiredEvidence` is already written.** All 16
`sufficientWhen` strings are specific and actionable (*">=2 Lowcountry-boil caterer quotes in a
comparable coastal market"*). **The research queue can be generated from existing data on day
one.**

---

## 7. Priority Domains

Reassessed against integrity findings, which changes the 5B-4 order.

| Domain | Product question | Reuse | Verdict |
|---|---|---|---|
| **DIY economics** | "Should I do this myself or hire someone?" | **11 grounded legs depend on it + 9 ungrounded decisions** | **EXECUTE** - but now for *repair*, and it must land as a documented derivation |
| **Potluck economics** | "What do I save if guests bring dishes?" | **12 grounded decisions, 8 conflicting values, 0 source coverage** | **EXECUTE - newly promoted.** 5B-4 did not identify this as a domain; the integrity audit shows it is the single largest ungrounded dependency, and it is *not* a sub-case of DIY |
| **Beverage cost** | "What will drinks cost?" | 11 decisions, 193 purchase instances; quantity half already governed | **EXECUTE** (non-alcoholic first) |
| **Seafood** | "Buy live or order steamed?" | 31 ids / 38 instances - no reuse | **EXECUTE narrowly** (crab live-buy column) / **PARK** broadly |
| Specialty / cultural | - | 28 ids / 29 instances | **KILL** (unchanged) |

**The promotion of potluck is this phase's main correction to 5B-4.** I treated potluck as part
of DIY. It is not: DIY is *the host performs the labor*; potluck is *guests bear the cost*.
They are different mechanisms, they need different evidence, and potluck touches more grounded
claims than any other single gap in the corpus.

---

## 8. Runtime Impact - where evidence quality should surface

Highest-value insertion points, ranked. **No UI designed here.**

| Rank | Surface | Why | Risk |
|---|---|---|---|
| **1** | **Budget figures derived from costFactors** | Where a multiplier becomes a dollar number the host plans against. An ANALOGOUS multiplier presented as a firm figure is the actual trust exposure | Must not read as "our numbers are unreliable" |
| **2** | **Decision explanations ("Why:")** | Already renders provenance notes (`HostShellV2:9357`). The strength distinction lands naturally in language already shown | Low - the surface exists |
| **3** | **AI/copilot explanations** | Must never assert researched-grade certainty for an ANALOGOUS claim. This is where fake authority does the most damage | Highest damage if skipped |
| 4 | Readiness score | **PARK** - folding evidence strength into readiness conflates *is the host ready* with *how sure are we*. Two different questions |
| 5 | Decision memory | PARK - useful later for "what did we know when" |

**The honest framing to aim for is not a confidence badge on every number.** It is that a
*modelled* figure reads as modelled and a *sourced* figure reads as sourced. Most NGW numbers
will be modelled for a long time, and saying so plainly is more trustworthy than decorating
them.

---

## 9. Risks

- **R1. Relabelling looks like regression.** Moving 22 legs from "grounded" to "analogous" will
  read as the system getting worse. **Mitigation:** it is the system becoming honest; frame the
  count drop as the deliverable, and decide this *before* anyone sees the number move.
- **R2. `derivation` becomes a laundering field.** Cite two real sources, apply an unexamined
  method, emit a researched number. **Mitigation:** the derivation must be *reproducible* - as
  SS3.4 demonstrates, arithmetic is checkable. Require the check, not the field.
- **R3. Reviewer burden.** 40 legs is tractable; a 219-item purchase backfill under the same
  regime is not. **Mitigation:** scope the assessment layer to costFactors + published
  artifacts. Do not extend it to purchases yet.
- **R4. The concentration risk is untouched.** 14 of 16 still rest on one source, and this
  phase does not fix that. Second-sourcing (5B-4) remains outstanding.
- **R5. My own classifications are judgement.** The DERIVED/ANALOGOUS boundary is arguable -
  particularly whether a labor-tier source can support a potluck cost-shift. **I have argued it
  cannot; a reviewer could disagree**, which is exactly why the assessment layer needs a named
  reviewer rather than my verdict.
- **R6. `p_wine` is live.** One of two published artifacts has a wrong published rationale. It
  is not urgent (the value is defensible by another route) but it should not sit.

## 10. Migration Strategy

**No data migration.** Every step is additive.

| Stage | Work | Reversible? |
|---|---|---|
| 0 | Source-consistency invariant as a test (SS4.3) | Yes - a test |
| 1 | `EvidenceAssessment` shape, unattached; no predicate reads it | Yes |
| 2 | Assess the 40 legs + 2 artifacts. **Report only** - nothing changes in runtime | Yes |
| 3 | Decide the display policy for ANALOGOUS **before** changing any tier | - |
| 4 | Apply relabelling; `isGroundedCost` unchanged, a new predicate reads strength | Yes - old field untouched |
| 5 | Extend the Freshness dimension to sources | Yes |

**Stage 2 is the decision point.** If assessing 40 legs produces no change in what NGW would
tell a host, the layer is not worth building and stages 3-5 should be dropped.

---

## 11. Final EXECUTE / PARK / KILL

| Decision | Verdict | Rationale |
|---|---|---|
| **Source-consistency invariant** (SS4.3) | **EXECUTE - first** | Catches 12 legs today. A unit test. No schema, no migration |
| **Assess the 40 legs + 2 published artifacts** | **EXECUTE** | Small, bounded, and it is the evidence for every later decision |
| **`EvidenceAssessment` with `derivation` + `sourceExcerpt` + `scopeGap` + `sufficiencyMet`** | **EXECUTE - design now, build after stage 2** | Extends `sufficientWhen`; does not replace it |
| **Fix `p_wine` rationale; correct crab `Medium` 0.55 -> ~0.63** | **EXECUTE** | Two concrete defects, both found, both small |
| **Withdraw grounding on Juneteenth `menu`** | **EXECUTE** | Source contradicts the brisket leg and has no seafood at all |
| **`supportsClaimTypes` / `excludesClaimTypes` on sources** | **EXECUTE** | Would have blocked the seafood citation mechanically |
| **Potluck evidence acquisition** | **EXECUTE** | 12 grounded decisions, 8 conflicting values, zero source coverage |
| DIY cost band / non-alcoholic beverage cost / crab live-buy column | EXECUTE | Unchanged from 5B-4 |
| Derived provenance for composed claims | **PARK** | Unpark when the DIY band or a composed beverage claim needs it |
| Freshness enforcement for sources | **PARK** | Unpark on first seasonal publish |
| Evidence strength in readiness score | **PARK** | Conflates readiness with certainty |
| Event-category applicability metadata | **KILL** | No finding has ever turned on it |
| Specialty/cultural ingredient pricing | **KILL** | Unchanged from 5B-4 |
| Resolver migration, registry consolidation, 219-item backfill | **PARK** | Unchanged since 5A-4 |
| **Any further KCR creation before stage 2** | **KILL for now** | Your call, and the audit supports it: publishing more claims under a gate that cannot verify support compounds the problem |

---

## FACTS / ASSUMPTIONS / RISKS

### FACTS (measured this session)
- F1. 40 claim legs across 16 grounded costFactor decisions: **0 DIRECT, 4 DERIVED, 22
  ANALOGOUS, 14 UNSUPPORTED.**
- F2. All 16 carry a populated `sufficientWhen`; in all 16 the named evidence was never gathered.
- F3. The word "potluck" does not appear in `catering-perperson-2026`. **12 of 16** grounded
  decisions carry a potluck multiplier, taking **8 distinct values (0.45-0.90).**
- F3b. **Exhaustive sweep of every source-defining file:** "potluck" appears in exactly one
  source claim in all of NGW - the USDA FSIS "Cooking for Groups" guide in
  `foodSafetyContext.js`, on the **food-safety axis**, with no cost content. **No cost source
  anywhere in the registry covers potluck.**
- F3c. 16 source ids total across the cost (3), quantity (3) and timing (10) axes.
- F4. 11 of 16 notes explicitly say the percentages "calibrate" the sourced structure.
- F5. Crab `crab_size`: 3 of 4 ratios reproduce from the stated midpoint method; **Mediums
  claims 0.55 where the method yields 0.63.**
- F6. `usda-meat-2026` prices brisket ~$4.50/lb vs pork chops ~$4.33/lb, and contains no
  seafood; Juneteenth `menu` claims a 20% brisket premium and a 1.25 seafood leg.
- F7. `bar-provision-2026` assigns ~40% to **beer** and ~1/2 bottle per **drinker**; published
  `p_wine` claims ~40% **wine** and 0.4 bottle per **guest**. The published arithmetic yields
  ~0.24.
- F8. `webstaurant-protein-2026` covers shell-on seafood (crab legs 16-24 oz); `p_crabs` at
  0.333 dz/guest (~1.3 lb) falls inside that band.

### ASSUMPTIONS
- A1. That a labor-tier catering source cannot support a potluck cost-shift claim. **My
  judgement**, and the load-bearing one behind 12 UNSUPPORTED legs.
- A2. That a large male blue crab is ~1/3 lb whole (used in F8). Not sourced.
- A3. Domain reuse counts carried from 5B-4, not re-measured.

**Promoted to fact:** the prior assumption that no other source covers potluck or DIY was
tested exhaustively this session across every source-defining file, not just the cost registry.
Result recorded as F3b - it holds for cost, with the food-safety exception noted.
