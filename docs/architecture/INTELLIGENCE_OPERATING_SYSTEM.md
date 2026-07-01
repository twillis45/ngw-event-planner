# NGW Intelligence Operating System — v1.0 (Canonical)

**Status:** FROZEN v1.0. This is the intelligence equivalent of the [Product OS](../product-os/PRODUCT_OS.md). Do **not** regenerate the intelligence audit — extend *this* document as engines ship. Curate after each sprint; never re-invent the framework.

**Owner:** Todd. **Adopted:** 2026-07-02, ratifying the "freeze the audit, build the missing layer" decision.

> **The thesis in one line:** Everyone else automates *templates you author* or *reminders off a date*. NGW automates *the plan itself* — and the plan gets smarter two ways: **Context Intelligence** makes the **first** event smart (culture + place + season), **Host Intelligence** makes the **tenth** event smart (learned reality). Together they compound into a moat neither has alone.

---

## 0. Why this document exists

Another intelligence audit has **diminishing returns** — we have enough evidence to make architectural decisions. The next gain comes from **building the missing layer**, not re-measuring. This OS exists to keep every future sprint grounded in data the system actually has, and to stop work from drifting into "AI features" that aren't actually intelligence.

**Every future sprint MUST answer these six questions** (the intelligence-debt gate):

1. **Which engine changes?** (name it from §3)
2. **Which level (1–5)?** (from §1)
3. **What intelligence debt is reduced?** (what guess/hard-code/hand-entry goes away)
4. **Does this create new MEMORY?** (does it store a reconciled observation?)
5. **Does this create PREDICTION?** (and if so, is there memory to justify it — §4?)
6. **Does this create MEASURABLE value?** (the metric that proves it)

If a proposed "AI feature" can't answer these, it isn't intelligence — it's branding. Reject it.

---

## 1. The five levels of intelligence

| Level | Name | What it is | Trust |
|---|---|---|---|
| **1** | **Static** | Hard-coded rules / templates the host authors | Low — commoditized |
| **2** | **Derived** | Generated from event semantics + a grounded corpus (playbooks, sizing math, taxonomy) | Medium — the current NGW floor |
| **3** | **Context** | The plan reshapes from **where / who / tradition / season** without the host asking | High — makes the *first* event smart |
| **4** | **Memory** | Learned from this host's **reconciled reality** (estimate → actual → stored) | Highest — accumulated operational knowledge, not "AI" |
| **5** | **Prediction** | Forecasts / risk / recommendations built **on top of** L4 memory | Earned only once memory exists |

**Rule:** a level-5 capability may not ship before the level-4 memory that justifies it exists (§4). *Prediction without memory is just another rules engine wearing AI branding.*

---

## 2. Intelligence debt (the thing we're paying down)

**Intelligence debt** = every place the system **guesses, hard-codes, or asks the host to hand-enter** something it could know. Each sprint should reduce it. Examples of current debt:

- The host types a headcount the system could learn from past attendance (→ L4).
- Ice/shade/water are generic instead of place-aware (→ L3).
- Weather is *displayed* instead of *acted on* (→ Weather→Action, roadmap #6).
- Estimates vanish after the event instead of being reconciled and stored (→ Reality Reconciliation, §4).

---

## 3. The canonical engines

Elevated to **two** compounding pillars — **Context** and **Host** intelligence — over the grounded L2 base.

### 3a. Base (L2, shipped)
- **Playbook engine** — projects tasks/spread/run-of-show from event type + attendance band.
- **Sizing / grounded corpus** — BLS pricing, attendance-band research, `eventTaxonomy`, provenance.
- **Effective Item seam** — one read-model over `plan.list` (FOOD-2A/2B/2C); the surface every consumer reads so intelligence lands in one place, not N copies. *(Shipped: shopping list migrated; parity discipline enforced by golden tests.)*

### 3b. Context Intelligence (L3) — **NEW canonical engine, the first-event moat**
Not memory. Not prediction. **Context.** Culture + location + season + traditions are the **same family** — fold them into one engine that reshapes the plan automatically.

It answers, and reshapes the plan for, four axes:

| Axis | Signals | Auto-effect examples |
|---|---|---|
| **Where** | state/region, climate, at-home vs venue | AZ → shade/water/ice ×1.4, cooling; coastal → seafood sourcing |
| **Who** | family · church · corporate · neighborhood · military · alumni | tone, formality, kids ratio, alcohol defaults |
| **Tradition** | Juneteenth · graduation · Eid · Diwali · Lunar New Year · backyard BBQ · **Maryland crab feast** | the tradition's *known kit* |
| **When** | season · holiday · local calendar · sunset · school schedule · football weekend | timing, daylight, competing-attention |

**Worked examples (the plan reshapes with no host input):**
- **Maryland Crab Feast** → newspaper on tables · crab mallets · seafood market · Old Bay · vinegar · hand-wash station · extra trash cans.
- **Texas BBQ** → smoker timing · wood · brisket rest · butcher paper.
- **Arizona (any outdoor)** → shade · water · ice · cooling — without the host asking.

*This is where the existing cultural/persona overlays + location signals consolidate. It makes the **first** event dramatically smarter.*

### 3c. Host Intelligence (L4) — **the tenth-event moat** (INTEL-1)
**Renamed from "Memory"** — "memory" sounds like storage; this is **learned operational behavior**. Also called **Household Intelligence** / **Host Intelligence Profile**. It is *accumulated operational knowledge*, which is far more trustworthy than "AI."

The profile (all fields carry a **confidence** that rises with observations):

```
Household Intelligence
  Attendance   planned 42 · actual 36 · confidence High · adjustment −14%
  Food         Brisket: planned 18 lb · consumed 15 lb · leftover 3 lb → recommend 16 lb next time · Medium
  Shopping     Frequently purchased: Costco · Butcher · Restaurant Depot
  Equipment    Owns: coolers, tables, canopies · Borrows: chairs
  Cooking      Usually starts 45 min later than planned → auto-shift prep
  Guests       Children usually add 18% → increase drinks
  Weather      Every outdoor event needed 40% more ice
```

Feeds forward into: attendance band, food sizing, shopping list, equipment/rentals ("To arrange"), run-of-show timing, drinks.

### 3d. Prediction (L5) — **deferred** (roadmap #7)
Forecasts, risk scores, probability, "smart" recommendations. **Do not build** until L4 has enough historical observations. See §5.

---

## 4. Reality Reconciliation — where intelligence compounds

The piece almost every planner misses. After each event, run the loop and **store the difference forever**:

```
Estimate  →  Reality  →  Difference  →  Store (forever)
```

| Estimated | Reality | Stored as |
|---|---|---|
| 42 guests | 36 | **Attendance multiplier** (−14%) |
| 18 lb brisket | 3 lb leftover | **Brisket multiplier** |
| $850 | $1,030 | **Budget drift** (+21%) |

This loop is the **only** thing that turns single events into a compounding profile. It is the input to Host Intelligence (§3c) and the prerequisite for Prediction (§3d). Build it as a first-class capability, not an afterthought — an **outcome-capture** step at event close that writes reconciled deltas to the Host Intelligence Profile.

---

## 5. Sequencing principle — memory before prediction

Do **not** build AI forecasts / risk scores / probability engines / smart recommendations until the system has enough **reconciled observations** (§4) to justify them. Context (L3) makes the first event smart with *no* history; Memory (L4) needs history; Prediction (L5) needs *enough* history. Ship in that order.

---

## 6. Canonical roadmap (revised, ratified)

1. **✅ Canonical Intelligence OS** — freeze the audit *(this document)*
2. **✅ Effective Item seam** — the single read-model *(FOOD-2A/2B/2C complete; the seam now owns name/category/forgotten/qty/unit/where/got for the shopping list; **Stage-2 category defaults are SAFE** to attempt, targeting derived `eff.category` only)*
3. **⬜ Host Intelligence Profile (INTEL-1)** — the learned profile of §3c (structure + storage; starts empty, honest-confidence). **Spec:** [INTEL_1_HOST_INTELLIGENCE_PROFILE.md](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)
4. **⬜ Reality Reconciliation** — the estimate→reality→store loop of §4 (outcome capture at event close). *Specced with INTEL-1 as a pair (same doc).*
5. **⬜ Context Intelligence** — culture + location + season + tradition as one L3 engine (§3b)
6. **⬜ Weather → Action** — weather drives plan changes (ice/shade/rain-plan), not just a display
7. **⬜ Prediction** — L5, only once §3/§4 have data
8. **⬜ Notification Intelligence** — the right nudge, at the right time, to the right guest (builds on the draft-and-share scheduler)
9. **⬜ Automation / Agent layer** — the plan acts, with the host in the loop

Each capability is grounded in data the system actually has at that step; nothing speculative ships early.

---

## 7. Change log
- **v1.0.1 (2026-07-02)** — FOOD-2C shipped: the Effective Item now carries `displayName` (short-first), `rawCategory`, `forgotten`, `basis`; the shopping list migrated name/category/forgotten onto the seam with byte-identical golden parity (685 tests). **Verdict: Stage-2 category defaults are now SAFE** — the shopping aisle sort reads the faithful `eff.rawCategory`, insulated from the derived `eff.category` that defaults would attach to. Roadmap #2 complete.
- **v1.0 (2026-07-02)** — Froze the audit. Established the six-question intelligence-debt gate, the five levels, and the two-pillar engine model (Context L3 + Host L4). Renamed "Memory" → Host Intelligence Profile. Elevated **Context Intelligence** to a canonical engine. Added **Reality Reconciliation** as the compounding loop. Ratified the 9-step roadmap. Superseded ad-hoc intelligence audits.

*(Do not re-generate the audit. Add a dated change-log entry here when an engine ships, and check the roadmap box.)*
