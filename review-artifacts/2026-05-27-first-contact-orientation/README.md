# Sprint 40B — First-Contact Orientation Recovery
**Date:** 2026-05-27  
**Trigger:** Alpha session observation data (375×812px, 44.6 min, 12 events)  
**Track:** B (OrchestrationSlice — R&D environment)

---

## 1. The Problem This Sprint Addresses

The alpha session was not a success. One coordinator, 375×812px device, 44.6 minutes:

- **3 hesitations in the first 44 seconds** — orientation confusion on first load
- **1 scroll-seek at 39 seconds** — seeking something to engage with
- **4 taps, all on BUTTON (simulation controls)** — zero engagement with orchestration content
- **37-minute passive observation gap** — coordinator stopped interacting after 44 seconds
- **`returns: 0`** — visibilitychange mechanism produced no return events on mobile

The coordinator entered the simulation controls, not the operational environment. They interacted with play/pause and speed buttons — the simulation chrome — and never entered the operational cognition the environment is designed to surface.

This is a first-contact orientation failure. The coordinator could not find the center of gravity.

---

## 2. Root Cause Analysis

### The hierarchy inversion problem

At 375px (mobile), the orchestration environment loaded in this visual order:

```
[Wedding] [Corporate] [Fashion]     ← Row 1: scenario tabs (28px buttons)
[↺] [▶] [1×] [2×] [4×]    CALM    ← Row 2: playback controls (28px buttons)
[════════════════════════]  0/55    ← Row 3: progress scrubber
                                     ← 16px gap
  Hartwell Wedding                  ← Event card heading
  Sat · 17:45 · Bluebell Manor
  ● PRE-EVENT              T-4:00
                                     ← 52px dead zone (disruption placeholder)
CEREMONY TRANSITION                 ← Phase label
[sequence items...]
```

The coordinator's eye landed on simulation chrome before operational content. The first interactive elements were `[Wedding]`, `[Corporate]`, `[Fashion]` — scenario switchers. This looks like a UI control panel, not an operational environment.

### The dead zone problem

The disruption card placeholder (`minHeight: 52`) reserved 52px of blank space below the event identity card — even in calm state when no disruption card was present. This gap reinforced the perception that the environment was incomplete or not yet "running."

### The mobile return gap

`visibilitychange` does not fire on iOS Safari when the device is locked and unlocked. The coordinator's 37-minute passive gap produced zero RETURN events in the observation session (`returns: 0`). The re-entry emphasis system built in Sprint 40A had no trigger.

---

## 3. What Sprint 40B Built

### 3.1 Mobile identity strip (primary fix)

Added a 30px compact strip **above the simulation controls** (mobile only) showing:

```
● Hartwell Wedding        PRE-EVENT · T-4:00
```

This strip leads the page on first load. The coordinator sees WHO (event name), WHAT (mode), and WHEN (countdown) before they see a single simulation button.

The strip uses the same `modeDot`, `modeLabel`, and `timeDisplay` signals as the event card — it's not new information, just promoted to the first visible position. When pressure escalates:
- PRE-EVENT → LIVE (amber dot, no color change on label)
- Disruption → amber/red text on mode label

The sticky scroll header (Sprint 38) picks up when the coordinator scrolls past the strip. Continuity is maintained through the full scroll journey.

**Why not onboarding?** The strip contains no instructions, no tooltips, no arrows, no "start here" copy. It is pure operational signal — the same signal that appears in the event card body. Moving it to the top of the page is a layout decision, not a tutorial decision.

### 3.2 Control layer de-emphasis

Reduced visual weight of compact (mobile) simulation controls:

| Property | Before | After |
|---|---|---|
| Button height | 28px | 22px |
| Button font size | 12px | 11px |
| Wrap vertical padding | 8px | 4px |
| Wrap row gap | 8px | 4px |

The control strip is now clearly a toolbar — smaller, less chrome, subordinate to content. On first load, the eye lands on the identity strip and event card before the controls register as interactive targets.

### 3.3 Disruption placeholder dead zone collapse

Changed `minHeight: 52` (unconditional) to `minHeight: isDisruption ? 52 : 0`.

At calm state, the placeholder no longer consumes 52px of vertical space. The sequence list begins immediately after the event card. One additional sequence item is now visible above the fold at 375×812.

The Sprint 38 geometry stability guarantee (no layout shift when disruption card appears) is preserved — the `400ms ease` height transition still applies.

### 3.4 iOS mobile return detection supplement

Added `pagehide/pageshow` event listeners to both the re-entry system (OrchestrationSlice.jsx) and the observation kit (observationKit.js).

**Why this matters:**
- `visibilitychange` fires on tab switching in iOS Safari
- `visibilitychange` does NOT fire on device lock/unlock
- `pagehide` fires when the page enters background (home button, lock button)
- `pageshow` fires on restore from bfcache (`e.persisted = true`)

Both systems now use a shared pattern:
- `pagehide` → capture `hiddenAt` (only if not already captured by visibilitychange)
- `pageshow` (persisted only) → compute absence duration and trigger return event/re-entry state

This does not guarantee coverage of all lock events — iOS suspension timing is unreliable — but it adds a second detection path that should capture the most common absence patterns (home button press, app switch via swipe).

The `source: 'pageshow'` field is added to observation RETURN events to distinguish which listener fired.

---

## 4. Above-the-Fold Comparison (375×812px)

### Before Sprint 40B
```
┌─────────────────────────────────────────────┐
│ [Wedding] [Corporate] [Fashion]              │ ← FIRST THING SEEN (controls)
│ [↺] [▶] [1×] [2×] [4×]             CALM   │
│ [═══════════════════════════════════] 0/55  │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │  Hartwell Wedding                    │    │
│ │  Sat · 17:45 · Bluebell Manor        │    │
│ │  ● PRE-EVENT                 T-4:00  │    │
│ └──────────────────────────────────────┘    │
│                                              │
│  [52px dead zone]                           │
│                                              │
│ CEREMONY TRANSITION                          │
│ [Guest Transportation          45m]          │
│ [Cocktail Service End          30m]          │
│ [Ceremony Florals              25m]          │
│ [Room Flip                     20m]          │
│ [Lighting Crossfade            18m]          │
│ [Guest Seating                 15m]          │
│ [Dinner Positions              10m]          │ ← fold
└─────────────────────────────────────────────┘
7 sequence items visible. Controls first.
```

### After Sprint 40B
```
┌─────────────────────────────────────────────┐
│ ● Hartwell Wedding       PRE-EVENT · T-4:00 │ ← FIRST THING SEEN (event identity)
│ [Wedding] [Corporate] [Fashion]              │ ← controls (smaller)
│ [↺] [▶] [1×] [2×] [4×]             CALM   │
│ [═══════════════════════════════════] 0/55  │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │  Hartwell Wedding                    │    │
│ │  Sat · 17:45 · Bluebell Manor        │    │
│ │  ● PRE-EVENT                 T-4:00  │    │
│ └──────────────────────────────────────┘    │
│ CEREMONY TRANSITION                          │ ← no dead zone
│ [Guest Transportation          45m]          │
│ [Cocktail Service End          30m]          │
│ [Ceremony Florals              25m]          │
│ [Room Flip                     20m]          │
│ [Lighting Crossfade            18m]          │
│ [Guest Seating                 15m]          │
│ [Dinner Positions              10m]          │
│ [DJ Ceremony Intro              5m]          │ ← fold
└─────────────────────────────────────────────┘
8 sequence items visible. Event identity first.
```

---

## 5. What This Sprint Does NOT Fix

### The event card redundancy

The event card body (Hartwell Wedding, Sat · 17:45, PRE-EVENT, T-4:00) now repeats information from the identity strip. This is intentional: the strip is a fast orientation scan; the card is a stable anchor. Users who scroll past the strip can still orient from the card body. The sticky header handles the scrolled state.

### The 37-minute passive gap

The alpha coordinator disengaged after 44 seconds. Nothing in Sprint 40B addresses why they stopped interacting or why the environment didn't pull them back in. The re-entry emphasis (Sprint 40A) depends on them returning to the tab — which never happened in the alpha session.

Sprint 40B reduces the probability of initial disengagement. It does not address extended passive sessions.

### The BUTTON data-obs problem

The alpha session recorded all 4 taps as `target: "BUTTON"` — the fallback when no `data-obs` attribute is found on the target or its ancestors. This was surprising, since the simulation control buttons do have `data-obs` attributes (`play-pause`, `reset`, `speed-1×`, etc.).

Investigation: the `data-obs` lookup uses `e.target?.closest('[data-obs]')?.dataset?.obs`. If the tap lands on a text node inside the button (`▶`), `e.target` is the text node, `closest('[data-obs]')` traverses up and should find the button. On iOS Safari, `e.target` on a touch can be the button element directly.

Possible cause: the observation kit may have been started before the buttons had `data-obs` attributes in a prior build, or the `touchend` event target resolution behaves differently than expected on that device. This needs a physical device test to confirm. It does not affect Sprint 40B scope.

### visibilitychange on iOS lock

The `pagehide/pageshow` supplement added in Sprint 40B improves coverage but does not guarantee it. iOS can suspend JS execution without firing either event when memory pressure is high. The observation kit may still produce `returns: 0` on some iOS lock/unlock cycles.

---

## 6. Files Changed

| File | Change |
|---|---|
| `demo/src/slices/OrchestrationSlice.jsx` | Identity strip, control de-emphasis, dead zone collapse, pagehide/pageshow supplement, footer Sprint 40A→40B |
| `demo/src/orchestration/observationKit.js` | `onPageHide` / `onPageShow` functions, wired into `startObservation` / `stopObservation` |

---

## 7. Constraints Maintained

- No onboarding, tutorials, coachmarks, overlays, or narration added
- Track A (App.js) untouched
- 4 retained doctrine violations (pulse ring, glow, backdrop blur, spring entrance) unchanged
- Supabase keys remain commented out in `.env.local` (localStorage-only mode)
- Identity strip contains zero instructional copy — pure operational signal

---

## 8. Open Questions

1. **Does the identity strip actually change first-contact behavior?** Only another alpha session will answer this. The hypothesis is that event-first orientation reduces the probability of coordinators engaging only with simulation controls.

2. **Will `pagehide/pageshow` produce RETURN events on iOS lock/unlock?** Requires physical device test with `?observe=1` recording.

3. **Why did `data-obs` resolution fail for the alpha coordinator?** Browser/device target resolution edge case — needs a physical device test.

4. **Is the event card body now redundant?** The identity strip and event card show the same information. Consider whether to simplify the event card in a future sprint — or accept the redundancy as deliberate depth (strip = fast scan, card = full detail).
