// Pure ESM re-export of the canonical taxonomy resolvers. Forwards from
// eventSolveAdapter so the ONLY path to the CJS eventTaxonomy is the single proven
// CJS chain (eventSolveAdapter -> eventSolve -> eventTaxonomy). This file contains no
// `require` and no `module.exports`, so webpack never flags it ESM-with-CJS-exports.
// (Importing the CJS eventTaxonomy directly from multiple ESM modules tripped the
// production "ES Modules may not assign module.exports" runtime guard.)
export {
  EVENT_TAXONOMY,
  resolveCanonicalType,
  intakeFamilyFor,
  budgetFamilyFor,
  solveFamilyFor,
  budgetShareFamilyFor,
  recordKindFor,
  curatedRosterKeyFor,
  culturalFlagFor,
} from './eventSolveAdapter';
