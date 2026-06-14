// Thin ESM wrapper around the canonical taxonomy — mirrors eventSolveAdapter.js.
// The taxonomy data + resolver live in the (node-testable) CJS module so the engine
// (eventSolve.js) and the validate/backtest scripts can `require` it under node.
// React/webpack surfaces import the named bindings from HERE, so they get real ESM
// `export const`s (CRA's production webpack won't synthesize named/default bindings
// from a bare `import` of a CJS `module.exports`, which fails the build).
const taxonomy = require('./eventTaxonomy');

export const EVENT_TAXONOMY = taxonomy.EVENT_TAXONOMY;
export const resolveCanonicalType = taxonomy.resolveCanonicalType;
export const intakeFamilyFor = taxonomy.intakeFamilyFor;
export const budgetFamilyFor = taxonomy.budgetFamilyFor;
export const solveFamilyFor = taxonomy.solveFamilyFor;
export const budgetShareFamilyFor = taxonomy.budgetShareFamilyFor;
export const recordKindFor = taxonomy.recordKindFor;
export const curatedRosterKeyFor = taxonomy.curatedRosterKeyFor;
export const culturalFlagFor = taxonomy.culturalFlagFor;
