# F4: Assemble Reveal Enhancement Design

**Status:** Design Phase  
**Scope:** Intelligent stage generation while preserving existing modal/animations/transitions  
**Goal:** First-time host sees "we assembled this for you" with Event Intelligence, not generic planning stages

---

## Design Principle

**Preserve everything that works. Replace only the dumb part.**

The modal, animations, button mechanics, and transition-state behavior are excellent. The problem is the hardcoded 3-stage array. Replace that with intelligent stage generation that consumes Event Identity + existing engines.

---

## Current → Enhanced Flow

### Current (unchanged)
```
Event Creation
  ↓
Intake (3 questions)
  ↓
AssembleReveal (modal shown)
  ↓
User clicks "Take me in →" or waits for "Your plan is ready"
  ↓
HostHome / normal workspace
```

### Enhanced (logic only, not UX flow)
```
Event Creation
  ↓
Intake
  ↓
Resolve Event Identity (Sprint A engines)
  ↓
AssembleReveal (call buildAssembleRevealStages)
  ↓
render stages (still modal, still animated)
  ↓
User interaction unchanged
```

**No new routes. No new modals. No new workflows.**

---

## Card Contract (Unified)

Every stage rendered by AssembleReveal uses this contract:

```javascript
{
  key: string,              // unique identifier (e.g., 'identity', 'timeline', 'risks')
  icon: string,             // icon name (e.g., 'calendar', 'alert', 'sparkles')
  title: string,            // short label (e.g., "Your Event", "What's Next", "Watch Out")
  
  // The four questions every card must answer
  what: string,             // the assembled recommendation/finding
  why: string,              // reasoning from Event Identity / domains / engines
  status: string,           // 'Ready' | 'Needs Clarification' | 'Needs Research' | 'Awaiting Decision'
  nextDecision: string,     // the one decision that unlocks this area (or null)
  
  // Transparency
  sourceEngines: string[],  // e.g., ['Event Identity', 'Timeline Engine']
  confidenceLabel: string,  // human-readable confidence (never % or single scores)
  
  // Optional styling hints (for future iteration, not required for MVP)
  mark?: 'quiet' | 'caution' | 'blocker',  // visual treatment hint
}
```

### Contract Examples

**Event Identity Card**
```javascript
{
  key: 'identity',
  icon: 'sparkles',
  title: 'Your Event',
  what: 'A 50th birthday + military retirement celebration. Two milestones, one day.',
  why: 'You mentioned both birthday and Navy retirement. We see this as a compound event—the ceremony honors your service first, then the celebration.',
  status: 'Ready',
  nextDecision: 'Confirm: ceremony before or after the celebration?',
  sourceEngines: ['Event Identity', 'Compound Detection'],
  confidenceLabel: 'High confidence',
  mark: 'ready'
}
```

**Timeline Card (existing, refactored to contract)**
```javascript
{
  key: 'timeline',
  icon: 'calendar',
  title: 'Building Your Day',
  what: '10 moments, hour by hour. Ceremony slot at 2pm, celebration at 5pm.',
  why: 'Military ceremonies are formal and time-locked; separating them protects both.',
  status: 'Awaiting Decision',
  nextDecision: 'Choose ceremony duration (1hr vs. 90min vs. 2hr).',
  sourceEngines: ['Run-of-Show Engine', 'Playbook'],
  confidenceLabel: 'Ready to fill'
}
```

**Risk Card (new)**
```javascript
{
  key: 'risks',
  icon: 'alert',
  title: 'Watch Out',
  what: 'Weather forecast + outdoor ceremony = contingency needed. Also, Navy dress code + birthday casual guests = dress code clarification.',
  why: 'Military formality and guest confusion are the two places compound events break. We flagged both.',
  status: 'Needs Research',
  nextDecision: 'Check weather 3 days out. Decide: all formal or dress code zones?',
  sourceEngines: ['Risk Engine', 'Ceremony Protocol'],
  confidenceLabel: 'We can help',
  mark: 'caution'
}
```

**Food Card (existing, refactored to contract)**
```javascript
{
  key: 'food',
  icon: 'cloche',
  title: 'Sizing the Food & Drink',
  what: '85 guests. Formal ceremony spread + casual celebration menu.',
  why: 'Guest count is locked. Ceremony formality means appetizers first; celebration means full meal.',
  status: 'Ready',
  nextDecision: 'Pick menu sourcing (caterer, self-catering, or hybrid).',
  sourceEngines: ['Food Plan Engine', 'Playbook'],
  confidenceLabel: 'Ready to fill'
}
```

---

## Stage Generation Function

```javascript
function buildAssembleRevealStages(
  event,
  playbook,
  eventIdentity,
  persona,
  context = {}
) {
  // Returns array of stage objects matching the card contract above.
  // Order matters: identity first, then blockers, then others.
  
  const stages = [];
  
  // === TIER 1: Event Understanding ===
  // Always first. The host needs to see the system understands the event.
  
  if (eventIdentity) {
    stages.push(buildIdentityStage(event, eventIdentity, persona));
  }
  
  // === TIER 2: Decision Blockers ===
  // Only decisions that unlock downstream work or remove critical risk.
  // Derived, not scored.
  
  const blockers = deriveDecisionBlockers(event, eventIdentity, playbook);
  blockers.forEach(b => {
    stages.push(buildBlockerStage(b, event, eventIdentity));
  });
  
  // === TIER 3: Planning Domains ===
  // The actual assembled work. Timeline, food, shopping, guests, etc.
  // Only domains that have assembled content (not empty).
  
  const domains = assemblePlanningDomains(event, playbook, eventIdentity, persona);
  domains.forEach(d => {
    stages.push(buildDomainStage(d, event, playbook));
  });
  
  // === TIER 4: High-Impact Risks ===
  // Only the 1–3 risks that matter most. Not a laundry list.
  
  const topRisks = deriveTopRisks(event, eventIdentity, playbook);
  if (topRisks.length > 0) {
    stages.push(buildRiskStage(topRisks, event, eventIdentity));
  }
  
  return stages.filter(Boolean);
}
```

---

## Tier 1: Identity Stage

**When:** Always first  
**What:** The host sees exactly what the system recognized  
**Why:** Trust-building. The host needs to know the planner understands the event before trusting other recommendations

```javascript
function buildIdentityStage(event, eventIdentity, persona) {
  const {
    primaryEventType,
    secondaryEventTypes,
    isCompound,
    complexity,
    celebrationType,
    ceremonyComponents,
    participants,
    confidence
  } = eventIdentity;
  
  // Translate to natural language
  const eventDesc = isCompound
    ? `A ${primaryEventType.toLowerCase()} + ${secondaryEventTypes.join(' + ').toLowerCase()}.`
    : `A ${primaryEventType.toLowerCase()}.`;
  
  const compoundExplanation = isCompound
    ? ` Two milestones, one event. We'll handle both.`
    : '';
  
  const ceremonyNote = ceremonyComponents.length > 0 && isCompound
    ? ` Formal ceremony first, then celebration.`
    : '';
  
  const participantNote = participants.length > 1
    ? ` Guests span ${participants.join(' and ')}.`
    : '';
  
  return {
    key: 'identity',
    icon: 'sparkles',  // or personalized icon from eventGlyph
    title: 'Your Event',
    what: eventDesc + compoundExplanation,
    why: `We heard: "${event.freeText || 'your description'}". We recognized: ${primaryEventType}.${ceremonyNote}${participantNote}`,
    status: 'Ready',
    nextDecision: isCompound
      ? `Confirm: ceremony timing (before, during, or after celebration)?`
      : null,
    sourceEngines: ['Event Identity Engine', 'Compound Detection'],
    confidenceLabel: confidence >= 0.85 ? 'High confidence' : 'We think so',
    mark: 'ready'
  };
}
```

---

## Tier 2: Decision Blockers

**When:** Second, before other planning domains  
**What:** Only decisions that unlock other work or remove critical risk  
**How:** Derived from event complexity + missing critical inputs

```javascript
function deriveDecisionBlockers(event, eventIdentity, playbook) {
  // Decision blockers satisfy one or more:
  // 1. Unlock another planning area (e.g., venue → vendor scheduling)
  // 2. Remove significant risk (e.g., guest count → budget accuracy)
  // 3. Affect multiple downstream systems (e.g., ceremony timing)
  // 4. Required before continuing (e.g., event date)
  
  const blockers = [];
  
  // RULE: Compound events always surface timing decision
  if (eventIdentity.isCompound && !event.ceremonyTiming) {
    blockers.push({
      type: 'ceremony-timing',
      urgency: 'critical',
      reasoning: 'Ceremony timing affects vendors, timeline, guest experience'
    });
  }
  
  // RULE: No venue = everything blocks
  if (!event.venue || !event.venue.trim()) {
    blockers.push({
      type: 'venue-selection',
      urgency: 'critical',
      reasoning: 'Venue unlocks vendors, timeline, logistics'
    });
  }
  
  // RULE: No confirmed guest count = budget is meaningless
  if (!event.guestCount || event.guestCount === 0) {
    blockers.push({
      type: 'guest-count-confirmation',
      urgency: 'high',
      reasoning: 'Guest count scales budget, menu, logistics'
    });
  }
  
  // RULE: Event date in past = no blocking decisions
  const daysUntil = (() => {
    try {
      const d = new Date(event.date + 'T00:00:00');
      const now = new Date();
      return Math.floor((d - now) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  })();
  
  if (daysUntil !== null && daysUntil < 0) {
    return []; // post-event, no blockers to surface
  }
  
  // RULE: Formal ceremony without dress code = clarification needed
  if (eventIdentity.ceremonyComponents && eventIdentity.ceremonyComponents.includes('formal-salute')) {
    if (!event.dressCode || !event.dressCode.trim()) {
      blockers.push({
        type: 'dress-code-confirmation',
        urgency: 'medium',
        reasoning: 'Military formality + guest expectations = miscommunication risk'
      });
    }
  }
  
  return blockers;
}

function buildBlockerStage(blocker, event, eventIdentity) {
  const blockerCopy = {
    'ceremony-timing': {
      title: 'Ceremony Timing',
      what: 'When does the ceremony happen? Before, during, or after the celebration?',
      why: 'This decision cascades: it affects your timeline, guest experience, vendor sequence, and risk profile.',
      nextDecision: 'Choose the timing.'
    },
    'venue-selection': {
      title: 'Venue',
      what: 'Where is the event?',
      why: 'Everything depends on venue: vendors, timeline, logistics, weather contingency.',
      nextDecision: 'Choose or confirm the venue.'
    },
    'guest-count-confirmation': {
      title: 'Guest Count',
      what: 'How many guests?',
      why: 'Every other number (budget, food, seating) depends on this.',
      nextDecision: 'Confirm the headcount.'
    },
    'dress-code-confirmation': {
      title: 'Dress Code',
      what: 'What should guests wear?',
      why: 'Formal ceremony + casual celebration = guests will be confused. Clarity here prevents day-of friction.',
      nextDecision: 'Decide: all formal, all casual, or different zones?'
    }
  };
  
  const copy = blockerCopy[blocker.type] || {
    title: 'Decision Needed',
    what: blocker.type,
    why: blocker.reasoning,
    nextDecision: 'Make this choice.'
  };
  
  return {
    key: `blocker-${blocker.type}`,
    icon: 'alert',  // or context-specific icon
    title: copy.title,
    what: copy.what,
    why: copy.why,
    status: 'Awaiting Decision',
    nextDecision: copy.nextDecision,
    sourceEngines: ['Decision Derivation', 'Event Identity'],
    confidenceLabel: 'Required',
    mark: blocker.urgency === 'critical' ? 'blocker' : 'caution'
  };
}
```

---

## Tier 3: Planning Domains

**When:** After blockers, before risks  
**What:** The assembled work from existing engines (timeline, food, shopping, guests, budget, vendors, etc.)  
**How:** Call existing engines, refactor their outputs to the card contract

```javascript
function assemblePlanningDomains(event, playbook, eventIdentity, persona) {
  const domains = [];
  
  // === TIMELINE ===
  try {
    const ros = effectiveRos(event) || [];
    if (ros.length > 0) {
      domains.push({
        type: 'timeline',
        data: { cueCount: ros.length, ros }
      });
    }
  } catch {}
  
  // === FOOD ===
  try {
    const foodPP = useFoodPriceFactor(event, null); // context.profile
    const fp = playbookFoodPlan(event, foodPP);
    if (fp && fp.itemCount > 0) {
      domains.push({
        type: 'food',
        data: { fp, guestEstimate: fp.guests }
      });
    }
  } catch {}
  
  // === SHOPPING ===
  try {
    const foodPP = useFoodPriceFactor(event, null);
    const fp = playbookFoodPlan(event, foodPP);
    if (fp && fp.list && fp.list.length > 0) {
      domains.push({
        type: 'shopping',
        data: { fp, itemCount: fp.itemCount }
      });
    }
  } catch {}
  
  // === GUESTS (if meaningful) ===
  try {
    const guestCount = event.guestCount || event.guests?.length || 0;
    if (guestCount > 0) {
      domains.push({
        type: 'guests',
        data: { guestCount, rsvpCount: event.guests?.filter(g => g.rsvp === 'Yes').length || 0 }
      });
    }
  } catch {}
  
  // === BUDGET (if set) ===
  try {
    const budgetSet = (event.budget || []).reduce((s, r) => s + (Number(r.budgeted) || 0), 0) > 0;
    if (budgetSet || Number(event.totalBudget) > 0) {
      domains.push({
        type: 'budget',
        data: { totalBudget: event.totalBudget, categories: event.budget || [] }
      });
    }
  } catch {}
  
  // === VENDORS (if any named) ===
  try {
    const namedVendors = (event.vendors || []).filter(v => v && v.name && v.name.trim());
    if (namedVendors.length > 0) {
      domains.push({
        type: 'vendors',
        data: { vendorCount: namedVendors.length, vendors: namedVendors }
      });
    }
  } catch {}
  
  return domains;
}

function buildDomainStage(domain, event, playbook) {
  const stageMeta = {
    timeline: {
      icon: 'calendar',
      title: 'Building Your Day',
      buildWhat: (data) => `${data.cueCount} moments, hour by hour.`,
      buildWhy: (data) => 'Your timeline is ready to fill—every moment can be adjusted as plans crystallize.',
      status: 'Ready to fill'
    },
    food: {
      icon: 'cloche',
      title: 'Sizing the Food & Drink',
      buildWhat: (data) => `${data.fp.itemCount} item${data.fp.itemCount === 1 ? '' : 's'} for ${data.guestEstimate} guests.`,
      buildWhy: (data) => 'Menu is built. Quantities scale with headcount. Choose sourcing next.',
      status: 'Ready to fill'
    },
    shopping: {
      icon: 'store',
      title: 'Writing Your Shopping List',
      buildWhat: (data) => `${data.itemCount} item${data.itemCount === 1 ? '' : 's'}, ready to check off.`,
      buildWhy: (data) => 'Every ingredient mapped to a store and price. Check items off as you shop.',
      status: 'Ready'
    },
    guests: {
      icon: 'people',
      title: 'Guest Planning',
      buildWhat: (data) => `${data.guestCount} guest${data.guestCount === 1 ? '' : 's'}${data.rsvpCount > 0 ? `, ${data.rsvpCount} confirmed` : ''}.`,
      buildWhy: (data) => 'Guest list built. RSVP tracking live.',
      status: 'In progress'
    },
    budget: {
      icon: 'wallet',
      title: 'Budget',
      buildWhat: (data) => `$${(Number(data.totalBudget) || 0).toLocaleString()} allocated across ${data.categories.length} categories.`,
      buildWhy: (data) => 'Budget is set and live. Track spending in real time.',
      status: 'Ready'
    },
    vendors: {
      icon: 'briefcase',
      title: 'Vendors',
      buildWhat: (data) => `${data.vendorCount} vendor${data.vendorCount === 1 ? '' : 's'} assigned.`,
      buildWhy: (data) => 'Vendor list built. Confirm each one, then track deliverables.',
      status: 'Ready to confirm'
    }
  };
  
  const meta = stageMeta[domain.type];
  if (!meta) return null;
  
  return {
    key: domain.type,
    icon: meta.icon,
    title: meta.title,
    what: meta.buildWhat(domain.data),
    why: meta.buildWhy(domain.data),
    status: meta.status,
    nextDecision: null, // domains don't have one blocker; users explore at their pace
    sourceEngines: ['Playbook Engine'],
    confidenceLabel: 'Assembled',
    mark: 'ready'
  };
}
```

---

## Tier 4: Risk Preview

**When:** Last, after domains  
**What:** Only the 1–3 risks that matter most  
**Why:** Not every risk, only those the host needs to think about now

```javascript
function deriveTopRisks(event, eventIdentity, playbook) {
  // Return only the ~3 highest-impact risks from existing risk engine.
  // A "high-impact risk" is one that:
  // 1. Is likely to happen
  // 2. Has significant consequences if it does
  // 3. Can be mitigated by a decision the host can make now
  
  const risks = [];
  
  // RULE: Compound events often have ceremony/celebration confusion
  if (eventIdentity.isCompound) {
    risks.push({
      type: 'compound-confusion',
      severity: 'medium',
      description: 'Guest expectations for ceremony vs. celebration formality will diverge if not clarified early.',
      mitigation: 'Clarity on dress code + timing cascades to reduce all downstream friction.'
    });
  }
  
  // RULE: Outdoor + ceremony = weather
  if (eventIdentity.ceremonyComponents && eventIdentity.ceremonyComponents.includes('formal-salute')) {
    const daysUntil = (() => {
      try {
        const d = new Date(event.date + 'T00:00:00');
        const now = new Date();
        return Math.floor((d - now) / (1000 * 60 * 60 * 24));
      } catch {
        return null;
      }
    })();
    
    if (daysUntil !== null && daysUntil > 0 && daysUntil <= 30 && !event.indoorVenue) {
      risks.push({
        type: 'weather-ceremony',
        severity: 'medium',
        description: 'Outdoor ceremony + formal dress code = weather is not a small risk.',
        mitigation: 'Plan contingency now: indoor backup, tent rental, etc.'
      });
    }
  }
  
  // RULE: Large guest count + limited timeline
  const guestCount = event.guestCount || event.guests?.length || 0;
  const daysUntil = (() => {
    try {
      const d = new Date(event.date + 'T00:00:00');
      const now = new Date();
      return Math.floor((d - now) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  })();
  
  if (guestCount > 100 && daysUntil !== null && daysUntil < 30) {
    risks.push({
      type: 'compression',
      severity: 'high',
      description: `${guestCount} guests in ${daysUntil} days is tight. Vendors book fast.`,
      mitigation: 'Confirm top vendors (venue, catering, photography) this week.'
    });
  }
  
  // Return top 1–3 by severity
  return risks.sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0)).slice(0, 3);
}

function buildRiskStage(topRisks, event, eventIdentity) {
  const riskExplanations = topRisks.map(r => r.description).join(' And: ');
  const mitigations = topRisks.map(r => r.mitigation).join(' Also: ');
  
  return {
    key: 'risks',
    icon: 'alert',
    title: 'Watch Out',
    what: riskExplanations,
    why: 'These aren\'t fears—they\'re patterns we see in events like yours.',
    status: 'Needs Research',
    nextDecision: mitigations,
    sourceEngines: ['Risk Engine', 'Event Identity'],
    confidenceLabel: 'We can help',
    mark: 'caution'
  };
}
```

---

## Language Guidelines

### ✅ DO Use
- "We recognized..." (shows system understanding)
- "You mentioned..." (acknowledges user input)
- "We see this as a compound event" (transparent reasoning)
- "This decision cascades..." (explains why it matters)
- "Clarity here prevents day-of friction" (practical, not jargon)
- "Two milestones, one day" (simple, concrete)

### ❌ DO NOT Use
- "Knowledge Factory" / "KCR" / "Blueprint" / "workers" / "provider engine"
- "AI" (say "we" instead)
- "Engine" or "orchestrator" (say "we assembled")
- Admin internals
- Percentage scores ("92% confidence")
- Single-number confidence (use "High", "Medium", "We think so")
- Platform jargon

### Example
❌ **Bad:** "The Event Identity Engine detected a compound event via the Compound Detection worker with 92% confidence."

✅ **Good:** "You mentioned both birthday and retirement. We see this as two milestones, one day. The ceremony honors your service first."

---

## Test Strategy

### Unit Tests
```javascript
describe('buildAssembleRevealStages', () => {
  // Test each tier independently
  
  test('identity stage always renders first', () => {
    const stages = buildAssembleRevealStages(event50, pb, id50, persona);
    expect(stages[0].key).toBe('identity');
  });
  
  test('compound events show ceremony-timing blocker', () => {
    const stages = buildAssembleRevealStages(eventCompound, pb, idCompound, persona);
    expect(stages).toContainEqual(expect.objectContaining({ key: 'blocker-ceremony-timing' }));
  });
  
  test('no timeline stage if ros empty', () => {
    const stages = buildAssembleRevealStages(eventNoTimeline, pb, id, persona);
    expect(stages.find(s => s.key === 'timeline')).toBeUndefined();
  });
  
  test('risk stage only appears if risks exist', () => {
    const stages = buildAssembleRevealStages(eventSimple, pb, idSimple, persona);
    expect(stages.find(s => s.key === 'risks')).toBeUndefined();
  });
});
```

### Golden Path Tests (7 scenarios)
```javascript
describe('F4 golden paths', () => {
  const fixtures = {
    '50th Birthday + Military Retirement': { event: ev50mil, identity: id50mil, expected: ['identity', 'blocker-ceremony-timing', 'timeline', 'food', 'shopping', 'risks'] },
    'Birthday': { event: evBday, identity: idBday, expected: ['identity', 'timeline', 'food', 'shopping'] },
    'Retirement': { event: evRet, identity: idRet, expected: ['identity', 'timeline', 'food'] },
    'Crab Feast': { event: evCrab, identity: idCrab, expected: ['identity', 'timeline', 'food', 'shopping'] },
    'Family Reunion': { event: evRe, identity: idRe, expected: ['identity', 'timeline', 'guests', 'food'] },
    'Graduation': { event: evGrad, identity: idGrad, expected: ['identity', 'timeline', 'food', 'budget'] },
    'Anniversary': { event: evAnniv, identity: idAnniv, expected: ['identity', 'timeline', 'food', 'vendors'] }
  };
  
  Object.entries(fixtures).forEach(([name, { event, identity, expected }]) => {
    test(`${name} renders expected stages`, () => {
      const stages = buildAssembleRevealStages(event, getPlaybook(event.type), identity, resolvePersona(identity, {}, 'self', {}));
      const keys = stages.map(s => s.key);
      expected.forEach(key => {
        expect(keys).toContain(key);
      });
    });
    
    test(`${name} card contract valid for all stages`, () => {
      const stages = buildAssembleRevealStages(event, getPlaybook(event.type), identity, resolvePersona(identity, {}, 'self', {}));
      stages.forEach(stage => {
        expect(stage).toEqual(expect.objectContaining({
          key: expect.any(String),
          icon: expect.any(String),
          title: expect.any(String),
          what: expect.any(String),
          why: expect.any(String),
          status: expect.any(String),
          sourceEngines: expect.any(Array),
          confidenceLabel: expect.any(String)
        }));
      });
    });
  });
});
```

### Integration Test: Modal Still Works
```javascript
test('AssembleReveal renders stages and modal behavior unchanged', () => {
  const { getByText, getByRole } = render(
    <AssembleReveal
      ev={event50}
      profile={profile}
      onDone={onDone}
    />
  );
  
  // Modal is visible
  expect(getByRole('dialog')).toBeInTheDocument();
  
  // Stages render
  expect(getByText(/Your Event/i)).toBeInTheDocument();
  expect(getByText(/Building Your Day/i)).toBeInTheDocument();
  
  // Button is live from start
  expect(getByRole('button', { name: /Take me in/i })).toBeEnabled();
  
  // Animations fire (verify via spy on setTimeout if needed)
  // ...
  
  // User can click through
  fireEvent.click(getByRole('button', { name: /Take me in/i }));
  expect(onDone).toHaveBeenCalled();
});
```

### Build Test
```bash
npm run build && echo "Build clean, no errors"
```

---

## Implementation Checklist (After Design Approval)

- [ ] Create `buildAssembleRevealStages()` function in new file `/lib/assembleRevealEngines.js`
- [ ] Create tier-specific builders: `buildIdentityStage()`, `deriveDecisionBlockers()`, `buildBlockerStage()`, `assemblePlanningDomains()`, `buildDomainStage()`, `deriveTopRisks()`, `buildRiskStage()`
- [ ] Update `AssembleReveal` component: replace hardcoded `stages` array with call to `buildAssembleRevealStages()`
- [ ] Wire inputs: `eventIdentity`, `persona`, `playbook`
- [ ] Verify existing imports still work: `playbookFoodPlan`, `effectiveRos`, `useFoodPriceFactor`
- [ ] Create test fixtures (7 golden scenarios)
- [ ] Write unit + golden path + integration tests
- [ ] Verify modal/animation/button behavior unchanged
- [ ] Verify no duplicate reveal flows
- [ ] Prod build clean

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| New function fails silently | All builders wrapped in try/catch; fallback to basic card contract |
| Event Identity not available at reveal time | Happens after intake, after Sprint A identity engine runs; graceful fallback if absent |
| Existing stages render badly | Tier 3 (domains) logic mirrors current rendering; same data sources |
| Card contract breaks existing CSS | CSS unchanged; only data structure changed, not markup |
| Tests break due to fixtures missing | Create minimal event fixtures that match real schema |

---

## Summary

This design:
1. ✅ Preserves existing modal, animations, button mechanics, transition behavior
2. ✅ Replaces only the stage generation (the dumb part)
3. ✅ Adds Event Intelligence inputs without duplicating reveal flows
4. ✅ Standardizes card rendering to uniform contract
5. ✅ Surfaces only meaningful decisions/risks (not laundry lists)
6. ✅ Uses natural language (no Knowledge Factory, KCR, admin jargon)
7. ✅ Tests existing behavior + new intelligence + golden paths
8. ✅ Maintains zero breaking changes
9. ✅ Prod build passes

**Ready to implement after approval.**
