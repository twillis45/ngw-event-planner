# Phase 5C - Trust Repair Strategy

**Date:** 2026-08-01 - **READ-ONLY.** No code modified, no KCR created, no tier upgraded,
no predicate touched. Companion to `PHASE_5C_TRUST_REPAIR_INVENTORY.md`. ASCII-only.

> **CORRECTION 2026-08-01 - see `docs/playbooks/PHASE_5C_2_ADMIN_FULL_BROWSER_AUDIT.md`.**
> SS4 "Claims Needing Research" is **dispatchable from Admin today** via Studio > Campaign
> Research (`Cost Factor Grounding`, `Government Data Pull`, `Cross-Vendor Price Check`,
> `Seasonal Adjustment`). The research itself still has to be done; commissioning it does not
> require new tooling. All repair and relabelling findings stand.


---

## 1. Executive Recommendation

# **Repair 4 claims, relabel 16, build 2 checks. Do not build EvidenceAssessment yet.**

Your sequencing instinct is right, and the inventory sharpened why: **the defects are more
concrete than an abstraction layer would have caught.** Both published artifacts are wrong in
ways a schema would not have prevented - one cites a source that biases against the host, the
other publishes arithmetic that does not reproduce. Those needed a human doing division, not a
new field.

**Answering your standard directly - "how many claims can NGW defend under hostile review?"**

```
Claims NGW would defend today          : 18   (16 decisions + 2 published)
Claims NGW could actually defend       :  3   (Cookout grill_master, Low Country cook,
                                               crab_size minus its Medium leg)
Defensible after the repairs below     : 18   (as ANALOGOUS / DERIVED, honestly labelled)
```

**The repair does not shrink the knowledge base. It relabels it.** No value is deleted; no
host loses a recommendation. What changes is that NGW stops calling a planning heuristic
"researched."

**One finding outranks the rest and is a product issue, not a governance issue:** `p_crabs`
grounds crab quantity to a **crab-legs** portion band. Whole blue crab has a far worse
meat-to-shell ratio, so the citation **biases the host toward under-buying the main dish of the
event** - and it contradicts the playbook's own Maryland rule of thumb by ~1.5x. That is the
first thing to fix, ahead of any framework.

---

## 2. Claims Requiring Immediate Repair

| # | Claim | Defect | Action | Effort |
|---|---|---|---|---|
| **1** | **`p_crabs.provenance`** | Crab-leg band applied to whole blue crab; biases low; contradicts playbook's own ~9/picker rule | Re-ground to regional crab-feast guidance; record the adult-picker conversion; reconcile the internal conflict | Hours |
| **2** | **`p_wine.provenance`** | 40% is the source's **beer** share; stated arithmetic yields 0.24 not 0.4; two sibling playbooks citing the same source say 0.5 | Rewrite derivation; state the drinker-rate assumption; reconcile with Anniversary/Vow Renewal | Hours |
| **3** | **Crab Feast `crab_size`** Medium leg | Documented method yields 0.63; claim says 0.55 | Correct to ~0.63 or record why the method excepts that size | Minutes |
| **4** | **Juneteenth `menu`** | Source prices brisket at pork parity (~4% apart) and holds no seafood | Withdraw grounding; retain values as planning model | Minutes |

**Items 3 and 4 are minutes of work.** They should not wait on anything in this document.

## 3. Claims Safe to Keep

**As ANALOGOUS, with no value change:**

- The Cookout `grill_master` and Low Country `cook` - clean single-leg hierarchy claims, no
  potluck leg. The source genuinely establishes that hired labor costs more than host labor;
  only the exact percentage is calibration.
- The 11 hierarchy legs across decisions 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 16 - caterer /
  restaurant / drop-off / platter multipliers measured against a host baseline.

**As DERIVED, verified:** `crab_size` Large Female, XL Male, Jumbo Male - all three reproduce
exactly from the recorded midpoint method.

**Nothing in the corpus warrants deletion.** These are reasonable planning heuristics authored
by people who knew the domain. The defect has always been the label, not the number.

## 4. Claims Needing Research

Ordered by cost to acquire, carrying forward 5B-4:

| # | Requirement | Unblocks | Effort |
|---|---|---|---|
| 1 | **Potluck / guest-contribution cost economics** | **12 decisions, 8 conflicting values** - the largest ungrounded dependency in the corpus | Medium |
| 2 | Live blue crab $/dozen (4 DMV vendors already surveyed) | Crab Feast `steam_vs_order` | Hours |
| 3 | Whole blue crab picked-yield per crab | **Repair #1** - and it retires assumption A1 | Hours |
| 4 | Live vs boiled crawfish $/lb | Crawfish `cookmethod` | Hours |
| 5 | DIY / host-cooked per-person cost band | 11 grounded + 9 ungrounded decisions | Weeks |
| 6 | Non-alcoholic beverage per-person cost | 11 decisions, 193 purchase instances | Days |

**Item 3 is new and cheap** - the inventory needs it to close its own assumption, and it is the
difference between repairing `p_crabs` properly and re-guessing.

---

## 5. Proposed Evidence Model

**Recommendation: adopt the vocabulary now, defer the storage.**

The four-way classification (DIRECT / DERIVED / ANALOGOUS / UNSUPPORTED) has already proven
itself - it is what made this inventory possible, and it did so with **no schema at all**. That
is the signal: the taxonomy is the valuable part; the persistence layer is not yet earning its
cost.

**Phase 5C stores assessments in the inventory document, not in code.** 18 claims is a
document-sized problem. Build storage when a reviewer other than the author needs to act on it,
or when the count exceeds roughly 50.

When it is built, four fields are non-negotiable, each earned by a specific defect found:

| Field | Earned by |
|---|---|
| `derivation` (inputs / method / output) | `crab_size` was checkable **only** because its method was recorded; `p_wine` failed **only** because I could redo its arithmetic |
| `sourceExcerpt` (verbatim, required for DIRECT) | Potluck: 12 claims cite a source whose text never mentions it |
| `scopeGap` (required for ANALOGOUS) | `usda-meat` has no seafood; the crab-leg band is the wrong instrument for blue crab |
| `sufficiencyMet` | `sufficientWhen` is already populated on all 16 and was never once evaluated |

**Do not reinvent `sufficientWhen`.** It exists, it is specific, and it is actionable
("2+ Lowcountry-boil caterer quotes in a comparable coastal market"). The research queue can be
generated from it today.

## 6. Predicate Recommendation

**Recommendation: keep `isGroundedCost` unchanged. Add a separate, richer function.**

**Return a structured result, not a boolean.** The inventory settles the argument: a single
decision can hold DERIVED, ANALOGOUS and UNSUPPORTED legs simultaneously (Juneteenth `menu`
holds all three). A boolean cannot express that, and collapsing it would recreate exactly the
flattening that caused this problem.

```
EvidenceResult {
  status        : verified | derived | analogous | unsupported | unassessed
  perLeg[]      : the same, per multiplier      <- REQUIRED, per Juneteenth menu
  reason        : why this status
  sourceCoverage: which parts of the claim the source reaches
  freshness     : age vs the source's freshnessPolicy
}
```

**Why not modify `isGroundedCost`:** 16 decisions and both published artifacts flow through it,
plus CI gates and `decisionWireProof`-class tests. Changing its semantics is a behavioral change
disguised as a rename. Add alongside; migrate callers deliberately; delete nothing.

**`unassessed` must be the default and must be visually distinct from `unsupported`.** "We have
not checked" and "we checked and it fails" are different claims, and conflating them is the same
category of error this whole phase is correcting.

## 7. Source Registry Changes

| Field | Prevents a real defect? | Rank |
|---|---|---|
| **`supportsClaimTypes[]` / `excludedClaimTypes[]`** | **Yes** - `usda-meat` cited for a seafood leg would have been blocked mechanically | **MUST HAVE** |
| **`supportedSegments[]` / `unsupportedSegments[]`** | **Yes** - `catering-perperson-2026` enumerates 4 tiers; declaring that potluck and DIY are **not** among them blocks 14 legs at authoring time | **MUST HAVE** |
| `derivationAllowed` | Partly - would have forced `p_wine` to record its method | SHOULD HAVE |
| `freshnessRequired` | Not yet - no staleness defect found. Becomes MUST on the first seasonal publish | SHOULD HAVE |
| `geographicLimits` | Yes but latent - `dmv-crab-2026` is DMV-only and nothing enforces it. No defect yet because only one playbook uses it | SHOULD HAVE |

**The two MUST HAVEs would have prevented 14 of the 14 UNSUPPORTED legs.** That is the entire
unsupported population, caught at authoring time by two declarative fields. This is the highest
leverage change in the whole phase and it is metadata, not machinery.

## 8. Automated Checks

Ranked by value per unit of effort. **All four are unit tests over existing data - no schema,
no migration.**

| # | Check | Catches today | Effort |
|---|---|---|---|
| **1** | **Same source + same relationship -> different values** | **12 potluck legs (8 values), 4 wine claims (2 values)** | Low |
| **2** | **Source category mismatch** (needs `excludedClaimTypes`) | Juneteenth `menu` seafood leg | Low, after SS7 |
| **3** | Derived claim without a derivation record | 15 of 16 decisions | Low |
| **4** | `researched` tier without an evidence assessment | All 18 | Trivial |

**Check 1 is the one to build first**, and it needs one design property or it will fail: it must
separate **unexplained** variance from **justified** variance. C3 in the inventory shows why -
beer ranges 1.5 to 6 per guest across playbooks citing one source, and that spread is *correct*,
because the source explicitly parameterizes drinks by event duration. A check that flags it as a
defect will be muted within a week.

**So Check 1 emits three outcomes, not two:** `consistent` / `justified-variance` (a recorded
reason exists) / `unexplained-variance`. Only the third is a finding.

**Checks 3 and 4 will flag nearly everything on first run.** That is fine - they are inventory
instruments, not gates. Do not wire them to CI until the repairs land, or the build goes red on
day one and someone disables them.

## 9. Runtime Communication Strategy

**Recommendation: do not expose a five-level taxonomy to hosts.**

The internal model needs five levels. The host-facing surface needs **two**, because the honest
distinction a host can act on is narrow:

> **"We looked this up"** vs **"This is our planning estimate"**

Verified and Derived collapse to the first. Analogous, Planning Model and Preference collapse to
the second. A host cannot act differently on "analogous" versus "expert guidance," and asking
them to parse five tiers transfers our governance problem onto them.

**Insertion points, ranked:**

| Rank | Surface | Rationale |
|---|---|---|
| **1** | **Budget figures derived from costFactors** | Where a multiplier becomes a dollar number the host plans against. The actual exposure |
| **2** | **Decision explanations ("Why:")** | Already renders provenance notes (`HostShellV2:9357`) - the surface exists |
| **3** | **AI / copilot explanations** | Must never assert researched certainty for an analogous claim. Highest damage if skipped |
| 4 | Readiness score | **PARK** - conflates "is the host ready" with "how sure are we" |
| 5 | Decision memory | PARK |

**Most NGW numbers will read as planning estimates for a long time.** That is the honest state,
and saying it plainly is more trustworthy than decorating 18 claims with confidence badges while
2,294 others carry nothing.

---

## 10. Risks

- **R1. The relabelling reads as regression.** "Grounded" drops from 16 to 3 before the repairs
  land. **Decide this is the deliverable before anyone sees the number move.**
- **R2. `p_crabs` is a live under-buying risk.** Of everything here, this is the one with direct
  host consequence. It should not sit behind a framework discussion.
- **R3. Check 1 without a justified-variance path becomes noise** and gets disabled. See SS8.
- **R4. My classifications are judgement.** Particularly A3 - whether a labor-tier source can
  support a potluck cost-shift. It carries 14 UNSUPPORTED legs. A reviewer could disagree, which
  is why the assessment needs a named reviewer rather than my verdict.
- **R5. Two inventory assumptions are unsourced** (blue crab ~1/3 lb; ~2/3 adult pickers) and
  both sit under the `p_crabs` repair. Research item #3 retires them.
- **R6. Concentration is untouched.** 14 of 16 still rest on one source. Second-sourcing remains
  outstanding from 5B-4 and no phase has scheduled it.

## 11. Migration Strategy

Every stage is additive and independently revertible.

| Stage | Work | Reversible |
|---|---|---|
| 0 | Repairs #3 and #4 (minutes) | Yes |
| 1 | Check 1 as a unit test, reporting only | Yes - a test |
| 2 | Repairs #1 and #2 (research item #3 first) | Yes |
| 3 | `supportsClaimTypes` / `supportedSegments` on the 3 cost sources | Yes - additive metadata |
| 4 | Checks 2, 3, 4; still reporting only | Yes |
| 5 | Relabel the 16 decisions; `isGroundedCost` untouched | Yes |
| 6 | Runtime two-level display | Yes |

**Stage 2 is the decision point.** If repairing both published artifacts changes nothing a host
would see, the assessment layer is not worth building and stages 3-6 should be re-argued.

---

## 12. EXECUTE / PARK / KILL

| Decision | Verdict |
|---|---|
| **Repair `crab_size` Medium leg (0.55 -> ~0.63)** | **EXECUTE - minutes** |
| **Withdraw grounding on Juneteenth `menu`** | **EXECUTE - minutes** |
| **Repair `p_crabs`** (research item #3 first) | **EXECUTE - highest priority; host-facing risk** |
| **Repair `p_wine` derivation** | **EXECUTE** |
| **Check 1** (same source, different values, 3-outcome) | **EXECUTE - first check** |
| **`supportsClaimTypes` + `supportedSegments` on 3 cost sources** | **EXECUTE - would prevent all 14 UNSUPPORTED legs** |
| **Relabel 16 decisions to ANALOGOUS / split potluck legs** | **EXECUTE - after stage 2** |
| **Potluck cost research** | **EXECUTE - largest single gap** |
| **Whole blue crab picked-yield research** | **EXECUTE - cheap, closes A1** |
| `EvidenceResult` structured return (alongside, not replacing) | **PARK** - unpark at stage 5 |
| `EvidenceAssessment` persistence | **PARK** - document-stored until >50 claims or a second reviewer |
| Checks 2, 3, 4 | PARK behind Check 1 and SS7 |
| Freshness enforcement | PARK - unpark on first seasonal publish |
| Derived/composed provenance | PARK - unpark when the DIY band needs it |
| Evidence level in readiness score | **PARK** - conflates readiness with certainty |
| Five-level host-facing taxonomy | **KILL** - two levels; five transfers our problem to the host |
| `geographicLimits` enforcement | PARK - latent, single consumer |
| Event-category applicability metadata | **KILL** - no finding has turned on it |
| Specialty / cultural ingredient pricing | **KILL** - unchanged |
| Resolver migration, registry consolidation, 219-item backfill | PARK - unchanged since 5A-4 |
| **Any new KCR before stage 2** | **KILL for now** - publishing under a gate that cannot verify support compounds the problem |

---

## 13. Answering the Milestone Question

> "Can NGW defend its top 50 recommendations under hostile review?"

**Not yet - but the gap is measured, bounded, and mostly clerical.**

Today NGW has **18 governed claims**, not 50. Of those, **3 survive hostile review as labelled**.
After the four repairs and the relabelling, **all 18 are defensible** - because a defensible
claim is one whose label matches its evidence, not one with a source id attached.

**The moat is not the count.** It is that NGW is now the kind of system that can find its own
`p_wine` - a published artifact whose arithmetic does not reproduce - and say so in writing.
Nothing in the previous four phases could have caught that, because nothing was doing the
division.

**Build the habit before the framework.** The taxonomy plus one automated check plus four
repairs will teach more about what the permanent gate needs than designing the gate first would.
