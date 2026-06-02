// Pressure State System — Sprint 34 Implementation Foundation
//
// Maps temporal proximity + vendor dependency load + escalation severity
// into a continuous pressure value (0.0–1.0) with discrete state labels.
// Composes with existing OperationalModeContext and EscalationContext —
// does NOT replace them. This is the engine that drives all other
// behavioral orchestration systems.
//
// States:
//   CALM     (0.0–0.25)  — exploratory cognition, full breathing room
//   BUILDING (0.25–0.60) — gravity forming, peripherals receding
//   ACTIVE   (0.60–0.90) — gravity dominant, instinctive cognition
//   RECOVERY (0.90–1.0)  — post-peak, systems relaxing, monitoring

export const PRESSURE_STATE = {
  CALM:     'calm',
  BUILDING: 'building',
  ACTIVE:   'active',
  RECOVERY: 'recovery',
};

export const PRESSURE_THRESHOLDS = {
  calm:     { min: 0.0, max: 0.25 },
  building: { min: 0.25, max: 0.60 },
  active:   { min: 0.60, max: 0.90 },
  recovery: { min: 0.0, max: 0.30 }, // recovery is a separate mode, not a pressure level
};

// Derive pressure state from a continuous 0–1 value + recovery flag.
export function pressureStateFrom(pressure, isRecovery = false) {
  if (isRecovery) return PRESSURE_STATE.RECOVERY;
  if (pressure >= 0.60) return PRESSURE_STATE.ACTIVE;
  if (pressure >= 0.25) return PRESSURE_STATE.BUILDING;
  return PRESSURE_STATE.CALM;
}

// Map existing operational mode + escalation level into a pressure value.
// This bridges Sprint 34 behavioral systems with the existing context system.
//
//   operationalMode: 'pre-event' | 'live' | 'recovery' | 'post-event'
//   escalationLevel: 'nominal' | 'caution' | 'escalated' | 'emergency'
//   temporalProximity: minutes until next critical transition (0 = now)
//   activeDependencies: number of active vendor dependency chains
export function computePressure({
  operationalMode = 'pre-event',
  escalationLevel = 'nominal',
  temporalProximity = 240,
  activeDependencies = 0,
} = {}) {
  // Base pressure from operational mode
  const modePressure = {
    'pre-event': 0.05,
    'live':      0.30,
    'recovery':  0.10,
    'post-event': 0.0,
  }[operationalMode] || 0.0;

  // Escalation contribution (0–0.4)
  const escalationPressure = {
    'nominal':   0.0,
    'caution':   0.10,
    'escalated': 0.25,
    'emergency': 0.40,
  }[escalationLevel] || 0.0;

  // Temporal proximity contribution (0–0.3)
  // Pressure increases as we approach a critical transition
  const temporalPressure = temporalProximity <= 0 ? 0.30
    : temporalProximity <= 5   ? 0.28
    : temporalProximity <= 15  ? 0.22
    : temporalProximity <= 45  ? 0.15
    : temporalProximity <= 120 ? 0.08
    : 0.0;

  // Dependency chain contribution (0–0.15)
  // More active dependencies = more coordination pressure
  const dependencyPressure = Math.min(0.15, activeDependencies * 0.03);

  // Combine — clamped to 0–1
  return Math.min(1.0, Math.max(0.0,
    modePressure + escalationPressure + temporalPressure + dependencyPressure
  ));
}

// Pressure state resolution: returns state + all computed parameters
// that downstream systems need.
export function resolvePressure(inputs = {}) {
  const isRecovery = inputs.operationalMode === 'recovery';
  const pressure = computePressure(inputs);
  const state = pressureStateFrom(pressure, isRecovery);

  return {
    pressure,           // 0.0–1.0 continuous
    state,              // calm | building | active | recovery
    isRecovery,
    // Derived values for downstream systems
    gravityFactor:      state === 'recovery' ? 0.2 : pressure,
    compressionFactor:  Math.min(1.0, pressure * 1.2),
    recessionFactor:    pressure,
    routingIntensity:   state === 'active' ? 1.0 : state === 'building' ? 0.6 : 0.1,
  };
}
