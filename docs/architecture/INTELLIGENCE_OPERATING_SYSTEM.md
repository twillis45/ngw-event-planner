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

## 4.5 Precedence — the resolution order (CANONICAL, load-bearing)

Three intelligence layers now stack. They resolve in ONE fixed order — a higher layer is the default, a lower layer may only *refine* it under its own gate, and the user always wins:

1. **Ground truth** — the playbook / L2 default. Always the baseline.
2. **Context Intelligence** (L3) — today's event (place · tradition · season) refines the baseline.
3. **Host Intelligence** (L4) — the household's learned reality refines the *Context-adjusted* value — **only** when `Applicability.eligible` (Confidence ≥ Medium AND Stability ≥ Medium AND enough recent, non-expired observations; §5c + the Applicability object §5e).
4. **User override** — the host's explicit choice. **Always wins**, and persists (e.g. the R1 "Keep {planned}" revert).

**Host Intelligence must NEVER bypass Context Intelligence.** It refines the Context-adjusted value; it does not replace the chain. Every reader in the [Readers Registry](./INTELLIGENCE_READERS_REGISTRY.md) resolves in this order, and its `because` names which layer spoke. This precedence is part of the OS — no reader may reorder it.

---

## 4.6 The two registries + the Observatory (governance triad)

From R1 onward, the system *changes plans*, so three governance surfaces are load-bearing and must stay current:
- **[Readers Registry](./INTELLIGENCE_READERS_REGISTRY.md)** — every engine that *consumes* memory/context (nine-field contract).
- **[Writers Registry](./INTELLIGENCE_WRITERS_REGISTRY.md)** — every surface that *writes* an observation (nine-field contract). No unregistered writes.
- **Intelligence Observatory** (admin) — the visibility layer: applicability rate, accept-vs-revert (trust), average adjustment, confidence/stability by domain, time-to-applicable, memory-by-playbook, active readers. **Ships before R2** — validate that R1 helps before adding readers that change more behavior.
- **[Intelligence Validation Platform](./INTELLIGENCE_VALIDATION_PLATFORM.md)** (INTEL-QA-1, design) — the accuracy layer above the Observatory: every recommendation becomes an evaluation record, reality scores it (grade + baseline comparison), and calibration measures whether confidence is earned. Turns "accepted" into "correct." Trust ≠ accuracy; nothing self-graded without a baseline; no single score. Staged: telemetry → scoring → calibration → prediction-validation → continuous QA.

---

## 5. Sequencing principle — memory before prediction

Do **not** build AI forecasts / risk scores / probability engines / smart recommendations until the system has enough **reconciled observations** (§4) to justify them. Context (L3) makes the first event smart with *no* history; Memory (L4) needs history; Prediction (L5) needs *enough* history. Ship in that order.

---

## 6. Canonical roadmap (revised, ratified)

1. **✅ Canonical Intelligence OS** — freeze the audit *(this document)*
2. **✅ Effective Item seam** — the single read-model *(FOOD-2A/2B/2C; Stage-2 category defaults SAFE)*
3. **✅ Host Intelligence store (INTEL-1 P1)** — inert store + `hostIntel(profile)` reader
4. **✅ Reality Reconciliation (P2)** — the "How'd it go?" capture at event close
5. **✅ Inspect / Clear (P3)** — "What Event Boss remembers" in Settings
6. **✅ Attendance Read-Forward (P4 R1)** — the FIRST governed reader (gated + clamped + because + revert)
7. **🚧 Intelligence Observatory (admin)** — 🚨 **Memory Validation gate.** Applicability rate · accept-vs-revert (trust) · avg adjustment · confidence/stability by domain · time-to-applicable · memory-by-playbook · active readers. **Must exist before R2** — prove R1 helps before adding readers that change more behavior.
8. **🚧 Intelligence Writers Registry** — 🚨 the write-side contract ([doc](./INTELLIGENCE_WRITERS_REGISTRY.md)); no unregistered writes
9. **⬜ R2 Food Read-Forward** — per-item quantities, **observation-first** (store est/eaten, engine computes); only after #7+#8
10. **⬜ R3 Ice Read-Forward** — outdoor ice delta (subsumes the old "Weather→Action" for ice)
11. **⬜ Context Intelligence readers** — culture/location/season packs ([spec](./CONTEXT_INTELLIGENCE.md)); resolve per §4.5 precedence
12. **⬜ Prediction Layer** — L5, only once memory is proven + broad
13. **⬜ Automation / Agent layer** — the plan acts, host in the loop *(Notification Intelligence folds in here)*

**The pivot at #6→#7:** up to R1 this was infrastructure; from here every reader changes user behavior. The cost of a bad read-forward now exceeds the cost of more architecture — so #7 (Observatory) and #8 (Writers Registry) gate #9+. Each later capability is grounded in data the system actually has, resolves in the §4.5 precedence order, and validates trust before it widens.

---

## 7. Change log
- **v1.0.6 (2026-07-02)** — **Memory Validation Sprint** (the #6→#7 pivot: don't just keep building). (1) **Precedence** made canonical (§4.5): Ground truth → Context → Host (only if applicable) → User override always wins; Host never bypasses Context. (2) **Applicability** upgraded to a first-class object on every rollup — `{eligible, reason, confidence, stability, observations, required, lastUpdated, staleAfterMonths, fresh}` — one contract every future reader gates on. (3) **[Intelligence Writers Registry](./INTELLIGENCE_WRITERS_REGISTRY.md)** created — the write-side twin (W1 post-event live; W2–W7 proposed). (4) **Intelligence Observatory** (admin, `?observatory=1`): applicability/confidence/stability by domain · time-to-applicable · memory-by-playbook · active readers · honest PostHog pointer for behavioral trust. **This gates R2** — validate R1 helps before adding readers. Suite 733.
- **v1.0.5 (2026-07-02)** — INTEL-1 **P4 R1 shipped** — the FIRST read-forward. `attendanceAdjustment` (pure) sizes the FoodPlan's plan-to count by learned turnout, **only** at Confidence ≥ Medium AND Stability ≥ Medium AND not reverted, **clamped ±25%**; renders the because ("…size for 34?") with a one-tap **"Keep {planned}"** revert (per-event flag) + `intel_attendance_applied`/`_reverted` analytics. No memory / low / unstable / reverted ⇒ identical to before. R1 marked 🟢 live in the readers registry. Scope-contained: attendance count only (flows to food sizing) — **no food/ice/budget personalization, no prediction, no Context**. 8 R1 tests; suite 724. Roadmap #3/#4 (Host Intelligence + Reconciliation) now complete end-to-end: store → capture → inspect/clear → first governed read-forward.
- **v1.0.4 (2026-07-02)** — INTEL-1 **P3 shipped**: a deliberate "What Event Boss remembers" section in HostSettings — plain-language learned facts (turnout / food / spending / ice / notes) with per-domain **Clear** + clear-all; honest-empty when thin; no PII; **no dashboard, no recommendations, no read-forward**. `summarizeHostIntel` (pure) + profile-safe clears (unrelated profile data preserved). Suite 716. **P1–P3 complete → the store, the loop, and the inspect/clear surface all exist; only P4 (first read-forward) remains before memory changes a plan.**
- **v1.0.3 (2026-07-02)** — INTEL-1 **P1 + P2 shipped** (roadmap #3/#4). P1: the inert `profile.hostIntelligence` store + pure `hostIntel(profile)` reader (per-domain confidence + stability + explainability + applicable; honest-empty; no consumer). P2: the skippable "How'd it go?" Reality Reconciliation card in `PostEventRecap` — captures per-item leftovers/ice/lesson and harvests attendance+cost from the existing "final numbers" (single-source, no double-ask), writing reconciled observations via pure idempotent helpers. **Capture only — no reads-forward** (that's P4). 26 hostIntel tests; suite 711. Store + loop now exist to catch the first reconciled event.
- **v1.0.2 (2026-07-02)** — INTEL-1 spec refined (per review): **domain-specific confidence** (each domain matures independently), **memory stability** as a second per-domain gate (variance — automate the predictable, keep asking the volatile), and **explainability/provenance** required on every learned number. **No memory dashboard** — memory surfaces inline only where it changes a decision. Added the canonical **[Intelligence Readers Registry](./INTELLIGENCE_READERS_REGISTRY.md)** — no engine may consume memory/context until registered (nine-field contract). Context Intelligence (#5) being specced next so Host + Context evolve together.
- **v1.0.1 (2026-07-02)** — FOOD-2C shipped: the Effective Item now carries `displayName` (short-first), `rawCategory`, `forgotten`, `basis`; the shopping list migrated name/category/forgotten onto the seam with byte-identical golden parity (685 tests). **Verdict: Stage-2 category defaults are now SAFE** — the shopping aisle sort reads the faithful `eff.rawCategory`, insulated from the derived `eff.category` that defaults would attach to. Roadmap #2 complete.
- **v1.0 (2026-07-02)** — Froze the audit. Established the six-question intelligence-debt gate, the five levels, and the two-pillar engine model (Context L3 + Host L4). Renamed "Memory" → Host Intelligence Profile. Elevated **Context Intelligence** to a canonical engine. Added **Reality Reconciliation** as the compounding loop. Ratified the 9-step roadmap. Superseded ad-hoc intelligence audits.

*(Do not re-generate the audit. Add a dated change-log entry here when an engine ships, and check the roadmap box.)*
