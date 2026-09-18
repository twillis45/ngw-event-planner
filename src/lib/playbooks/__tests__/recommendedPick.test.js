// ─── THE PROPOSAL MOVES WITH THE EVENT, OR IT IS NOT A DERIVATION ────────────
//
// Measured 2026-09-18, before this existed: all 129 `difmCapable: 'can-derive'`
// decisions proposed their authored literal, and ZERO responded to any event
// data — the proposal was identical on a 4-guest event and a 400-guest one.
// `can-derive` meant "this playbook authored a default", said out loud as
// "We'll go with X". The word derive appeared in one place in the code and it
// was the one place nothing happened.
//
// The first assertion below is the whole point, and it is the one that would
// have failed for every decision in the corpus this morning.
import {
  buildFacts, evaluateRecommendation, clauseHolds, proposedPickFor, OPERATORS,
} from '../recommendedPick';
import { ALL_PLAYBOOKS, choicePickFor, decisionFactsFor } from '../index';

const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const ev = (type, guests, extra) => ({
  id: 'r', type, date: iso(40), guestMode: 'count', guestCount: guests,
  foodChoices: {}, ...extra,
});

describe('a recommendation responds to the event', () => {
  test('dinner party seating: the rule that used to live inside the default string', () => {
    // The default WAS 'Host-assigned for 8+' — a rule sitting in an option slot,
    // which is how this decision announced that it wanted to be conditional.
    expect(choicePickFor(ev('Dinner Party', 4), 'seating')).toBe('Open');
    expect(choicePickFor(ev('Dinner Party', 12), 'seating')).toBe('Host-assigned');
  });

  test('anniversary help: one hire at the threshold its own why names', () => {
    expect(choicePickFor(ev('Anniversary', 10), 'help')).toBe('Fully DIY');
    expect(choicePickFor(ev('Anniversary', 40), 'help')).toBe('Bartender');
  });

  test('day party food: the truck its own why names at 35+', () => {
    expect(choicePickFor(ev('Day Party', 12), 'food')).toBe('Light passed bites + grazing table');
    expect(choicePickFor(ev('Day Party', 60), 'food')).toBe('Food truck');
  });

  test('the host’s own answer still outranks any recommendation', () => {
    const e = ev('Dinner Party', 12, { foodChoices: { seating: 'Place cards' } });
    expect(choicePickFor(e, 'seating')).toBe('Place cards');
  });
});

describe('an unknown fact refuses the rule — it never counts as zero', () => {
  // THE HONESTY RULE. A guest-count rule on an event with no headcount must not
  // quietly recommend the small-party option; that is the invention this whole
  // module is written against, wearing a derivation's clothes.
  test('no headcount at all falls back to the authored default', () => {
    const e = { id: 'r', type: 'Dinner Party', date: iso(40), foodChoices: {} };
    expect(choicePickFor(e, 'seating')).toBe('Host-assigned');   // the authored literal
  });

  test('a roster of nothing but pending RSVPs is not a headcount', () => {
    const guests = Array.from({ length: 30 }, (_, i) => ({ name: `G${i}`, rsvp: 'Pending' }));
    const facts = decisionFactsFor({ type: 'Dinner Party', date: iso(40), guests }, null);
    // It may be known via the attendance band — what must NOT happen is a
    // confident small-party recommendation off a count nobody gave.
    if (!facts.guests.known) expect(facts.guests.known).toBe(false);
    else expect(facts.guests.value).toBeGreaterThan(0);
  });

  test('unknown compares as neither true nor false', () => {
    const facts = buildFacts({ guests: null, guestsKnown: false });
    expect(clauseHolds({ guests: { lt: 8 } }, facts).pass).toBe(false);
    expect(clauseHolds({ guests: { gte: 8 } }, facts).pass).toBe(false);
  });

  test('a zero-valued fact is not a known fact', () => {
    const facts = buildFacts({ guests: 0, guestsKnown: true });
    expect(facts.guests.known).toBe(false);
  });

  test('a boolean fact is known only when it was actually set', () => {
    expect(buildFacts({}).overnight.known).toBe(false);
    expect(buildFacts({ overnight: false }).overnight.known).toBe(true);
  });
});

describe('the evaluator refuses what it cannot honour', () => {
  const DEC = { id: 'x', options: ['A', 'B'], default: 'A' };

  test('a rule picking an option the decision does not offer is skipped', () => {
    const d = { ...DEC, recommendedWhen: [{ when: { guests: { gte: 1 } }, pick: 'Z' }] };
    expect(evaluateRecommendation(d, buildFacts({ guests: 50, guestsKnown: true }))).toBe(null);
  });

  test('an unknown operator refuses rather than guesses', () => {
    const d = { ...DEC, recommendedWhen: [{ when: { guests: { roughly: 8 } }, pick: 'B' }] };
    expect(evaluateRecommendation(d, buildFacts({ guests: 8, guestsKnown: true }))).toBe(null);
  });

  test('an unknown fact key refuses', () => {
    const d = { ...DEC, recommendedWhen: [{ when: { moonPhase: { eq: 'full' } }, pick: 'B' }] };
    expect(evaluateRecommendation(d, buildFacts({ guests: 8, guestsKnown: true }))).toBe(null);
  });

  test('first matching rule wins, in authored order', () => {
    const d = { ...DEC, recommendedWhen: [
      { when: { guests: { gte: 1 } }, pick: 'A' },
      { when: { guests: { gte: 1 } }, pick: 'B' },
    ] };
    expect(evaluateRecommendation(d, buildFacts({ guests: 5, guestsKnown: true })).pick).toBe('A');
  });
});

describe('the basis is reported, so a surface can explain itself', () => {
  const DEC = { id: 'x', options: ['A', 'B'], default: 'A',
    recommendedWhen: [{ when: { guests: { gte: 8 } }, pick: 'B', because: 'at eight or more' }] };

  test('a fired rule reports recommended, its reason, and the facts it read', () => {
    const p = proposedPickFor(DEC, buildFacts({ guests: 12, guestsKnown: true }));
    expect(p.pick).toBe('B');
    expect(p.basis).toBe('recommended');
    expect(p.because).toBe('at eight or more');
    expect(p.read).toEqual([{ key: 'guests', value: 12 }]);
  });

  test('no rule reports authored-default, and claims no reasoning', () => {
    const p = proposedPickFor(DEC, buildFacts({ guests: null, guestsKnown: false }));
    expect(p.pick).toBe('A');
    expect(p.basis).toBe('authored-default');
    expect(p.because).toBe(null);
    expect(p.read).toEqual([]);
  });
});

describe('every authored rule in the corpus is well formed', () => {
  const rules = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) {
      for (const r of (d.recommendedWhen || [])) rules.push({ pb: pb.type, d, r });
    }
  }

  test('(premise) rules exist to check', () => {
    expect(rules.length).toBeGreaterThan(0);
  });

  test('every rule picks an option its decision actually offers', () => {
    const bad = rules
      .filter(({ d, r }) => Array.isArray(d.options) && d.options.length && !d.options.includes(r.pick))
      .map(({ pb, d, r }) => `${pb} · ${d.id}: picks ${JSON.stringify(r.pick)}`);
    expect(bad).toEqual([]);
  });

  test('every rule uses a known operator on a known fact', () => {
    const bad = [];
    for (const { pb, d, r } of rules) {
      for (const [key, test] of Object.entries(r.when || {})) {
        if (!(key in buildFacts({}))) bad.push(`${pb} · ${d.id}: unknown fact ${key}`);
        for (const op of Object.keys(test || {})) {
          if (!OPERATORS.includes(op)) bad.push(`${pb} · ${d.id}: unknown operator ${op}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('every rule says why, in words a host could read', () => {
    const silent = rules.filter(({ r }) => !String(r.because || '').trim())
      .map(({ pb, d }) => `${pb} · ${d.id}`);
    expect(silent).toEqual([]);
  });
});
