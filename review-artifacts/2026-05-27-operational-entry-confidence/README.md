# Sprint 40C — Operational Entry Confidence
**Date:** 2026-05-27  
**Track:** B (OrchestrationSlice — R&D environment)  
**Shift:** Orientation recovery → behavioral participation architecture

---

## 1. The Question This Sprint Answers

Sprint 40B established that the coordinator now sees **who/what/when** on first load (identity strip, event name, mode, countdown). That was orientation.

Sprint 40C addresses the next failure: **the coordinator may understand what the environment is but still not understand how to enter it operationally.**

The specific risk: a coordinator who understands they're looking at a wedding coordination environment might still engage it as a *passive viewer* rather than as an *operational participant*. They watch the simulation advance instead of engaging the orchestration content.

This is not an onboarding problem. It is behavioral invitation architecture.

---

## 2. The Core Diagnosis

### Why coordinators defaulted to controls

The alpha session showed 4 taps, all on simulation controls. The explanation is now clearer:

**The environment was static on load.** At tick 0 with `playing = false`, the coordinator saw a paused operational environment. The natural instinct when confronted with a paused playback interface is to press play. That's the only affordance that suggests "something will happen." The sequence items at tick 0 had uniform appearance and gave no feedback when touched. The controls responded; the content didn't.

The coordinator wasn't confused about what the environment was. They were doing what the environment invited: pressing play.

### The passive viewer trap

A paused simulation with a ▶ button reads as: "press play to begin." The coordinator presses play, watches the simulation advance, and observes the hierarchy shift. They are now a *viewer* of an orchestration simulation, not a *participant* in an operational environment.

This is the passive viewer trap. The environment communicated: "watch this." It should communicate: "you are already in it."

---

## 3. What Sprint 40C Built

### 3.1 Auto-play on mobile load

**Change:** `playing` state initializes to `true` on mobile (< 1024px), suppressed by `?debug=1`.

**Effect:** The coordinator enters a live operational space — the simulation is already running. The identity strip shows LIVE · T-0:45 by the time they've oriented. The hierarchy is already differentiating items. The environment feels inhabited.

**Why this is not onboarding:** No instruction is given. No "watch what happens" prompt appears. The environment simply starts, as a real operational environment would. The coordinator is dropped in mid-stream.

**Implementation note:** The existing `useEffect(() => { setTick(0); setPlaying(false); }, [scenarioId])` was interfering — it fired on mount and killed the auto-play. Fixed by: (1) removing `setPlaying(false)` from the reset effect (safe, since `handleScenario` always reloads the page — there's never an in-place scenario switch), and (2) adding a separate auto-play `useEffect` that runs after the reset.

**Debug mode exception:** `?debug=1` suppresses auto-play. Facilitators who need to inspect the environment in a known state get the old behavior.

### 3.2 Sequence item tap response

**Change:** `SequenceItem` gains a `tapped` state and an `onClick` handler. On tap: background briefly shifts to `rgba(255, 255, 255, 0.045)` with instant onset (no transition), releasing slowly over 400ms.

**Effect:** The coordinator who touches a sequence item gets tactile confirmation — the environment *noticed*. This breaks the assumption that the content is non-interactive.

**Why this matters:** If items look like cards but don't respond to touch, coordinators quickly learn the environment is read-only. Once that mental model forms, they stop touching content. The tap response is the minimum signal needed to keep the "this might be interactive" assumption alive.

**Design constraint:** The response is not a feature. It reveals no additional information. It carries no semantic meaning beyond "acknowledged." If the response were richer (expanded detail, vendor contact, action menu), it would become traditional software. The brief flash is presence — nothing more.

### 3.3 IDLE event in observationKit

**Change:** `IDLE` event type added. Fires 30 seconds after the last tap, once per quiet period. Resets on each tap.

**Effect:** Future sessions can distinguish between:
- "Coordinator stopped tapping at 44s" (IDLE fires at 74s)
- "Coordinator tapped throughout" (IDLE never fires)
- "Coordinator resumed after extended silence" (IDLE fires, then a TAP resets the timer)

**Why 30 seconds:** The alpha session had a 37-minute passive gap. An IDLE threshold of 30s would have fired after 74s of the session and at 30s intervals throughout the gap — giving us 73+ IDLE events. That's too noisy. A single IDLE event after 30s of no taps cleanly marks the transition from active to passive.

**Mobile context:** On mobile, `pointermove` doesn't fire without touch. The existing HESITATION event (3s pointer stillness) is blind on mobile. IDLE is the mobile-appropriate passive dwell signal.

### 3.4 Enhanced export: participation classification

**Change:** `exportSession()` now includes a `participation` block in the summary.

```json
"participation": {
  "operationalTaps": 0,
  "controlTaps": 4,
  "operationalRatio": 0.0,
  "firstTapMs": 8420,
  "firstOrchestrationTapMs": null,
  "maxScrollY": 127,
  "engaged": false
}
```

**Classification rules:**
- **Operational:** `seq-*`, `vendor-*` — engaging orchestration content
- **Control:** `play-pause`, `reset`, `scrubber`, `speed-*`, `tab-*` — simulation infrastructure
- **Other:** everything else

**Key metric:** `firstOrchestrationTapMs: null` is the failure signal. If a coordinator finishes a session and this field is `null`, they never touched orchestration content. That's the alpha session diagnosis in one field.

**`engaged: boolean`** is a derived flag — true if `operationalTaps > 0`. Future sessions can be classified as "engaged" or "not engaged" at a glance.

### 3.5 maxScrollY tracking

**Change:** `maxScrollY` module variable tracks the deepest scroll position reached during an observation session. Reported in export summary under `participation.maxScrollY`.

**Why this matters:** The alpha session coordinator scrolled (there was a SCROLL_SEEK event). `maxScrollY` tells us *how far* they scrolled. If `maxScrollY` is 300 but vendor rows start at 900, the coordinator never saw vendors. If `maxScrollY` is 1200, they scrolled through the full sequence. This gives spatial context to the "what did they see" question.

---

## 4. What Was Considered But Not Built

### Explicit entry affordance (rejected)

The brief asked to investigate "touch invitation," "interaction gravity," and "subtle affordance cues." One option was to add a very faint pulse animation to the first sequence item on load — a barely perceptible ring that fades in and out — suggesting "touch this."

Rejected. Even a faint pulse is instructional. It says "look here." The environment should pull by *being alive*, not by pointing. The auto-play change achieves this more faithfully.

### Focal warmth on highest-urgency item (deferred)

At PRE-EVENT/calm (pressure=0), the hierarchy system assigns nearly uniform weights. No item stands out. Adding a barely perceptible warm tint to the first unstarted item was considered — a `rgba(184, 148, 63, 0.03)` background on Guest Transportation.

Not built this sprint. At tick 0 with auto-play running, the hierarchy differentiates within seconds as the simulation advances. Adding artificial warmth at calm would be a static override of what the system derives dynamically. It could send a wrong signal when the real focal item emerges at tick 5–8.

### Vendor row prominence at calm (deferred)

Vendors are below the fold at 375px (third flex child in the mobile column). They're not visible without scrolling. This is a structural mobile layout issue — the vendor column is a right rail on desktop that stacks below content on mobile. Reordering the flex children on mobile (show vendors between event card and sequence) was considered.

Not built. This would require restructuring the desktop grid logic. It's a layout refactor, not an invitation change. Sprint 40B established the current order deliberately.

---

## 5. Participation Psychology Findings

### The paused-start failure mode

The single biggest behavioral barrier was `playing = false` on load. A paused environment with a ▶ button reads as a playback interface. The coordinator's mental model becomes "player" not "participant." Once they press play and watch, the passive viewer trap closes.

Auto-play eliminates the ▶ call-to-action on mobile. The coordinator can still pause (⏸ is visible), but they're not prompted to *start* anything. The environment is already going.

### Interactivity discovery

If content doesn't respond to touch, coordinators learn it's static. The tap response breaks this within the first interaction. The key question for validation: does a coordinator who taps a sequence item and feels the response *continue tapping other items*, or does the brief flash not register?

The response is intentionally subtle — 4.5% white overlay, 380ms. It may be too subtle for coordinators who are scanning fast. If future sessions still show zero operational taps, the response threshold may need to be higher.

### The first 10 seconds

With auto-play running, the first 10 seconds now look like this:

| Time | Coordinator sees |
|---|---|
| 0s | Identity strip: ● Hartwell Wedding · PRE-EVENT · T-4:00 |
| 0–2s | Environment at tick 0–1: calm, sequence items uniform |
| 2–4s | Tick 2–3: time display starts updating |
| 4–6s | Tick 3–4: transitioning into building state |
| 6–10s | Tick 4–5: hierarchy begins differentiating items, some fade, some brighten |

The coordinator sees the environment *change* without doing anything. This is operationally coherent — the event is approaching in real time. Whether this change invites touch or discourages it ("I'm just watching this happen") is the validation question.

### Passive vs. confusion distinction

The IDLE event helps but doesn't fully resolve the passive/confused ambiguity. A coordinator sitting quietly for 30+ seconds could be:
- **Comprehending:** taking in the environment, forming a mental model before acting
- **Uncertain:** not knowing whether interaction is possible or appropriate
- **Disengaged:** mentally switched off from the task

The IDLE event fires for all three. Distinguishing them requires a protocol — either facilitator observation notes, a brief post-session question ("what were you thinking at that point?"), or secondary behavioral signals (did they scroll? did they return after the idle? did they eventually engage?).

The `maxScrollY` + first tap target combination is the best proxy without self-reporting. If `IDLE` fires AND `maxScrollY` is high AND the next tap is on a sequence item, that's comprehension. If `IDLE` fires AND `maxScrollY` is low AND the next tap is on a control, that's uncertainty or confusion.

---

## 6. Mobile Participation Flow

### What the coordinator now experiences at 375px

On load:
1. Identity strip is already showing event + mode + time
2. Simulation is already running (2s/tick)
3. Controls show ⏸ (the environment is live, not waiting)
4. Sequence items begin showing hierarchy differentiation within 6–10 seconds
5. Touching a sequence item produces brief tactile response

This is the closest the environment has come to "entering an already-evolving operational space" without adding instructional content.

### What still fails

**No natural "first touch" target exists at tick 0.** The sequence items at PRE-EVENT/calm are uniform. There's no "this item needs attention" visual signal until tick 6–8 when the hierarchy starts differentiating. A coordinator who explores in the first 5 seconds sees a list of equally weighted cards with no focal point.

**The environment doesn't telegraph what interaction does.** A coordinator can touch a sequence item and feel the tap response, but nothing else happens. There's no expand, no drill-down, no action. The tap says "this is interactive" but doesn't say "and here's what you can do." Whether this is a limitation or a feature depends on whether the orchestration environment is meant to be a display surface or an action surface. Sprint 40C assumes display surface — the coordinator observes and mentally coordinates, the system reflects the state.

**Vendor rows are below fold.** On mobile, vendors are the third flex child — they appear after the full sequence. A coordinator scrolling to find the "active" area might scroll through all 8+ sequence items before reaching vendors. The vendor compression system (ghosting, collapsing) is designed for pressure states, not for discovery.

---

## 7. Observability Instrumentation

### data-obs coverage

Current coverage (confirmed in code):
- Sequence items: `seq-{id}` on outer wrapper div — resolves via `closest('[data-obs]')` traversal
- Vendors: `vendor-{id}` on card/wrapper
- Controls: `play-pause`, `reset`, `scrubber`, `speed-1×/2×/4×`, `tab-wedding/corporate/fashion`

The alpha session's `target: "BUTTON"` failure remains unexplained. The tap resolver should find `data-obs` on the button ancestors. Possible causes: (1) the alpha session build predated some `data-obs` attributes, (2) iOS touch event target resolution differs from click, (3) the `touchend` event fired on a non-button element (e.g., label text that bubbles differently).

This needs a physical device test to diagnose definitively.

### New observability: participation export

The `participation` block in the export gives facilitators a clear post-session assessment without manual analysis:
- `engaged: false` → coordinator never touched orchestration content
- `operationalRatio: 0.0` → 100% of taps on controls
- `firstOrchestrationTapMs: null` → never happened
- `maxScrollY: 127` → coordinator saw the first 2–3 sequence items only

Future sessions that produce `engaged: true` and `firstOrchestrationTapMs < 10000` would represent the first validated operational entry.

---

## 8. Invisible Guidance Assessment

### What was achieved

The auto-play change is the most faithful implementation of "invisible guidance." The coordinator is not told to engage the environment — the environment is simply already evolving when they arrive. The guidance is embedded in the state of the world, not in instructions about the world.

The tap response is similarly non-instructional. It doesn't say "you can do more." It just says "I felt that." The coordinator may or may not infer that further interaction is possible.

### What remains explicit

The SimControls are still visible. Even though they're de-emphasized (22px buttons, Sprint 40B), the ⏸ button and speed buttons are labeled interactive elements. A coordinator can still reach for them.

The identity strip (Sprint 40B) is information display, not guidance. But it does establish a visual hierarchy that draws the eye upward (to identity) before down (to controls). This is implicit guidance — not "do this" but "here is what matters."

### The honest limit

An environment that self-starts and responds to touch is closer to "already-evolving operational space" than what existed before. But it still doesn't answer the coordinator's unspoken question: "what should I do here?"

If that question needs answering, the answer must come from the environment's behavior, not from text. The hierarchy differentiating. An item flashing red. A vendor going yellow. These are behavioral answers to "what matters now?" They work only when the simulation is in a high-pressure phase. At PRE-EVENT/calm, the environment has no urgency to communicate.

The gap: **the calm entry state doesn't have a natural center of gravity.** Everything is pending. Everything looks similar. A coordinator with no event-day mental model won't know where to direct attention. This may be an unsolvable UX problem — a calm operational environment before an event has nothing urgent happening yet. The environment accurately reflects reality; the coordinator just doesn't have a role in that reality yet.

---

## 9. Control-Layer Status

Post Sprint 40B + 40C:
- Buttons: 22px height, 11px font, 4px wrap padding (de-emphasized)
- Play button shows ⏸ on mobile load (environment is live, not waiting)
- Phase label (CALM/BUILDING/ACTIVE) still visible in controls strip — small, low contrast
- Controls strip has borderBottom separating it from content

The controls are now clearly infrastructure. The ⏸ button is still the most interactive-looking element on the first screen, but it no longer reads as "press me to start" — it reads as "this is running."

---

## 10. Remaining Risks and Open Questions

1. **Will coordinators engage orchestration content?** The first hypothesis (orientation) addressed by Sprints 40A/40B/40C was necessary but may not be sufficient. The next alpha session will determine if participation happens.

2. **Is the tap response detectable?** 4.5% white at 380ms release is very subtle. A coordinator scanning the environment fast may not register it. If sessions still show zero operational taps, increase the response intensity (8–10% white, or a brief border flash).

3. **Does auto-play help or disorient?** A coordinator who arrives expecting a static state might be disoriented by a running simulation. Particularly if they arrive mid-disruption (if the URL has a tick param). This needs to be managed in alpha session protocols — start coordinators with fresh URLs.

4. **What is the ideal "first touch" moment?** The environment should ideally have one item that's differentiated enough to invite attention in the first 10 seconds. At PRE-EVENT/calm, this doesn't exist yet. It emerges at tick 6–10. Fast-forward the auto-start speed to 4× for the first 5 ticks? This would accelerate the differentiation into a visible state. Not implemented — risks disorientation.

5. **Passive comprehension vs. passive confusion still unresolved.** IDLE event helps but doesn't definitively distinguish. Requires facilitator observation notes to interpret.

---

## 11. Files Changed

| File | Change |
|---|---|
| `demo/src/slices/OrchestrationSlice.jsx` | Auto-play on mobile (separate useEffect after scenario reset), SequenceItem tap response (tapped state + onClick + background pulse), footer Sprint 40B→40C |
| `demo/src/orchestration/observationKit.js` | IDLE event type, idle timer + reset logic, maxScrollY tracking, participation export block (operationalTaps, controlTaps, operationalRatio, firstTapMs, firstOrchestrationTapMs, maxScrollY, engaged) |

---

## 12. Brutally Honest Assessment

Sprint 40C built the minimum viable behavioral invitations:
- The environment is live on load (good)
- Content responds to touch (necessary)
- Observability can now distinguish engaged from non-engaged sessions (essential)

What wasn't built: a convincing operational pull. The calm entry state has no center of gravity. The sequence items at tick 0–6 look like a well-organized list, not like an operational environment with something at stake.

The environment will feel more alive to a coordinator who *already knows* what a ceremony transition window is, who knows why "Lighting Crossfade — 18m" with a red border is a signal to investigate, who understands that "Room Flip · Grand Ballroom" starting in 20 minutes needs her attention now.

For a coordinator without that context, the environment is visually coherent but behaviorally inert in the first 10 seconds. The hierarchy differentiation that begins at tick 6–10 is the real invitation — but the coordinator has to wait for it.

**The honest verdict:** Sprint 40C improved the conditions for operational engagement. It did not prove operational engagement happens. The next alpha session is the only real test.
