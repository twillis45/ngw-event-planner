// ESM re-export of the engine + canonical taxonomy resolvers. The engine lives in
// eventSolve.mjs (real ESM, node-loadable). React/webpack surfaces import the named
// bindings from here; nothing in the engine uses CJS module.exports, so the prod
// bundle never hits the "ES Modules may not assign module.exports" runtime guard.
export {
  enginePreview,
  familyFor,
  EVENT_TAXONOMY,
  resolveCanonicalType,
  intakeFamilyFor,
  budgetFamilyFor,
  solveFamilyFor,
  budgetShareFamilyFor,
  recordKindFor,
  curatedRosterKeyFor,
  culturalFlagFor,
} from './eventSolve.mjs';
