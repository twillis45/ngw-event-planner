# HIP-1 — Issue Concentration Report
**Date:** 2026-07-03  
**Source:** HIP-1 Validation Report (70 scenarios, 65 issues)  
**Purpose:** Map symptoms to architectural roots. Fix the roots, not the symptoms.

---

## Root Cause Concentration

| Root Cause | Issues Affected | % of Total | Fix Lever |
|-----------|----------------|------------|-----------|
| **Persona Resolution** — system cannot determine who the primary operator is | 19 | 29% | Sprint A: Persona Resolution Engine |
| **Event Composition** — system models only atomic events | 16 | 25% | Sprint B: Event Composition Engine |
| **Domain Knowledge** — correct shell + correct type, but missing operational depth | 14 | 22% | Sprint C: KCR research + playbook expansion |
| **Intake Blindness** — intake doesn't capture signals needed for correct planning | 8 | 12% | Sprint A (intake extension) |
| **Event Pattern** — no playbook or taxonomy entry for a real-world event class | 5 | 8% | Sprint D: Playbook expansion |
| **UX** — correct logic, surfacing or sequencing is wrong | 3 | 5% | Standalone polish |

**Finding**: Fix the top 3 roots and you resolve ~76% of issues without touching individual playbooks.

---

## Root 1: Persona Resolution (19 issues)

### What it is
The system determines the planning shell from `event_type → family → recordKind`. There is no concept of **who is doing the planning**. A professional planner organizing a birthday party and a parent organizing their own kid's birthday party go through the same intake and get the same shell.

### Why it fails at 19 scenarios
The taxonomy maps `host_driven` → `'client'`, but `host_driven` includes the most common personal milestone events: Birthday, Graduation, Retirement Party, Anniversary, Baby Shower, Bridal Shower, Engagement Party, Gender Reveal, Bachelorette Party, Bachelor Party, Reunion, Surprise Proposal. Most people planning these events are personal hosts, not professional planners.

### The correct model
Shell is a function of **operational context**, not event type:

```
operationalContext = {
  plannerType,   // 'personal_host' | 'professional_planner' | 'coordinator' | 'operator'
  eventType,     // from taxonomy
  relationship,  // 'self' | 'family' | 'friend' | 'client'
  scale,         // 'intimate' | 'mid' | 'large' | 'gala'
}

shell = personaResolutionEngine(operationalContext)
```

**Override rules (in priority order)**:
1. If user account role = 'planner' AND event has a client → **Planner shell** (regardless of type)
2. If user account role = 'host' → **Host shell** (regardless of type)
3. If event type is `home_hosted` family → **Host shell**
4. If event type is `host_driven` AND relationship is 'self' or 'family' → **Host shell**
5. If event type is `full_service` or `corporate` → **Planner shell**
6. If event type is `corporate` AND user is an employee (not hired planner) → **Coordinator shell**
7. Default → **Host shell** (safer fallback than planner shell)

### Issues resolved by Sprint A
- Retirement Party → Host shell ✅
- Anniversary → Host shell ✅
- Family Reunion → Host shell ✅
- Holiday Party (personal) → Host shell ✅
- Bridal Shower (hosted by friend) → Host shell ✅
- Engagement Party (hosted by family) → Host shell ✅
- Gender Reveal → Host shell ✅
- Sweet 16 (hosted by parents) → Host shell ✅
- Bachelorette/Bachelor Party (hosted by friend) → Host shell ✅
- Birthday (professional planner) → Planner shell ✅ (override rule #1)
- Professional Holiday Party → Coordinator shell ✅ (override rule #6)
- ...+8 more shell routing issues

### Intake extension required
One question resolves most ambiguity: **"Are you planning this for yourself / your family, or for a client?"**

This replaces the current implicit shell detection with an explicit signal at creation time.

---

## Root 2: Event Composition (16 issues)

### What it is
The system's fundamental data model is:

```
Event {
  type: string  // ONE canonical type
  ...
}
```

There is no `secondaryType`, no `ceremonies[]`, no `overlays[]`. Every real-world compound event (50th Birthday + Retirement, Family Reunion + Crab Feast, Birthday + 4th of July, Military Ceremony + Reception) forces the host to pick one type and lose all intelligence from the other.

### The correct model

```
Event {
  primaryEvent: EventComponent      // required
  secondaryEvents: EventComponent[] // optional array
  ceremonies: CeremonyOverlay[]     // military, religious, civil, cultural
  celebrations: CelebrationOverlay[] // birthday within retirement, toast, etc.
}

EventComponent {
  type: string             // canonical taxonomy type
  honoree?: string         // "who is this for"
  milestone?: string       // "50th", "30-year", "military retirement"
  format?: string          // 'formal' | 'casual' | 'open-house' | 'seated'
}

CeremonyOverlay {
  kind: 'military' | 'religious' | 'civil' | 'cultural'
  subtype?: string  // 'army' | 'navy' | 'catholic' | 'nigerian'
  duration?: number // hours
  precedes: boolean // ceremony before party?
}
```

### What the Event Composition Engine does

```
composeEvent(event) → ComposedPlan {
  leadTimeDays: max(all components' leadTimeDays)
  timeline: mergeTimelines(all components) // deduped, sequenced
  purchases: mergePurchases(all components) // union, deduped by item type
  program: sequenceProgram(all components) // ordered moments, conflict-checked
  vendors: mergeVendors(all components)   // union, deduped by category
  risks: mergeRisks(all components)       // union, severity-sorted
  milestones: mergeMilestones(all components) // chronological, deduped
  conflicts: detectConflicts(all components) // e.g., "birthday cake moment vs crab eating"
}
```

### Issues resolved by Sprint B
- 50th Birthday + Retirement Party: composed plan ✅
- Graduation + Family Reunion: merged multi-day timeline ✅
- Birthday + Crab Feast: sequenced program (cake after crabs) ✅
- Birthday + 4th of July: fireworks-anchored schedule ✅
- Holiday Party + Charity Fundraiser: merged logistics ✅
- Company Picnic + Awards Ceremony: merged program ✅
- Family Reunion + Crab Feast: merged food/logistics ✅
- Wedding + Cultural Ceremony: ceremony overlay ✅
- ...+8 more compound event gaps

### Conflict detection (examples)
The engine should surface explicit conflicts — these are non-obvious planning failures:

| Composition | Conflict | Resolution |
|-------------|---------|-----------|
| Birthday + Crab Feast | Birthday cake moment timing (crabs are messy, guests are eating) | Schedule cake at the END of the first crab wave, before the second |
| Birthday + 4th of July | Birthday candles compete with fireworks as the "wow" moment | Schedule birthday song at 7pm, fireworks at 9:30pm — they don't compete |
| Military Ceremony + Party | Guests in dress uniform can't switch to casual easily | Ceremony + party at same venue; build formal dinner into reception |
| Graduation + Family Reunion | Open-house format vs multi-day reunion format | Graduation day = open house; reunion spans the weekend |
| Retirement + Anniversary | Two "wow" tribute moments may dilute each other | Sequence: anniversary toast (intimate) → career tribute (group) → both honorees together |

---

## Root 3: Domain Knowledge (14 issues)

### What it is
Correct shell, correct event type, but the playbook is missing deep operational knowledge that an experienced event planner would know. These are research candidates, not code gaps.

### The correct fix: KCR research pipeline, not code

Each gap below should flow: **"The AI should know…" → Observation → Evidence → Finding → KCR → playbook update**

| Domain | What's Missing | Research Route |
|--------|---------------|----------------|
| Military retirement | Formal ceremony protocol (retreat, shadow box, "Ruffles and Flourishes"), branch-specific traditions | DOD publications, branch ceremony guides |
| Retirement subtypes | Corporate vs Military vs Police vs Fire vs Teacher vs Medical — each has different operational requirements | HR/protocol sources per subtype |
| 4th of July logistics | Fireworks start times by metro area, parking after fireworks, municipal noise ordinances at 10pm | Municipal data, NPS fireworks database |
| Cultural weddings | Nigerian traditional + white wedding compound; Indian mehendi + sangeet + baraat; Korean hanbok + western | Cultural event planner interviews, community sources |
| Fundraiser mechanics | Silent auction logistics, donation collection, nonprofit tax receipt requirements, goal-reveal moment | IRS, nonprofit event planning guides |
| Festival permits | Community festival permit timelines (often 6-12 months), booth coordination, food truck contracts | Municipal permit office data by city type |
| Multi-day food quantities | Reunion all-day quantities vs party 3h quantities — different consumption rates | Catering industry data |
| Large-scale crab feast | Second propane burner at 50+ guests, staggered cooking, parking for 20+ cars | DMV seafood market expertise |

### Additional research candidates from reasoning failures
The original report listed 8 research candidates. Expanding for reasoning failures:

9. **Milestone birthday patterns** — What makes 40/50/60/70 categorically different from regular birthday planning (lead time, program, alcohol, surprise patterns). → KCR
10. **Adult birthday alcohol baseline** — The default "No alcohol" in birthday.js is wrong for adult parties. What's the real US baseline? → KCR
11. **Open-house vs set-time food quantity difference** — How much more should a host over-provision for drop-in format? → KCR  
12. **Kids party safety protocols** — Allergen communication, supervision ratios, age-appropriate activities. → KCR
13. **Block party permit requirements by US city type** — Urban vs suburban vs rural street closure rules. → KCR
14. **Backyard shade assessment** — At what point does sun exposure become a planning risk (season, time, region)? → KCR
15. **Crab feast timing for birthday cake moment** — Operational sequencing knowledge specific to this compound. → KCR
16. **Anniversary milestone scaling** — How 25th and 50th anniversaries differ operationally from 1st and 10th. → KCR

**Revised research candidate total: 16** (up from 8)

---

## Root 4: Intake Blindness (8 issues)

### What it is
The intake form is minimal: type, date, guests, location, vibe/notes. It captures enough to create an event but not enough to drive correct planning for milestone and compound events.

### Missing intake signals

| Signal | Why it matters | Where used |
|--------|----------------|-----------|
| Honoree age (for birthdays) | Detects milestone (50th), drives adult vs kids planning, changes alcohol, program, surprise defaults | Persona resolution + playbook selection |
| "Are you planning for yourself or a client?" | Resolves shell routing ambiguity | Persona Resolution Engine |
| "Is this also a…?" (secondary event) | Enables Event Composition Engine | Event Composition Engine |
| "Military retirement?" | Triggers formal ceremony overlay | CeremonyOverlay |
| "Surprise or announced?" | Changes invite language, choreography, lead time | Retirement Party, Birthday playbooks |
| "Years of service / milestone milestone" | Scales the tribute program, memory display, speech format | Retirement Party playbook |
| "Indoor or outdoor?" (upfront) | Risk routing, weather, shade, parking → surfaces correct risks | All outdoor events |
| Honoree's favorite drink | Already in retirement playbook decisions — but not in intake; host may not reach it | Retirement Party |

### Fix: Progressive intake extension
Not all questions need to be in the create modal. Some can be deferred to the "Plan" tab as first-run prompts. The intake only needs:

1. **"For yourself/family or a client?"** → resolves shell ← add this
2. **Honoree age** (for birthdays) → activates milestone path ← add this
3. **"This is also a…"** (optional secondary type) → activates composition ← add this
4. Everything else → deferred to Plan tab decisions

---

## Root 5: Missing Event Patterns (5 issues)

These are real event classes with no taxonomy entry and no playbook. Less urgent than roots 1–4 because they're additive, not architectural.

| Missing Pattern | Closest Existing | Gap |
|----------------|-----------------|-----|
| Neighborhood Block Party | "Get-Together" (under-qualified) | Permit logistics, shared cost model, street closure |
| Community Picnic | None | Park reservation, shared cost, outdoor logistics |
| Community Festival | "Conference" (wrong context) | Vendor permits, stage logistics, full-day food |
| Retirement Dinner (intimate, 10–20 guests) | Retirement Party (over-qualified) | Restaurant format, smaller scale, less tribute program |
| Large Birthday Celebration (75–150 guests) | Birthday (max 40 in meta) | Scale warnings, venue logic, catering contracts |

---

## Root 6: UX Surfacing (3 issues)

These are correct logic, wrong placement. Low priority — fix after the architectural roots.

1. Birthday: "Surprise or announced?" decision exists in playbook but not surfaced early enough
2. Outdoor events: shade/sun assessment exists as risk but not surfaced as intake question
3. Crab feast: cold-crab risk is in contingencies but not in the host's day-of "What to watch" view

---

## Sprint Roadmap

### Sprint A — Persona Resolution Engine
**Goal**: One authoritative function determines shell, workflow, and intake for every event.  
**Output**: `resolvePersona(user, event, context) → { shell, workflow, intakeTemplate, voice }`  
**Key work**:
- Override rule hierarchy (6 rules, priority-ordered)
- "For yourself or a client?" intake question
- Route `host_driven` events to host shell by default
- Professional planner override (role-based)
- Remove hardcoded `recordKind: 'client'` from personal milestone playbooks

**Impact**: Resolves 19 issues (~29% of total) in 1 sprint.

---

### Sprint B — Event Composition Engine
**Goal**: Events can have a primary type + secondary events + ceremony overlays.  
**Output**: `composeEvent(event) → ComposedPlan { timeline, purchases, program, vendors, risks, conflicts }`  
**Key work**:
- `Event.secondaryEvents[]` and `Event.ceremonies[]` data model
- `mergeTimelines()` — max lead time, chronological milestone union
- `mergePurchases()` — item-type deduplication, quantity aggregation
- `sequenceProgram()` — program moment ordering + conflict detection
- Intake: "This is also a…" optional secondary type field
- Conflict detection table (20–30 known compound conflicts to start)

**Impact**: Resolves 16 issues (~25% of total). Enables the entire Tier 4 scenario class.

---

### Sprint C — Domain Expansion (KCR Research)
**Goal**: Feed 16 research candidates through the Knowledge Factory.  
**Output**: 16 KCRs reviewed and approved → playbook data updates  
**Priority order**: Military retirement → Milestone birthdays → Retirement subtypes → 4th of July logistics → Fundraiser mechanics

---

### Sprint D — Re-run HIP-1
**Goal**: HIP-1 score moves from 5.8 to 8.5+.  
**Method**: Same 70 scenarios, same evaluation criteria.  
**Pass threshold**: No wrong-shell routing. At least 5 compound event scenarios handled correctly. Domain knowledge gaps reduced by 50%.

---

## The 10+ Standard for Compound Events

Before any compound event scenario is marked "handled," it must pass:

1. Correct shell (host shell for personal events)
2. Correct lead time (max of all components)
3. Merged shopping list (union, no duplicates)
4. Merged program (explicit sequence, no collisions)
5. Conflicts surfaced (at least 1 compound-specific conflict identified)
6. Longer component's milestone timeline applied
7. "What should the host do next?" answered correctly on first view

Until all 7 are true for a given compound scenario, it does not pass.

---

*Issue Concentration Report complete. 65 issues → 6 roots. Top 3 roots cover 76% of issues. Fix those first.*
