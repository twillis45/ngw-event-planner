# Sprint 56E — Event Judgment Intelligence Audit

*Audit only. No build, no runtime change, no new engine without evidence, **no Notion update** (governance = recommendations only). Pattern 006 governs; burden of proof is on any new engine/dashboard/readiness/governance layer. The system increasingly knows WHAT to do; this audit asks whether it can reason about **what matters, why, to whom, and whether it's worth doing** — and settles the dependency order before any architecture call. Date: 2026-06-17.*

## The settling finding (read first)
**Outcome → Stakeholder → Communication is ONE chain — but the proposed order inverts the first link. The correct order is `Stakeholder → Outcome → Communication`.** Proof, from code: the intake field **`meaning_people`** asks for *"the people who matter most — and your hope for each."* That single field captures **stakeholder + that stakeholder's desired outcome together** — you cannot state the hope without naming the person. Therefore **stakeholder is the index of outcome** (Part 5's hint is correct: stakeholder is *upstream*). Outcome = the aggregate of stakeholders' hopes + the event's `theOneThing`. Communication (the *strategic* kind) = keeping those stakeholders informed toward those outcomes.

So: **not three independent systems — one dependency chain, built Stakeholder → Outcome → Communication.** And all three reuse data NGW **already captures** (the meaning intake + the dark `plannerLens`/`successDeterminants`) → **Architecture C (reuse), no new engine.** *(Operational communication — RSVP/vendor reminders — is timeline-derived, already exists, and sits OUTSIDE this chain.)*

This is the same meta-pattern as 56C/56D: **the intelligence is largely already authored or captured; the gap is modeling + surfacing + rendering, not engines.**

---

## Part 1 — Intelligence Capability Matrix
`A mature · B functional · C partial · D largely absent`
| Capability | Grade | Evidence / existing consumer & surface | Gap | Chain position |
|---|---|---|---|---|
| Timeline | **A** | templates + `deriveEventCompressionSummary` + ROS + phases → timeline/spine | — | foundation |
| Dependency | **B** | `dependsOn` in milestones/tasks; decision-gates | cross-event deps | foundation |
| Readiness | **A** | `getEventReadiness` (4 axes) → cascade/health | — | foundation |
| Capacity | **B** | `playbookCapacity` (5 types) → Planning Health | non-playbook types | foundation |
| Pattern | **C** | risks/contingencies live; `plannerLens`/`mindset` **dark** (56D) | wire dark eos.json | mid |
| Venue | **D** | free-text + `COMMUNITY_VENUE_RE` hint (56C) | class model (56C build) | **root of inference** |
| Budget | **B** | estimator + `playbookBudgetCategories` | locality, quote | mid |
| Vendor | **B** | accountability/promises/COI | local pricing | mid |
| Market | **C** | national band × coarse metro (56B) | per-category local | mid |
| **Communication** | **B** op / **D** strategic | comms system (frozen) = operational; strategic absent | strategic = chain output | **chain #3** |
| **Outcome** | **C** | `meaning_why`/`must_have_moment`/`feeling_words` + dark `successDeterminants`/`theOneThing` — captured as TEXT, unmodeled | model + surface + use for decisions | **chain #2** |
| **Stakeholder** | **C** | `clients[]`, `honoree`, **`meaning_people`** (who + hope) | influence/priority model | **chain #1 (root)** |
| Resource | **D** (have-vs-need) | `rentalsGap` = NEED only; no owned-inventory | a HAVE field | needs Venue+Capacity |
| Opportunity | **D** | thin (56B) + scattered tribute tasks | type catalog (56B) | needs Type+Venue |
| Quote | **D** | latent (estimator range, unwired, 56C) | needs Venue+Market | downstream |
| Recovery | **B** | `contingencies` authored | surface + render | mid |
| Tradeoff | **D** | recommendations only; no cost/value/risk reasoning | needs Outcome+Budget+Risk | downstream of Outcome |
| Attention | **B** | Attention-System doctrine + on-track collapse + "nothing needs you" empty state | compose "stop worrying" explicitly | emergent (no engine) |
| Confidence | **C** | Pattern 014 pockets (estimate ranges, prompts) | universalize | cross-cutting |
| Knowledge Capture | **C** | `budget.actual` + vendor perf (`onTimeRate`/`incidentCount`/`plannerRehireCount`) + some `postEvent` — captured, **no learning loop** | actuals → future estimates | compounding moat |
| Event Maturity | **B** | `dayMode` + phase offsets + runway → stage-aware | explicit lifecycle model | cross-cutting |
| Decision Simulation | **C-latent** | readers are **pure functions of `guestCount`** → re-run with modified params = sim | a diff presentation | existing-engine evolution |

**Read:** strong on **operational** intelligence (timeline/readiness/capacity/budget/vendor = A/B), weak on **judgment** intelligence (outcome/stakeholder/tradeoff/resource/knowledge-capture = C/D) — and the judgment layer is mostly **captured-but-unmodeled**, not absent.

---

## Part 2 — Outcome Intelligence Audit
1. **Where it exists:** `meaning_why` ("the heart of the night"), `must_have_moment`, `feeling_words`, `meaning_cry_moment` (intake) + dark `plannerLens.successDeterminants` + `theOneThing` (eos.json).
2. **Modeled?** No — free text + dark data. 3. **Surfaced?** Barely (feeds AI briefs/ROS). 4. **Used for decisions?** No. 5. **Can it alter recommendations?** No.
→ **Should it be first-class? Yes — as a *modeled* layer, but it is DOWNSTREAM of Stakeholder** (`meaning_people` proves outcome is stakeholder-indexed). Build it by *modeling the meaning intake + dark plannerLens*, not a new engine.

---

## Part 3 — Communication Intelligence Audit
Two distinct tiers:
- **Operational comms** (RSVP follow-up, vendor confirmation, day-before reminders) — **timeline/decision-derived; already exists** (the comms system, currently FROZEN). **Not in the judgment chain.**
- **Strategic comms** (stakeholder updates, executive summaries, "is the bride reassured?") — **derived from Stakeholder + Outcome; absent.**
→ **Recommendation:** strategic communication is **the OUTPUT of the chain (data → existing comms runtime → existing surface)**, *not* a separate intelligence layer. Operational comms = existing runtime extension (when comms unfreezes). **Burden of proof for a new "communication intelligence engine" is unmet.**

---

## Part 4 — Resource Intelligence Audit
- **Need:** modeled — `rentalsGap` (chairs/plates/tables from guest count). **Have:** absent — no "I own 40 chairs / 3 coolers" inventory (one stray `owned` at `App.js:1863`, not an inventory).
- Can NGW compute **Buy / Rent / Borrow / Reuse?** No — only **Need.**
- **Smallest path:** add a **HAVE list** (per-profile or per-event owned items) → difference against the existing `rentalsGap` (NEED) → buy/rent/borrow/reuse. **Reuses `rentalsGap`; adds one data field; no engine.** Depends on Capacity (exists). **EXECUTE-able cheaply, but low on the judgment chain.**

---

## Part 5 — Stakeholder Intelligence Audit
1. **Modeled?** Partially — `clients[]` (primary/secondary), `honoree`, **`meaning_people`** (who matters + the hope for each). 2. **Influence modeled?** No. 3. **Recommendations vary by stakeholder?** No. 4. **Upstream of outcomes?** **YES — definitively** (`meaning_people` co-captures stakeholder + outcome).
→ **Architecture implication: Stakeholder is the ROOT of the judgment chain.** Model it from the existing `clients`/`honoree`/`meaning_people` data (add an influence/priority weight) — reuse, not new engine. **This is what must be built first.**

---

## Part 6 — Knowledge Capture Audit
1. **Captured:** `budget.actual` (planned vs actual), vendor performance (`onTimeRate`/`incidentCount`/`plannerRehireCount`/`successfulEventCount`), some `postEvent` hooks. 2. **Lost:** the **learning loop** — actuals don't feed future estimates (those come from hardcoded per-head bands, 56B); lessons aren't structured. 3. **Reusable knowledge:** vendor rehire-count partly compounds. 4. **Compounds over time:** essentially nothing today.
→ **Largest long-term moat? YES.** "Events like yours actually cost $X / this vendor delivered on time 9/10" is the compounding advantage no template-based competitor has. Currently **C (capture without compounding)**. The moat is the **loop** (actuals → tuned estimates/patterns), and it reuses already-captured data — **data + existing runtime, no engine.**

---

## Part 7 — Attention Intelligence Audit
"What should the user **stop** worrying about?" = `readiness=on-track` + `risk=low` → **whisper/collapse**; the one high item → **hero**. This is **composition over existing signals** (readiness + risk + patterns + confidence), and NGW already does a primitive version: the **Attention-System doctrine**, the on-track-row collapse, and the "Nothing needs you right now — you're clear" empty state.
→ **No new engine.** Attention Intelligence **emerges** from existing readiness/risk/pattern/confidence signals — the "centerpieces are fine, parking is the real risk" framing is `(centerpieces: green) + (parking: high-risk)`, both already computed. **B, emergent — compose, don't build.**

---

## Part 8 — Tradeoff Intelligence Audit
Current = **recommendations only.** No "open bar: +satisfaction / +cost / +liability." A tradeoff needs three valued axes: **cost** (Budget, exists), **liability/risk** (Risk, exists), **value/satisfaction** (**Outcome, missing-until-Part-2**).
→ **Tradeoff is DOWNSTREAM of Outcome** — you can't value the "+satisfaction" side until outcomes are modeled. **D, dependent.** Do not attempt before the Stakeholder→Outcome chain exists.

---

## Part 9 — Confidence Intelligence Audit
Pattern 014 (56C) named Known/Likely/Estimated/Unknown; it lives in **pockets** (budget ranges, Reality-Check prompts, capacity-as-requirements) but is **not universal** — venue/quote/pattern/market each render certainty differently or not at all.
→ **Confidence should become a universal framework** — a **cross-cutting rendering convention** (every inference carries its tier), **not a vertical engine.** This is **Pattern 014 universalized**, the trust substrate for the entire inference roadmap. **C → make universal.**

---

## Part 10 — Event Maturity Audit
Lifecycle: Idea → Planning → Procurement → Coordination → Execution → Recovery. Runtime is **partially** stage-aware: `dayMode` auto-engages on event day (Execution), phase offsets + readiness phases, the runway/countdown (56 calendar rework). **Missing:** an explicit lifecycle-stage model + intelligence that *varies* by stage (Procurement → surface buying; Coordination → vendor; Recovery → Knowledge Capture).
→ **B.** Maturity is a **cross-cutting lens** (which patterns/actions surface when), derivable from dates + existing phase data — **no new engine**; it sequences *when* the other intelligences fire.

---

## Part 11 — Decision Simulation Audit
"What if 80 → 120 guests / venue change / budget cut / rain plan / vendor cancels?" The playbook readers (`playbookCapacity`, `playbookBudgetCategories`, `rentalsGap`, estimator) are **pure functions of event parameters** (verified: pure `guestCount`/`resolveQuantity`). **Running them against a hypothetical event = simulation.**
→ **Simulation is an existing-engine EVOLUTION, not new architecture** — the compute primitive already exists; what's missing is a **diff presentation** (current vs hypothetical). Dependency: the readers must stay pure (they are). **C-latent; cheap; reuse.** *(Caveat: only guest-count/budget what-ifs are clean today; venue/vendor what-ifs depend on Venue Intelligence.)*

---

## Part 12 — Cutting-Edge Moats ("what great planners do that software doesn't")
| Moat | Current gap | Existing evidence | Dependency | Smallest path | Moat value | Bucket |
|---|---|---|---|---|---|---|
| **Stakeholder→Outcome reasoning** (optimize for whose success) | unmodeled | `meaning_people`, `successDeterminants` (dark) | root of chain | model the meaning intake | **Very high** | **TEST** (after Venue) |
| **Knowledge-capture learning loop** (your history tunes your future) | no loop | `budget.actual`, vendor perf | needs ≥1 completed event | actuals → estimate tuning | **Highest (compounding)** | **TEST** |
| **Attention** (what to stop worrying about) | not composed | Attention System + on-track collapse | readiness+risk (exist) | compose a "clear/worry" view | High | **EXECUTE-able** |
| **Confidence everywhere** (Pattern 014 universal) | pockets only | Pattern 014 | none | rendering convention | High (trust) | **TEST** (with Venue card) |
| **Decision simulation** (what-if) | no diff view | pure readers | readers pure (✓) | hypothetical-run + diff | High | **PARK** (after Venue) |
| **Resource have-vs-need** (buy/rent/borrow) | need-only | `rentalsGap` | Capacity (✓) | add HAVE list | Medium | **PARK** |
| **Tradeoff reasoning** | recs only | Budget+Risk | needs Outcome | value axes | High | **PARK** (after Outcome) |

---

## Part 13 — Product OS Governance (recommend only — NO Notion update this sprint)
| Candidate | Recommendation | Evidence |
|---|---|---|
| **Outcome Before Optimization** | **Needs Review** (Draft when modeled) | thesis of 56E; but depends on the Stakeholder→Outcome chain existing; foundational, not yet shipped |
| **Attention Is Scarce** | **Needs Review → likely fold into the existing Attention-System doctrine** | already largely doctrine + embodied (on-track collapse, empty-state); reaffirm, don't duplicate |
| **Events Exist To Produce Outcomes** | **Needs Review** | foundational premise (like Pattern 016); abstract; promote when Outcome ships |
| **Decisions Require Tradeoffs** | **Needs Review** | sound but downstream of Outcome; no embodiment yet |
| **Confidence Must Travel With Advice** | **Reject as new → fold into Pattern 014** | this is Pattern 014 (Show Confidence Boundaries) restated; make it a 014 refinement (POS-P014-R), not a new pattern |
| **Knowledge Must Compound** | **Promote-candidate → Needs Review** | the strongest genuinely-new doctrine: the learning-loop moat; distinct from all existing patterns; promote to Draft when the capture loop is designed |
*(All "recommend" — nothing created. The clean new doctrine is "Knowledge Must Compound"; "Confidence Must Travel With Advice" = Pattern 014; "Attention Is Scarce" = existing Attention System.)*

---

## Deliverable 2 — Gap Map (grade profile as each layer lands)
| Capability | Current | +Venue Intel | +Outcome (via Stakeholder) | +Communication | +Resource | +Knowledge Capture |
|---|---|---|---|---|---|---|
| Venue | D | **B** | B | B | B | B |
| Budget/Quote/Market | C/D | **C+** (cost-profile) | C+ | C+ | C+ | **B** (tuned by actuals) |
| Stakeholder | C | C | **B** | B | B | B |
| Outcome | C | C | **B** | B | B | B |
| Communication (strategic) | D | D | D | **B** | B | B |
| Tradeoff | D | D | **C** (value axis appears) | C | C | C |
| Resource | D | D | D | D | **B** | B |
| Knowledge Capture | C | C | C | C | C | **B (compounding)** |
| Attention/Confidence | B/C | B/C+ | B/C+ | B | B | B |
**The profile lifts fastest when Venue (root of inference) and Stakeholder (root of judgment) land — every later column depends on those two.**

---

## Deliverable 3 — Top 10 Moat Opportunities (ranked: User value · Planner realism · Competitive advantage · Reuse)
1. **Venue Intelligence Foundation** (56C) — root of inference; reuse 5/5. *(already the EXECUTE decision)*
2. **Stakeholder→Outcome chain** — root of judgment; reuse 4/5 (meaning intake + dark plannerLens).
3. **Knowledge-capture learning loop** — compounding moat; reuse 4/5 (actuals + vendor perf).
4. **Confidence universal (Pattern 014)** — trust substrate; reuse 5/5.
5. **Attention ("stop worrying")** — emergent; reuse 5/5.
6. **Pattern Intelligence wiring** (56D) — turn on dark eos.json; reuse 5/5.
7. **Strategic communication** (chain output) — reuse 4/5; gated on Stakeholder+Outcome.
8. **Decision simulation (what-if)** — latent; reuse 4/5; gated on Venue.
9. **Tradeoff reasoning** — high value; gated on Outcome.
10. **Resource have-vs-need** — medium; cheap; standalone.

---

## Deliverable 4 — Final Recommendation (EXECUTE / TEST / PARK / KILL, sequenced)
**Build in dependency order, not feature order. Two roots first, then the chain.**

- **EXECUTE (in order):**
  1. **Venue Intelligence Foundation** (56C) — root of all inference.
  2. **Wire the dark `eos.json` pattern data** (56D) — lights up authored intelligence; also surfaces the `plannerLens`/`mindset` that the Outcome layer will reuse.
  3. **Attention composition** + **Confidence-universal rendering** — both are compositions/conventions over existing signals; cheapest trust wins.
- **TEST (the judgment chain, in dependency order — NOT three separate systems):**
  4. **Stakeholder** (model `meaning_people`/`clients`/`honoree` + influence) → 5. **Outcome** (model the meaning intake + `successDeterminants`) → 6. **Strategic Communication** (chain output). Plus **Knowledge-capture loop** (actuals → tuned estimates).
- **PARK:** Tradeoff (after Outcome), Decision Simulation (after Venue), Resource have-vs-need, local market/quote (after Venue).
- **KILL:** a new Outcome/Stakeholder/Communication **engine**; a separate Attention/Confidence/Tradeoff engine; a new governance system for any of it. **All are data + existing runtime + existing surface; the burden of proof for an engine is unmet everywhere.**

**Sequencing rule (the answer to the core question):** because `Stakeholder → Outcome → Communication` is **one chain rooted in stakeholder**, build it as one sequenced effort over the existing meaning intake + dark plannerLens — **after** the two foundations (Venue, Pattern wiring) that the rest of the inference roadmap also needs.

**Confidence:** High on the dependency proof (`meaning_people` is decisive) and on the reuse conclusion (the data is captured/dark, not absent). **Weakest assumption:** the Knowledge-capture *moat* assumes a volume of completed real events to compound from — which depends on the activation funnel (55N) producing a cohort; with zero completed events, the learning loop has nothing to learn from yet. So the moat is real but **gated on traction**, not just on build. No build performed; audit only; no Notion/Product OS changes made.
