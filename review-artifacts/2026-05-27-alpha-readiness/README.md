# Sprint 37 — Human Coordination Observation (Alpha Readiness)

Transition from internal refinement to controlled human validation. This sprint removes remaining system self-awareness, fixes the behavioral issues identified in Sprint 36, adds observation tooling, and prepares facilitator materials for alpha testing with 2–5 real coordinators.

## What Was Done

### Engine Fixes (Sprint 36 findings → Sprint 37 corrections)

| Finding | Fix | File |
|---|---|---|
| Completed item ghosting too aggressive (5-10% opacity) | Raised GHOSTED minimum from 0.05 → 0.20 | `cognitiveTunneling.js` |
| Continuity field contamination imperceptible (3% brass) | Strengthened visual treatment 3-5× across all levels; added borderTint at lower thresholds | `continuityField.js` |
| RECENT section narrates rather than embodies | Removed entirely — memory manifests only as consequences (borders, buffers, weight) | `OrchestrationSlice.jsx` |
| Trust compression transitions too abrupt (1200ms) | Increased to 2000ms on all vendor opacity/expansion transitions | `OrchestrationSlice.jsx` |
| Recovery lacks operational character | Recovery now reflects preceding stress (disruption count → canvas/border residue, "Resolved" vs "Complete") | `OrchestrationSlice.jsx` |

### New Capabilities

| Feature | Description | Access |
|---|---|---|
| Debug overlay | Shows pressure %, state, phase, tick, per-item weights and zones | Ctrl+D toggle, or `?debug=1` URL param. Hidden by default. |
| Observation recording | Lightweight interaction tracker: taps, repeated taps, hesitations (3s+), scroll seeks, tab returns | Ctrl+Shift+O toggle, or `?observe=1` URL param |
| Session export | Copies observation JSON to clipboard with event summary | Ctrl+Shift+E |
| Session reset | Resets simulation to tick 0 and clears observation data | Ctrl+Shift+R, or ↺ button in controls |
| Recovery residual | Recovery state reflects preceding disruption intensity via canvas temperature and event card border | Automatic based on timeline history |

### Files Created/Modified

| File | Change |
|---|---|
| `src/orchestration/cognitiveTunneling.js` | GHOSTED opacity: 0.05→0.20 minimum |
| `src/orchestration/continuityField.js` | Contamination treatment 3-5× stronger |
| `src/orchestration/observationKit.js` | NEW — lightweight observation recorder |
| `src/slices/OrchestrationSlice.jsx` | Rewritten: removed RECENT, added debug/observation/recovery residual |
| `review-artifacts/.../FACILITATOR_GUIDE.md` | NEW — session structure, questions, observation checklist |

---

## Final Report — 9 Evaluation Points

### 1. What was refined for human testing

**RECENT section removed.** The explicit "Environmental Memory" narration section that listed past event failures with age markers is gone. Memory now manifests exclusively through operational consequences:
- Red fragile borders on items with failure history
- "+Xmin" buffer time additions from past delays
- Increased hierarchy weight (bolder, more spaced) on items with failure history
- Vendor caution indicators from past performance

This is the single biggest behavioral invisibility improvement. The coordinator's environment already incorporates failure knowledge — through how it renders current items — without listing "what went wrong before."

**Cognitive landmarks strengthened.** Completed items ghost to ~20-25% opacity (was ~5-10%). Still clearly receded from active content, but readable enough to maintain navigational orientation. A coordinator can glance at the top of the sequence and see "transportation and cocktails are done" without those items competing for attention with active items.

**Continuity field visibility improved.** Contamination borders and background gradients are 3-5× stronger. Brass/warm tinting is now perceptible on dark canvas — connected items visually warm when a neighbor is under stress. This creates genuine cross-context awareness.

**Trust compression softened.** Vendor expansion/collapse transitions run at 2000ms (was 1200ms). The change from ghosted → expanded or expanded → ghosted now feels gradual rather than instant. Opacity leads the transition — the card fades in before expanding, rather than everything appearing simultaneously.

**Recovery given identity.** Recovery after heavy disruption (3+ disruption phases) shows "Resolved" instead of "Complete" and retains subtle canvas/border warmth. Recovery after a smooth event shows "Complete" at full calm. The environment carries residue of what happened without narrating it.

### 2. What still feels too designed

**The disruption indicator.** "Premier Valet responding" in a bordered card is useful but explicit. A coordinator might ask "where did this card come from?" The disruption indicator appears and disappears based on phase transitions — which is system-driven behavior that could feel designed rather than natural.

**The simulation controls themselves.** The timeline scrubber, play/pause, and speed buttons are test harness controls. They create an inherently "designed" frame around the operational content. Any tester will know they're using a simulation, which changes how they evaluate the experience. This is unavoidable for alpha testing but means the results are "how people evaluate the simulation" rather than "how people coordinate real events."

**The event card layout.** The left-rail event card with title, subtitle, mode indicator, and timing feels slightly formal. Real coordinators might want this information integrated into their workflow rather than occupying a permanent slot in the layout. The card is always-visible — which is correct for orientation — but its static nature makes the left rail feel like "dashboard context" rather than "environmental context."

### 3. Mobile pressure findings

**Improvement over Sprint 36:** Removing the RECENT section saves ~100px of vertical space at mobile width. The first sequence item is now visible above the fold during building pressure. This is a measurable mobile usability improvement.

**Remaining issues:**
- Controls bar takes ~80px at 375px (scenario tabs + transport + speed wrap to 2 rows). Under active pressure, this is real estate that could show operational content.
- Sequence and vendors are never simultaneously visible — single-column stacking means scrolling between them. During active pressure, a coordinator checking vendor status must scroll past the sequence.
- Simulation scrubber is barely usable at 375px with a thumb — fine for facilitator-driven testing, but a real-time coordination tool would need different interaction patterns.

**What works:**
- Touch targets remain 44px+ even under maximum compression
- One-handed operation confirmed at all pressure states
- Rapid glance retrieval: active items immediately identifiable by bold weight + colored borders
- Interruption recovery: returning to the screen after looking away, the mode indicator + sequence state provides instant orientation

### 4. Remaining friction points

1. **No vendor-to-sequence linkage interaction.** Tapping a vendor doesn't scroll to or highlight their sequence items. A coordinator seeing "Sparkle Lighting · caution" can't immediately see which sequence items that affects. The continuity field provides visual contamination, but there's no interactive navigation.

2. **Calm state emptiness.** During the calm phase, every item has uniform weight, every vendor is nominal, and the interface is a flat list. This is correct (nothing is urgent) but provides zero operational value. A coordinator looking at the calm state sees the same thing they'd see in any list app.

3. **Phase transitions still feel like mode switches.** Despite 2000ms canvas transitions, the moment when building → active occurs is perceptible. Hierarchy weights shift, tunneling kicks in, vendors compress — all at once when the pressure crosses 0.60. Real pressure doesn't have thresholds; it's continuous.

4. **Observation tooling is invisible to testers.** The recording indicator is in the footer at 9px font size. Testers won't know they're being observed unless told. This is intentional (don't change behavior) but means facilitated sessions must handle consent separately.

### 5. Recovery-state improvements

**Before (Sprint 36):** Recovery was a reset to calm. All items showed ✓, vendors expanded, canvas returned to default. Identical regardless of preceding stress.

**After (Sprint 37):**
- Recovery after heavy disruption: "Resolved" label, subtle canvas warmth (#080808 vs #070809), event card bottom border with faint red residue, completion counter visible
- Recovery after mild disruption: "Complete" label, minimal canvas shift, clean unwinding
- Recovery after smooth event: "Complete" label, calm state, no residue

The residual character is extremely subtle — a 1-2 step color shift on the canvas, a barely-visible border on the event card. This is intentional. The coordinator shouldn't notice "the system is showing me something" — they should feel "this event was heavy" vs "that went smoothly" without being able to articulate why the interface feels different.

### 6. Trust-compression refinements

**Transition timing:** 1200ms → 2000ms on all vendor opacity transitions. The compression state changes now feel gradual rather than instant.

**Vendor status in expanded cards:** Shows "confirmed" for nominal vendors, actual status ("caution", "delayed", "escalated") for disrupted vendors. This is factual — the coordinator needs to know the vendor's current state, not the system's trust computation.

**Override behavior unchanged:** Any vendor in a dependency chain or with non-nominal status is always expanded, regardless of trust level. This prevents the dangerous case where a relevant vendor gets hidden.

**Remaining issue:** The GHOSTED → FULL expansion when a previously-trusted vendor enters disruption is still a notable visual event. Even at 2000ms, going from "Silk" at 15% opacity to a full card with event count is a visible state change. The coordinator will notice. Whether that's helpful ("ah, something changed with this vendor") or alarming ("where did that card come from?") depends on the individual coordinator.

### 7. Human-testing readiness assessment

| Criterion | Status | Notes |
|---|---|---|
| Simulation scenarios | ✅ Ready | 3 scenarios, each with realistic disruption patterns |
| Desktop testing flow | ✅ Ready | 3-column layout at 1024px+, all behavioral systems active |
| Mobile testing flow | ✅ Ready | Single-column at 375px, all behavioral systems active |
| Facilitator observation checklist | ✅ Ready | Session structure, key questions, warning signals documented |
| Observation tooling | ✅ Ready | Hesitation/tap/scroll tracking with export |
| Debug overlay | ✅ Ready | Ctrl+D for facilitator-only pressure/weight inspection |
| Session reset | ✅ Ready | Ctrl+Shift+R or ↺ button |
| Consent handling | ⚠️ Not implemented | Recording indicator exists but consent must be handled verbally |
| Real-time mode | ❌ Not available | Simulation only — no live event data connection |
| Session persistence | ❌ Not available | Observation data is localStorage only, no backend |

**Overall: Ready for facilitator-observed alpha testing with 2–5 coordinators.** Not ready for unobserved or remote testing.

### 8. Biggest remaining operational risks

1. **Simulation ≠ reality.** Every finding from alpha testing will be about "how coordinators interact with a simulation of coordination pressure" — not "how coordinators coordinate real events under real pressure." The simulation has predictable disruption patterns, a timeline scrubber, and a 2-minute loop. Real events have unpredictable disruptions over 4-8 hours. The gap between simulation feedback and real-world performance is unknown.

2. **Facilitator bias.** The observation checklist and guided questions will shape tester responses. A facilitator who believes the system works will unconsciously ask leading questions. The "positive signals" and "warning signals" categories in the facilitator guide pre-frame the evaluation.

3. **Small sample.** 2-5 coordinators is enough to find severe usability problems (orientation loss, trust compression anxiety) but not enough to validate the cognitive load hypothesis. Statistical significance requires larger samples and controlled comparisons against baseline (coordinating without the system).

4. **Formula tuning still hypothetical.** The pressure weights (mode: 0.30, escalation: 0.40, temporal: 0.30, dependencies: 0.15), trust thresholds (compact: 5, collapsed: 20, ghosted: 50), and memory decay curves are all untested hypotheses. Alpha testing may reveal that building → active occurs too early or too late, but adjusting the formula requires understanding which specific threshold is wrong — which requires the debug overlay and careful observation.

5. **No baseline comparison.** Without showing testers both "coordination with the system" and "coordination without the system" (or with a flat-list alternative), we can't attribute any cognitive load difference to the orchestration engine vs. the general experience of using a new tool.

### 9. Brutally honest alpha-readiness evaluation

**What's ready:** The orchestration engine produces coherent behavioral responses across 3 diverse scenarios. The surface no longer narrates what it's doing. Environmental memory manifests as consequences. Cognitive tunneling maintains landmarks. Continuity fields are perceptible. Trust compression transitions are smooth. Recovery reflects preceding stress. Debug and observation tooling exist. Facilitator materials are prepared.

**What's not ready:** This is a simulation running in a browser proving ground. It is not an event coordination tool. A coordinator cannot add sequence items, modify vendor assignments, send messages, update statuses, or do any of the actual work of coordination. They can only watch the simulation and evaluate how the environment feels. This limits alpha testing to perception evaluation — "does this feel helpful?" — not performance evaluation — "does this actually help you coordinate better?"

**What I'd honestly tell a coordinator:** "This is a demonstration of how an event coordination tool could adapt its behavior under pressure. Everything you see is simulated. We'd like to know whether the way the interface changes — what gets emphasized, what recedes, how vendors are shown — feels natural or confusing. Your feedback will shape whether we build this into a real tool."

**What I'd honestly tell the product owner:** "The engine works. The behavioral systems compose correctly. The surface is clean. But we have zero evidence that any of this reduces coordination cognitive load. Alpha testing will generate qualitative feedback about perceived value — which is useful but not validating. Real validation requires a real tool used during a real event. We're approximately 3 sprints away from that: (1) real event data integration, (2) coordinator interaction capabilities, (3) field deployment. What we have now is a high-fidelity behavioral prototype that's ready for perception testing."

**The metric:** Does coordinating through pressure feel less mentally exhausting? We can't answer that with a simulation. We can answer: "Does this simulation make coordinators feel like the system understands their attention needs?" That's a weaker but still valuable question, and it's the one alpha testing can address.
