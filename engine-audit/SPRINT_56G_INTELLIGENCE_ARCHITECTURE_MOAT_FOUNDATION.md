# Sprint 56G — Intelligence Architecture & Moat Foundation

*Architecture + Product-OS design review. No build, no code, no UI, no new engine, no Notion write (governance = recommendations only). Consolidates 56A–56F and adds four new layers (Assumption, Decision Consequence, Regret, Decision Memory). All 15 existing patterns + 4 anti-patterns treated as canonical. Date: 2026-06-17.*

## The ruthless conclusion (read first)
**Every intelligence layer in this review is Product Excellence — necessary to be world-class, and copyable.** Venue, Market, Outcome, Stakeholder, Pattern, Tradeoff, Assumption, Consequence — all are **authored data + existing runtime**; a funded competitor can author the same. **The only durable moats are the data-accumulation layers — Knowledge Capture → Memory → Decision Memory → Event Intelligence Network — and they are gated on *traction NGW has not earned* (the 55N funnel has ~0 measured events).** 

Therefore the strategically honest finding: **more intelligence moves NGW toward top-10% but not toward defensible.** The moat is the data loop; the data loop is gated on getting real events through the product — a **distribution problem, not an intelligence problem.** The largest risk in this entire 56-series is **building copyable excellence while the only defensible asset (accumulated data) starves for lack of traction.**

---

## Master Layer Review (grade · dependency · reuse · moat tier · architecture)
| # | Layer | Grade (today) | Depends on | Reuse | Moat tier | Architecture |
|---|---|---|---|---|---|---|
| 1 | **Venue** | **D** | — (root) | `COMMUNITY_VENUE_RE`, tags | Excellence | data + classifier (56C) |
| 2 | **Market** | **C** | Venue | `METRO_MARKETS` | Excellence | lookup table (per-class × metro) |
| 3 | **Outcome** | **D**-modeled | **Stakeholder** | meaning intake + dark `successDeterminants` | Excellence | model existing data |
| 4 | **Stakeholder** | **C** | — (root of judgment) | `clients`/`honoree`/`meaning_people` | Excellence | model existing data |
| 5 | **Communication** | **B** op / **D** strategic | Stakeholder+Outcome | comms system (frozen) | Excellence | chain output |
| 6 | **Resource** | **D** (need-only) | Capacity | `rentalsGap` | Excellence | add HAVE field |
| 7 | **Tradeoff** | **D** | Outcome+Budget+Risk | — | Excellence | deterministic compute |
| 8 | **Assumption** *(new)* | **D** | Patterns/Risks | risks+contingencies+deps | Excellence | **reframe existing data** |
| 9 | **Decision Consequence** *(new)* | **C** | decision graph | Pattern 001 gating + `dependsOn` | Excellence | **surface existing edges** |
| 10 | **Regret** *(new)* | **D** | Outcome+Memory | risk `severity` + dark `experience` | Excellence→Moat | severity proxy → measured (Memory) |
| 11 | **Attention** | **B**-emergent | readiness+risk | Attention System + on-track collapse | Excellence | compose, no engine |
| 12 | **Knowledge Capture** | **C** | completed events | `budget.actual`, vendor perf | **TRUE MOAT** | data loop |
| 13 | **Decision Memory** *(new)* | **D** | decision-resolve | resolve flow | **TRUE MOAT** | rationale field |
| 14 | **Event Intelligence Network** | **F** | scale (10k+) | the loop | **TRUE MOAT** | aggregation infra (gated) |
| + | Pattern (56D) | C | — | dark eos.json | Excellence | wire dark data |
| + | Confidence (Pattern 014) | C | none | estimate ranges/prompts | Excellence | universal convention |

---

## Layer deep-dives

### Layer 1 — Venue Intelligence Maturity Model
**Root inference layer? Yes** (56C dependency map). Maturity tiers (Pattern 014):
- **Known** (recognized name → class): `venueClass`.
- **Likely** (class inference): inclusions, BYO, typical policies, setup-responsibility.
- **Estimated** (range): rental cost-profile.
- **Always Unknown** (confirm forever — AP-005/POS-P009-R1): alcohol policy, kitchen access, insurance, decor rules.
- **Never inferred:** parking/restroom/power **adequacy**, ADA **compliance** — *adequacy is unknowable from a name*.
Maturity ladder: M0 free-text (today) → M1 class recognition → M2 class model (inclusions/cost/rules as Likely/Estimated) → M3 confirmed-per-venue → M4 Memory-tuned (real costs from completed events). M0→M2 = authored (Excellence); M4 = moat (Memory-gated).

### Layer 2 — Market: smallest accurate architecture
Resolution order, smallest-first: **Venue-class cost-profile (national typical) × Metro factor** (exists, `METRO_MARKETS`) → optionally **county/sub-metro** refinement later. **Category-level** bands (DJ/florals/catering) layer on top. No AI, no prediction — a **lookup table**, tuned by Memory at M4. Smallest accurate = `class × metro`, with `category` and `county` as additive refinements only when data justifies.

### Layer 3 — Universal Outcome Framework (downstream of Stakeholder)
Outcome taxonomy (small, type-weighted): **{ Emotional · Experiential · Financial · Reputational · Relational · Operational }**. Each event type weights them:
- Wedding → Emotional + Relational + Experiential (memories, family connection).
- Fundraiser → Financial + Reputational (donations, sponsor visibility).
- Conference → Experiential + Operational (attendance, engagement).
- Graduation → Emotional + Relational (recognition, family).
Captured today as text (`meaning_why`, `feeling_words`) + dark `successDeterminants`/`theOneThing`. **Model = tag the meaning intake against the 6-axis taxonomy, weighted by type. No engine.**

### Layer 4 — Stakeholder (dependency proof, restated)
`meaning_people` = "people who matter most **and your hope for each**" = **stakeholder + their outcome in one field.** ⇒ **Stakeholder → Outcome → Communication is one chain rooted in Stakeholder** (56E, proven). Stakeholder = WHO; Outcome = what success means *to them*; Communication = keeping them informed toward it.

### Layer 5 — Communication (operational vs strategic)
- **Operational** (RSVP/vendor/reminders): timeline-derived, **exists** (frozen), outside the chain.
- **Strategic** (stakeholder updates, exec summaries): the **chain output**, downstream of Stakeholder+Outcome. Not a separate engine.

### Layer 6 — Resource (no fake precision)
Reason about money (Budget, exists), time (Timeline, exists), volunteers/vendors/inventory/equipment as **Need vs Have**: NEED exists (`rentalsGap`); HAVE is missing. Add a HAVE list → diff → **Buy/Rent/Borrow/Reuse** as *suggestions to confirm* (never "you have enough" — that's adequacy/AP-005).

### Layer 7 — Tradeoff (deterministic)
"If X↑ then Y↓" must be **deterministic**, not modeled: more guests → +cost (per-head, known) + capacity load (known) + timeline (known); open bar → +cost (known) + liability (risk flag) + satisfaction (**Outcome — missing**). ⇒ **Tradeoff is deterministic on two axes today (cost, logistics) but needs Outcome for the third (value/satisfaction).** Downstream of Outcome.

### Layer 8 — Assumption Intelligence *(new)*
Surface the **implicit preconditions** of a choice: outdoor → *assumes* good weather; volunteer setup → *assumes* volunteers arrive; buffet → *assumes* replenishment. **This is the INVERSE of risks/contingencies + dependencies — a reframing, not new data.** Most assumptions already exist as authored risks/`dependsOn`; Assumption Intelligence renders them as "this choice assumes X — is that safe?" **Architecture: reframe existing risk/dependency data (Pattern 016 family). High value, near-zero new data.** Doctrine candidate (see Part 4).

### Layer 9 — Decision Consequence Intelligence *(new)*
"Because you chose this, **these** now matter." This is **Pattern 001 (Decision-First) made visible** — the decision graph already gates downstream actions (`dependsOn`, decision-gates); Consequence Intelligence *shows the edges* ("outdoor venue → rain plan now matters; 120 guests → seating + parking now matter"). **Architecture: surface the existing dependency/gating edges. No new engine — it's the cascade, narrated.** Reframes Pattern 001, doesn't replace it.

### Layer 10 — Regret Intelligence *(new)*
High-regret = **high severity × irreversibility × outcome-impact.** Severity exists (risk `severity`); the dark `experience` detectors are proto-regret. **v1 (authored proxy):** flag high-severity + hard-to-reverse decisions as "get this right — it's hard to undo." **v2 (measured):** which decisions did people actually regret? — **requires Memory + Outcome** (gated on traction). Useful + feasible (v1); measurable only at v2. **v1 = reframe; v2 = PARK behind Memory.**

### Layer 11 — Attention ("what to stop worrying about")
Derived: `on-track + low-risk → whisper`; `the one high item → hero`. **Emergent from readiness+risk+patterns+confidence** — already primitively shipped (Attention System, on-track collapse, "nothing needs you"). **Compose, don't build.**

### Layer 12 — Knowledge Capture Architecture
After every event capture: **actual cost** (`budget.actual`, exists) · **actual attendance** (vs estimate) · **vendor outcome** (perf fields exist) · **problems/successes/regrets/lessons** (structured, missing). Architecture = a lightweight **post-event capture** (reuse the `postEvent` hooks) writing to a per-user/per-vendor/per-venue **ledger**. **The loop (capture → tune estimates/patterns) is the first true moat.** No engine — data + aggregation.

### Layer 13 — Decision Memory Architecture *(new)*
Remember **why**, not just **what**: a **rationale note** captured at decision-resolve ("chose VFW because budget-tight + BYO-bar"). Architecture: one field on the existing decision-resolve flow + recall on revisit. **Cheap, high planner-realism** (planners remember reasoning), pairs with Knowledge Capture. Modest per-user moat.

### Layer 14 — Event Intelligence Network
At 10k/100k/1M events: real **quote-fairness distributions**, cross-user **vendor/venue benchmarking**, **outcome/attendance prediction** from priors. **The strongest, most proprietary moat — and the farthest** (gated on scale → traction). Until then it doesn't exist (**F**).

---

## Moat Analysis (be ruthless)
- **Product Excellence** (must-have, copyable): Layers **1–11 + Pattern + Confidence + Attention.** All of it. This is the *price of admission* to world-class, not a moat.
- **Competitive Advantage** (a lead, erodes): the **depth, integration, and trust-honesty** of the above — a head start measured in months, not a wall.
- **True Moat** (hard to replicate): **Knowledge Capture loop → Memory → Decision Memory → Event Intelligence Network.** Only the **accumulated proprietary data.** And all of it is **traction-gated.**

---

## Part 1 — Intelligence Dependency Map (the correct order)
```
                         ┌──────────────┐
                         │ VENUE (root) │ ──► Market ──► Quote
                         └──────┬───────┘                 ▲
   Pattern wiring (dark eos) ───┤                         │
                                ▼                          │
        ┌────────── STAKEHOLDER (root of judgment) ────────┘
        ▼
     OUTCOME ──► Tradeoff
        │   └──► Regret(v1)
        ▼
   COMMUNICATION (strategic)
        │
        ▼
  ┌─ Assumption / Decision-Consequence / Attention ─┐  (reframes of existing graph — surface anytime)
  └──────────────────────────────────────────────────┘
                                │
                                ▼
   KNOWLEDGE CAPTURE ──► MEMORY ──► Decision Memory ──► Regret(v2)/Prediction ──► EVENT NETWORK
                         └──────────────── traction-gated ──────────────────────────┘
```
Two roots (Venue for inference, Stakeholder for judgment); reframes (Assumption/Consequence/Attention) ride existing graphs; the moat tail (Capture→Memory→Network) is traction-gated.

## Part 2 — World-Class Roadmap (today → top 10%)
1. **Venue Intelligence** (root) → 2. **Pattern wiring** (turn on dark eos.json) → 3. **Confidence-universal + Attention** (cheap trust) → 4. **Stakeholder → Outcome → Strategic Comms** (judgment chain) → 5. **Assumption + Decision-Consequence** (reframe existing graph — high value, near-zero new data) → 6. **Tradeoff + Resource**. *All Product Excellence — gets NGW to top-10%, all copyable.*

## Part 3 — Moat Roadmap (top 10% → difficult-to-copy)
1. **Knowledge Capture loop** (build early, even at low volume) → 2. **Decision Memory** (cheap, pairs) → 3. **Memory** (per-user priors; tunes estimates/patterns) → 4. **Regret-v2 / Prediction** (statistics over Memory) → 5. **Event Intelligence Network** (the durable moat). **Every step is traction-gated; none defensible without volume.** *Parallel, non-negotiable track: distribution/activation — without it the moat roadmap is inert.*

## Part 4 — Doctrine & Layer Recommendations
**Per-layer EXECUTE / TEST / PARK / KILL:**
- **EXECUTE:** Venue · Pattern wiring · Confidence-universal · Attention compose.
- **TEST:** Stakeholder→Outcome→Comms chain · Assumption (reframe) · Decision-Consequence (reframe) · **Knowledge-Capture loop** · Decision Memory.
- **PARK:** Market refinement · Resource have-vs-need · Tradeoff (after Outcome) · Regret-v2 · Prediction · Decision Simulation · Event Network (until traction).
- **KILL:** any **new engine/dashboard/AI/governance layer** for the above (burden unmet — all reuse) · inferred **adequacy** (AP-005) · self-classified venue tiers (AP-004) · the **belief that authored intelligence is a moat.**

**Doctrine recommendations (recommend only — nothing written to Notion):**
| Candidate | Recommendation | Why |
|---|---|---|
| **Memory Beats Features** | **Needs Review** (strongest new) | features copyable, accumulated memory isn't (56F) — promote when the loop ships |
| **Knowledge Must Compound** | **Needs Review** | the mechanism behind Memory Beats Features (56E) |
| **Surface Hidden Assumptions** (Layer 8) | **Needs Review** | valuable + reuses risk/dep data; may be a refinement of Pattern 016, not standalone |
| **Choices Have Consequences** (Layer 9) | **Reject as new → refinement of Pattern 001** | it's decision-first made visible, not new doctrine |
| **Capture Decision Rationale** (Layer 13) | **Needs Review** | pairs with Knowledge-Must-Compound; cheap, high realism |
| **Confidence Must Travel With Advice** | **Reject → = Pattern 014** | restates Show Confidence Boundaries |
| **Trust Is Earned Through Accuracy** | **Needs Review (Executive Principle, not Pattern)** | trust is emergent (56F) |
| **Regret as severity×irreversibility×impact** | **Park doctrine** | premature; v2 needs Memory |

## Part 5 — The Honest Gap (no flattery)
Even with **all** layers built correctly, a first-time host will **not** match an elite planner, because the residual is **human-only and software-irreducible:**
1. **Taste / aesthetic eye** — suggest directions, never *have taste*.
2. **Real-time adaptation** — software isn't *in the room* when the toast drags.
3. **Emotional / relational labor** — it can't be the buffer for the crying bride or difficult mother.
4. **Authority & accountability** — it advises; it doesn't *own the outcome* or absorb blame.
5. **Physical execution & presence** — it can't direct vendors or fix the floor live.
6. **Relationship capital** — the Network gives data, never the planner's *personal* vendor leverage.
7. **Earned calm** — experience is *felt*, not informed; advice reduces ignorance, not anxiety.

**Honest bottom line:** NGW can lift a first-time host to a **competent planner on the cognitive dimensions** (decisions, anticipation, budget, risk, sequencing) — ~**60–70%** of the gap — and should promise *prepared + confident*, **not** *replaces the planner in the room*. The largest unbridgeable gap is **presence + accountability**. And the largest *strategic* gap is not intelligence at all — it is **traction**: the moats that would make any of this defensible cannot compound until real events flow through the product. **The next decisive move is distribution, not more intelligence.**

*Confidence: High on the dependency order (proven, 56E), the moat classification (56F), and the reuse verdict (every layer = data + existing runtime). Weakest assumption: the 60–70% figure and the traction-gating are judgment + inference, not measured — they must be validated against real activation/outcome data (55N), which does not yet exist. No build; design review only; no Notion/Product OS changes.*
