// ─── THE HOST SAID TWICE THAT THEY HAVE HELP, AND NINE STRINGS SAID OTHERWISE ──
//
// THE FINDING. Helpers are resolved by a whole engine (lib/helperResponsibility.js)
// and never reached the decision model. recommendedPick's FACT_KEYS was
// Object.freeze(['guests','budget','daysOut','venueKind','isDestination','overnight'])
// — no host fact of any kind — so no authored rule could condition on who is
// carrying the event. Measured across the corpus, NINE authored strings in five
// playbooks assert as fact that the host is on their own, unconditionally:
//
//   Dinner Party      help           defaultWhy  "a dinner party this size is one person's job"
//   Engagement Party  help           why         "one host cannot pass apps, tend bar, AND host"
//   Engagement Party  help           rationale   "One host cannot pass apps, tend bar, and be present…"
//   Holiday Party     food_format    why         "a full host-cooked spread is a brutal solo lift"
//   Holiday Party     food_format    rationale   "a brutal solo lift, so drop-off catering is…"
//   Retirement Party  help           why         "one host cannot run a buffet, tend bar, AND run…"
//   Retirement Party  help           defaultWhy  "one host cannot run a buffet, tend bar and run…"
//   Reunion           planning-team  why         "the app assumes solo until you say otherwise"
//   Reunion           planning-team  rationale   "too much work … for one person … a solo host …"
//
// All nine printed verbatim to a host who had set hostCapacity:'has_help' AND typed
// named people onto their own food / timeline / supply rows. Two independent
// statements of "I have help", both ignored.
//
// THE CONTRACT THAT KEEPS THE FIX HONEST, and the thing this file is really
// guarding: a fact is { value, known }, and an UNKNOWN fact REFUSES its rule
// rather than comparing as zero or false. `helperCount` is therefore known ONLY
// when it is positive — a host who has named nobody has not told us they are
// alone, they have told us nothing — so no rule can ever derive "you are on your
// own" from silence. The authored literal stays, and says whatever it always said.
import {
  playbookDecisionOptions, playbookDecisionBoard, decisionFactsFor,
  namedHelperCount, getPlaybook, ALL_PLAYBOOKS,
} from '../index';
import { FACT_KEYS, OPERATORS, buildFacts, resolveCopy } from '../recommendedPick';
import { deriveHelperResponsibilities } from '../../helperResponsibility';

// The claim under test: a string that states, as fact, that the host is alone.
const ALONE_CLAIM = /one person's job|one host cannot|brutal solo lift|assumes solo|for one person past|a solo host with/i;

// The nine, by where they live and where a surface reads them from.
const NINE = [
  { type: 'Dinner Party',     id: 'help',          field: 'defaultWhy' },
  { type: 'Engagement Party', id: 'help',          field: 'why' },
  { type: 'Engagement Party', id: 'help',          field: 'rationale' },
  { type: 'Holiday Party',    id: 'food_format',   field: 'why' },
  { type: 'Holiday Party',    id: 'food_format',   field: 'rationale' },
  { type: 'Retirement Party', id: 'help',          field: 'why' },
  { type: 'Retirement Party', id: 'help',          field: 'defaultWhy' },
  { type: 'Reunion',          id: 'planning-team', field: 'why' },
  { type: 'Reunion',          id: 'planning-team', field: 'rationale' },
];

const iso = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const baseEvent = (type, extra) => ({ id: 'e', type, date: iso(40), guests: [], guestEstimate: 40, ...extra });

// What a surface actually renders for one of the nine. `why`/`defaultWhy` come
// from the option sheet; `rationale` from the board row (it is what rankReason prefers).
function rendered({ type, id, field }, event) {
  if (field === 'rationale') {
    const b = playbookDecisionBoard(event);
    const row = [...b.open, ...b.deferred, ...b.locked].find((r) => r.id === id);
    return row && row.priorityBasis ? row.priorityBasis.rationale : null;
  }
  const o = playbookDecisionOptions(event, id);
  return o ? o[field] : null;
}

// The raw authored literal, straight off the playbook — what used to be the only
// thing a surface could ever show.
function authored({ type, id, field }) {
  const pb = getPlaybook(type);
  const d = (pb.decisions || []).find((x) => x.id === id);
  return field === 'rationale' ? d.priorityBasis.rationale : d[field];
}

describe('host facts exist at all', () => {
  test('FACT_KEYS carries the host, and buildFacts returns { value, known } for both', () => {
    expect(FACT_KEYS).toContain('hostCapacity');
    expect(FACT_KEYS).toContain('helperCount');
    const f = buildFacts({ hostCapacity: 'has_help', helperCount: 3 });
    expect(f.hostCapacity).toEqual({ value: 'has_help', known: true });
    expect(f.helperCount).toEqual({ value: 3, known: true });
  });

  test('UNKNOWN REFUSES: silence is not "solo", and zero helpers is not "alone"', () => {
    const silent = buildFacts({});
    expect(silent.hostCapacity).toEqual({ value: null, known: false });
    expect(silent.helperCount.known).toBe(false);
    // a junk capacity value is "not told", never coerced to one of the two
    expect(buildFacts({ hostCapacity: 'sort of' }).hostCapacity).toEqual({ value: null, known: false });
    // zero named helpers is SILENCE, not evidence of being alone
    expect(buildFacts({ helperCount: 0 }).helperCount.known).toBe(false);
    // …so a rule that tries to assert the host is alone can never fire.
    const aloneRule = { copyWhen: [{ when: { helperCount: { lt: 1 } }, why: 'YOU ARE ON YOUR OWN' }], why: 'base' };
    expect(resolveCopy(aloneRule, buildFacts({ helperCount: 0 })).why).toBe('base');
    expect(resolveCopy(aloneRule, buildFacts({})).why).toBe('base');
    // NEGATIVE CONTROL: the same machinery DOES fire on a fact it knows, so the
    // refusal above is the `known` contract and not a broken evaluator.
    const helpRule = { copyWhen: [{ when: { helperCount: { gte: 1 } }, why: 'YOU HAVE HELP' }], why: 'base' };
    expect(resolveCopy(helpRule, buildFacts({ helperCount: 1 })).why).toBe('YOU HAVE HELP');
    expect(resolveCopy(helpRule, buildFacts({ helperCount: 0 })).why).toBe('base');
  });

  test('the facts are sourced from the real event, through decisionFactsFor', () => {
    const ev = baseEvent('Dinner Party', {
      hostCapacity: 'has_help',
      guests: [{ id: 'g1', name: 'Aunt Lisa' }],
      foodAdd: [{ id: 'fa1', name: 'Potato salad', owner: 'Aunt Lisa' }],
    });
    const f = decisionFactsFor(ev, getPlaybook('Dinner Party'));
    expect(f.hostCapacity).toEqual({ value: 'has_help', known: true });
    expect(f.helperCount).toEqual({ value: 1, known: true });
    // nothing said ⇒ both unknown
    const g = decisionFactsFor(baseEvent('Dinner Party'), getPlaybook('Dinner Party'));
    expect(g.hostCapacity.known).toBe(false);
    expect(g.helperCount.known).toBe(false);
  });
});

// ─── THE SECOND COPY OF A RULE, HELD TO THE FIRST ────────────────────────────
// namedHelperCount() re-reads the host-typed owner fields rather than calling
// deriveHelperResponsibilities, because that call would recurse (decisionFactsFor
// → deriveHelperResponsibilities → playbookFoodPlan → choicePickFor →
// decisionFactsFor). A second copy of a rule is a liability unless something
// holds the two together. This is that something.
describe('namedHelperCount agrees with the helper engine', () => {
  const cases = [
    ['nobody', {}],
    ['one dish owner', { guests: [{ id: 'g1', name: 'Aunt Lisa' }], foodAdd: [{ id: 'fa1', name: 'Potato salad', owner: 'Aunt Lisa' }] }],
    ['a task owner', { timeline: [{ id: 't1', task: 'Run the grill', owner: 'Uncle Ray' }] }],
    ['the host themself is not a helper', { timeline: [{ id: 't1', task: 'Set the table', owner: 'Host' }, { id: 't2', task: 'Ice run', owner: 'me' }] }],
    ['one person in two roles dedupes via the guest list', {
      guests: [{ id: 'g1', name: 'Uncle Ray' }],
      foodAdd: [{ id: 'fa1', name: 'Ribs', owner: 'Uncle Ray' }],
      timeline: [{ id: 't1', task: 'Run the grill', owner: 'Uncle Ray' }],
    }],
    ['a retired task carries no helper', { timeline: [{ id: 't1', task: 'Collect the crabs', owner: 'Cousin Dee', retired: true }] }],
    ['a skipped dish carries no helper', { foodAdd: [{ id: 'fa1', name: 'Mac', owner: 'Nia' }], foodSkip: { fa1: true } }],
    ['an informal vendor is a helper', { vendors: [{ id: 'v1', name: 'Marcus', isInformal: true }] }],
    ['a real vendor is NOT a helper', { vendors: [{ id: 'v1', name: 'Bayview Catering', category: 'Caterer' }] }],
    ['a run-of-show owner', { ros: [{ id: 'r1', segment: 'Cue the toast', owner: 'Nia' }] }],
    ['three distinct people', {
      foodAdd: [{ id: 'fa1', name: 'Greens', owner: 'Aunt Lisa' }],
      timeline: [{ id: 't1', task: 'Grill', owner: 'Uncle Ray' }],
      vendors: [{ id: 'v1', name: 'Marcus', isInformal: true }],
    }],
  ];

  for (const [name, extra] of cases) {
    test(name, () => {
      const ev = baseEvent('The Cookout', extra);
      expect(namedHelperCount(ev)).toBe(deriveHelperResponsibilities(ev).helpers.length);
    });
  }

  test('NEGATIVE CONTROL: the parity check can fail — it is not comparing zero to zero', () => {
    const ev = baseEvent('The Cookout', {
      foodAdd: [{ id: 'fa1', name: 'Greens', owner: 'Aunt Lisa' }],
      timeline: [{ id: 't1', task: 'Grill', owner: 'Uncle Ray' }],
    });
    expect(namedHelperCount(ev)).toBe(2);
    expect(deriveHelperResponsibilities(ev).helpers.length).toBe(2);
  });
});

describe('the nine strings stop asserting the host is alone', () => {
  test('all nine DO assert it, as authored — the premise of this whole file', () => {
    for (const nine of NINE) {
      const lit = authored(nine);
      expect([`${nine.type}/${nine.id}/${nine.field}`, ALONE_CLAIM.test(lit)])
        .toEqual([`${nine.type}/${nine.id}/${nine.field}`, true]);
    }
  });

  test('NEGATIVE CONTROL: a host who has said nothing still reads the authored literal', () => {
    for (const nine of NINE) {
      const got = rendered(nine, baseEvent(nine.type));
      expect([`${nine.type}/${nine.id}/${nine.field}`, got]).toEqual([`${nine.type}/${nine.id}/${nine.field}`, authored(nine)]);
    }
  });

  test('hostCapacity:has_help alone is enough — all nine stand down', () => {
    for (const nine of NINE) {
      const got = rendered(nine, baseEvent(nine.type, { hostCapacity: 'has_help' }));
      expect([`${nine.type}/${nine.id}/${nine.field}`, ALONE_CLAIM.test(got)])
        .toEqual([`${nine.type}/${nine.id}/${nine.field}`, false]);
      expect(got).not.toBe(authored(nine)); // it genuinely changed, not just passed a regex
      expect(String(got).length).toBeGreaterThan(40); // and it is real copy, not a blank
    }
  });

  test('a NAMED helper alone is enough — the second statement, on its own', () => {
    for (const nine of NINE) {
      const ev = baseEvent(nine.type, {
        guests: [{ id: 'g1', name: 'Aunt Lisa' }],
        foodAdd: [{ id: 'fa1', name: "Auntie's potato salad", owner: 'Aunt Lisa' }],
      });
      expect(namedHelperCount(ev)).toBe(1);
      const got = rendered(nine, ev);
      expect([`${nine.type}/${nine.id}/${nine.field}`, ALONE_CLAIM.test(got)])
        .toEqual([`${nine.type}/${nine.id}/${nine.field}`, false]);
    }
  });

  test('the option sheet says HOW it resolved — a conditional line names itself', () => {
    const silent = playbookDecisionOptions(baseEvent('Holiday Party'), 'food_format');
    expect(silent.copyBasis).toBe('authored');
    expect(silent.copyRead).toEqual([]);
    const helped = playbookDecisionOptions(baseEvent('Holiday Party', { hostCapacity: 'has_help' }), 'food_format');
    expect(helped.copyBasis).toBe('conditional');
    expect(helped.copyRead).toEqual([{ key: 'hostCapacity', value: 'has_help' }]);
  });

  test('hostCapacity follows the PERSON: the profile answers when the event does not', () => {
    const ev = baseEvent('Holiday Party');
    const b = playbookDecisionBoard(ev, undefined, { hostCapacity: 'has_help' });
    const row = [...b.open, ...b.deferred, ...b.locked].find((r) => r.id === 'food_format');
    expect(row).toBeTruthy();
    expect(ALONE_CLAIM.test(row.priorityBasis.rationale)).toBe(false);
    // NEGATIVE CONTROL: no profile ⇒ the literal
    const b2 = playbookDecisionBoard(ev);
    const row2 = [...b2.open, ...b2.deferred, ...b2.locked].find((r) => r.id === 'food_format');
    expect(row2.priorityBasis.rationale).toBe(authored({ type: 'Holiday Party', id: 'food_format', field: 'rationale' }));
  });

  test('the fix does not flip any PICK — only the words moved', () => {
    // "I have help with this event" is not "a cousins committee of 3-6 relatives
    // has agreed to own a lane". Nothing in the app knows the difference, so no
    // recommendedWhen rule was added and the authored defaults stand.
    for (const nine of NINE) {
      if (nine.field === 'rationale') continue;
      const silent = playbookDecisionOptions(baseEvent(nine.type), nine.id);
      const helped = playbookDecisionOptions(baseEvent(nine.type, { hostCapacity: 'has_help' }), nine.id);
      expect(helped.chosen).toBe(silent.chosen);
      expect(helped.default).toBe(silent.default);
      expect(helped.options).toEqual(silent.options);
    }
  });
});

describe('copyWhen authoring is checkable, and additive everywhere else', () => {
  test('every authored copyWhen rule names a real fact and a real operator', () => {
    let rules = 0;
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (!Array.isArray(d.copyWhen)) continue;
        for (const r of d.copyWhen) {
          rules += 1;
          expect(r.when && typeof r.when === 'object').toBe(true);
          // a rule that changes nothing is a defect, not a no-op
          expect(['why', 'defaultWhy', 'rationale'].some((k) => typeof r[k] === 'string' && r[k].trim())).toBe(true);
          for (const [key, test_] of Object.entries(r.when)) {
            expect([d.id, key, FACT_KEYS.includes(key)]).toEqual([d.id, key, true]);
            for (const op of Object.keys(test_)) {
              expect([d.id, op, OPERATORS.includes(op)]).toEqual([d.id, op, true]);
            }
          }
        }
      }
    }
    expect(rules).toBeGreaterThanOrEqual(10); // the nine live on five decisions × 2 rules
  });

  test('ADDITIVE: a host with help changes nothing on decisions that never claimed otherwise', () => {
    // Every optioned decision in every playbook, rendered twice. Only decisions
    // carrying copyWhen may differ; everything else must be byte-identical, so
    // this change cannot have leaked into copy it was not written for.
    let compared = 0, differed = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const silent = baseEvent(pb.type);
      const helped = baseEvent(pb.type, { hostCapacity: 'has_help' });
      for (const d of (pb.decisions || [])) {
        const a = playbookDecisionOptions(silent, d.id);
        const b = playbookDecisionOptions(helped, d.id);
        if (!a || !b) continue;
        compared += 1;
        const same = a.why === b.why && a.defaultWhy === b.defaultWhy;
        if (!same) {
          differed += 1;
          expect([pb.type, d.id, Array.isArray(d.copyWhen)]).toEqual([pb.type, d.id, true]);
        }
      }
    }
    expect(compared).toBeGreaterThan(100);
    expect(differed).toBeGreaterThan(0); // the ones that were supposed to move, did
  });
});
