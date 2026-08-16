// ─── DEST_LODGING_OPTIONS — a leaf, deliberately ─────────────────────────────
//
// Four strings. They live in their own module because of what importing them
// from `playbooks/index.js` costs.
//
// THE REGRESSION THIS ENDS (found by the review board, 2026-08-16). The guest
// invite path had already been cleaned once — `hostv2/src/inviteShared.js` opens
// by describing it: "a guest downloaded the entire playbook engine to read an
// invitation", fixed by moving four small helpers out of `eventPool`.
//
// It came back through a different door. `InviteV2.jsx` imports `lodgingIntel`,
// `lodgingIntel` imported `DEST_LODGING_OPTIONS` from `./playbooks`, and that
// single named import of a four-element array pulled the whole 1.4MB corpus onto
// the critical path of a guest tapping an invitation — Ethiopian Coffee Ceremony,
// Kwanzaa, Board Meeting and 36 other playbooks no invite will ever render.
//
// The lesson is not "someone was careless". The first fix removed the edge and
// nothing stopped a NEW edge from recreating it, so the guest payload silently
// regressed to worse than before. `guestPayloadGate` in the e2e suite is the
// part that actually holds; this file is just the leaf it protects.
//
// Keep this module free of imports. That is its whole job.
export const DEST_LODGING_OPTIONS = [
  'A room block, no commitment',
  'A room block I guarantee fills',
  'Guests book on their own',
  'A host-arranged Airbnb',
];
