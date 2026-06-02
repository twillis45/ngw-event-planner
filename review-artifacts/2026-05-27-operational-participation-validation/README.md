# Sprint 40D — Operational Participation Validation
**Date:** 2026-05-27  
**Track:** B (OrchestrationSlice — R&D environment)  
**Shift:** Behavioral invitation architecture → operational participation validation

---

## 1. Session Scope and Honest Limits

Sprint 40D was tasked with running a facilitator-observed 375px session to validate whether the Sprint 40B/40C changes produce genuine orchestration participation. **No live coordinator session was possible this sprint.** What this README documents instead:

- A mechanical simulation observation: loading the environment at 375px and systematically analyzing what a coordinator would see, when, and what it would signal to them
- Code analysis of the current affordance layer
- Instrumentation improvements made based on identified observability gaps
- Behavioral analysis of what the environment can and cannot communicate without a real coordinator

**The primary validation gate — `engaged: true` and `firstOrchestrationTapMs < 10000` — cannot be confirmed without a real alpha session.** This sprint improves the conditions for measurement and addresses the most probable failure mode. It does not claim to prove participation happens.

---

## 2. Mechanical Simulation: What the Coordinator Sees

### Environment state at load (375×812px, tick 0, auto-play running)

**Above-fold reading order:**
```
● Hartwell Wedding              PRE-EVENT · T-4:00   ← identity strip (30px)
[Wedding] [Corporate] [Fashion]                       ← scenario tabs
[↺] [⏸] [1×] [2×] [4×]                    CALM     ← transport (22px buttons)
[══════════════════════════════════] 0/55             ← scrubber

┌─────────────────────────────────────────────────┐
│  Hartwell Wedding                               │
│  Sat · 17:45 · Bluebell Manor                  │
│  ● PRE-EVENT                          T-4:00   │
└─────────────────────────────────────────────────┘

CEREMONY TRANSITION
[Guest Transportation          Premier Valet  45m]
[Cocktail Service End         Atlas Catering  30m]
[Ceremony Florals              Bloom Florals  25m]
[Room Flip                    Grand Ballroom  20m]
[Lighting Crossfade  ◀ RED BORDER  Sparkle   18m]  ← only differentiated item
[Guest Seating                Grand Ballroom  15m]
[Dinner Positions  +6min     Atlas Catering   10m]
[DJ Ceremony Intro            SoundWave        5m]  ← fold
```

**Vendors (12px below fold):** A minimal scroll reveals Atlas Catering, Grand Ballroom, Sparkle Lighting, SoundWave Audio, Bloom Florals, Premier Valet, Lumina Photo, Silk & Linen Co. — all fully expanded at calm/tick 0.

### BehavioralObservatory confirmation at tick 0

```
HIERARCHY WEIGHTS at calm/tick 0:
Guest Transportation   ▒▒░░  0.41  focal
Cocktail Service End   ▒▒░░  0.46  focal
Ceremony Florals       ▒▒░░  0.46  focal
Room Flip              ▒▒░░  0.51  focal
Lighting Crossfade     ████  0.92  focal   ← FRAGILE memory residue
Guest Seating          ▓▒▒░  0.69  focal
Dinner Positions       ▓▒▒░  0.69  focal
DJ Ceremony Intro      ▓▒▒░  0.77  focal
```

**Critical discovery:** The assumption that "tick 0–6 has no center of gravity" (Sprint 40C README) is partially incorrect. Lighting Crossfade has hierarchy weight 0.92 at tick 0 — more than double Guest Transportation (0.41) — because of FRAGILE memory residue from a past failure (Sparkle Lighting had an incident). This produces a visible red left border on Lighting Crossfade that is the only visual differentiator in the calm entry state.

This IS a center of gravity. The question is whether a coordinator without prior event context recognizes the red border as meaningful rather than decorative.

---

## 3. Orchestration Engagement Timing

### First-10-seconds sequence (mechanical projection)

| Time | Coordinator likely sees | Behavioral prediction |
|---|---|---|
| 0–1s | Identity strip: ● Hartwell Wedding · PRE-EVENT · T-4:00 | Orientation. WHO and WHAT established. |
| 1–2s | Controls (⏸ visible, sim running). Event card. | Confirms environment is "already going." May reach for ⏸. |
| 2–5s | Full sequence list. Lighting Crossfade red border visible. | Scan. Red border registers peripherally. |
| 5–8s | Hierarchy begins differentiating as tick advances (tick 2–4). Some items brighten, some fade. | If red border was noticed, this is the moment it becomes interpretable — "something is different here." |
| 8–10s | First interaction decision. | Coordinator either: (a) taps Lighting Crossfade, (b) reaches for ⏸, (c) scrolls to explore, (d) continues passive watching. |

**The branch at 8–10s is the validation target.** Sprint 40D cannot determine which branch a real coordinator takes.

### What decides the branch

- **Domain knowledge**: A coordinator who has worked weddings knows a FRAGILE item means "past failure — monitor closely." They investigate.
- **Interaction confidence**: Does the coordinator believe tapping is permitted? The tap response (now 8% white) is the only affordance confirming interactivity. If they haven't tapped anything yet, they don't know.
- **Control habituation**: If the coordinator's first instinct was to stabilize a "paused-looking" environment, Sprint 40C's auto-play removes that trigger. But the ⏸ button is still visible and still looks interactive. It may still attract the first touch.

---

## 4. Participation Confidence Analysis

### The environment's legibility problem

The sequence items read as an **operational status list**, not as **touchable coordination surfaces**. This is by design — the doctrine explicitly refuses button affordances, call-to-action states, and interactive signaling. But it creates a participation confidence gap:

A coordinator who has never seen this environment cannot determine from appearance alone whether the sequence items:
- Are display-only (like a flight status board)
- Are tappable for detail (like a mobile notification)
- Are tappable for action (like a checklist)

The tap response (now 8% white flash, instant onset, 400ms release) is the only affordance that answers this question — and it can only answer it after the first tap, not before.

**This is the chicken-and-egg problem.** The coordinator won't tap without knowing they can. The environment won't confirm they can without being tapped. Sprint 40C's tap response breaks the cycle only if the first tap is accidental or exploratory.

### Participation confidence risk levels

| Coordinator type | First-10s prediction | Confidence |
|---|---|---|
| Experienced wedding coordinator | Sees red border on Lighting Crossfade, taps to investigate | High — domain knowledge bridges the legibility gap |
| Event coordinator without wedding specialty | Sees a list, unsure if status board or interactive | Medium — will likely explore but may start with scroll |
| Observer unfamiliar with event coordination | Watches the simulation advance, passive | Low — no framework to interpret what "matters" |

The environment has been tuned for the first type. The alpha session will reveal which type the actual coordinator is.

---

## 5. Hesitation and Passive-Viewing Analysis

### IDLE event projection

With auto-play running and IDLE threshold at 30s:

- **Coordinator who taps within 10s**: IDLE never fires if they continue exploring
- **Coordinator who watches passively**: IDLE fires at 30s, giving a single "passive transition" marker
- **Coordinator who hesitates and then taps at 45s**: IDLE fires at 30s, resets after first tap — session shows comprehension recovery, not confusion

The `IDLE` event was designed (Sprint 40C) to distinguish "coordinator stopped tapping" from "coordinator never started." Combined with `firstOrchestrationTapMs`, it now provides:

- `firstOrchestrationTapMs: null` + IDLE fired at ~30s = **never engaged**
- `firstOrchestrationTapMs: 8400` + no IDLE = **early engagement, sustained**
- `firstOrchestrationTapMs: 52000` + IDLE fired + then taps = **comprehension mode, recovered**

### Passive vs. confusion distinction (still unresolved)

The IDLE + `maxScrollY` combination is the best proxy:
- **Comprehension**: IDLE fires + `maxScrollY` > 700 (scrolled to vendors) + first tap on seq-* after idle
- **Uncertainty**: IDLE fires + `maxScrollY` < 400 (never left event card area) + first tap on play-pause
- **Disengagement**: IDLE fires + `maxScrollY` < 100 + no subsequent taps + session ends

This classification requires a real session to execute.

---

## 6. Control-Layer Findings

### Visual hierarchy at 375px

```
Identity strip    — operational signal (strong)
Scenario tabs     — labeled buttons (look tappable, clear affordance)
Transport strip   — ⏸ + speed buttons (clearly interactive)
Scrubber          — range input (interactive affordance)
────────────────────────────────────────────────
Event card        — now has data-obs="event-card" (operational)
Sequence items    — tap response affordance (subtle, post-tap discovery)
```

The control strip occupies ~85px (de-emphasized to 22px buttons from Sprint 40B's 28px). It is no longer the dominant element. The identity strip leads. But the controls remain the clearest interactive affordance on the page — three labeled button groups with obvious click targets.

**Expected coordinator behavior:** First interaction is likely still on the controls unless domain knowledge draws them to Lighting Crossfade. The scenario tabs ("Wedding / Corporate / Fashion") may attract early exploration — "what's Corporate like?"

**What this means for `operationalRatio`:** Even with auto-play and identity-first layout, the `operationalRatio` may remain below 0.5 in the first few minutes. The question is whether it ever becomes > 0 — whether any operational taps occur at all.

---

## 7. Interruption Continuity Retest

Sprint 40D did not conduct a live iOS lock/unlock test. The pagehide/pageshow supplement (Sprint 40B) remains untested on physical hardware. The Observatory at tick 0 shows:

```
INTERRUPTION MEMORY
return count       43
last absence       1.0s
re-entry           settled
```

These are accumulated from previous test sessions in the browser (tab switching). The `return: 43` count confirms the visibilitychange mechanism is working in Chrome. iOS Safari behavior on lock/unlock remains unconfirmed.

**Recommended physical device test protocol:**
1. Load `?slice=orchestration&observe=1` on iPhone Safari
2. Let auto-play run for 5 seconds
3. Lock device for 30 seconds
4. Unlock and return to Safari
5. Export session — check for `RETURN` event with `source: 'pageshow'` and `hiddenDurationSec: 30`

---

## 8. What Sprint 40D Built

### 8.1 Tap response increase

**Change:** SequenceItem tap background: `rgba(255, 255, 255, 0.045)` → `rgba(255, 255, 255, 0.08)`

**Why:** 4.5% white on a dark background (approximately #0d0e10) is visually imperceptible under most ambient lighting conditions on an OLED mobile screen. 8% white crosses the perceptibility threshold in normal indoor lighting. Still subtle — not a feature, not a button state, not a selection indicator. Just presence confirmation.

**Risk:** 8% may still be below threshold on particularly bright ambient light (outdoor use). The threshold may need to go to 12–15% if future sessions still show zero operational taps.

### 8.2 Event card observability

**Change:** `data-obs="event-card"` added to the event card Surface. `classifyTarget()` now classifies `event-card` as operational.

**Why:** A coordinator who taps the event card (Hartwell Wedding, PRE-EVENT, T-4:00) is exhibiting genuine operational curiosity — they're investigating the event context, not using simulation controls. Previously this tap was uncaptured (it hit `target: "DIV"` or fell through to "unknown"). Now it registers as operational engagement.

**Effect on export:** `operationalTaps` increases if coordinator taps the event card. `engaged: true` can now trigger from event card exploration, not just sequence item exploration.

### 8.3 Scroll-depth observability

**Change:** `SCROLL_DEPTH` event type added. Fires once per session per threshold:
- `400px / label: 'sequence'` — coordinator scrolled past the event card into the sequence body
- `700px / label: 'vendors'` — coordinator scrolled into the vendor zone

New participation export fields:
- `firstScrollMs: number | null` — elapsed ms at first scroll event
- `vendorZoneReached: boolean` — whether the coordinator saw the vendor section

**Why:** The alpha session had a `SCROLL_SEEK` event (rapid direction changes) but no way to determine *where* the coordinator was when they scrolled. `maxScrollY` told us the deepest point but not whether it crossed the vendor threshold. The new fields enable:

- `vendorZoneReached: false` → coordinator never saw vendor content
- `vendorZoneReached: true` + `operationalTaps === 0` → saw vendors but still didn't engage
- `firstScrollMs < 5000` → coordinator was actively exploring from the first seconds

### 8.4 Border transition smoothing

**Change:** `borderLeft` now always renders `2px solid transparent` when inactive (was `undefined`). All active states normalized to `2px` width. Transition duration: `1200ms` → `2000ms`.

**Root cause:** CSS `transition: border-color` only interpolates when the border property already exists. Going from `borderLeft: undefined` to `2px solid rgba(184,148,63,0.25)` is a property *addition*, not a color change — the browser cannot animate it. Items were popping into their border color rather than fading in.

**Fix:** Always render `2px solid rgba(0,0,0,0)` at rest. When the hierarchy system promotes an item to `caution` or `urgent`, the transition interpolates from `rgba(0,0,0,0)` → the target color over 2000ms. Verified: `transition: "border-color 2s, background 0.4s"` confirmed in computed style.

**Why 2000ms:** At 1× speed (2s/tick), the hierarchy updates every 2 seconds. A 2000ms transition means the border is still completing when the next tick fires — giving a continuous, overlapping fade rather than discrete step changes. This is the geological quality: the environment doesn't "update," it *drifts*.

---

## 9. Entry-Rhythm Analysis

### Target rhythm (from sprint brief)

| Window | Target behavior |
|---|---|
| 0–3s | Operational grounding |
| 3–8s | Orchestration scanning |
| 5–10s | First orchestration interaction |
| 10–30s | Sequence exploration |
| 30–90s | Continuity understanding |
| 2–5m | Active operational participation |

### Environment's ability to support each window

| Window | Environment support | Gap |
|---|---|---|
| 0–3s | Identity strip grounds WHO/WHAT/WHEN before any chrome | None — this works |
| 3–8s | Lighting Crossfade red border is visible; hierarchy differentiating | The differentiation requires domain knowledge to interpret |
| 5–10s | Tap response confirms interactivity after first contact | No pre-tap invitation exists |
| 10–30s | All 8 items visible; vendors one scroll away | Items look like status display, not coordination surface |
| 30–90s | IDLE fires at 30s if no engagement — marks the gap | Cannot distinguish comprehension from confusion |
| 2–5m | Phase transitions create pressure escalation after tick 15–20 | At 2s/tick, tick 15 = 30 seconds wall time — fast |

**Critical timing asymmetry:** At 1× speed (2s/tick), the simulation reaches the BUILDING phase (tick ~15) in approximately 30 seconds. If the coordinator has engaged by then, the environment "opens up" — hierarchy differentiation accelerates, Lighting Crossfade becomes fully active, pressure escalates. If the coordinator has NOT engaged by 30s, they're watching an increasingly urgent simulation from a passive stance — the IDLE event fires simultaneously with the environment becoming more alive.

This creates a behavioral fork: either the escalating simulation pulls them in (the environment "reaches out"), or they watch it escalate without touching anything.

---

## 10. Over-Subtlety Risks

### Risk 1: Tap response still below threshold
**Probability: Medium.** 8% white on #0d0e10 is perceptible in controlled conditions but may not register in real mobile ambient light on an OLED panel with auto-brightness. If future sessions show zero operational taps, the next increment should be 12–15%.

### Risk 2: Red border misread as decorative
**Probability: Medium-High for non-domain coordinators.** The red left border on Lighting Crossfade signals FRAGILE memory residue. A coordinator with wedding experience reads "this vendor had a problem — watch it." A coordinator without that context may read "this item has a colored border for some reason." The border is present but not necessarily interpreted.

### Risk 3: Environment feels like a display surface
**Probability: High.** The sequence cards have no button affordance, no hover state, no tap target styling, no visual feedback before the first tap. They look like styled text blocks. A coordinator who approaches them with a "this is a dashboard" mental model will not attempt to interact.

### Risk 4: Scenario tabs attract first engagement
**Probability: Medium.** The [Wedding] [Corporate] [Fashion] buttons are the clearest interactive affordances on the screen. A curious coordinator may tap "Corporate" to see what changes — a legitimate exploration but one that registers as a `tab-*` control tap, not operational engagement.

### Risk 5: Auto-play disorientation on re-entry
**Probability: Low.** If a coordinator receives a fresh URL mid-disruption (with a specific tick param), they enter an escalated environment without the calm orientation phase. Protocol: always start coordinators with fresh URLs at tick 0.

---

## 11. Operational Participation Verdict

**The environment is structurally ready to support operational participation.** The auto-play, identity strip, de-emphasized controls, and hierarchy differentiation (including the Lighting Crossfade FRAGILE signal at tick 0) create a credible live operational space.

**Whether it invites operational participation is unproven.** The primary hypothesis — that removing the paused-start ▶ affordance will shift coordinators from passive viewers to operational participants — cannot be confirmed without a real alpha session. The mechanical simulation confirms the environment is coherent and the signals are present. It cannot confirm the signals produce instinctive engagement.

**The participation confidence gap remains open.** A coordinator who has never seen this environment cannot tell from appearance alone that the sequence cards are touchable. The tap response solves this after first contact. Nothing solves it before.

---

## 12. Brutally Honest Assessment

Sprint 40D did not run a human session. It improved measurement infrastructure and addressed one clear over-subtlety risk (tap response intensity). Everything else is analysis.

The environment at Sprint 40D is:
- **More measurable**: SCROLL_DEPTH events, `firstScrollMs`, `vendorZoneReached`, `event-card` classification
- **More perceptible**: 8% tap response vs 4.5%
- **Still unvalidated**: No real coordinator has been observed in this environment with Sprint 40B+40C+40D changes active

The honest path forward is one thing: run the alpha session. One coordinator, 375×812px iPhone Safari, `?slice=orchestration&observe=1`, fresh URL, no briefing beyond "explore this for a few minutes." Export the session. Read `engaged`, `firstOrchestrationTapMs`, `firstScrollMs`, `vendorZoneReached`, and `operationalRatio`.

That data will answer what 4 sprints of analysis cannot.

---

## 13. Files Changed

| File | Change |
|---|---|
| `demo/src/slices/OrchestrationSlice.jsx` | Tap response 4.5%→8% white; `data-obs="event-card"` on event card; footer Sprint 40C→40D; border always `2px solid transparent` at rest (enables CSS color transition); transition `1200ms`→`2000ms` |
| `demo/src/orchestration/observationKit.js` | `SCROLL_DEPTH` event type; `onScroll` depth threshold tracking at 400px/700px; `firstScrollMs` timing; `scrollDepthsFired` state; `classifyTarget` adds `event-card` as operational; `exportSession` adds `firstScrollMs` + `vendorZoneReached` to participation block; `startObservation` + `clearSession` reset new state |

---

## Sprint 40D.1 — Environmental Continuity Pacing (addendum)

**Date:** 2026-05-28

### Problem addressed

After Sprint 40D, the user observed: "when cocktail service and ceremony florals first illuminate, it's too quick." Root cause: `cognitiveTunneling.js` was setting `transitionMs: 600` at calm pressure state, and `transitionMs: 800` at active — both below the geological threshold. CSS property transitions elsewhere (sticky header, mode text) were at 600ms, reading as reactive state-switches.

### Changes made

| Surface | Before | After |
|---|---|---|
| Tunneling opacity — calm state | 600ms | 1200ms |
| Tunneling opacity — building state | 1200ms | 1200ms (unchanged) |
| Tunneling opacity — active state | 800ms | 1200ms |
| Sequence item opacity fallback (OrchestrationSlice) | 800ms | 1200ms |
| Identity strip mode text color | 600ms | 1000ms |
| Identity strip mode label content | Instant snap | 400ms opacity crossfade |
| Sticky header background + border-color | 600ms | 1200ms |
| Event card mode label color | 600ms | 1000ms |
| Event card mode label content | Instant snap | 400ms opacity crossfade (same state) |
| Disruption card border/background/shadow | 600ms | 600ms (preserved — urgency) |

### Key design decision: tunneling unified at 1200ms

Previous behavior differentiated by pressure state: calm=600, building=1200, active=800. The different speeds across states made orchestration transitions feel like mode switches rather than environmental drift. Unified at 1200ms across all states. Urgency signaling is now the responsibility of the disruption card (600ms) and the disruption pulse animation, not tunneling opacity speed.

### Mode label crossfade

The text content change "PRE-EVENT" → "LIVE" cannot be animated with CSS. Implemented via React state (`modeLabelVisible`) + `prevModeLabelRef`: on modeLabel change, opacity → 0 (400ms), content switches, opacity → 1 (400ms). The fade window overlaps the dot color drift (1200ms) and header background shift (1200ms), creating a coordinated environmental shift rather than a label snap surrounded by slow color changes.

### Files changed in 40D.1

| File | Change |
|---|---|
| `demo/src/orchestration/cognitiveTunneling.js` | `transitionMs` unified at 1200ms (was conditional 600/1200/800 by pressure state) |
| `demo/src/slices/OrchestrationSlice.jsx` | Sequence item opacity fallback 800→1200ms; identity strip + event card mode text 600→1000ms; sticky header 600→1200ms; mode label opacity crossfade (`modeLabelVisible` state + `prevModeLabelRef` + useEffect) |
