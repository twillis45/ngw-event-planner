// Simulation Scenarios — Sprint 36 Live Orchestration Simulation
//
// Three realistic event coordination scenarios that evolve through
// calm → building → active → disruption → recovery → decompression.
//
// Each scenario defines:
//   - event metadata
//   - sequence items (the coordination checklist)
//   - vendors involved
//   - environmental memories from past events
//   - a timeline of phase transitions with disruptions
//
// The simulation engine drives these through the orchestration system
// to validate whether the behavioral environment actually reduces
// cognitive load under pressure — or becomes another demanding interface.

import { MEMORY_TYPE, MEMORY_SEVERITY, createMemory } from './environmentalMemory';

// ─── SCENARIO 1: Wedding Ceremony Transition ────────────────────────────

const WEDDING = {
  id: 'wedding',
  title: 'Hartwell Wedding',
  subtitle: 'Sat · 17:45 · Bluebell Manor',
  eventType: 'Wedding',

  sequence: [
    { id: 'transport',     label: 'Guest Transportation',      vendorId: 'premier',  minutesToDeadline: 45, dependencyDepth: 0, failureCount: 0, isFragile: false },
    { id: 'cocktail-end',  label: 'Cocktail Service End',      vendorId: 'atlas',    minutesToDeadline: 30, dependencyDepth: 1, failureCount: 0, isFragile: false },
    { id: 'floral-set',    label: 'Ceremony Florals',          vendorId: 'bloom',    minutesToDeadline: 25, dependencyDepth: 1, failureCount: 0, isFragile: false },
    { id: 'room-flip',     label: 'Room Flip',                 vendorId: 'grand',    minutesToDeadline: 20, dependencyDepth: 2, failureCount: 0, isFragile: false },
    { id: 'crossfade',     label: 'Lighting Crossfade',        vendorId: 'sparkle',  minutesToDeadline: 18, dependencyDepth: 3, failureCount: 1, isFragile: true  },
    { id: 'guest-flow',    label: 'Guest Seating',             vendorId: 'grand',    minutesToDeadline: 15, dependencyDepth: 4, failureCount: 0, isFragile: false },
    { id: 'dinner-pos',    label: 'Dinner Positions',          vendorId: 'atlas',    minutesToDeadline: 10, dependencyDepth: 5, failureCount: 0, isFragile: false },
    { id: 'dj-cue',        label: 'DJ Ceremony Intro',         vendorId: 'sound',    minutesToDeadline: 5,  dependencyDepth: 6, failureCount: 0, isFragile: false },
  ],

  vendors: [
    { id: 'atlas',   name: 'Atlas Catering',     status: 'nominal',   eventsCompleted: 47,  failureCount: 1, consecutiveClean: 3,  avgResponseMinutes: 8  },
    { id: 'grand',   name: 'Grand Ballroom',     status: 'nominal',   eventsCompleted: 120, failureCount: 2, consecutiveClean: 40, avgResponseMinutes: 5  },
    { id: 'sparkle', name: 'Sparkle Lighting',   status: 'nominal',   eventsCompleted: 35,  failureCount: 1, consecutiveClean: 10, avgResponseMinutes: 12 },
    { id: 'sound',   name: 'SoundWave Audio',    status: 'nominal',   eventsCompleted: 62,  failureCount: 0, consecutiveClean: 62, avgResponseMinutes: 4  },
    { id: 'bloom',   name: 'Bloom Florals',      status: 'confirmed', eventsCompleted: 85,  failureCount: 0, consecutiveClean: 85, avgResponseMinutes: 6  },
    { id: 'premier', name: 'Premier Valet',      status: 'confirmed', eventsCompleted: 40,  failureCount: 0, consecutiveClean: 40, avgResponseMinutes: 10 },
    { id: 'lumina',  name: 'Lumina Photo',       status: 'confirmed', eventsCompleted: 55,  failureCount: 0, consecutiveClean: 55, avgResponseMinutes: 7  },
    { id: 'silk',    name: 'Silk & Linen Co.',   status: 'confirmed', eventsCompleted: 30,  failureCount: 0, consecutiveClean: 30, avgResponseMinutes: 15 },
  ],

  memories: [
    createMemory({ eventName: 'Thompson-Garcia Rehearsal', vendorId: 'atlas',   itemId: 'dinner-pos',  type: MEMORY_TYPE.DELAY,   severity: MEMORY_SEVERITY.MODERATE, description: 'Atlas delayed 12 minutes', daysAgo: 2,  delayMinutes: 12 }),
    createMemory({ eventName: 'Chen Wedding',              vendorId: 'sparkle', itemId: 'crossfade',   type: MEMORY_TYPE.FAILURE,  severity: MEMORY_SEVERITY.MAJOR,    description: 'Lighting crossfade failed', daysAgo: 14 }),
    createMemory({ eventName: 'Rodriguez Gala',            vendorId: 'grand',   itemId: 'guest-flow',  type: MEMORY_TYPE.FAILURE,  severity: MEMORY_SEVERITY.MODERATE, description: 'Guest redirect slow', daysAgo: 30, delayMinutes: 5 }),
  ],

  // Timeline: array of phases. Each phase has a duration (simulation ticks),
  // pressure inputs, and optional disruptions that modify vendors/sequence state.
  timeline: [
    // Phase 0: Calm — pre-event, everything nominal
    {
      name: 'calm',
      durationTicks: 8,
      inputs: { operationalMode: 'pre-event', escalationLevel: 'nominal', temporalProximity: 240, activeDependencies: 0 },
      vendorOverrides: {},
      sequenceOverrides: {},
    },
    // Phase 1: Building — go live, early coordination
    {
      name: 'building',
      durationTicks: 10,
      inputs: { operationalMode: 'live', escalationLevel: 'nominal', temporalProximity: 45, activeDependencies: 2 },
      vendorOverrides: {},
      sequenceOverrides: {},
    },
    // Phase 2: Disruption 1 — transport delay
    {
      name: 'disruption-transport',
      durationTicks: 6,
      inputs: { operationalMode: 'live', escalationLevel: 'caution', temporalProximity: 30, activeDependencies: 3 },
      vendorOverrides: { premier: { status: 'delayed' } },
      sequenceOverrides: { transport: { failureCount: 1, isFragile: true } },
    },
    // Phase 3: Disruption 2 — floral timing slip + lighting instability
    {
      name: 'disruption-cascade',
      durationTicks: 8,
      inputs: { operationalMode: 'live', escalationLevel: 'escalated', temporalProximity: 15, activeDependencies: 5 },
      vendorOverrides: { bloom: { status: 'delayed' }, sparkle: { status: 'caution' } },
      sequenceOverrides: {
        'floral-set': { failureCount: 1, isFragile: true },
        crossfade: { failureCount: 2 },
      },
    },
    // Phase 4: Active — full coordination pressure, guest seating instability
    {
      name: 'active',
      durationTicks: 10,
      inputs: { operationalMode: 'live', escalationLevel: 'escalated', temporalProximity: 5, activeDependencies: 6 },
      vendorOverrides: { bloom: { status: 'nominal' }, sparkle: { status: 'caution' }, premier: { status: 'nominal' } },
      sequenceOverrides: {
        transport: { isCompleted: true },
        'cocktail-end': { isCompleted: true },
        'floral-set': { isActive: true },
        'room-flip': { isActive: true },
        crossfade: { isActive: true },
        'guest-flow': { isActive: true },
      },
    },
    // Phase 5: DJ coordination drift — last disruption before recovery
    {
      name: 'disruption-dj',
      durationTicks: 6,
      inputs: { operationalMode: 'live', escalationLevel: 'caution', temporalProximity: 3, activeDependencies: 4 },
      vendorOverrides: { sound: { status: 'caution' } },
      sequenceOverrides: {
        transport: { isCompleted: true },
        'cocktail-end': { isCompleted: true },
        'floral-set': { isCompleted: true },
        'room-flip': { isCompleted: true },
        crossfade: { isActive: true },
        'guest-flow': { isActive: true },
        'dinner-pos': { isActive: true },
        'dj-cue': { failureCount: 1, isFragile: true },
      },
    },
    // Phase 6: Recovery — ceremony started, systems unwinding
    {
      name: 'recovery',
      durationTicks: 8,
      inputs: { operationalMode: 'recovery', escalationLevel: 'nominal', temporalProximity: 60, activeDependencies: 0 },
      vendorOverrides: { sound: { status: 'nominal' }, sparkle: { status: 'nominal' } },
      sequenceOverrides: {
        transport: { isCompleted: true },
        'cocktail-end': { isCompleted: true },
        'floral-set': { isCompleted: true },
        'room-flip': { isCompleted: true },
        crossfade: { isCompleted: true },
        'guest-flow': { isCompleted: true },
        'dinner-pos': { isCompleted: true },
        'dj-cue': { isCompleted: true },
      },
    },
  ],
};


// ─── SCENARIO 2: Corporate Gala ─────────────────────────────────────────

const GALA = {
  id: 'gala',
  title: 'Meridian Tech Summit Gala',
  subtitle: 'Thu · 19:00 · Skyline Convention Center',
  eventType: 'Corporate',

  sequence: [
    { id: 'av-check',      label: 'AV System Check',           vendorId: 'avpro',    minutesToDeadline: 60, dependencyDepth: 0, failureCount: 0, isFragile: false },
    { id: 'sponsor-walk',  label: 'Sponsor Walkthrough',       vendorId: 'skyline',  minutesToDeadline: 45, dependencyDepth: 0, failureCount: 0, isFragile: false },
    { id: 'catering-stage', label: 'Catering Staging',         vendorId: 'premier-c', minutesToDeadline: 40, dependencyDepth: 1, failureCount: 0, isFragile: false },
    { id: 'keynote-prep',  label: 'Keynote Tech Rehearsal',    vendorId: 'avpro',    minutesToDeadline: 30, dependencyDepth: 2, failureCount: 1, isFragile: true  },
    { id: 'sponsor-seq',   label: 'Sponsor Video Sequence',    vendorId: 'avpro',    minutesToDeadline: 20, dependencyDepth: 3, failureCount: 0, isFragile: false },
    { id: 'service-open',  label: 'Service Open',              vendorId: 'premier-c', minutesToDeadline: 15, dependencyDepth: 4, failureCount: 0, isFragile: false },
    { id: 'keynote-live',  label: 'Keynote Address',           vendorId: 'avpro',    minutesToDeadline: 10, dependencyDepth: 5, failureCount: 0, isFragile: false },
    { id: 'reception-flow', label: 'Reception Transition',     vendorId: 'skyline',  minutesToDeadline: 5,  dependencyDepth: 6, failureCount: 0, isFragile: false },
  ],

  vendors: [
    { id: 'avpro',     name: 'AVPro Systems',       status: 'nominal',   eventsCompleted: 28,  failureCount: 2, consecutiveClean: 5,   avgResponseMinutes: 15 },
    { id: 'skyline',   name: 'Skyline Convention',   status: 'nominal',   eventsCompleted: 200, failureCount: 1, consecutiveClean: 120, avgResponseMinutes: 3  },
    { id: 'premier-c', name: 'Premier Catering',     status: 'nominal',   eventsCompleted: 95,  failureCount: 0, consecutiveClean: 95,  avgResponseMinutes: 6  },
    { id: 'security',  name: 'Shield Security',      status: 'confirmed', eventsCompleted: 150, failureCount: 0, consecutiveClean: 150, avgResponseMinutes: 2  },
    { id: 'decor',     name: 'Luxe Decor',           status: 'confirmed', eventsCompleted: 60,  failureCount: 0, consecutiveClean: 60,  avgResponseMinutes: 8  },
    { id: 'transport', name: 'VIP Transfers',        status: 'confirmed', eventsCompleted: 45,  failureCount: 1, consecutiveClean: 20,  avgResponseMinutes: 12 },
    { id: 'photo',     name: 'Press Photography',    status: 'confirmed', eventsCompleted: 35,  failureCount: 0, consecutiveClean: 35,  avgResponseMinutes: 5  },
  ],

  memories: [
    createMemory({ eventName: 'Fintech Awards',     vendorId: 'avpro',     itemId: 'keynote-prep',  type: MEMORY_TYPE.FAILURE,  severity: MEMORY_SEVERITY.MAJOR,    description: 'AV sync failed during keynote', daysAgo: 7  }),
    createMemory({ eventName: 'Q3 Board Dinner',     vendorId: 'premier-c', itemId: 'service-open',  type: MEMORY_TYPE.DELAY,    severity: MEMORY_SEVERITY.MINOR,    description: 'Service delayed 8 minutes', daysAgo: 21, delayMinutes: 8 }),
    createMemory({ eventName: 'Summit Preview',      vendorId: 'avpro',     itemId: 'sponsor-seq',   type: MEMORY_TYPE.PATTERN,  severity: MEMORY_SEVERITY.MODERATE, description: 'Video sequencing inconsistent', daysAgo: 3 }),
  ],

  timeline: [
    {
      name: 'calm',
      durationTicks: 8,
      inputs: { operationalMode: 'pre-event', escalationLevel: 'nominal', temporalProximity: 240, activeDependencies: 0 },
      vendorOverrides: {},
      sequenceOverrides: {},
    },
    {
      name: 'building',
      durationTicks: 8,
      inputs: { operationalMode: 'live', escalationLevel: 'nominal', temporalProximity: 50, activeDependencies: 2 },
      vendorOverrides: {},
      sequenceOverrides: {},
    },
    // AV concern emerging — caution ramp before escalation
    {
      name: 'disruption-av-building',
      durationTicks: 3,
      inputs: { operationalMode: 'live', escalationLevel: 'caution', temporalProximity: 35, activeDependencies: 2 },
      vendorOverrides: { avpro: { status: 'caution' } },
      sequenceOverrides: {
        'av-check': { isCompleted: true },
        'keynote-prep': { failureCount: 1, isFragile: true },
      },
    },
    // AV sync failure confirmed — escalated
    {
      name: 'disruption-av',
      durationTicks: 8,
      inputs: { operationalMode: 'live', escalationLevel: 'escalated', temporalProximity: 25, activeDependencies: 4 },
      vendorOverrides: { avpro: { status: 'escalated' } },
      sequenceOverrides: {
        'av-check': { isCompleted: true },
        'sponsor-walk': { isCompleted: true },
        'keynote-prep': { failureCount: 2, isActive: true },
      },
    },
    // Keynote timing collapse + sponsor sequence change
    {
      name: 'disruption-keynote',
      durationTicks: 8,
      inputs: { operationalMode: 'live', escalationLevel: 'escalated', temporalProximity: 10, activeDependencies: 5 },
      vendorOverrides: { avpro: { status: 'caution' } },
      sequenceOverrides: {
        'av-check': { isCompleted: true },
        'sponsor-walk': { isCompleted: true },
        'catering-stage': { isCompleted: true },
        'keynote-prep': { isCompleted: true },
        'sponsor-seq': { isActive: true, failureCount: 1 },
        'service-open': { isActive: true },
      },
    },
    // Catering bottleneck — backstage overload
    {
      name: 'active',
      durationTicks: 10,
      inputs: { operationalMode: 'live', escalationLevel: 'caution', temporalProximity: 5, activeDependencies: 4 },
      vendorOverrides: { avpro: { status: 'nominal' }, 'premier-c': { status: 'delayed' } },
      sequenceOverrides: {
        'av-check': { isCompleted: true },
        'sponsor-walk': { isCompleted: true },
        'catering-stage': { isCompleted: true },
        'keynote-prep': { isCompleted: true },
        'sponsor-seq': { isCompleted: true },
        'service-open': { isActive: true, failureCount: 1, isFragile: true },
        'keynote-live': { isActive: true },
      },
    },
    {
      name: 'recovery',
      durationTicks: 8,
      inputs: { operationalMode: 'recovery', escalationLevel: 'nominal', temporalProximity: 60, activeDependencies: 0 },
      vendorOverrides: { 'premier-c': { status: 'nominal' } },
      sequenceOverrides: {
        'av-check': { isCompleted: true },
        'sponsor-walk': { isCompleted: true },
        'catering-stage': { isCompleted: true },
        'keynote-prep': { isCompleted: true },
        'sponsor-seq': { isCompleted: true },
        'service-open': { isCompleted: true },
        'keynote-live': { isCompleted: true },
        'reception-flow': { isCompleted: true },
      },
    },
  ],
};


// ─── SCENARIO 3: Fashion / Editorial Event ──────────────────────────────

const FASHION = {
  id: 'fashion',
  title: 'Noir Editorial Show',
  subtitle: 'Fri · 20:30 · The Foundry',
  eventType: 'Fashion',

  sequence: [
    { id: 'venue-prep',    label: 'Venue Staging',             vendorId: 'foundry',  minutesToDeadline: 40, dependencyDepth: 0, failureCount: 0, isFragile: false },
    { id: 'wardrobe-1',    label: 'Look 1 Wardrobe',           vendorId: 'atelier',  minutesToDeadline: 30, dependencyDepth: 1, failureCount: 0, isFragile: false },
    { id: 'lighting-set',  label: 'Lighting Design Lock',      vendorId: 'lux',      minutesToDeadline: 25, dependencyDepth: 1, failureCount: 1, isFragile: true  },
    { id: 'model-call',    label: 'Model Call & Lineup',       vendorId: 'agency',   minutesToDeadline: 20, dependencyDepth: 2, failureCount: 0, isFragile: false },
    { id: 'run-1',         label: 'Run 1 — Opening',           vendorId: 'agency',   minutesToDeadline: 15, dependencyDepth: 3, failureCount: 0, isFragile: false },
    { id: 'quick-change',  label: 'Quick Change Window',       vendorId: 'atelier',  minutesToDeadline: 10, dependencyDepth: 4, failureCount: 0, isFragile: false },
    { id: 'run-2',         label: 'Run 2 — Editorial',         vendorId: 'agency',   minutesToDeadline: 7,  dependencyDepth: 5, failureCount: 0, isFragile: false },
    { id: 'finale',        label: 'Finale + Designer Walk',    vendorId: 'foundry',  minutesToDeadline: 3,  dependencyDepth: 6, failureCount: 0, isFragile: false },
  ],

  vendors: [
    { id: 'foundry',  name: 'The Foundry',         status: 'nominal',   eventsCompleted: 180, failureCount: 1, consecutiveClean: 90,  avgResponseMinutes: 4  },
    { id: 'atelier',  name: 'Atelier Wardrobe',    status: 'nominal',   eventsCompleted: 22,  failureCount: 2, consecutiveClean: 8,   avgResponseMinutes: 20 },
    { id: 'lux',      name: 'Lux Lighting',        status: 'nominal',   eventsCompleted: 45,  failureCount: 1, consecutiveClean: 15,  avgResponseMinutes: 10 },
    { id: 'agency',   name: 'Noir Models',         status: 'confirmed', eventsCompleted: 30,  failureCount: 0, consecutiveClean: 30,  avgResponseMinutes: 8  },
    { id: 'hair',     name: 'Studio Glam',         status: 'confirmed', eventsCompleted: 70,  failureCount: 0, consecutiveClean: 70,  avgResponseMinutes: 5  },
    { id: 'photo-ed', name: 'Editorial Photo',     status: 'confirmed', eventsCompleted: 40,  failureCount: 0, consecutiveClean: 40,  avgResponseMinutes: 6  },
    { id: 'music',    name: 'Pulse Audio',         status: 'confirmed', eventsCompleted: 55,  failureCount: 0, consecutiveClean: 55,  avgResponseMinutes: 3  },
  ],

  memories: [
    createMemory({ eventName: 'Spring Preview',    vendorId: 'atelier',  itemId: 'quick-change', type: MEMORY_TYPE.DELAY,    severity: MEMORY_SEVERITY.MAJOR,    description: 'Quick change ran 6 min over', daysAgo: 5,  delayMinutes: 6 }),
    createMemory({ eventName: 'Resort Collection', vendorId: 'lux',      itemId: 'lighting-set', type: MEMORY_TYPE.FAILURE,  severity: MEMORY_SEVERITY.MODERATE, description: 'Lighting cue missed on run 2', daysAgo: 12 }),
    createMemory({ eventName: 'FW26 Show',         vendorId: 'agency',   itemId: 'model-call',   type: MEMORY_TYPE.DELAY,    severity: MEMORY_SEVERITY.MINOR,    description: 'Model lineup 4 min late', daysAgo: 45, delayMinutes: 4 }),
  ],

  timeline: [
    {
      name: 'calm',
      durationTicks: 6,
      inputs: { operationalMode: 'pre-event', escalationLevel: 'nominal', temporalProximity: 180, activeDependencies: 0 },
      vendorOverrides: {},
      sequenceOverrides: {},
    },
    {
      name: 'building',
      durationTicks: 8,
      inputs: { operationalMode: 'live', escalationLevel: 'nominal', temporalProximity: 35, activeDependencies: 2 },
      vendorOverrides: {},
      sequenceOverrides: {},
    },
    // Model timing drift + wardrobe instability
    {
      name: 'disruption-wardrobe',
      durationTicks: 6,
      inputs: { operationalMode: 'live', escalationLevel: 'caution', temporalProximity: 20, activeDependencies: 3 },
      vendorOverrides: { atelier: { status: 'delayed' } },
      sequenceOverrides: {
        'venue-prep': { isCompleted: true },
        'wardrobe-1': { isActive: true, failureCount: 1 },
        'model-call': { failureCount: 1 },
      },
    },
    // Lighting concern emerging — caution ramp before escalation
    {
      name: 'disruption-lighting-building',
      durationTicks: 3,
      inputs: { operationalMode: 'live', escalationLevel: 'caution', temporalProximity: 15, activeDependencies: 4 },
      vendorOverrides: { atelier: { status: 'nominal' }, lux: { status: 'caution' } },
      sequenceOverrides: {
        'venue-prep': { isCompleted: true },
        'wardrobe-1': { isCompleted: true },
        'lighting-set': { isActive: true, failureCount: 1, isFragile: true },
        'model-call': { isActive: true },
      },
    },
    // Lighting cue conflict — cascading into run timing
    {
      name: 'disruption-lighting',
      durationTicks: 8,
      inputs: { operationalMode: 'live', escalationLevel: 'escalated', temporalProximity: 12, activeDependencies: 5 },
      vendorOverrides: { atelier: { status: 'nominal' }, lux: { status: 'escalated' } },
      sequenceOverrides: {
        'venue-prep': { isCompleted: true },
        'wardrobe-1': { isCompleted: true },
        'lighting-set': { isActive: true, failureCount: 2 },
        'model-call': { isActive: true },
        'run-1': { isActive: true },
      },
    },
    // Rapid sequencing turnover — runs happening fast
    {
      name: 'active',
      durationTicks: 10,
      inputs: { operationalMode: 'live', escalationLevel: 'caution', temporalProximity: 5, activeDependencies: 4 },
      vendorOverrides: { lux: { status: 'caution' } },
      sequenceOverrides: {
        'venue-prep': { isCompleted: true },
        'wardrobe-1': { isCompleted: true },
        'lighting-set': { isCompleted: true },
        'model-call': { isCompleted: true },
        'run-1': { isCompleted: true },
        'quick-change': { isActive: true, failureCount: 1, isFragile: true },
        'run-2': { isActive: true },
        finale: { isActive: true },
      },
    },
    {
      name: 'recovery',
      durationTicks: 8,
      inputs: { operationalMode: 'recovery', escalationLevel: 'nominal', temporalProximity: 60, activeDependencies: 0 },
      vendorOverrides: { lux: { status: 'nominal' } },
      sequenceOverrides: {
        'venue-prep': { isCompleted: true },
        'wardrobe-1': { isCompleted: true },
        'lighting-set': { isCompleted: true },
        'model-call': { isCompleted: true },
        'run-1': { isCompleted: true },
        'quick-change': { isCompleted: true },
        'run-2': { isCompleted: true },
        finale: { isCompleted: true },
      },
    },
  ],
};

export const SCENARIOS = { wedding: WEDDING, gala: GALA, fashion: FASHION };
export const SCENARIO_LIST = [WEDDING, GALA, FASHION];

// Compute total simulation ticks for a scenario
export function totalTicks(scenario) {
  return scenario.timeline.reduce((sum, phase) => sum + phase.durationTicks, 0);
}

// Get current phase and phase-relative tick from absolute tick
export function getPhaseAt(scenario, tick) {
  let elapsed = 0;
  for (let i = 0; i < scenario.timeline.length; i++) {
    const phase = scenario.timeline[i];
    if (tick < elapsed + phase.durationTicks) {
      return { phase, phaseIndex: i, phaseTick: tick - elapsed, total: totalTicks(scenario) };
    }
    elapsed += phase.durationTicks;
  }
  // Past end — return last phase
  const last = scenario.timeline[scenario.timeline.length - 1];
  return { phase: last, phaseIndex: scenario.timeline.length - 1, phaseTick: last.durationTicks - 1, total: totalTicks(scenario) };
}

// Resolve sequence items at a given tick — applies phase overrides
export function resolveSequenceAt(scenario, tick) {
  const { phase } = getPhaseAt(scenario, tick);
  return scenario.sequence.map(item => ({
    ...item,
    isActive: false,
    isCompleted: false,
    ...(phase.sequenceOverrides[item.id] || {}),
  }));
}

// Resolve vendors at a given tick — applies phase overrides
export function resolveVendorsAt(scenario, tick) {
  const { phase } = getPhaseAt(scenario, tick);
  return scenario.vendors.map(v => ({
    ...v,
    ...(phase.vendorOverrides[v.id] || {}),
  }));
}

// Get pressure inputs at a given tick
export function resolveInputsAt(scenario, tick) {
  const { phase } = getPhaseAt(scenario, tick);
  return { ...phase.inputs };
}

// Get phase name at a given tick
export function resolvePhaseNameAt(scenario, tick) {
  const { phase } = getPhaseAt(scenario, tick);
  return phase.name;
}
