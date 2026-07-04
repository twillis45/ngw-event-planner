# F4: Assemble Reveal — Current State Audit

**Date:** 2026-07-03  
**Status:** Audit in Progress  
**Purpose:** Understand existing architecture before enhancing with Event Intelligence layers

---

## Current Implementation

### Location
`/demo/src/App.js` lines 22445–22527  
Component: `AssembleReveal({ ev, profile, onDone })`

### Render Flow
```
Landing (new event created)
  ↓
Intake (user describes event + date)
  ↓
AssembleReveal (modal/dialog, fixed position, zIndex: 10000)
  ↓ [onClick onDone]
HostHome (normal workspace)
```

### Current Architecture

**Input:** Event + Profile  
**Output:** Modal dialog with 3 animated cards

**Current Data Sources**
```javascript
eventGlyph(ev, C)              // event icon, color, hue, mark, sacred
useFoodPriceFactor(ev, profile) // regional food cost factor
playbookFoodPlan(ev, foodPP)   // food plan (item count, guest estimate)
effectiveRos(ev)               // run-of-show timeline
```

**Current "Stages" Rendered**
```javascript
1. { key: 'day',  icon: 'calendar', label: 'Building your day',        value: `${ros.length} moments, hour by hour` }
2. { key: 'food', icon: 'cloche', label: 'Sizing the food & drink', value: `${fp.itemCount} item${s} for ~${fp.guests} guests` }
3. { key: 'list', icon: 'store', label: 'Writing your shopping list', value: 'Every item, ready to check off' }
```

---

## What Current Assemble Reveal Consumes

| Engine | Output | Current Use |
|--------|--------|------------|
| **Playbook Reader** | Event type, capacity, task structure | Selects which playbook; used for food plan |
| **Food Plan Engine** | Item count, guest estimate, sourcing choices | "Sizing the food & drink" stage |
| **Run-of-Show Engine** | Timeline cues, moments | "Building your day" stage (moment count) |
| **Event Glyph** | Icon, color, hue, mark (quiet/festive), sacred | Event identity visual |
| **Food Price Factor** | Regional cost multiplier | Food plan accuracy |

---

## What Current Assemble Reveal Does NOT Consume

| Intelligence | Engine | Status |
|--------------|--------|--------|
| **Event Identity** | Event Identity Engine | ❌ Not consumed; exists in lib but Reveal doesn't call it |
| **Persona** | Persona Resolution Engine | ❌ Not consumed (new, Sprint A) |
| **Complexity** | Event Complexity Classifier | ❌ Not consumed; exists in lib but Reveal doesn't call it |
| **Compound Detection** | Compound Event Detection | ❌ Not consumed; core to F4 goal but absent from Reveal |
| **Budget** | Budget Engine | ❌ Not surfaced in Reveal; exists in planning workspace |
| **Vendors** | Vendor Intelligence | ❌ Not surfaced in Reveal; exists in planning workspace |
| **Risks** | Risk Engine | ❌ Not surfaced in Reveal; exists in planning workspace |
| **Guest Planning** | Guest Management | ❌ Not surfaced in Reveal; exists in planning workspace |
| **Weather** | Weather Intelligence | ❌ Not surfaced in Reveal; exists in planning workspace |
| **Shopping** | Shopping Engine | ⚠️ Partially—only item count, not full shopping plan |
| **Decisions** | Decision Confidence | ❌ Not surfaced in Reveal; exists in Command Center |
| **Next Actions** | Next Action Engine | ❌ Not surfaced in Reveal; exists in Command Center |

---

## Existing Components & Readers

### Readers Already Wired
- `eventGlyph()` — translates event into visual identity
- `eventIdentity()` — reads existing event.identity flags (Sprint 60B)
- `eventComplexity()` — classifies event complexity (may exist, need to verify)
- `decisionConfidence()` — judges if decisions are locked
- `playbookFoodPlan()` — generates food planning intelligence

### Readers NOT Yet Wired to Reveal
- `eventIdentity()` — what the system understood
- `mustHaveBecause()` — why the event is important
- `isMeaningfulMustHave()` — whether user set their core moment
- `identityOn()` — presentation flag for event identity exposure
- `decisionConfidence()` — confidence in locked decisions
- `becauseLayer()` — reasoning layer for recommendations
- `confidencePersona()` — confidence remapped by persona

---

## Current Reveal UX

### Structure
- Fixed modal/dialog overlay
- Radial gradient background (event color-based)
- Event glyph hero (festive = 78px glass; quiet = 40px mono)
- Headline: "Setting up {event name}"
- Status: "Putting it together..." → "Your plan is ready."
- 3 stage cards animate in (360ms first, 620ms each after)
- Button: "Take me in →" (available immediately) → "Open my event →" (when done)

### Animations
- `ceFadeIn` (600ms) — modal appears
- `ceRise` (640ms) — hero rises
- `ceSettle` / `ceAura` (5.4s infinite) — breathing aura
- `ceBreathe` (2.4s × 2) — card breathing when revealed
- `cePop` (460ms) — checkmark animation

### Feedback
- `feedbackReveal()` — haptic + tone when reveal completes (festive events only)

---

## What Event Identity Engine Should Feed In

From Sprint A, the Event Identity Engine returns:
```javascript
{
  primaryEventType: 'Birthday',
  secondaryEventTypes: ['retirement', 'military-retirement'],
  complexity: 'compound',
  isCompound: true,
  requiresMerge: true,
  ceremonyComponents: ['military-ceremony', 'formal-salute'],
  celebrationComponents: ['milestone-birthday-celebration'],
  participants: ['immediate-family', 'military-colleagues'],
  knowledgeDomains: ['birthday-celebration', 'military-ceremony', ...],
  confidence: 0.92,
  missingClarifyingQuestions: [...],
  canonicalDescription: 'Birthday + Retirement (compound event, requires merging)'
}
```

**Current Reveal blind to all of this.**

---

## Gaps Between Current & F4 Requirements

| Gap | Current | F4 Required | Impact |
|-----|---------|------------|--------|
| **Event Understanding** | Shows 3 static stages | Shows "what AI recognized" + why | User doesn't know the system understands compound events |
| **Explainability** | "Putting it together" (no why) | What/Why/Status/Next Decision per card | User doesn't understand recommendations |
| **Confidence Signals** | None | Ready / Needs Clarification / Needs Research / Awaiting Decision | User doesn't know what's ready vs. uncertain |
| **Decision Highlights** | None | Only decisions that unlock/risk/block others | User doesn't know which decisions matter first |
| **Compound Exposure** | Not visible | "We detected ceremony + celebration" | User unaware system understands compound |
| **Intelligence Summary** | "Your plan is ready" | "Here's what we solved for you" | User doesn't see the work completed |
| **Card Standardization** | 3 hardcoded stages (timeline, food, shopping) | Uniform What/Why/Status/Next Decision cards for 8-12 domains | New domains require code changes |
| **Risk Visibility** | None | Highest-impact risks surfaced | User doesn't know about critical risks |
| **Vendor Hints** | None | Key vendor sequence recommendations | User doesn't know vendor dependencies |
| **Persona-Aware** | Generic | Personality aware ("You're planning a compound event; this matters") | Not personal to the host's role |

---

## Existing Engines to Preserve

✅ **Keep as-is:**
- `eventGlyph()` — already perfect identity marker
- `useFoodPriceFactor()` — already integrated
- `playbookFoodPlan()` — already solid
- `effectiveRos()` — already solid
- Modal structure + animations — already excellent
- Haptic/tone feedback — already in place

⚠️ **Refactor (not replace):**
- **Stage generation** — change from hardcoded array to templated cards
- **Data collection** — add intelligence inputs without breaking existing ones
- **Card rendering** — standardize to What/Why/Status/Next Decision template

❌ **Do NOT change:**
- Reveal as state vs. route (already correct)
- Modal positioning/timing
- Button mechanics (available immediately)
- Animation curves/timings

---

## Components Already in Codebase to Wire

From grep + existing code:
- `eventIdentity()` — identity reader (lib/eventIdentity.js)
- `mustHaveBecause()` — reasoning layer (lib/eventIdentity.js)
- `isMeaningfulMustHave()` — must-have validation
- `becauseLayer()` — reasoning on Planning Health
- `decisionConfidence()` — confidence reader
- `confidencePersona()` — persona-aware confidence
- `topPlaybookTask()` — next highest-priority task
- `topPlaybookDecision()` — next highest-priority decision
- `playbookRisks()` — risk layer (may exist, need to verify)
- `getVendorCOIState()` — vendor conflict-of-interest
- `coiNextAction()` — vendor COI as next action

---

## APIs Already Called in Reveal

```javascript
track(EVENTS.ASSEMBLE_VIEWED, { event_id, event_type, stages })
feedbackReveal() // haptic + tone
```

No Supabase/backend calls currently. All reads are synchronous off `event` object.

---

## Host Workflows That Depend on AssembleReveal

1. **New Event Creation** — only entry point
2. **Post-Intake Flow** — must fire before HostHome workspace visible
3. **Onboarding** — implicit critical touchpoint for activation

No other surfaces reference AssembleReveal; it's a one-time transition.

---

## Summary: Ready-to-Enhance Architecture

**Current Reveal is NOT a problem.** It's a solid foundation that:
- ✅ Shows event identity clearly (glyph)
- ✅ Animates beautifully (no fake loader)
- ✅ Never gates the user (button live from start)
- ✅ Surfaces 3 core planning areas (timeline, food, shopping)

**Gaps are pure information, not UX:**
- Need to surface Event Identity Engine understanding
- Need to explain why assemblies were made
- Need to show confidence/readiness signals
- Need to highlight only the decisions that matter
- Need to show the system detected compound events
- Need to make it extensible for more domains

**Zero architectural changes needed.** Only enrich the stages with intelligence inputs.

---

## Next Steps

1. **Map Stage Generation** — Replace hardcoded array with intelligent orchestration
2. **Wire Event Intelligence** — Consume Event Identity + Persona + Complexity
3. **Standardize Card Output** — What/Why/Status/Next Decision template
4. **Derive Decision Highlights** — Surface decisions that unlock/risk/block
5. **Add Confidence Indicators** — Ready / Needs Clarification / Needs Research / Awaiting Decision
6. **Test 7 Golden Scenarios** — Fixtures for same assertions across all event types
7. **Migrate Data Flow** — Event Identity → stages generation (no new components)
