# Sprint 34 — Implementation Foundation

The behavioral orchestration engine. Six subsystems that compose together to create an environment that adapts to coordination pressure in real time. Built in code. Tokenized. Reusable. Mobile-first.

## What this is

This sprint stops atmospheric exploration and implements the strongest proven orchestration concepts from Sprints 30–32 into real frontend behavior. Every module is operational — not conceptual, not Figma-only. The engine runs in the existing React app, composes with existing contexts (EscalationContext, DensityContext, OperationalModeContext), and drives a live proving-ground slice.

## What was implemented

### 1. Pressure State System (`orchestration/pressureState.js`)

Maps temporal proximity + vendor dependencies + escalation severity into continuous pressure (0.0–1.0) with discrete states:

| State | Pressure Range | Cognition Mode |
|---|---|---|
| CALM | 0.0–0.25 | Exploratory — scanning the full landscape |
| BUILDING | 0.25–0.60 | Focused — gravity well forming |
| ACTIVE | 0.60–0.90 | Instinctive — environment doing the work |
| RECOVERY | Post-peak | Monitoring — systems relaxing |

`computePressure()` combines four input signals:
- **Operational mode** (pre-event: 0.05, live: 0.30, recovery: 0.10)
- **Escalation level** (nominal: 0, caution: 0.10, escalated: 0.25, emergency: 0.40)
- **Temporal proximity** (T-0: 0.30, T-5min: 0.28, T-45min: 0.15, T-2hr: 0.08)
- **Active dependencies** (0.03 per active dependency chain, capped at 0.15)

### 2. Adaptive Hierarchy Engine (`orchestration/adaptiveHierarchy.js`)

Items earn visual weight through operational consequence:

- **Failure history**: +0.15 per failure, capped at +0.45
- **Fragile flag**: +0.20 (earned from specific prior failure)
- **Dependency depth**: +0.05 per chain level, capped at +0.20
- **Temporal urgency**: +0.25 at T-5min, scaling down to +0.04 at T-2hr
- **Active coordination**: +0.15
- **Pressure amplification**: weight × (1 + pressure × 0.4)

Output: `{ opacity, spacingPx, borderWidth, borderIntent, fontWeight }` — all tokenized.

`resolveSequenceHierarchy()` normalizes weights across a full coordination sequence so the highest-weight item = 1.0 under active pressure. Maximum contrast between important and unimportant.

### 3. Trust Compression System (`orchestration/trustCompression.js`)

Trusted vendors compress when not in active dependency chains:

| Compression Level | Trigger | Visual |
|---|---|---|
| FULL | Default, or in dependency chain | All details visible |
| COMPACT | 5+ events, trust ≥ 50% | Name + status only |
| COLLAPSED | 20+ events, trust ≥ 70%, building+ pressure | Single-line abbreviated |
| GHOSTED | 50+ events, trust ≥ 85%, active pressure | 12% opacity, 3-letter code |

`computeTrust()` weighs: success rate (50%), volume (25%), consecutive clean streak (15%), response time (10%).

Override: any vendor in an active dependency chain or with non-nominal status is ALWAYS expanded regardless of trust.

### 4. Environmental Memory Architecture (`orchestration/environmentalMemory.js`)

Past failures reshape the current environment:

| Memory Type | Environmental Consequence |
|---|---|
| FAILURE | Weight increase, fragile flag, buffer time, red border |
| DELAY | Buffer time (50% of actual delay), vendor caution |
| PATTERN | Reinforcement strength, subtle environmental shaping |

Memory decays over time but never vanishes:
- 2 days: 100% intensity
- 7 days: 90%
- 14 days: 75%
- 30 days: 55%
- 90 days: 35%
- 180+ days: 10% (whisper, but not gone)

`aggregateMemories()` compounds multiple failures with diminishing returns — the first failure dominates, subsequent ones add less.

### 5. Cognitive Tunneling (`orchestration/cognitiveTunneling.js`)

Peripheral recession — under pressure, attention narrows:

```
periphery_opacity = 1.0 - (pressure × 0.9)
  At pressure 0.0: everything visible (100%)
  At pressure 0.5: peripherals at 55%
  At pressure 1.0: peripherals at 10%
```

Four visibility zones:
- **FOCAL** — in gravity well, always 100% opacity
- **ADJACENT** — near gravity well, 50% recession curve
- **PERIPHERAL** — far from gravity well, full recession
- **GHOSTED** — outside coordination context, 5–20% opacity

Ghosted items lose pointer events and gain aria-hidden under active pressure.

### 6. Continuity Field Logic (`orchestration/continuityField.js`)

Pressure leaks between connected items — contamination, not notification:

| Field Type | Propagation Strength |
|---|---|
| DEPENDENCY | 0.70 — strongest (B can't happen if A fails) |
| VENDOR | 0.50 — vendor problems affect all their items |
| RESOURCE | 0.40 — shared resource coupling |
| TEMPORAL | 0.30 — nearby items feel time pressure |

Contamination decays with distance (60% retained per step). Visual treatment escalates from trace warmth (rgba brass 3%) through concerned (visible brass border) to urgent (red warmth).

### 7. React Integration

- **OrchestrationContext** (`contexts/OrchestrationContext.jsx`) — wraps the engine, provides `pressure`, `state`, `setPressureInputs()`, derived factors. Graceful fallback outside provider (calm defaults).
- **OrchestrationSlice** (`slices/OrchestrationSlice.jsx`) — proving ground showing the Ceremony Transition Window corridor through all 4 pressure states.
- **Index.js** — wired as `?slice=orchestration` in the harness.

## What survived from the Figma prototypes

| Concept | Survived? | Notes |
|---|---|---|
| Coordination gravity (spacing compression) | ✓ | Implemented as spacingPx in hierarchy resolution |
| Learned compression (trust-based) | ✓ | Full trust computation + 4-level compression |
| Environmental memory (failure residue) | ✓ | 3 memory types with decay + aggregation |
| Peripheral recession (cognitive tunneling) | ✓ | 4-zone model with zone classification |
| Continuity routing (dependency chains) | ✓ | Field connections with contamination propagation |
| Inherited hierarchy (earned weight) | ✓ | Weight from failures, deps, urgency, activity |
| Metabolized continuity (geological transitions) | Partial | 800–1200ms CSS transitions, but not truly continuous |
| Adaptive density (time drives density) | ✓ | Temporal proximity directly drives pressure |
| Orchestration leakage (cross-context) | ✓ | Continuity fields propagate contamination |
| Behavioral reinforcement | Deferred | Requires historical interaction data |

## What failed or was deferred

1. **Metabolized continuity**: The transitions between states use CSS transitions (800–1200ms) which is better than instant mode-switches, but not truly geological. Real metabolization requires continuous animation frames or spring physics — deferred to a future sprint.

2. **Behavioral reinforcement**: This system requires accumulated user interaction data — which paths coordinators take, which sequences succeed. Can't be implemented without real usage data. The architecture supports it (the memory system can track patterns), but the reinforcement logic itself is deferred.

3. **Operational sediment**: The concept of geological layers of vendor history is too visually complex for a first implementation. Trust compression captures the core behavior (trusted vendors compress), but the visual "depth" metaphor (warm tones, density as environmental character) needs more design work.

4. **Institutional memory**: Session-persisted scroll positions, sort orders, expansion states. The architecture is there (environmental memory can store anything), but actually persisting UI state across sessions requires storage integration. Deferred.

## Files created

| File | Purpose |
|---|---|
| `src/orchestration/pressureState.js` | Pressure computation + state resolution |
| `src/orchestration/adaptiveHierarchy.js` | Weight computation + visual property resolution |
| `src/orchestration/trustCompression.js` | Trust scoring + compression level resolution |
| `src/orchestration/environmentalMemory.js` | Memory creation, decay, consequence, aggregation |
| `src/orchestration/cognitiveTunneling.js` | Zone classification + recession opacity |
| `src/orchestration/continuityField.js` | Field connections + contamination propagation |
| `src/orchestration/index.js` | Public API — all exports |
| `src/contexts/OrchestrationContext.jsx` | React context wrapping the engine |
| `src/slices/OrchestrationSlice.jsx` | Proving ground slice |
| `src/index.js` | Updated — added orchestration slice to harness |

## Drift risks

| Risk | Level | Mitigation |
|---|---|---|
| Pressure formula tuning | HIGH | The weights (mode: 0.30, escalation: 0.40, temporal: 0.30, deps: 0.15) are hypothesis. Real coordinator sessions will reveal whether building starts too early or active kicks in too late. The formula is centralized in one function — easy to tune. |
| Trust compression anxiety | MEDIUM | Ghosting vendors to 12% opacity might cause "are they really fine?" anxiety. The override (dependency chain = always expand) helps, but field testing is needed. |
| Memory decay curve | MEDIUM | Whether 14-day-old failures should be at 75% or 50% intensity is a guess. The decay function is isolated and easy to adjust. |
| Tunneling over-recession | MEDIUM | Ghosted items losing pointer events under active pressure could hide real problems. The zone classification logic needs validation with real coordinators. |
| Contamination visual treatment | LOW | The brass/red warmth contamination is subtle by design. Whether it's noticeable enough to actually create cross-context awareness is unknown. |
| Engine composition | LOW | The engine composes with existing contexts rather than replacing them. If the existing contexts evolve, the pressure mapping in computePressure() needs to stay synchronized. |

## Mobile assessment

Mobile surfaces prove the behavioral systems work at 375px:
- Single-column stacking: event info → memory → corridor → sequence → vendors
- All 6 systems active — hierarchy weights, compression levels, tunneling zones visible
- Touch targets remain adequate even under maximum compression
- Continuity corridor renders as horizontal flow at mobile width

## Cognitive load assessment

| State | Visible Items | Vendor Detail | Hierarchy Differentiation | Estimated Load |
|---|---|---|---|---|
| CALM | 6 sequence + 8 vendors | Compact | Low (0.41–0.87 range) | Low — scanning |
| BUILDING | 6 sequence + 3 expanded + 5 compressed | Mixed | Medium (0.44–1.00 range) | Medium — focusing |
| ACTIVE | 5 active + 1 faded + 3 expanded + 5 ghosted | Minimal | High (0.77–1.00 normalized) | Low — environment leading |
| RECOVERY | 6 sequence + 3 expanded + 5 relaxing | Expanding | Relaxing | Low — monitoring |

The same insight as the Figma prototypes: cognitive load peaks at BUILDING where the coordinator is actively focusing but the environment hasn't fully taken over. At ACTIVE, the environment does the work — only active items visible, routing corridor leading attention.

## Architecture decisions

1. **Compose, not replace**: The orchestration engine sits alongside existing contexts. `computePressure()` maps OperationalModeContext and EscalationContext values into pressure — it doesn't create a parallel state management system. This means existing slices (DesktopDensitySlice, EventDayMode) continue working unchanged.

2. **Pure functions, not hooks**: The core engine (pressureState, adaptiveHierarchy, trustCompression, environmentalMemory, cognitiveTunneling, continuityField) is all pure functions. No React dependencies. This means the algorithms can be unit tested, reused in Node.js tooling, or ported to other frameworks.

3. **Tokenized output**: Every visual property comes as a tokenized value (opacity number, spacing token index, border intent string) — never as raw CSS. Consumers resolve tokens through the existing design system.

4. **Graceful degradation**: `useOrchestration()` returns calm-state defaults outside the provider. Components work with or without the orchestration engine wrapped around them.

## Recommended next step

**Field validation with the orchestration slice.** Load `?slice=orchestration` and cycle through all 4 states. Adjust the pressure formula weights based on whether the state transitions feel right. Then: bring a real coordinator and watch their eyes. Do they follow the continuity corridor? Does the crossfade ⚠ draw attention without being asked about? Does vendor compression feel like relief or anxiety?

The engine is built. The question is whether the behavioral specifications produce the intended cognitive effects. That question can only be answered by watching humans use it.

## Honest evaluation

This sprint delivers what implementation should: operational code that embodies the behavioral grammar without inventing new philosophy. The six engine modules are pure functions with clear inputs and outputs. The proving-ground slice demonstrates all systems working together across desktop and mobile viewports.

The strongest part: the composition strategy. The orchestration engine doesn't fight the existing context system — it sits alongside it and maps existing signals (operational mode, escalation level) into pressure. Any component can opt into behavioral orchestration by wrapping in OrchestrationProvider and calling useOrchestration(). Nothing breaks if they don't.

The weakest part: metabolized continuity. CSS transitions at 800–1200ms are better than instant mode switches, but they don't feel geological. The transition from calm to active still has a "something changed" quality rather than a "the environment slowly shifted" quality. Real metabolization requires continuous animation frames, spring physics, or actual time-based interpolation — none of which is in this implementation.

The most honest thing I can say: the formulas are hypotheses. The pressure weights, the trust thresholds, the memory decay curve, the recession opacity formula — all of them are educated guesses based on the behavioral grammar doctrine. Every single number in these modules needs validation against real coordinator behavior. The architecture is sound. The numbers are provisional.

The proving ground works. The engine compiles. The behavioral systems compose. Whether any of this actually reduces coordination cognition under pressure — that's the question this sprint can't answer. Only field testing can.
