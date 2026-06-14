// Thin ESM wrapper so React components can import the engine preview.
// The real-state mapping + solve live in the (node-testable) CJS engine module.
const engine = require('./eventSolve');

export const enginePreview = engine.enginePreview;
export const familyFor = engine.familyFor;
