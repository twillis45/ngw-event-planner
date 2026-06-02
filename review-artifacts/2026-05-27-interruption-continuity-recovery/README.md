# Sprint 40A — Interruption Continuity Recovery
## NGW Events — Fragmented Cognition Survival

**Date:** 2026-05-27
**Status:** Implementation complete · Observatory extended · behavioral assessment documented
**Scope:** Track B (OrchestrationSlice) — interruption recovery and re-entry continuity

---

## The Shift

Sprint 38 validated continuous orchestration usage — a coordinator moving through an event without interruption.

Sprint 40A addresses a harder problem:

**Can a distracted coordinator re-enter the environment mid-pressure and instantly regain orientation WITHOUT cognitive reloading?**

This is the real operating condition. Coordinators are not sitting at a desk watching a screen continuously. They are interrupted constantly:
- Phone to pocket, vendor in face
- Stepping away from the table to manage a guest concern
- App switching to check a text
- Walking to a location while mid-coordination
- Returning from a conversation 90 seconds later

The environment must survive fragmented attention. If it doesn't, the orchestration surface is theater — beautiful when watched, useless when used.

---

## Section 1 — Interruption Philosophy

### What interruption continuity is NOT

- NOT a "you were away" notification
- NOT a "resume session" flow
- NOT a summary of what changed
- NOT an onboarding re-entry experience
- NOT a dashboard update showing what happened

### What interruption continuity IS

**Environmental re-catch.** When the coordinator returns, the environment should quietly re-establish their operational context without narrating anything. The hierarchy should still be correct. The gravity well should still be identifiable. The most critical items should visually attract the eye. The coordinator should feel re-grounded within 1–3 seconds without having to read anything.

The analogy: a physical coordination desk where you set things down. You walk away and come back. The desk hasn't reorganized itself — it's exactly as you left it. You instantly know where you were because the physical arrangement of papers and notes persists. The orchestration environment should feel like that desk.

---

## Section 2 — What Existed Before Sprint 40A

### Sprint 38 tab-return flash

The only prior interruption mechanism was a boolean `tabReturnFlash` state that:
- Fired on any `visibilitychange` (hidden → visible)
- Applied amber border to items where `item.isActive` for exactly 2 seconds
- Did not measure how long the user was gone
- Did not scale with absence duration
- Treated a 1-second alt-tab identically to a 3-minute phone lock

### observationKit.js RETURN event

The observation kit recorded `RETURN` events when visibility changed, but stored `hiddenDuration: 'unknown'`. No actual timing data was captured. The export summary had no interruption statistics.

### Observatory

Seven observability sections. No interruption section. No way to inspect re-entry behavior during a facilitated testing session.

---

## Section 3 — What Sprint 40A Built

### 3.1 Proper hidden-duration tracking (`observationKit.js`)

The module now tracks `hiddenAt` as a timestamp when the tab goes hidden. On return:

```js
hiddenAt = Date.now(); // on hide

// on return:
const hiddenDuration = Date.now() - hiddenAt;
record(OBS_EVENT.RETURN, {
  hiddenDuration,            // milliseconds
  hiddenDurationSec: 45.2,  // human-readable
});
```

Export summary now includes:
```json
"interruptions": {
  "count": 3,
  "avgAbsenceSec": 22.4,
  "maxAbsenceSec": 71.0,
  "longAbsences": 1
}
```

### 3.2 Absence-scaled re-entry emphasis (`OrchestrationSlice.jsx`)

The boolean `tabReturnFlash` is replaced by a richer `reEntry` state object:

```js
{
  hiddenDuration: 45200,     // ms
  pressureDelta: +0.18,      // pressure change while away
  pressureOnLeave: 0.62,     // pressure when coordinator left
  pressureOnReturn: 0.80,    // pressure when they returned
  flashDuration: 2500,       // ms — scaled by absence length
  intensity: 0.75,           // 0–1 — scaled by absence length
  active: true,              // whether emphasis is still showing
  returnCount: 2,            // total returns this session
  returnedAt: 1748376000000, // timestamp
}
```

**Flash duration scaling:**
| Absence duration | Flash duration | Intensity |
|---|---|---|
| < 5 seconds | 1.5 seconds | 0.5 |
| 5–30 seconds | 2.5 seconds | 0.5–1.0 |
| > 30 seconds | 4.0 seconds | near 1.0 |

### 3.3 Structural re-entry landmarks

**Active items:** Amber border (3px, rgba 0.85) — Sprint 38 behavior preserved.

**Focal and adjacent items:** Proportional structural presence based on hierarchy weight:
```
reEntryEmphasis = min(0.55, item.hierarchy.weight × reEntry.intensity × 0.8)
```

A high-weight focal item (weight 0.92 — like Lighting Crossfade with prior failure history) gets a visible amber border at opacity ~0.40. A low-weight focal item (weight 0.35) gets a faint presence at ~0.14. The most critical items in the gravity well attract the eye without any narration.

**Progress bar:** Briefly raises opacity to 1.0 on return (from 0.85 baseline). This catches peripheral vision — the progress indicator is the widest horizontal element on the screen and makes a reliable orientation anchor even during a glance.

### 3.4 Observatory section 8 — INTERRUPTION MEMORY

New observability section visible at `?debug=1`:

```
INTERRUPTION MEMORY
return count     2
last absence     45.2s
pressure Δ       +0.18
re-entry         anchoring → settled
```

- **return count** — total returns this session (helps facilitator track frequency)
- **last absence** — duration in seconds; amber if > 30s
- **pressure Δ** — how much pressure changed during the absence; signals whether coordinator returned to a different operational state than they left
- **re-entry** — `anchoring` (emphasis active) or `settled` (emphasis complete)

---

## Section 4 — Glance Reconstruction Analysis

### The 1–3 second target

A returning coordinator's eye sequence (expected, not yet validated with humans):

1. **0–0.3s:** Canvas background tint registers — dark/amber/recovery palette signals operational context instantly
2. **0.3–0.8s:** Progress bar reads — position in sequence + brief opacity pulse draws eye
3. **0.8–1.5s:** Hierarchy gravity is felt — the heaviest items (anchor + contamination) command the eye without explicit direction
4. **1.5–3s:** Active items with amber border confirm "what is happening right now"

This sequence assumes the coordinator remembers roughly what they were doing. If they've been away for >2 minutes, the re-entry emphasis (4s flash duration) extends the re-orientation window appropriately.

### Structural landmarks that persist without emphasis

Even without re-entry flash, several elements are reliable orientation anchors:

| Landmark | Signal |
|---|---|
| Canvas background color | Operational state (dark = calm, charcoal = active, warm = disruption) |
| Mode dot color | Amber = disruption, green = nominal, dim = recovery |
| Disruption card (if present) | Vendor name + DISRUPTION/ESCALATED label — always in same position |
| Progress bar | Sequence position — width is readable at a glance |
| Contamination warmth on items | Brass tint on affected items persists through absence |
| Sequence item opacity gradient | Tunneling zone visible — focal items bright, receded items dim |

### What persists through absence correctly

Because the simulation runs on `setInterval` (which continues even when the tab is backgrounded, modulo browser throttling), and all visual state is derived from `tick`:

- Canvas background tint ✓
- Hierarchy weights ✓
- Tunneling zone opacity gradient ✓
- Contamination field warmth ✓
- Vendor compression state ✓
- Disruption card presence ✓
- Progress bar position ✓

The environment is geometrically continuous — nothing hard-resets on return. CSS transitions (2000ms for canvas, 800ms for items) run to completion even while tab is backgrounded, so when focus returns, everything is already in its correct rendered state.

### The tick-advance gap

One subtlety: if the simulation was playing at 1× speed (one tick per 2 seconds), a 60-second absence = ~30 ticks advanced. The coordinator returns to a materially different tick than they left. Whether this feels disorienting depends on where they left and where they return:

- Leave at tick 18 (calm building), return at tick 36 (disruption active) → major disorientation. The pressure delta signal (+0.30+) in the Observatory captures this.
- Leave at tick 20 (disruption entry), return at tick 25 (same disruption) → minimal disorientation. Pressure delta ≈ 0.

**Recommendation:** In facilitated sessions, always use auto-advance. The coordinator should be able to return and immediately feel the current state — not try to recover from a gap.

---

## Section 5 — Mobile Re-Entry Findings

### Existing mobile continuity elements

The sticky context header (Sprint 38) is the strongest mobile re-entry anchor. When the coordinator is scrolled past 80px and returns:

- Mode dot (amber during disruption, green nominal) — visible at 375px
- Event title — confirms which event they're coordinating
- T-minus countdown — instantly shows time pressure
- Backdrop blur blur (intentional retained design choice) — visual separation from content below

At 375px (iPhone class), the sticky header shows above the fold. On re-entry with scrolled position preserved, the coordinator's first glance hits: event name · mode dot · time remaining. This 3-element cluster achieves orientation without scrolling.

### What mobile doesn't have yet

- **Lock/unlock simulation** — not testable in the preview environment. Requires physical device and real coordinator session.
- **One-hand re-entry** — needs observation. Is the active item above or below the natural thumb-zone on a 6.1" screen? Untested.
- **Walking reorientation** — peripheral vision reading distance is shorter. The 7px mode dot may be too small for glance confidence at arm's length. Observed in preview but not validated in motion.

### Mobile interruption gap: sticky header trigger

The sticky header only appears when `scrollY > 80`. If the coordinator returns without having scrolled (common in a quick back-and-forth), the sticky header is absent. Their first visual is the full content view, which is readable — but the mode dot is deeper in the context card, not pinned at top. This is a known gap, not a new regression.

---

## Section 6 — Continuity Persistence Timing Observations

| Transition | Current timing | Interruption behavior | Assessment |
|---|---|---|---|
| Canvas background | 2000ms ease | Completes while tab hidden | Correct — returns to settled state |
| Vendor opacity | 2000ms ease | Completes while tab hidden | Correct |
| Item opacity (recession) | 600–1200ms ease | Completes while tab hidden | Correct |
| Mode label color | 600ms ease | Completes while tab hidden | Acceptable |
| Re-entry flash | 1500–4000ms | Fires on return | New — correct |
| Progress bar opacity | 1200ms ease | Pulses on return | New — correct |
| Disruption card entrance | 300ms cubic-bezier | Fires when phase changes | Independent of tab state |

The geological continuity of the environment — the quality where state changes feel absorbed rather than switched — is preserved through interruption. This is because all state is derived from `tick`, not from animation. CSS transitions are cosmetic; the underlying state is always correct.

### One exception: simultaneous zone transitions

When the coordinator is away for multiple ticks and the phase changes, several items may transition zones simultaneously (e.g., calm → active means most items reclassify). This can look like "everything changed at once" rather than a geological drift. This is not new behavior — it predates Sprint 40A — but it's more likely to appear on return from a long absence. The transition timing (600–1200ms) softens it, but the root cause is that transition animations represent state that already settled before the user was looking.

---

## Section 7 — Geological Continuity Assessment

### What makes interruption recovery geological?

A geological transition is one where the state change feels absorbed, not switched. For interruption recovery, geological means: the coordinator returns and feels the environment has been alive, not paused and resumed.

**Passes:**
- Canvas background ✓ — never snaps, always settled on return
- Hierarchy weights ✓ — derived from tick, no re-computation artifact
- Contamination field ✓ — warm items stay warm, no field reset
- Environmental memory ✓ — failure history persists across interruption
- Vendor compression ✓ — trust state never resets

**Passes with caveats:**
- Zone transitions (see §6) — geological in theory, potentially visible in long-absence return
- Re-entry flash — designed to be environmental, but is technically triggered behavior. The amber border pulse is structural (not a notification), but a sharp eye could identify it as "something fired on return"

**Active gaps:**
- No pressure-delta warning in the UI itself (only in Observatory) — coordinator has no signal if they returned to a different pressure state. This may or may not be necessary.

---

## Section 8 — Re-Entry Failures Documented

The following failure modes are not yet addressed by Sprint 40A:

### Failure 1: Long-absence panic after phase transition

If the coordinator leaves during `disruption-cascade` (escalated, pressure 0.92) and returns 3 minutes later during `recovery` (pressure 0.10), the dramatic pressure drop causes all items to re-expand, the disruption card vanishes, and the canvas brightens — simultaneously. Even with 2000ms transitions, this is jarring.

**Root cause:** Large tick gap + recovery phase entry = multiple simultaneous state changes.
**Not a regression** — exists pre-Sprint 40A. Not addressed in this sprint.

### Failure 2: Silent return during calm

If the coordinator returns during `calm` (pre-event), there is no emphasis because `item.isActive` is false for all items and `item.tunneling.zone` is `focal` for everything (no tunneling at calm). The re-entry flash fires (amber border on focal items proportional to hierarchy weight), but hierarchy weights under calm are low (0.41–0.51), so the border opacity is ~0.15 — nearly invisible.

**Effect:** Re-entry during calm provides minimal structural signal. Acceptable because calm is low-pressure — disorientation risk is low.

### Failure 3: Lock/unlock physical reality

The `visibilitychange` event fires on browser tab switching but may not fire reliably on phone lock/unlock depending on PWA installation state, OS version, and browser. This has not been tested on a physical device.

**Risk:** The entire re-entry mechanism assumes `visibilitychange` fires. If it doesn't, no re-entry emphasis occurs. The passive landmarks (canvas tint, progress bar, hierarchy gradient) still provide some continuity, but the active flash doesn't fire.

---

## Section 9 — Operational Successes

### What works well today

1. **Structural persistence** — the environment never hard-resets. Returning coordinator always lands in correct state.

2. **Disruption card as anchor** — when disruption is active, the left-rail disruption card (amber/red, bolded vendor name) is the single most visible element. It persists through any interruption. A coordinator can return from a 5-minute absence and within 1 second see "ESCALATED · Sparkle Lighting, Bloom Florals · responding" — full operational context.

3. **Progress bar as position anchor** — the 3px bar showing sequence completion is visible at a glance. On return, the brief opacity pulse (new in Sprint 40A) draws the eye without narrating.

4. **Canvas tint as atmosphere carrier** — the dark amber canvas background during disruption is a pre-cognitive signal. Before the coordinator reads anything, the warm-dark environment tells them: "something is elevated." This operates below conscious attention.

5. **Contamination warmth persists** — items contaminated from active pressure (brass warmth on downstream items) retain their warmth through absence. Returning coordinator sees the field consequence without needing to re-read the sequence.

6. **Observatory section 8 for facilitators** — facilitators running observed sessions can now see: how long coordinators were absent, whether pressure changed during absence, and whether the re-entry emphasis fired. This is direct behavioral data, not inference.

---

## Section 10 — Fragmented Cognition Analysis

### The cognitive load of re-entry

Cognitive load during re-entry comes from one question: "where am I?" The coordinator's working memory has been partially displaced by whatever interrupted them. They need to rebuild:
1. **Location** — which event, which phase, which items are active
2. **Priority** — what's the single most important thing right now
3. **Status** — has anything changed

The environment currently handles (1) well (structural persistence), (2) adequately (hierarchy gravity), and (3) poorly (no signal about what changed, only what IS).

Sprint 40A addresses (2) more explicitly by scaling re-entry emphasis to hierarchy weight — the most critical focal items get the strongest structural emphasis on return.

### The "changed while away" problem

The current environment provides no signal about what changed during the absence. This is a deliberate design choice: the Figma doctrine forbids "while you were away" summaries, notification-center behavior, and explicit narration. The environment carries history through structural weight, not verbal report.

The tradeoff: a coordinator who returns mid-disruption-cascade (was away during caution-to-escalated transition) sees the current escalated state clearly but has no environmental signal that the state changed. The Observatory's `pressure Δ` gives this signal to facilitators but not coordinators.

**Whether this matters is a human validation question.** The doctrine says no narration. A coordinator may instinctively feel "this is worse than I left it" from the visual environment without needing explicit notification. Or they may feel lost. The 68% Figma compliance the system is running at keeps this question open.

---

## Section 11 — Brutally Honest Assessment

### What Sprint 40A actually accomplished

1. The re-entry mechanism now knows how long the coordinator was gone. Previously it treated all returns identically.

2. The re-entry emphasis now scales with absence duration and hierarchy weight. Previously it was binary (flash/no-flash) on active items only.

3. The Observatory can now show facilitators interruption data. Previously it was blind to returns.

4. The export session JSON now includes interruption statistics. Previously `hiddenDuration: 'unknown'`.

### What it didn't accomplish

The sprint brief asked for "instant operational continuity recovery." That's a user outcome, not a code deliverable. Whether a distracted coordinator can re-enter and regain orientation within 1–3 seconds is **not validated**. The code was written. The mechanism fires. The environmental anchors exist.

But no human has used this.

No coordinator has locked their phone, walked 30 seconds across a venue, returned, and been observed re-orienting. The Observatory section 8 exists precisely so this observation can happen — but it hasn't happened yet.

The brutally honest statement: Sprint 40A built the instruments to measure interruption recovery. It did not prove interruption recovery works.

### Most important next action

Facilitated session where a coordinator uses the simulation for 10 minutes with deliberate interruptions. Facilitator watches:
- Where does the eye go first on return?
- How long before first meaningful interaction?
- Does the re-entry flash help or go unnoticed?
- Is the disruption card the primary anchor (hypothesis: yes)?
- Is the canvas tint a pre-cognitive signal (hypothesis: yes, but untested)?

Everything in this document is a behavioral hypothesis built on simulation-derived assessment.

---

## Files Changed

| File | Change |
|---|---|
| `demo/src/orchestration/observationKit.js` | Proper `hiddenAt` timestamp tracking; `hiddenDuration` computed on return; export summary includes interruption stats |
| `demo/src/slices/OrchestrationSlice.jsx` | `tabReturnFlash` → `reEntry` state object; absence-scaled flash duration + intensity; focal-item re-entry emphasis proportional to hierarchy weight; progress bar opacity pulse; Observatory section 8 |

## Files Referenced

| File | Role |
|---|---|
| `demo/src/orchestration/cognitiveTunneling.js` | Zone classification (focal/adjacent/peripheral/ghosted) — re-entry emphasis targets focal+adjacent |
| `demo/src/orchestration/adaptiveHierarchy.js` | Item weight computation — used to scale re-entry emphasis per item |
| `demo/review-artifacts/2026-05-27-figma-implementation-discipline/README.md` | Doctrine constraints — no narration, no notification, no "while you were away" |
| `demo/review-artifacts/2026-05-27-behavioral-transition-observatory/README.md` | GEOLOGICAL assessment thresholds — continuity reference |
