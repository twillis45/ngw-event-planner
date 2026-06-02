# Sprint 40 — Behavioral Transition Observatory
## NGW Events — Internal Orchestration Motion Observability

**Date:** 2026-05-27
**Status:** Observatory built, first behavioral findings captured
**Scope:** Track B R&D only — internal/facilitator tooling

---

## Activation

```
http://localhost:3000/?slice=orchestration&sim=wedding&observe=1&debug=1
```

- `?debug=1` — activates the Observatory panel (bottom-right, monospace, clinical)
- `Ctrl+D` — keyboard toggle while the slice is running
- Never visible in `?slice=orchestration` without `&debug=1`
- Never wired to production App.js

---

## Observability Philosophy

The primary question this Observatory answers:

> Do orchestration-state transitions feel geological (continuous, metabolized) or like UI state changes?

The observatory is not a dashboard. It is a behavioral microscope. It surfaces values that reveal whether the environment is evolving or switching. The distinction matters because:

- **Evolving** environments feel inhabited. Users orient by feel.
- **Switching** environments feel operated. Users consciously scan for state.

The goal is to build a system where a coordinator never consciously notices a state transition — the environment simply *is different* when they look again.

---

## Seven Observability Targets

### 1. Pressure Evolution (Geological Continuity Assessment)

**What it shows:** Rolling 35-tick sparkline of continuous pressure (0–1), with the max and average per-tick delta.

**Geological assessment labels:**
| Label | max-Δ threshold | Meaning |
|---|---|---|
| `GEOLOGICAL` | < 0.06 | Pressure evolves smoothly — environment feels continuous |
| `TRANSITIONING` | < 0.14 | Moderate delta — acceptable but watch |
| `ABRUPT` | ≥ 0.14 | Pressure spike — visible state switching likely |

**First finding:** The disruption phase entry at tick ~38 produces a max-Δ of **0.460** — flagged `ABRUPT`. This is a concrete behavioral failure: the jump from `active` into `disruption` is instantaneous. The environment switches, not evolves. See §Behavioral Failures.

---

### 2. Transition Continuity

**What it shows:** Recession timing (ms) for the current pressure state, and count of visibility zone changes this tick.

**Recession timing by state:**
- `calm` → 600ms
- `building` → 1200ms
- `active` → 800ms
- `recovery` → 600ms

**Finding:** `building` (1200ms) is the most geological of the states — changes in the building phase are slow enough to feel environmental. `active` drops to 800ms (appropriate — coordination urgency requires responsiveness). `calm` at 600ms is acceptable since no tunneling is active.

Zone changes per tick are the clearest signal of abrupt transitions. More than 3 zone changes in a single tick is a candidate for redesign.

---

### 3. Hierarchy Weights

**What it shows:** Per-item weight (0–1) with ASCII bar representation and current visibility zone. Items with memory weight show higher baseline values even in calm state.

**Observations from Wedding scenario:**
- At tick 0 (calm): Lighting Crossfade already shows weight 0.92 (████) — environmental memory from prior crossfade failure has permanently elevated this item. This is correct behavior: the scar is embedded.
- At tick 42 (disruption/active): Hierarchy compression is visible — Guest Seating 0.69 → 1.00, DJ Ceremony 0.77 → 1.00. Normalized weights flatten under peak pressure. The engine's normalization formula is doing its job.
- Lighting Crossfade weight stayed at 1.00 throughout disruption — correct, it's in the active dependency chain.

**Weight bar legend:** `░░░░` = 0.0–0.24, `▒░░░` = 0.25–0.49, `▒▒░░` = 0.50–0.74, `▓▒▒░` = 0.75–0.99, `████` = 1.0

---

### 4. Tunneling Map

**What it shows:** Count of items in each visibility zone (focal / adjacent / peripheral / ghosted) at the current tick.

**Wedding scenario zones at tick 42 (active pressure):**
- `foc 5  adj 1  per 1  gst 1`

This means tunneling is functioning: 3 items have receded from full visibility. Under calm pressure (tick 0), all 8 items are focal (no tunneling). Under active pressure, 3 items are receding. This matches the design intent: peripheral collapse narrows coordination attention to the active chain.

**What to watch for:** If `gst` count reaches 4+ during active phase on a short sequence, the environment may be collapsing too aggressively. Coordinators need orientation landmarks even under peak pressure.

---

### 5. Continuity Field Contamination

**What it shows:** Items receiving contamination > 0.03, with contamination level, treatment label, and source relationships.

**Wedding scenario at tick 42:**
- `DJ Ceremony In: concerned 0.43` — near-active contamination from upstream dependency chain
- `Dinner Positio: concerned 0.40`
- `Guest Seating: warm 0.34`

Treatment levels: `trace` → `warm` → `concerned` → `urgent`. At `concerned`, text tint activates (`#b8943f` brass). At `urgent`, red treatment applies. This is the contamination cascading from the active `Lighting Crossfade` item down through the dependency chain.

**Behavioral interpretation:** This is the continuity field working correctly — pressure is not contained within the active item. Adjacent items gain warmth proportional to their relationship distance. The field doesn't feel artificial here because the decay formula (60% retained per step) produces natural falloff.

---

### 6. Environmental Memory Residue

**What it shows:** Items with active memories (from prior event failures), their memory count, decay factor, fragile status, and buffer time.

**Wedding scenario memory state:**
| Item | Memory | Decay | Effect |
|---|---|---|---|
| Lighting Crossfade | ×1 failure | 0.75 (14–30 days ago) | FRAGILE — red border treatment |
| Guest Seating | ×1 failure | 0.55 (last quarter) | Weight increase |
| Dinner Positions | ×1 delay | 1.00 (very recent) | +6min buffer |

**Finding:** Memory is embedded correctly — the Lighting Crossfade failure is not narrated anywhere in the UI, but its weight (0.92 at calm) and fragile border treatment signal it environmentally. A coordinator who knows this system doesn't need to read a warning. They feel the item's weight.

**Behavioral concern:** The decay factor of 1.00 for Dinner Positions means this is from a very recent event. If a coordinator runs multiple events in a week, the memory accumulation could overweight items over time. The `min(+0.50)` cap in `aggregateMemories()` prevents this from becoming pathological, but it's worth monitoring across multi-event sequences.

---

### 7. Viewport / Mobile Context

**What it shows:** Current viewport dimensions and device class (mobile / tablet / desktop) derived from the breakpoint system.

At 375px width (simulated mobile): the Observatory panel overlaps the main content area. This is expected for internal tooling. Facilitators use this on desktop while observing mobile simulation.

---

## Transition Continuity — Critical Finding

### The ABRUPT Pressure Jump

The most significant behavioral finding from the first Observatory session:

**Tick ~38: pressure spikes from ~0.35 to ~0.80 in a single tick.**

This corresponds to the transition from `active` state into the `disruption` phase. The disruption phase is detected as a named phase (e.g. `disruption-dj`) and the simulation adds escalation severity (`escalated` vendor status), which increases the pressure computation by +0.25 in a single step.

The Observatory flags this as `ABRUPT` (max-Δ 0.460).

**Why this matters:** If the pressure jump is too large and instantaneous, the cognitive tunneling shift is also instantaneous. Eight items are all `focal` one tick, then 3 items drop to `adjacent/peripheral/ghosted` the next tick. That's a visible mode switch, not environmental evolution.

**What geological feels like:** Pressure should accumulate over 3–5 ticks as a disruption develops. The current simulation models disruption as a discrete event (coordinator gets a call, DJ is stuck in traffic). In reality, a disruption develops: first there's uncertainty, then concern, then confirmed disruption. The engine supports gradual escalation through `caution → escalated → emergency`, but the simulation scenario jumps directly to `escalated`.

**Recommendation:** Consider a `disruption-building` phase before `disruption-dj` in the simulation scenarios — a 3-tick period where escalation level is `caution` rather than `escalated`. This would smooth the pressure curve and produce a TRANSITIONING → ACTIVE pattern rather than an ABRUPT spike.

---

## Recovery Decompression — Assessment

At tick 46+ (recovery state): pressure drops from 0.80 to below 0.30 in 2–3 ticks. The Observatory shows this as ABRUPT in the same way as the disruption entry.

**Behavioral interpretation:** The recovery decompression is actually appropriate — coordinators should feel the pressure lift quickly when a disruption resolves. The "geological" ideal applies primarily to *pressure accumulation*, not necessarily to *release*. Recovery should feel like relief, not a slow fade.

**Verdict:** Recovery abruptness is acceptable. Disruption entry abruptness is the failure to fix.

---

## Cognitive Tunneling — Geological Assessment

**Assessment: MOSTLY GEOLOGICAL**

At active pressure (0.6–0.9), recession timing is 800ms. Items don't snap to their new opacity — they transition. This is correct.

The zone classification (`classifyZone()`) uses discrete conditions (if/else branches), which means items can jump zones instantaneously when conditions cross thresholds. However, because the *opacity interpolation* uses CSS transitions (applied via the item's `opacity` style + transition property), the visual result is smooth even when the zone classification is discrete.

**The seam:** Zone *classification* is discrete but opacity *rendering* is continuous. This is the right architecture. The Observatory confirms this is working.

---

## Mobile Continuity Findings

Mobile simulation at 375px (iPhone class):
- All 7 observability sections render correctly in the Observatory panel
- Panel overlaps main content — expected for dev tooling
- At active pressure, the tunneling map shows items receding correctly
- The sticky header (visible when scrolled) correctly shows the disruption mode tint

**Mobile-specific behavioral concern:** At 375px, when 3 items are ghosted and 5 remain focal, the sequence list becomes very short. A coordinator on mobile under active pressure sees approximately 5 items. This is the intended density collapse — it matches thumb-zone interaction patterns. Too many items visible simultaneously on mobile under pressure would fragment cognitive attention.

---

## Environmental Persistence — Observations

The environmental memory system produces measurable weight differences between scenarios:

- Lighting Crossfade baseline weight = **0.92** (████) at tick 0 — memory elevated
- A "fresh" event without memories shows Lighting Crossfade at ~0.40 baseline

This is the persistence working correctly. The environment *knows* this item has failed before. A coordinator running their third consecutive wedding at Bluebell Manor doesn't need to remember the crossfade history — the system carries it.

**Finding:** Memory decay is functioning appropriately. The 30-day memory (decay 0.75) still produces noticeable environmental weight. The 90-day memory (decay 0.55) is a whisper — visible in Observatory but barely perceptible in the rendered environment. This calibration feels correct.

---

## Behavioral Failures

### 1. Pressure spike at disruption entry (Critical)

The simulation jumps from `caution` pressure to `escalated` in one tick. This produces a 0.46 single-tick delta — rated ABRUPT. Fix: add a `disruption-building` pre-phase in simulation scenarios.

### 2. Contamination invisibility at calm state

At tick 0 (calm), field contamination shows 0 active connections despite memory weights existing. This is correct behavior (contamination only flows when items are under active pressure), but it means memory-adjacent items look identical to non-memory items at calm. An observer can't distinguish "this item has history" from "this item is new" without looking at the Memory Residue section.

**This is a design choice, not a bug.** Memory expresses through hierarchy weight, not through atmospheric contamination. The Observatory surfaces this distinction clearly.

### 3. No weight delta tracking between ticks

The Observatory shows current weight but not weight *change* since the previous tick. A weight that jumped from 0.41 to 0.77 in one tick looks identical to a weight that gradually climbed to 0.77 over 10 ticks. Adding Δw tracking would surface hierarchy mutation abruptness.

**Deferred:** Low priority for Sprint 40. The pressure delta is the more meaningful geological signal.

---

## Brutally Honest Assessment

### What the Observatory reveals

The orchestration engine is well-built. The behavioral systems (hierarchy, tunneling, contamination, memory) compose correctly. In the 35-tick calm→active→disruption→recovery arc, the environment does feel continuously evolving in the building and active phases. The tunneling recession is slow enough to feel atmospheric, not theatrical.

The primary failure is at the phase boundaries: disruption entry and recovery exit are abrupt. These are simulation scenario artifacts, not engine failures. The engine supports gradual escalation — the scenarios don't use it.

### What "geological" feels like in this system

At tick 20–35 (building pressure), the Observatory shows:
- max-Δ < 0.04 per tick → `GEOLOGICAL`
- Zone changes: 0 per tick
- Recession timing: 1200ms (building state — slowest)
- Contamination building gradually from 0.15 → 0.35

This is the behavior the engine was designed to produce. It works.

### What needs to change

1. **Simulation scenarios** — add pre-phase escalation ramp (3 ticks of `caution` before `escalated`)
2. **Δw tracking** — future Observatory feature, not blocking
3. **Recovery abruptness** — acceptable, revisit after human testing

### What this sprint achieved

The Observatory transforms "does this feel right?" into a measurable question. GEOLOGICAL vs ABRUPT is a binary the team can act on. The contamination levels, memory decay factors, and zone transition counts give developers a behavioral audit trail that previously existed only as intuition.

The environment is not yet continuously evolving at phase boundaries. It is continuously evolving *within* phases. That's meaningful progress, and the Observatory makes the gap visible.

---

## Files

| File | Purpose |
|---|---|
| `demo/src/slices/OrchestrationSlice.jsx` | `BehavioralObservatory` component (replaced `DebugOverlay`) |
| `demo/src/orchestration/pressureState.js` | Pressure engine — `PRESSURE_THRESHOLDS`, `computePressure()` |
| `demo/src/orchestration/cognitiveTunneling.js` | Tunneling — `recessionOpacity()`, `classifyZone()`, transitionMs |
| `demo/src/orchestration/adaptiveHierarchy.js` | Weight computation — `computeWeight()`, normalization |
| `demo/src/orchestration/continuityField.js` | Contamination — `PROPAGATION_STRENGTH`, decay |
| `demo/src/orchestration/environmentalMemory.js` | Memory decay — `memoryDecay()`, `aggregateMemories()` |
