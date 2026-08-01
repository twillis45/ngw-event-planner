# Phase 5B-1 -- Source-First Discovery Report

**Date:** 2026-08-01 - **READ-ONLY.** No KCR created, no playbook edited, no predicate or
registry changed. `publishedKnowledge.json` remains at 2 entries.

---

## 1. Executive Recommendation

# **PARK -- with one narrow EXECUTE inside it.**

The source-first inversion worked: it produced a candidate list, and the list is **much
shorter than expected**. Not because the sources are weak, but because of a structural
mismatch this audit found and the previous phases did not:

> **Where NGW has strong sources, it has no claims wired.
> Where NGW has claims wired, they are already grounded.**

Three measurements make the case:

| | |
|---|---|
| Axes with strong sources but **no engine consumer** | **4 axes, 51 of 111 sources (46%)** |
| Engine-consumed context axes already at **100% grounded** | cultural 11/11, venue 14/14, accessibility 18/18 |
| Engine-consumed context axes with **zero claims authored** | legal, dietary, human, childcare, budget -- all 0 |

The middle row is the important one. Every context axis the engine actually reads and that has
authored claims is **already fully grounded**. There is no ungrounded-but-sourceable backlog
in those axes, because whoever authored them cited as they went.

**The one EXECUTE:** the 30 `synthesized` costFactor decisions are the only population that is
simultaneously (a) engine-consumed, (b) host-visible in budget, (c) ungrounded, and
(d) matched by a source that already exists -- `catering-perperson-2026` and `usda-meat-2026`.
They need **research**, not plumbing. That is a research commission, not an engineering sprint.

---

## 2. Source Inventory

111 sources across 20 axes. Grouped by whether the playbook engine can consume them:

### Axes the engine reads (14 axes)

| Axis | Sources | Notable IDs | Claims authored | Grounded | Candidate count |
|---|---|---|---|---|---|
| Military ceremony | **12** | `title-4-usc-flag`, `ar-600-25`, `da-pam-600-60`, `navy-regs`, `afi-34-1201`, `mco-5060` | context-derived | n/a | **0** -- context is computed, not authored per-claim |
| Timing | 10 | `theknot-vendors`, `stuart-rentals`, `sweetery-cake` | 0 of 488 tasks | 0 | **0** -- no provenance field on tasks |
| Destination / travel | **7 (all tiered)** | `cdc-yellowbook`, `cdc-altitude`, `ahla-roomblock`, `nhtsa-impaired` | context-derived | n/a | **0** -- same as military |
| Cultural / religious | 6 | `pbs-juneteenth`, `nmaahc-kwanzaa`, `britannica-quinceanera` | 11 | **11 (100%)** | **0 -- complete** |
| Cost | 3 | `usda-meat-2026`, `catering-perperson-2026`, `dmv-crab-2026` | 46 costFactors | 16 | **30** |
| Quantity | 3 | `webstaurant-protein-2026`, `webstaurant-portions-2026`, `bar-provision-2026` | 45 with sources | 38 | **~7** (food/drink only) |
| Accessibility | 3 | `ada-events`, `mpi-ada-mobility`, `inclusive-seating` | 18 | **18 (100%)** | **0 -- complete** |
| Legal / COI | 3 | `iii-social-host`, `cornell-dramshop`, `nyc-special-events-coi` | **0** | 0 | 0 -- nothing authored |
| Venue constraint | 2 | `socialtables-capacity`, `unitedrentals-power` | 14 | **14 (100%)** | **0 -- complete** |
| Weather | 1 | `noaa-outdoor-events` | context-derived | n/a | 0 |
| Human / relational | 2 | `gatech-protocol`, `seatplan-dynamics` | **0** | 0 | 0 |
| Dietary / allergy | 1 | `fda-allergens` | **0** | 0 | 0 |
| Budget authority | 1 | `eventmobi-budget` | **0** | 0 | 0 |
| Childcare | 1 | `childcaregov-ratios` | **0** | 0 | 0 |

### Axes the engine does NOT read -- 51 sources, zero runtime value today

| Axis | Sources | Publishers | Engine | hostv2 |
|---|---|---|---|---|
| Incident / guest safety | **26** | AHA, NIH, CPI, SFPD | **no** | yes (`incidentPlanFor`) |
| Fire & burn safety | **10** | NFPA, USFA, CPSC, PERC | **no** | **no** |
| Food safety | **8** | USDA FSIS, FDA | **no** | **no** |
| Booking / vendor collapse | 7 | Airbnb, VRBO, CFPB | **no** | **no** |

**This is the single largest finding of the audit.** NGW's most authoritative sources -- federal
food-safety (FSIS), fire-safety (NFPA/USFA/CPSC) and emergency-response (AHA/NIH) -- sit on
axes **no engine reads**. 25 of those 51 sources back axes read by *nothing at all*.

---

## 3. Top Governable Candidates

The scoring model was applied. **Only one group survives all five safety checks**, so the
"top 10" is honestly a top 1 with a ranked research order inside it.

### Candidate Group -- the 30 `synthesized` costFactor decisions

| Check | Result |
|---|---|
| 1. Claim equivalence | **PASS** -- a costFactor is per-decision, per-playbook. No shared-ID ambiguity (the 5A-6 failure mode cannot occur). |
| 2. Source relevance | **PASS** -- `catering-perperson-2026` (per-person catering rates) and `usda-meat-2026` (2026 retail protein) directly support food/beverage cost multipliers. |
| 3. Source identity exists | **PASS** -- both resolve in `COST_SOURCES` today. |
| 4. Runtime consumer exists | **PASS** -- `playbooks/index.js:2582` computes `costGrounded = isGroundedCost(d.costFactorProvenance)`. |
| 5. Governance improves trust | **PASS** -- these multipliers move the budget the host plans against; today they self-declare `synthesized`. |

**Score: 22 / 25** -- Trust 5 - User impact 5 - Source availability 4 - Claim clarity 5 -
Runtime leverage 3.

*(Source availability is 4, not 5: two general sources must cover 30 specific multipliers. Each
decision still needs its own verification against the source -- that is the research.)*

**Exact claim shape:** for each decision, *"choosing option X multiplies the cost of purchase
P by N."* Today `costFactorProvenance.tier === 'synthesized'` on all 30 -- an honest admission
that N was estimated.

**Expected runtime impact:** `costGrounded` flips true, and the budget figure the host plans
against becomes traceable to a 2026 market source instead of an estimate.

**Ranked research order** (high-cost impact -> reuse -> host-facing):

1. Food-approach multipliers (caterer vs self-cook vs potluck) -- largest budget swing,
   directly supported by `catering-perperson-2026`.
2. Protein/menu-tier multipliers -- supported by `usda-meat-2026`.
3. Service-style multipliers (buffet vs plated) -- supported by `catering-perperson-2026`.
4. Everything else -- verify a source exists **before** committing.

---

## 4. Rejected Candidates

| Claim | Reason rejected |
|---|---|
| **`p_cleanup` quantity** (26 uses) | Equivalence passes, but **no qualifying source**. All 3 `QTY_SOURCES` are food/drink portion guides. Carried over from 5A-6. |
| **`p_tableware`** (18 uses) | **One ID, multiple concepts.** `qtyPerGuest` spans 1.5-3; `category` splits rental vs logistics. |
| **`p_paper`** (13 uses) | **13 distinct item texts across 13 uses**; 4 incompatible units. |
| **All 488 task timing claims** | 10 timing sources exist, but tasks carry **no `provenance` field**. Governance has nowhere to land. |
| **Food-safety claims** (8 FSIS/FDA sources) | **No engine consumer.** `foodSafetyContext` is imported by neither the engine nor hostv2. Fails safety check 4. |
| **Fire-safety claims** (10 NFPA/USFA/CPSC) | Same -- no consumer anywhere. |
| **Incident/guest-safety** (26 sources) | hostv2 reads `incidentPlanFor`, but the playbook engine does not, and there is no per-claim provenance field. |
| **Booking/vendor-collapse** (7 sources) | No consumer. |
| **Risks (263) / contingencies (191) / milestones (382)** | **Category B/C, not A.** Planning judgement and scheduling scaffolding. No external fact to cite. |
| **Non-costFactor decisions (169)** | **Category C** -- preference elicitation ("buffet or plated?"). No correct answer exists to cite. |
| **Cultural (11), venue (14), accessibility (18)** | **Already 100% grounded.** Nothing to add. |
| **Legal, dietary, human, childcare, budget contexts** | Sources exist; **zero claims authored**. Governance would have nothing to govern -- the gap is authoring, not sourcing. |

---

## 5. Recommended Next Sprint

**Number of KCRs to create now: 0.**

Not because nothing qualifies, but because the one qualifying group needs **research before
governance**. Publishing a costFactor KCR today would mean re-tiering `synthesized` to
`researched` without doing the work -- the exact "make an assumption look authoritative"
failure the rejection rules forbid.

**Recommended sequence:**

1. **Commission research on the top 3 costFactor groups** (food approach, protein tier,
   service style) against `catering-perperson-2026` and `usda-meat-2026`. This is analyst
   work, not engineering.
2. **Then create 3 KCRs** through the proven pipeline -- one per verified multiplier group.
   Expected impact: `costGrounded` true for the highest-swing budget decisions.
3. **Re-measure** before extending to the remaining 27.

**Risks:**
- **R1.** Two general sources may not support 30 specific multipliers. Verify per decision;
  publish only what the source actually says.
- **R2.** `catering-perperson-2026` is a 2026 rate. Cost knowledge decays -- grounding it
  creates a freshness obligation that does not exist today.
- **R3.** The research may conclude the existing estimates were right. That is a *success*
  (an estimate promoted to verified), and should not be treated as wasted effort.

---

## 6. FACTS / ASSUMPTIONS / RISKS

### FACTS (measured this session)
- F1. 111 sources across 20 axes; the playbook engine imports 14 knowledge modules.
- F2. **4 axes / 51 sources (46%) have no playbook-engine consumer**: incident (26),
  fire (10), food safety (8), booking (7). Of these, 25 are read by nothing at all.
- F3. Cultural 11/11, venue 14/14, accessibility 18/18 -- **all 100% grounded**.
- F4. Legal, dietary, human, childcare, budget: **0 claims authored**, despite each having
  a source.
- F5. All 30 ungrounded costFactor decisions carry `tier: 'synthesized'`.
- F6. `playbooks/index.js:2582` consumes `isGroundedCost(d.costFactorProvenance)`.
- F7. Military (12 federal regs) and destination (7, all tiered) are context-**derived**, not
  authored per claim -- there is no per-claim provenance field to govern.

### ASSUMPTIONS (not proven)
- A1. That `catering-perperson-2026` and `usda-meat-2026` actually support specific cost
  multipliers. Their claim text covers per-person rates and retail prices; I did not verify
  either states a *ratio* between options.
- A2. That the 100%-grounded axes are correctly grounded. I verified the predicates return
  true; I did not audit whether each cited source genuinely supports its claim.
- A3. That food-safety and fire-safety knowledge has no runtime path at all. I traced imports;
  a dynamic or string-keyed consumer would not appear in that trace.

### RISKS
- **R4.** The 46% orphan-source finding may indicate wasted prior research -- 51 sources
  curated for axes nothing reads. Worth confirming whether those axes were *intended* to be
  wired and were not, or were built for a surface that no longer exists.
- **R5.** Chasing the costFactor group means accepting a freshness obligation (R2). NGW has
  no freshness enforcement today; `SOURCE_CATALOG` has a `freshnessPolicy` field, unused.

---

## 7. Final Assessment

Against the standard *"NGW confidently explains only what it can prove"* -- **NGW is already
close to that standard, more than the coverage numbers suggest.**

The 2.3% corpus-wide grounding figure reads like a failure. It is not. Every axis the engine
reads and that has authored claims is at **100%**. The low number comes from counting 1,521
claims (risks, milestones, contingencies) that cannot have sources, plus 51 sources on axes
nothing reads.

**The honest constraint is no longer infrastructure, selection, or even research. It is
wiring.** The most authoritative knowledge NGW owns -- FSIS food safety, NFPA fire safety, AHA
emergency response -- is curated, sourced, and unreachable by the product.

That is a bigger and cheaper opportunity than any grounding backfill, and it is the question
I would put next: **why does the engine not read the safety axes?** If the answer is "no one
wired it", that is the highest-value work available -- and it is not a knowledge problem.
