// ─── ONE SPELLING FOR WHAT A DECISION BLOCKS ────────────────────────────────
//
// `blocks` is the field that says what is waiting on a decision. It is authored
// on 250 of 260 decisions (96%) and is the raw material for the dependency
// graph, the role scorer, and the `blastRadius` the schema spec wants. It has
// never had a controlled vocabulary: 147 distinct targets across 471 uses, 78 of
// them used exactly once.
//
// ── THE DEFECT THAT WAS LIVE, MEASURED 2026-09-24 ───────────────────────────
//
// `vendors` is the corpus's SECOND most-used target — 28 uses. Every consumer
// that looks it up by exact key spells it `vendor`:
//
//   decisionIntelligence.js  BLOCK_ROLE_MAP = { vendor: [...] }
//   experienceContext.js     coordinator.decisionBlocks = [... 'vendor' ...]
//
// They have never matched. Twenty-eight vendor decisions scored zero for role
// relevance for every role, on a lookup that looks correct in both files.
// Across the whole corpus only 91 of 471 block uses (19%) reach a role key.
//
// ── WHY THIS NORMALIZES ON READ RATHER THAN REWRITING THE CORPUS ────────────
//
// Editing 28 authored data files to say `vendor` would fix today and nothing
// else: the next author writes the plural again, because the plural is the
// natural word. Other readers already match loosely (`/beverage/.test(b)`), so
// they are tolerant and only the exact-key consumers are not. One accessor,
// consulted by the readers that need it, is the same shape this codebase
// settled on for venue, budget, market and vendor status.
//
// NOTHING HERE INVENTS A MEANING. The only rule is that two spellings of one
// word are one word. Where a name genuinely has no map entry — `rentals`,
// `menu`, `decor` — it stays exactly as authored and is reported unmapped
// rather than quietly folded into something near it.

// Pairs the corpus actually contains, or that a consumer keys on, where the two
// strings are the same word. Measured, not imagined — every entry below was
// found in `blocks` or in a consumer's key list.
// ─── THE TOKENS ─────────────────────────────────────────────────────────────
//
// The canonical names, ONCE. Before this they were bare string literals in
// three places — BLOCK_ROLE_MAP's keys, every role's `decisionBlocks` array,
// and any test that wanted to check coverage — and the three drifted: the
// corpus said `vendors`, both consumers said `vendor`, and nothing matched for
// as long as either file has existed.
//
// Consumers import these instead of retyping them, so a rename is one edit and
// a typo is a build error rather than a silent zero.
export const BLOCK = Object.freeze({
  FOOD:         'food',
  LOGISTICS:    'logistics',
  VENDOR:       'vendor',
  BUDGET:       'budget',
  COMPLIANCE:   'compliance',
  STAFFING:     'staffing',
  GUESTS:       'guests',
  TIMELINE:     'timeline',
  // Authored in the corpus and not yet keyed on by any consumer. Named here so
  // the next consumer that wants them has one place to reach for, rather than
  // typing a fourth copy.
  RENTALS:      'rentals',
  BEVERAGE:     'beverage',
  PERMIT:       'permit',
  RESERVATIONS: 'reservations',
  PURCHASING:   'purchasing',
  INVITATIONS:  'invitations',
  // Added 2026-09-24 after `[BLOCK.SEATING]` in decisionImpacts.js resolved to
  // `undefined` and JS quietly made a map key literally named "undefined" — so
  // `seating` (7 uses) read as unmapped while the map looked correct. A missing
  // token is exactly what tokens are meant to make loud, and a computed key is
  // the one place JS lets it stay silent. Guarded now in the impacts test.
  SEATING:      'seating',
  VENUE:        'venue',
  SHOPPING:     'shopping',
});

// THE RULE, because without one the direction is a coin flip and I got it
// backwards on the first pass:
//
//   1. If a CONSUMER keys on one spelling, fold to that. The corpus can be
//      re-spelled; a lookup table cannot fold.
//   2. Otherwise fold to the spelling the corpus uses MOST — never to a third
//      string that appears nowhere, which would invent a target.
//
// Counts below are the measured corpus uses, 2026-09-24.
const CANON = {
  // (1) consumers key on these — BLOCK_ROLE_MAP and every role's decisionBlocks
  vendors:      BLOCK.VENDOR,        // corpus 28, consumers say `vendor`, corpus has no singular
  headcount:    BLOCK.GUESTS,        // corpus 2,  consumers say `guests`, corpus has no `guests`
  guestcount:   BLOCK.GUESTS,        // corpus 1
  // (2) no consumer keys on these — fold to the corpus's own majority spelling
  rental:       BLOCK.RENTALS,       // 4  -> 24
  beverages:    BLOCK.BEVERAGE,      // 1  -> 9
  permits:      BLOCK.PERMIT,        // 1  -> 3
  reservation:  BLOCK.RESERVATIONS,  // 1  -> 2
  purchases:    BLOCK.PURCHASING,    // 3  -> 5
  invite:       BLOCK.INVITATIONS,   // 4  -> 5
  // No separators at all, so the separator fold above cannot reach it — it
  // needs naming. Same rule: 3 uses fold into the 11-use spelling.
  runofshow:    'run_of_show',       // 3  -> 11
};

/**
 * The canonical spelling of one `blocks` entry.
 *
 * Case and surrounding space are normalized; a known variant is folded to its
 * canonical form; anything else is returned as authored. It never guesses at a
 * plural it has not been told about — a blind `replace(/s$/, '')` would turn
 * `logistics` into `logistic` and `games` into `game`, inventing two targets
 * that appear nowhere.
 */
export function normalizeBlock(name) {
  const raw = String(name == null ? '' : name).trim().toLowerCase();
  if (!raw) return '';
  // SEPARATORS ARE NOT MEANING. Measured 2026-09-24, after the first pass
  // missed them: `run_of_show`(11) vs `runofshow`(3), `food_purchases`(2) vs
  // `food-purchases`(1), `rain_plan`(1) vs `rain-plan`(1) — three targets, 18
  // uses, split purely by which key an author happened to reach for. Unlike a
  // plural this needs no judgement: there is no reading where a hyphen and an
  // underscore mean different things.
  //
  // Underscore is the corpus's majority style and no consumer key contains a
  // separator at all, so this can collide with nothing.
  const s = raw.replace(/[\s-]+/g, '_');
  return CANON[s] || s;
}

/** Normalize a whole `blocks` array, dropping empties and duplicates. */
export function normalizeBlocks(blocks) {
  const out = [];
  for (const b of (Array.isArray(blocks) ? blocks : [])) {
    const n = normalizeBlock(b);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Every canonical name, derived from the tokens — never a second list. */
export const CANONICAL_BLOCKS = Object.freeze(Object.values(BLOCK));

/**
 * The names consumers actually key on today. Derived from the role map and the
 * role definitions at import time rather than restated, so a test cannot check
 * coverage against a list that has drifted from the code it is checking.
 */
export function keyedBlockNames(roleMapKeys, roleBlockLists) {
  const out = new Set();
  for (const k of (roleMapKeys || [])) { const n = normalizeBlock(k); if (n) out.add(n); }
  for (const list of (roleBlockLists || [])) {
    for (const b of (list || [])) { const n = normalizeBlock(b); if (n) out.add(n); }
  }
  return [...out];
}
