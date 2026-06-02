# Sprint 35 — Subconscious Operational Environment

Behavioral invisibility pass. The orchestration engine from Sprint 34 is transformed from a visible intelligent system into a subconscious operational environment. Every behavioral system remains active. No system language survives.

## What was done

The OrchestrationSlice proving ground was rewritten to remove all explicit orchestration language while preserving every behavioral outcome. The engine underneath is identical — the surface no longer narrates what it's doing.

## Files modified

| File | Change |
|---|---|
| `src/slices/OrchestrationSlice.jsx` | Complete rewrite — behavioral invisibility pass |

No engine files were modified. All 6 orchestration modules (`pressureState`, `adaptiveHierarchy`, `trustCompression`, `environmentalMemory`, `cognitiveTunneling`, `continuityField`) and `OrchestrationContext` are unchanged from Sprint 34.

---

## Final Report — 8 Evaluation Points

### 1. What explicit systems were removed

14 categories of explicit orchestration language were identified and removed:

| Removed Element | Was | Now |
|---|---|---|
| Header | "ORCHESTRATION ENGINE" | "TEST HARNESS" |
| PressureIndicator component | Full component showing pressure %, state label, colored bar | Removed entirely |
| SystemStatus component | 4 meters (Gravity/Compression/Recession/Routing) with animated bars | Removed entirely |
| Demo driver buttons | calm / building / active / recovery | T-4:00 / T-0:45 / T-0:05 / Complete |
| Mode indicator | System state names | PRE-EVENT / LIVE / POST-TRANSITION |
| Memory section header | "ENVIRONMENTAL MEMORY" | "RECENT" |
| Sequence header | "CEREMONY TRANSITION CORRIDOR" | "CEREMONY TRANSITION" |
| Vendor header | "COORDINATION RAIL" | "VENDORS" |
| Weight numbers | Visible on every sequence item (e.g., "0.87") | Removed |
| Trust percentages | Shown on vendor rows (e.g., "trust: 72%") | Removed |
| Compression labels | FULL / COMPACT / COLLAPSED / GHOSTED labels | Removed |
| Focal/ghosted counters | "focal: 4 · ghosted: 2" | Removed |
| Vendor counters | "expanded: 3 · ghosted: 5" | Removed |
| ⚠ FRAGILE label | Explicit text label on items with failure memory | Removed (red border remains) |
| Memory narration | Event names, failure descriptions, buffer explanations | Minimal: "· +6min" without "buffer" word |
| Ghosted vendor format | 3-letter monospace codes with ✓ | First name only |
| Footer | Diagnostic dump | "Sprint 35 · {w}px" |

### 2. What behavioral systems survived invisibly

Every behavioral system from Sprint 34 continues operating. The difference is entirely in what the surface communicates to the user:

- **Pressure state**: Still computed from operational mode + escalation level + temporal proximity + active dependencies. Still drives all downstream systems. No numeric display.
- **Adaptive hierarchy**: Items still earn weight from failure history, fragile flags, dependency depth, temporal urgency, active coordination. Weight still resolves to opacity, spacing, border width, border intent, font weight. No weight numbers shown.
- **Trust compression**: Vendors still compress from FULL → COMPACT → COLLAPSED → GHOSTED based on earned trust. Dependency chain override still forces expansion. No compression level labels.
- **Environmental memory**: Past failures still reshape the environment — red borders, buffer time additions, weight increases. The "RECENT" section appears under building+ pressure and fades under active. No failure narration.
- **Cognitive tunneling**: Peripheral elements still fade under pressure. Ghosted items still lose pointer events. Focal items stay at full opacity. No zone counters.
- **Continuity fields**: Connected items still receive contamination tinting from stressed neighbors. Brass/red warmth still propagates. No routing intensity display.

### 3. What still feels "too designed"

Three things:

1. **The "RECENT" section**: It appears and disappears based on pressure state, which is the right behavior, but the label "RECENT" plus the formatted list of past events with age markers ("2d", "14d", "30d") still reads slightly as "system showing you something" rather than "environmental context you already knew." A real coordinator would have this context in their head — the system is narrating institutional memory rather than embodying it.

2. **Vendor expansion transitions**: When vendors shift from compact to expanded (showing event counts), the transition is CSS-driven at 800ms. It works, but the appearance/disappearance of "47 events · confirmed" text has a "the system decided to show you this" quality. Ideal: the information would feel like it was always there, just not previously relevant.

3. **The timing buttons themselves**: T-4:00 / T-0:45 / T-0:05 / Complete are test harness controls, not production UI. But even as test controls, they encode the pressure model's state boundaries. A coordinator doesn't think in timing presets — they experience continuous time pressure. The discrete jumps between states still feel like mode-switches rather than continuous environmental drift.

### 4. What became operationally natural

1. **Hierarchy differentiation under pressure**: Items getting bolder/larger/more spaced as they become operationally relevant feels like how a real coordinator's attention works. You don't notice "the system emphasized this" — you notice "Room Flip is the thing right now."

2. **Vendor compression at the bottom of the list**: Under active pressure, trusted vendors ghosting to first-name-only feels right. You don't need to see "Silk & Linen Co. · 85 events · confirmed" when you're 5 minutes from ceremony. "Silk" is enough. The override (dependency chain = always expand) prevents the dangerous case where a relevant vendor gets hidden.

3. **Ceremony Cue fading**: At T-0:05, the last sequence item (Ceremony Cue at 5m) is less relevant than Room Flip and Lighting Crossfade happening NOW. Its ghosting feels natural — your eye skips it because you already know it's coming later.

4. **Canvas temperature**: The background subtly shifts warmer/darker under pressure. Nobody would notice this consciously. It just makes the active state feel different from the calm state without any visible mode-switch indicator.

5. **Border intent**: Red left borders on items with failure memory, green on active items — these read as "status" rather than "the system computed your failure history." The border IS the consequence, not a label describing the consequence.

### 5. Mobile usability findings

- **375px single-column stacking works**: event info → memory → sequence → vendors flows naturally with scroll
- **All 6 behavioral systems active at mobile width**: hierarchy weights, compression levels, tunneling zones all rendering correctly
- **Touch targets remain adequate**: even under maximum compression, tappable items stay above 44px
- **Memory section at mobile**: the "RECENT" block takes meaningful vertical space. Under active pressure this is correct (it fades), but under building pressure it pushes the sequence content down. A coordinator on mobile in building-pressure might prefer the sequence visible above the fold
- **Ghosted vendors at mobile**: first-name-only rows at ~20% opacity work at mobile width — they communicate "this exists but isn't relevant now" without wasting scroll depth
- **Scroll depth under active**: sequence + vendors fit in ~2 screens at 375px. Acceptable. Under calm state (all items visible, all vendors expanded), it would be 3+ screens

### 6. Fatigue/load observations

| State | Cognitive Assessment |
|---|---|
| CALM | Low — everything visible, uniform weight, scanning mode. No system language to parse. |
| BUILDING | Medium — hierarchy starting to differentiate, memory section appearing, some vendors expanding. This is the peak-awareness state where the coordinator is actively focusing. The lack of system metrics means they focus on operational content, not system state. |
| ACTIVE | Low (by design) — environment doing the work. Only active items prominent, peripherals faded, trusted vendors compressed. The coordinator's attention is narrowed to what matters NOW. No diagnostic overlay competing for attention. |
| RECOVERY | Low — systems relaxing, checkmarks appearing, vendors re-expanding. The "POST-TRANSITION" label and expanding information signals "you can breathe now" without narrating the system's internal state. |

The key fatigue reduction from Sprint 34 → 35: **no system-state monitoring overhead**. In Sprint 34, a user had to parse pressure percentages, gravity/compression/recession/routing meters, weight numbers, trust percentages, compression labels, and focal/ghosted counters — all simultaneously. That's 6+ parallel information streams about the system itself, competing with the actual operational content. Sprint 35 removes all of them. The only information streams are operational: what's happening, when, who's responsible.

### 7. Drift risks

| Risk | Level | Notes |
|---|---|---|
| Memory section design | MEDIUM | "RECENT" with age markers still reads as system narration. Future refinement could embed memory consequences (buffer times, red borders) without the explicit memory list — making memory truly environmental rather than displayed. |
| Recovery state stickiness | LOW | Recovery uses the same vendor expansion as building, which is correct behaviorally but means the visual transition from active → recovery looks similar to active → building (in reverse). A coordinator might not feel the difference between "winding down" and "winding up." |
| Harness controls leaking | LOW | The T-4:00 / T-0:45 / T-0:05 / Complete buttons are test controls, not production UI. But if someone screenshots this slice as a "demo of the system," the timing presets could give the impression that pressure states are discrete modes rather than continuous computation. |
| Formula tuning unchanged | HIGH | All pressure weights, trust thresholds, memory decay curves, and recession formulas are still Sprint 34 hypotheses. The invisibility pass doesn't change the need for field validation — it makes field validation harder because there are no visible metrics to calibrate against. A debug/development overlay (toggle-able, never shown to real users) may be needed for tuning. |

### 8. Brutally honest evaluation

**What worked**: The explicit language removal is complete and clean. Fourteen categories of system narration are gone. The slice now shows a coordination surface that responds to temporal pressure without explaining itself. The behavioral systems drive real visual changes — hierarchy, compression, tunneling, memory borders — that a coordinator would experience as "the interface helping" rather than "the system computing."

**What didn't work**: The RECENT section is still a designed artifact. Real environmental memory would manifest as consequences (buffer times appearing, borders changing color, items reordering) without a labeled section explaining why. The section exists because the proving ground needs to demonstrate that memory works — but demonstrating it this explicitly undermines the subconscious principle.

**What I can't evaluate**: Whether any of this actually achieves behavioral invisibility with real humans. The screenshots show a clean surface. The code removes all system language. But "feeling subconscious" is a human perceptual judgment that can't be made by looking at screenshots. A coordinator might still notice "wait, why did that vendor disappear?" or "why is this item suddenly bold?" — and the moment they ask that question, the system has failed to be subconscious. The only test that matters is putting this in front of coordinators and watching whether they ask about the system or just use it.

**The hardest remaining problem**: metabolized continuity. CSS transitions at 800–2000ms are better than instant switches, but they're still perceptible transitions. A truly subconscious environment would shift so gradually that you never notice the moment of change. That requires continuous interpolation (spring physics, frame-by-frame animation) which is architecturally possible but wasn't implemented. The state transitions still have a "something just changed" quality that undermines geological inevitability.

**The most important thing this sprint proved**: You can build a complex multi-system behavioral engine (6 modules, continuous pressure computation, trust scoring, memory decay, zone classification, contamination propagation) and surface it through a proving ground that shows zero system language. The engine does real work. The surface doesn't narrate. Whether the gap between those two — engine complexity vs. surface simplicity — creates the intended cognitive effect is the question only field testing can answer.

## Architecture note

The invisibility pass touched only the slice (the proving-ground surface). The engine modules are pure functions with no UI concerns. This means any future surface — a real coordination view, a different proving ground, a mobile-native implementation — can consume the same engine and make its own decisions about how much (or how little) to expose. The engine is behaviorally complete. The surface is a rendering opinion.
