// ─── WHAT ELSE A DECISION CHANGES ───────────────────────────────────────────
//
// `DECISION_SCHEMA_SPEC.md`:
//
//   `impacts` · decision · ('budget'|'shopping'|'schedule'|'guestComms'
//              |'seating'|'vendors'|'risk')[] · keep those surfaces in sync
//              · BLANK for non-cost. Alcohol hits shopping + liability and
//              comms, not just cost.
//
// Never authored on a single decision. It does not need to be: `blocks` already
// names what a decision holds up, on 250 of 260 decisions, in the authors' own
// words. What was missing is the translation from 137 free-form targets into
// the spec's seven-value enum.
//
// ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────
//
// It does not guess. A target is mapped only where the WORD ITSELF settles it:
// `bar_purchases` is shopping because it is a purchase; `seating` is seating.
// Where a word could plausibly belong to two surfaces, or to none, it stays
// UNMAPPED and `unmappedBlocks()` reports it — the corpus has 74 targets used
// exactly once, and folding those into a near neighbour would be inventing the
// very thing this field is supposed to state.
//
// Coverage is therefore a measured fact, not a target to hit. A mapping that
// reached 100% would be a mapping that had started guessing.
import { normalizeBlocks, BLOCK } from './blockVocabulary';

/** The spec's enum, verbatim. One place, so nothing restates it as strings. */
export const IMPACT = Object.freeze({
  BUDGET:     'budget',
  SHOPPING:   'shopping',
  SCHEDULE:   'schedule',
  GUEST_COMMS: 'guestComms',
  SEATING:    'seating',
  VENDORS:    'vendors',
  RISK:       'risk',
});

export const IMPACT_VALUES = Object.freeze(Object.values(IMPACT));

// block target → the surfaces it keeps in sync.
// Every entry is justified by the target's own word. Multi-valued where the
// word genuinely names more than one surface — the spec's own example is that
// alcohol hits shopping AND comms AND risk, not just cost.
const BLOCK_IMPACTS = {
  // ── things you buy ──────────────────────────────────────────────────────
  [BLOCK.RENTALS]:        [IMPACT.BUDGET, IMPACT.VENDORS],
  [BLOCK.PURCHASING]:     [IMPACT.SHOPPING, IMPACT.BUDGET],
  food:                   [IMPACT.SHOPPING, IMPACT.BUDGET],
  food_purchases:         [IMPACT.SHOPPING, IMPACT.BUDGET],
  menu:                   [IMPACT.SHOPPING, IMPACT.BUDGET],
  [BLOCK.BEVERAGE]:       [IMPACT.SHOPPING, IMPACT.BUDGET],
  beverage_purchases:     [IMPACT.SHOPPING, IMPACT.BUDGET],
  bar_purchases:          [IMPACT.SHOPPING, IMPACT.BUDGET, IMPACT.RISK],   // the spec's own alcohol case
  cake:                   [IMPACT.SHOPPING, IMPACT.BUDGET],
  favors:                 [IMPACT.SHOPPING, IMPACT.BUDGET],
  decor:                  [IMPACT.SHOPPING, IMPACT.BUDGET],
  tableware:              [IMPACT.SHOPPING, IMPACT.BUDGET],
  glassware:              [IMPACT.SHOPPING, IMPACT.BUDGET],
  [BLOCK.SHOPPING]:       [IMPACT.SHOPPING],
  shopping_list:          [IMPACT.SHOPPING],
  fuel:                   [IMPACT.SHOPPING, IMPACT.BUDGET],

  // ── people you hire ─────────────────────────────────────────────────────
  [BLOCK.VENDOR]:         [IMPACT.VENDORS, IMPACT.BUDGET],
  vendor_team:            [IMPACT.VENDORS, IMPACT.BUDGET],
  catering:               [IMPACT.VENDORS, IMPACT.BUDGET],
  catering_style:         [IMPACT.VENDORS, IMPACT.BUDGET],
  photographer:           [IMPACT.VENDORS, IMPACT.BUDGET],
  florals:                [IMPACT.VENDORS, IMPACT.BUDGET],
  av:                     [IMPACT.VENDORS, IMPACT.BUDGET],
  av_production:          [IMPACT.VENDORS, IMPACT.BUDGET],
  [BLOCK.STAFFING]:       [IMPACT.VENDORS, IMPACT.BUDGET],

  // ── money, named outright ───────────────────────────────────────────────
  [BLOCK.BUDGET]:         [IMPACT.BUDGET],
  budget_model:           [IMPACT.BUDGET],
  budget_cap:             [IMPACT.BUDGET],

  // ── time ────────────────────────────────────────────────────────────────
  run_of_show:            [IMPACT.SCHEDULE],
  timeline:               [IMPACT.SCHEDULE],
  agenda:                 [IMPACT.SCHEDULE],
  itinerary:              [IMPACT.SCHEDULE],
  program:                [IMPACT.SCHEDULE],
  setup:                  [IMPACT.SCHEDULE],
  load_in:                [IMPACT.SCHEDULE],
  rehearsals:             [IMPACT.SCHEDULE],
  [BLOCK.LOGISTICS]:      [IMPACT.SCHEDULE],

  // ── what guests are told ────────────────────────────────────────────────
  [BLOCK.INVITATIONS]:    [IMPACT.GUEST_COMMS],
  [BLOCK.GUESTS]:         [IMPACT.GUEST_COMMS],
  guest_count:            [IMPACT.GUEST_COMMS],
  guest_list:             [IMPACT.GUEST_COMMS],
  registration:           [IMPACT.GUEST_COMMS],
  attire:                 [IMPACT.GUEST_COMMS],
  potluck_signup:         [IMPACT.GUEST_COMMS, IMPACT.SHOPPING],

  // ── where people sit ────────────────────────────────────────────────────
  [BLOCK.SEATING]:        [IMPACT.SEATING],
  tables:                 [IMPACT.SEATING],

  // ── things that can go wrong ────────────────────────────────────────────
  risks:                  [IMPACT.RISK],
  safety:                 [IMPACT.RISK],
  accessibility:          [IMPACT.RISK, IMPACT.GUEST_COMMS],
  [BLOCK.PERMIT]:         [IMPACT.RISK],
  license:                [IMPACT.RISK],
  licensing:              [IMPACT.RISK],
  rain_plan:              [IMPACT.RISK],
  safe_rides:             [IMPACT.RISK],
  confidentiality:        [IMPACT.RISK],

  // ── travel and beds ─────────────────────────────────────────────────────
  lodging:                [IMPACT.BUDGET, IMPACT.GUEST_COMMS],
  travel:                 [IMPACT.BUDGET, IMPACT.GUEST_COMMS],
  transport:              [IMPACT.BUDGET, IMPACT.SCHEDULE],
  [BLOCK.RESERVATIONS]:   [IMPACT.SCHEDULE, IMPACT.BUDGET],
  // A venue costs money — that much the word settles on its own. It arguably
  // also drives seating and schedule, and that is exactly the guess this map
  // does not make.
  [BLOCK.VENUE]:          [IMPACT.BUDGET],
};

// EVERY KEY MUST BE A REAL STRING. `[BLOCK.SEATING]` resolved to `undefined`
// while that token did not exist, and JS made a key named "undefined" without a
// murmur — `seating` (7 uses) then read as unmapped while the map looked right.
// Thrown at import so it can never ship, rather than waited for in a test.
for (const k of Object.keys(BLOCK_IMPACTS)) {
  if (!k || k === 'undefined') {
    throw new Error('decisionImpacts: a block key resolved to undefined — a BLOCK token is missing');
  }
}

/** The surfaces one decision keeps in sync. Derived, never authored. */
export function decisionImpacts(decision) {
  const out = [];
  for (const b of normalizeBlocks(decision && decision.blocks)) {
    for (const i of (BLOCK_IMPACTS[b] || [])) if (!out.includes(i)) out.push(i);
  }
  // Stable order — the enum's own, so two decisions with the same impacts
  // always render the same string.
  return IMPACT_VALUES.filter((v) => out.includes(v));
}

/** The block targets on a decision that this map cannot place. */
export function unmappedBlocks(decision) {
  return normalizeBlocks(decision && decision.blocks).filter((b) => !BLOCK_IMPACTS[b]);
}

/** Every target the map knows — for coverage checks that read the real map. */
export const MAPPED_BLOCKS = Object.freeze(Object.keys(BLOCK_IMPACTS));
