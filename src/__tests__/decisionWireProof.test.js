// ─── DECISION-WIRE PROOF — no decision may be inert ──────────────────────────
// The invariant behind "doesn't continue" (live drive 2026-07-22, W8): a host
// settles a decision and NOTHING downstream moves — because the pick was written
// to a key no engine reads, or a declared effect (costFactors/affects) is dead.
// Three contracts, enumerated over EVERY playbook, so a new playbook (or a
// renamed decision id) cannot silently reintroduce the class:
//
//   1. LEVER VISIBILITY — any decision offering a caterer-ish option must be
//      visible to foodApproach(): picking that option flips usesCaterer.
//   2. UNIVERSAL SOURCING — on a type with NO authored food-approach decision,
//      the shell's generic food answer (foodChoices.sourcing) must still reach
//      the engine. The host's food-source answer is never inert on any type.
//   3. DECLARED EFFECT IS REAL — a decision that declares costFactors or
//      affects[] must actually move the food plan when its options change.
//
// Deterministic: fixture events only, dates computed at run, no DOM.
import {
  ALL_PLAYBOOKS, playbookFoodPlan, playbookTypicalGuests,
  foodApproach, hostUsesCaterer,
  FOOD_APPROACH_DECISIONS, CATERER_OPTION_RE,
} from '../lib/playbooks';

// Component-level source decisions: they pick an INGREDIENT's source, not the
// meal's owner — exempt from lever registration by design. Review before adding.
const COMPONENT_LEVEL = new Set([
  'Ethiopian Coffee Ceremony · injera_source',
  'Crab Feast · where_buy',
]);

const mkEvent = (pb, foodChoices = {}) => {
  const d = new Date(); d.setDate(d.getDate() + 14); d.setHours(12);
  const typical = playbookTypicalGuests(pb.type) || 20;
  return {
    id: 'wire-' + pb.type.toLowerCase().replace(/[^a-z]+/g, '-'),
    type: pb.type, date: d.toISOString().slice(0, 10),
    guestMode: 'count', guestCount: typical, guestEstimate: typical,
    budget: [], vendors: [], guests: [], timeline: [],
    foodChoices,
  };
};

// A stable fingerprint of what the food plan says the host must do/spend —
// the ENTIRE list serialized, so any change (qty, cost, item, skip, note)
// counts as the decision having an effect.
const foodFingerprint = (event) => {
  try {
    const plan = playbookFoodPlan(event);
    if (!plan || !Array.isArray(plan.list)) return 'no-plan';
    return JSON.stringify(plan.list) + '|' + JSON.stringify(plan.summary || null);
  } catch { return 'error'; }
};

const playbooksWithDecisions = ALL_PLAYBOOKS.filter(pb => pb && Array.isArray(pb.decisions) && pb.decisions.length);

// A decision gates food work when it blocks a food-ish domain.
const blocksFood = (dec) => Array.isArray(dec.blocks)
  && dec.blocks.some(b => /food|beverage|menu|protein|fuel/i.test(String(b)));

describe('1 · lever visibility — every registered lever with a caterer-ish path works', () => {
  for (const pb of playbooksWithDecisions) {
    for (const dec of pb.decisions) {
      const registered = FOOD_APPROACH_DECISIONS.includes(dec.id);
      const catOpt = Array.isArray(dec.options) ? dec.options.find(o => CATERER_OPTION_RE.test(String(o))) : null;
      if (!catOpt) continue;
      const key = `${pb.type} · ${dec.id}`;
      if (registered) {
        test(`${key} → "${catOpt}" flips usesCaterer`, () => {
          const ev = mkEvent(pb, { [dec.id]: catOpt });
          const fa = foodApproach(ev);
          expect(fa.decisionId).toBe(dec.id);
          expect(fa.usesCaterer).toBe(true);
        });
      } else if (blocksFood(dec) && !COMPONENT_LEVEL.has(key)) {
        // DISCOVERY — a food-gating decision offers a caterer-ish path but the
        // engine can't see it. Either add its id to FOOD_APPROACH_DECISIONS
        // (whole-meal lever) or add it to COMPONENT_LEVEL above (ingredient pick).
        test(`${key} is unregistered — classify it`, () => {
          throw new Error(`"${key}" offers "${catOpt}" but is not in FOOD_APPROACH_DECISIONS and not marked COMPONENT_LEVEL.`);
        });
      }
    }
  }
});

describe('2 · universal sourcing — the generic food answer is never inert', () => {
  for (const pb of playbooksWithDecisions) {
    // Engine-grounded skip: when the playbook has an authored lever the engine
    // already resolves (even via its default), the authored decision governs
    // and the shell renders IT — the generic trio only exists for lever-less types.
    if (foodApproach(mkEvent(pb)).decisionId) continue;
    test(`${pb.type} · foodChoices.sourcing='caterer' reaches the engine`, () => {
      const ev = mkEvent(pb, { sourcing: 'caterer' });
      expect(hostUsesCaterer(ev)).toBe(true);
    });
  }
});

// RATCHET — declared effects found dead by the first run (2026-07-22), kept
// failing-as-known so NEW dead wires break the suite while these are tracked
// (hunt tracker cc2fdaec). Crab Feast: the crab lines are delegated to
// buildCrabPlan, which reads its own store — the decision's costFactors never
// touch them. Fixing one of these? DELETE its entry or this test flags it stale.
const KNOWN_DEAD_EFFECTS = new Set([
  // (empty — the Kwanzaa `occasion` entry was an artifact of COMMUNITY_OPTION_RE
  // matching bare "potluck": the playbook's potluck DEFAULT stood its own food
  // lines down, so occasion's factors had nothing to price. Regex narrowed
  // 2026-07-22; the ratchet stays for the next genuinely dead wire.)
]);

describe('3 · declared effect is real — costFactors/affects must move the plan', () => {
  for (const pb of playbooksWithDecisions) {
    for (const dec of pb.decisions) {
      if (!dec.costFactors && !Array.isArray(dec.affects)) continue;
      if (!Array.isArray(dec.options) || dec.options.length < 2) continue;
      const key = `${pb.type} · ${dec.id}`;
      test(`${key} options change the food plan`, () => {
        const prints = new Set(dec.options.map(o => foodFingerprint(mkEvent(pb, { [dec.id]: o }))));
        if (KNOWN_DEAD_EFFECTS.has(key)) {
          // Still dead, as recorded. If this line fails, the wire got fixed —
          // remove the KNOWN_DEAD_EFFECTS entry so the ratchet tightens.
          expect(prints.size).toBe(1);
          return;
        }
        // ≥2 distinct fingerprints ⇒ the pick genuinely moves quantities/cost.
        expect(prints.size).toBeGreaterThan(1);
      });
    }
  }
});
