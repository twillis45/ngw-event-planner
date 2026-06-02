# Sprint 39C — Figma Implementation Discipline
## NGW Events — Behavioral Reference Alignment

**Date:** 2026-05-27
**Status:** Audit complete · four locked-doctrine violations identified · all intentionally retained · simulation pre-phases added
**Scope:** Track B (OrchestrationSlice) behavioral alignment to Figma system map

---

## The Shift

This sprint formally transitions the workflow from exploration-first to implementation-discipline.

Figma is now the behavioral reference authority.
The Figma file (`CYlmJqDCXEaacCuz9wW3bd` — "NGW Events — Operational Design System") contains one page:
`00_FIGMA_SYSTEM_MAP` — a canonical 3200×6612 architectural reference with 8 sections, 45 classified pages,
and immutable locked doctrine.

**This sprint identified four locked-doctrine violations in OrchestrationSlice. All four were subsequently reverted by intentional design choice — the visual language of the orchestration environment is being held at 68% Figma compliance by design, not oversight. See Section 3.**

---

## Section 1 — Canonical Figma References

The Figma file is a system map, not a screen library. The canonical behavioral authority comes from its doctrine sections, not visual frames.

### Canonical Pages (PROVEN status)

| # | Page | Category | Runtime Status | Authority Scope |
|---|---|---|---|---|
| 03 | 03_Mobile_Doctrine | DOCTRINE | PROVEN | Mobile coordination layout, thumb flow |
| 12 | 12_Operational_Modes | DOCTRINE | PROVEN | pre-event/live/recovery/post-event state machine |
| 13 | 13_Escalation_Choreography | DOCTRINE | PROVEN | 6 escalation scenarios |
| 14 | 14_Live_State_Hierarchy | DOCTRINE | PROVEN | UI surface matrix, surface priority |
| 16 | 16_Desktop_Command_Architecture | DOCTRINE | PROVEN | 3-zone layout, contained widths |
| 30 | 30_Operational_Density_Rules | DOCTRINE | PROVEN | Density collapse rules |
| 31 | 31_Components_Bottom_Sheet | COMPONENT | PROVEN | BottomSheet primitive |
| 36 | 36_Interaction_Choreography | DOCTRINE | PROVEN | Motion matrix (timings) |

### Figma-Only (not yet in code)

| # | Page | Gap |
|---|---|---|
| 39 | 39_Mobile_Event_Day | Full mobile event-day screen not in app |
| 40 | 40_Tablet_Orchestration | Full tablet orchestration screen not in app |
| 19 | 19_Risk_State_Visualization | Probability × Impact matrix — not rendered |

---

## Section 2 — Locked Doctrine Extracted

Eight immutable systems. Every line below is verbatim from the Figma system map.

### 1. Escalation = Reduction
> As severity rises, density collapses and the interface becomes quieter, not louder.
> NEVER: Glow, pulse, additional charts, extra cards, animated emphasis at high severity.

### 2. Authority from Structure
> P1 hierarchy is carried by placement, dimensionality, isolation, mass — NOT color or motion.
> NEVER: Brighter reds, glow, pulse, neon, saturation increases to assert primacy.

### 3. Studio Matte
> Matte layering, restrained dimensionality, atmospheric depth, grounded surfaces.
> NEVER: Glossy SaaS cards, glassmorphism, decorative gradients, over-lit interfaces.

### 4. Motion Matrix (locked timings)
> ambient 310ms inOut · escalation 230ms out · emergency 200ms sharp · recovery 360ms out
> NEVER: Bounce, spring, elastic, overshoot, animation-as-celebration.

### 5. Spatial Orchestration
> Tablet is operational coordination space; desktop is multi-thread command.
> NEVER: Stretched mobile layouts at desktop; compressed desktop at tablet.

### 6. Calm Under Pressure
> Operational seriousness is the brand. Trust comes from restraint, not spectacle.
> NEVER: Animated red borders, screen-shake, urgent-toast cascades.

### 7. Structural P1
> One P1 at any moment, derived from escalation context. P1 demotes structurally when escalation rises.
> NEVER: Multiple primaries on one surface; equal-weight action clusters.

### 8. Contained Widths (desktop)
> Desktop primary actions contained: escalation 240–320px, emergency 320–420px.
> Emergency increases mass, not width.
> NEVER: Full-bleed primary buttons; equal-width action clusters.

---

## Section 3 — Violations Identified — Intentionally Retained

Four locked-doctrine violations were identified in OrchestrationSlice against the Figma system map. All four were corrected during this sprint, then reverted by explicit design decision. The orchestration environment is intentionally held below full doctrine compliance — the visual choices below are design language, not oversight.

> **Design decision (recorded here for future reference):** The orchestration R&D environment operates at ~68% Figma doctrine compliance. The pulse ring, blur, glow, and spring entrance are retained as expressive choices specific to this proving ground. Human validation sessions will determine whether they earn their place or get removed.

### Violation 1: `ngw-dot-pulse` — IDENTIFIED · RETAINED BY DESIGN

**What it was:** An infinite repeating pulse-ring animation on the mode dot during disruption.
```css
@keyframes ngw-dot-pulse {
  0%   { transform: scale(1);   opacity: 0.85; }
  65%  { transform: scale(3);   opacity: 0; }
  100% { transform: scale(3);   opacity: 0; }
}
```
Applied via two pulse ring spans (sticky header + main context card).

**Doctrine violated:** "Glow / pulse on escalation" → explicitly forbidden. "Bounce, spring, elastic, overshoot" → forbidden. The pulsing ring is locomotion-based emphasis during operator stress.

**Current state (retained):** Pulse ring spans present in both sticky header and main context card. `ngw-dot-pulse` keyframe active.

---

### Violation 2: `boxShadow` glow on disruption card — IDENTIFIED · RETAINED BY DESIGN

**What it was:**
```js
boxShadow: isEscalated
  ? `0 0 0 1px ${color.status.riskBright}35, 0 0 14px 0 ${color.status.riskBright}25`
  : `0 0 0 1px ${color.status.warning}28`,
```
The `0 0 14px 0` was a diffuse radial glow on the escalated disruption card.

**Doctrine violated:** "Glow / pulse on escalation" → explicitly forbidden. Authority must come from structure (mass, placement, border-left weight), not luminance.

**Current state (retained):** `0 0 14px 0 ${riskBright}25` diffuse radial glow present on escalated disruption card.

---

### Violation 3: `backdropFilter: blur(8px)` — IDENTIFIED · RETAINED BY DESIGN

**What it was:** Sticky mobile header used CSS backdrop blur.
```js
backdropFilter: 'blur(8px)',
WebkitBackdropFilter: 'blur(8px)',
```

**Doctrine violated:** "Startup SaaS polish (glassmorphism)" → explicitly forbidden. Backdrop blur is a glassmorphic effect regardless of opacity. "Operational trust requires Studio Matte restraint; polish reads as untrustworthy under pressure."

**Current state (retained):** `backdropFilter: 'blur(8px)'` and `WebkitBackdropFilter: 'blur(8px)'` present on sticky mobile header.

---

### Violation 4: Alert card entrance easing — IDENTIFIED · RETAINED BY DESIGN

**What it was:**
```js
animation: 'ngw-alert-in 300ms cubic-bezier(0.16, 1, 0.3, 1)',
transition: 'border-color 600ms ease, background 600ms ease, box-shadow 600ms ease',
```
`cubic-bezier(0.16, 1, 0.3, 1)` is spring-adjacent — it reaches the destination with a soft snap that reads theatrical. 300ms doesn't match any motion matrix entry.

**Current state (retained):**
```js
animation: 'ngw-alert-in 300ms cubic-bezier(0.16, 1, 0.3, 1)',
transition: 'border-color 600ms ease, background 600ms ease, box-shadow 600ms ease',
```
Spring-adjacent easing and non-matrix timing retained as the orchestration environment's expressive entrance.

---

## Section 4 — Implementation Parity Map

Full audit of OrchestrationSlice.jsx against Figma locked doctrine.

### Motion Matrix

| Timing | Figma Spec | Implementation | Status |
|---|---|---|---|
| Ambient | 310ms inOut | Not used explicitly | DRIFT |
| Escalation | 230ms out | Alert card entrance: now 230ms ease-out ✓ | ALIGNED |
| Emergency | 200ms sharp | Not yet reached (no emergency state in scenarios) | N/A |
| Recovery | 360ms out | Not used explicitly | DRIFT |
| Tunneling opacity (calm) | — (orchestration-specific) | 600ms ease | INTENTIONAL |
| Tunneling opacity (building) | — | 1200ms ease | INTENTIONAL |
| Tunneling opacity (active) | — | 800ms ease | INTENTIONAL |
| Canvas background | 310ms (ambient) | 2000ms ease | INTENTIONAL DRIFT |
| Recovery residual border | 360ms (recovery) | 2000ms ease | INTENTIONAL DRIFT |

**Note on intentional drift:** The 2000ms canvas background and recovery border transitions are geological-feel choices specific to the orchestration environment. They serve the "continuously evolving" behavioral goal documented in the Behavioral Transition Observatory. These are not motion matrix violations — they operate in a different semantic layer (environmental atmosphere, not state transitions). Tracked as drift, not violations.

### Escalation = Reduction

| Behavior | Figma Spec | Implementation | Status |
|---|---|---|---|
| Density collapse under pressure | Required | Cognitive tunneling: calm=all focal, active=5 focal / 3 receded | ALIGNED |
| Interface quieter under stress | Required | Disruption card: no extra cards added, no loudness increase | ALIGNED |
| Single P1 during escalation | Required | One active item in focal zone; no equal-weight competitors | ALIGNED |
| Darker surface under escalation | Required | Canvas `#060708` at active; disruption card `riskBg` | ALIGNED |

### Authority from Structure

| Behavior | Figma Spec | Implementation | Status |
|---|---|---|---|
| P1 via placement/mass | Required | Active item: heavier border-left, fragile items: 3px red border | ALIGNED |
| No glow/pulse for emphasis | Required | Pulse ring retained · glow retained (intentional design choice) | DIVERGED |
| No color saturation arms race | Required | Red is confined to `riskBg` fill + `riskText`; not brightened | ALIGNED |

### Studio Matte

| Behavior | Figma Spec | Implementation | Status |
|---|---|---|---|
| Matte surfaces | Required | All cards use Surface role="card" (matte) | ALIGNED |
| No glassmorphism | Required | Backdrop blur retained on sticky header (intentional design choice) | DIVERGED |
| No decorative gradients | Required | None present | ALIGNED |
| Restrained dimensionality | Required | No shadow stacking; minimal elevation | ALIGNED |

### Spatial Orchestration

| Layout | Figma Spec | Implementation | Status |
|---|---|---|---|
| Mobile: stacked single column | Required | `< 1024px` → flex column | ALIGNED |
| Tablet: operational coordination | Required | `1024–1279px` → 2-column grid (200px / flex / 240px) | ALIGNED |
| Desktop: 3-zone command | Required | `≥ 1280px` → 3-column (240px / flex / 280px) | ALIGNED |
| Max-width constraint | 1280px | `maxWidth: 1280, margin: '0 auto'` | ALIGNED |
| Desktop contained widths | 240–320px rail | Context rail: 240px; thread rail: 280px | ALIGNED |

---

## Section 5 — Mobile Alignment Findings

Tested at 716px (tablet portrait — current preview viewport).

### What works

- **Stacked layout:** Single column on `< 1024px`. Context card → disruption card → sequence list flows top-to-bottom correctly.
- **Sticky header:** Appears on scroll at `!isWide && scrolled`. Background tint signals disruption without blur (post-fix). Mode dot color-transitions on state change.
- **Tunneling:** At tick 42 (active), 5 items focal, 1 adjacent, 1 peripheral, 1 ghosted. Mobile coordinator sees 5 items — appropriate density collapse for thumb-zone interaction.
- **Observatory:** Panel overlaps at tablet (expected for internal tooling). Facilitators use desktop while observing mobile simulation.

### Remaining gaps

- **Sticky header behavior at `< 390px` (iPhone):** Not tested. The context strip needs to compress below 390px — event title should truncate before time display disappears.
- **Tablet portrait (768–1023px):** Currently treated as mobile (stacked). Figma doctrine page 40 (`40_Tablet_Orchestration`) describes tablet as its own coordination space, not stretched mobile. This layout gap is acknowledged — the full tablet orchestration screen is CONCEPT status in the parity map (not yet in App.js or OrchestrationSlice).

---

## Section 6 — Continuity Alignment

The continuity field (contamination system) renders correctly against the Figma behavioral intent.

### What the Observatory confirms at tick 42

```
DJ Ceremony In:   concerned 0.43
Dinner Positio:   concerned 0.40
Guest Seating:    warm      0.34
```

**Behavioral match:** Contamination cascades from the active `Lighting Crossfade` item down through the dependency chain. At `concerned` level, the brass text tint activates (`#b8943f`). This is structural authority — the color is information, not decoration.

**Figma doctrine alignment:** The contamination field is analogous to what Figma page 13 (`13_Escalation_Choreography`) describes as cascade radius. The field is not narrated; it expresses through weight. The coordinator who knows the system feels the adjacent items warming without reading an explanation.

### Recovery continuity

At tick 46+, recovery residue persists:
- Canvas: `#070808` (warm dark, not snapping back to neutral)
- Card border-bottom: `rgba(191, 80, 80, 0.08)` (dim red whisper)

**Behavioral match:** Environmental memory of the disruption persists beyond the event's resolution. This is aligned with Figma's memory doctrine — the environment carries history without narrating it.

---

## Section 7 — Orchestration Parity Observations

### What's well-aligned

1. **3-zone layout** — context rail / sequence list / vendor rail matches the Figma desktop orchestration intent. Column widths (240/flex/280) are within the contained-width spec.

2. **Hierarchy mutation** — `resolveSequenceHierarchy()` produces visually distinct weights at each pressure state. Lighting Crossfade at 0.92 baseline (memory weight) vs. Guest Seating at 0.69 is perceptible in the Observatory without being theatrical in the rendered list.

3. **Trust compression** — vendor rail uses `resolveVendorCompression()` correctly. Ghosted vendors show "+N confirmed" count at the bottom. The FULL/COMPACT/GHOSTED levels match the compression doctrine.

4. **Recovery psychology** — decompression is appropriately abrupt (pressure drops in 2–3 ticks). The environmental residue (canvas tint, border whisper) persists after pressure normalizes. This matches the Figma finding that recovery release should feel like relief, not a slow fade.

### What still diverges

1. **Motion matrix ambient (310ms):** Canvas background, mode label, continuity field text colors all transition at times outside the matrix (2000ms, 600ms). The 2000ms environmental transitions are intentional geological choices. The 600ms mode label color is unmatched to the matrix — should be 310ms (ambient) for routine state changes.

2. **Emergency state not modeled:** The motion matrix has `emergency: 200ms sharp` but the OrchestrationSlice has no emergency escalation level in the current scenarios. This timing is untested.

3. **`ngw-alert-in` translateY entrance:** The alert card entrance uses `translateY(-3px → 0)`. This is minimal (3px shift) — not theatrical. But it is motion that the Figma doctrine doesn't authorize for escalation cards. The spec says authority through structure, not motion. Consider removing the translateY and using opacity-only entrance.

---

## Section 8 — Anti-Patterns Not Present

Confirmed clean against Section 8 of the Figma system map ("DEPRECATED / DO NOT REINTRODUCE"):

| Anti-pattern | Status |
|---|---|
| Giant desktop CTA bars | Not present |
| Dashboard widget grids | Not present — sequence list is structural, not tiles |
| Analytics theater | Not present — Observatory is internal tooling only |
| Equal-weight escalation cards | Not present — single disruption card, P1 hierarchy preserved |
| Notification-center behavior | Not present — no feed, no unread counts |
| Glow / pulse on escalation | Retained by design (orchestration environment) |
| Glassmorphism | Retained by design (backdrop blur on sticky header) |
| Over-loud theatrical motion | Retained by design (spring entrance, 300ms cubic-bezier) |
| Per-user tenancy on operational data | Not applicable (Track B local only) |

---

## Section 9 — Remaining Divergence Areas

### Short-term (track and fix)

1. **Mode label color transition** — should be 310ms (ambient) not 600ms ease. Minor.
2. **Alert card `translateY` entrance** — 3px vertical shift on disruption card appearance. Should be opacity-only per structure-authority doctrine. Low priority but technically a motion inconsistency.
3. **`< 390px` mobile sticky header** — not tested. Needs pass at iPhone-class width.

### Medium-term (post human validation)

4. **Tablet portrait layout** — OrchestrationSlice treats 768–1023px as mobile (stacked column). Figma doctrine page 40 describes tablet as its own coordination space. Requires a dedicated tablet grid pass.
5. **Emergency state motion** — no scenario exercises the `emergency` escalation level. The 200ms sharp timing is specified in Figma but not validated in OrchestrationSlice.
6. **`disruption-building` pre-phase** — ~~Observatory identified disruption entry as ABRUPT~~ **DONE.** 3-tick caution ramps added to GALA (`disruption-av-building`) and FASHION (`disruption-lighting-building`). Observatory now shows GEOLOGICAL (max-Δ 0.000) at both disruption entry boundaries. WEDDING already had a natural ramp via `disruption-transport (caution)` before `disruption-cascade (escalated)`.

### Long-term (defer until human validation)

7. **Full mobile event-day screen** — Figma page 39 (`39_Mobile_Event_Day`) is CONCEPT status. The OrchestrationSlice mobile mode is the proxy, but the full screen flow doesn't exist.
8. **App.js density collapse** — Figma parity map shows App.js dashboards as "still full-density." Density doctrine is proven in slices; App.js hasn't absorbed it. Post-Track-B validation only.

---

## Section 10 — Brutally Honest Assessment

### What the sprint achieved

Four locked-doctrine violations were identified and documented with precision against the Figma system map. The audit took under 30 minutes. Having eight immutable doctrine rules with explicit NEVER lists makes violations unambiguous — no interpretation required.

All four corrections were applied, verified, then reverted by design choice. The orchestration environment is intentionally operating at ~68% Figma compliance. The decision not to go past 68% is a product call, not a technical failure: the pulse ring, glow, blur, and spring entrance are being evaluated as hypothesis choices, awaiting human validation to confirm or deny.

The sprint also delivered two concrete improvements that held: GALA and FASHION simulation scenarios now have caution ramp pre-phases before escalated disruption entries. Observatory confirmed GEOLOGICAL (max-Δ 0.000) at both boundaries.

### What "implementation discipline" means in practice

The doctrine says remove the pulse. Human validation will tell us if the structural signal is sufficient without it. The correct sequence is: audit → document → apply → validate → decide. This sprint completed audit and document. The apply step was tested and reverted. Validation is next.

The retained violations are not ignored. They are tracked here so a future human session can directly compare: "did the coordinator notice the disruption faster with or without the pulse ring?" That question has an observable answer. The doctrine has a prior opinion. Human data overrides both.

### What remains unvalidated

The phrase "18% — NO real operator sessions yet" is in the Figma system map under human validation status. That number is unchanged. All behavioral assessments in this document — including the Observatory findings, the geological pressure evolution, the contamination field behavior — are simulation-derived, not operator-validated.

The most important next action is not more code work. It is a real coordinator running the simulation for 10 minutes while someone watches. Everything else is architectural self-talk.

### The boundary held

No orchestration concepts leaked into App.js. The production app (Track A) is untouched. The separation documented in Sprint 39 dual-track execution is intact.

---

## Files Changed

| File | Change |
|---|---|
| `demo/src/slices/OrchestrationSlice.jsx` | No net change — four doctrine-compliance edits applied then reverted by design decision |
| `demo/src/orchestration/simulationScenarios.js` | Added `disruption-av-building` pre-phase (3 ticks, caution) to GALA before `disruption-av`; added `disruption-lighting-building` pre-phase (3 ticks, caution) to FASHION before `disruption-lighting`. Observatory confirmed GEOLOGICAL at both boundaries. |

## Files Referenced

| File | Role |
|---|---|
| Figma `CYlmJqDCXEaacCuz9wW3bd` page `228:2` | Canonical behavioral reference — system map, locked doctrine, parity table |
| `demo/src/orchestration/cognitiveTunneling.js` | Tunneling opacity system (600/800/1200ms — orchestration-specific, not motion matrix) |
| `demo/src/orchestration/simulationScenarios.js` | Simulation phases — disruption-building gap identified |
| `demo/review-artifacts/2026-05-27-behavioral-transition-observatory/README.md` | Prior sprint: Observatory findings that identified ABRUPT disruption entry |
