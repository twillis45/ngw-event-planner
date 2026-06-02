// Orchestration Engine — Sprint 34 Implementation Foundation
//
// Public API for the behavioral orchestration system.
// Six subsystems that compose together to create an environment
// that adapts to coordination pressure in real time.
//
// Usage:
//   import { resolvePressure, resolveSequenceHierarchy, ... } from './orchestration';
//
// These systems compose with existing contexts (EscalationContext,
// DensityContext, OperationalModeContext) — they don't replace them.
// The orchestration engine provides the behavioral intelligence;
// the contexts provide the React state management.

// ─── Pressure State System ───────────────────────────────────────────────
// The engine that drives all other systems. Maps temporal proximity,
// vendor dependencies, and escalation severity into continuous pressure.
export {
  PRESSURE_STATE,
  PRESSURE_THRESHOLDS,
  pressureStateFrom,
  computePressure,
  resolvePressure,
} from './pressureState';

// ─── Adaptive Hierarchy Engine ───────────────────────────────────────────
// Items earn visual weight through operational consequence.
// Hierarchy is metabolized, not designed.
export {
  computeWeight,
  resolveHierarchy,
  resolveSequenceHierarchy,
} from './adaptiveHierarchy';

// ─── Trust Compression System ────────────────────────────────────────────
// Trusted vendors compress. Compression is earned, not configured.
export {
  COMPRESSION_LEVEL,
  computeTrust,
  resolveCompression,
  resolveVendorCompression,
} from './trustCompression';

// ─── Environmental Memory Architecture ───────────────────────────────────
// Past failures reshape the current environment.
// The system remembers so the coordinator doesn't have to.
export {
  MEMORY_TYPE,
  MEMORY_SEVERITY,
  createMemory,
  memoryDecay,
  memoryConsequence,
  aggregateMemories,
} from './environmentalMemory';

// ─── Cognitive Tunneling (Peripheral Recession) ──────────────────────────
// Under pressure, peripheral elements fade.
// Attention narrows to what matters NOW.
export {
  VISIBILITY_ZONE,
  recessionOpacity,
  classifyZone,
  resolveTunneling,
  resolveSequenceTunneling,
} from './cognitiveTunneling';

// ─── Continuity Field Logic ──────────────────────────────────────────────
// Nearby systems influence each other.
// Pressure doesn't respect container boundaries.
export {
  FIELD_TYPE,
  createFieldConnection,
  computeContamination,
  contaminationTreatment,
  resolveFieldEffects,
  buildDependencyChain,
  buildVendorFields,
} from './continuityField';
