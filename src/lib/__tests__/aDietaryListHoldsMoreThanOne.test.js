// ─── THE SECOND ALLERGY ERASED THE FIRST ─────────────────────────────────────
//
// MEASURED 2026-09-18 against the running engine:
//
//   host picks "Vegetarian"   -> foodChoices.dietary = "Vegetarian"
//   host picks "Nut allergy"  -> foodChoices.dietary = "Nut allergy"
//   is the vegetarian still recorded?  NO
//
// Dinner Party's `dietary` offers TEN options — Vegetarian, Vegan, Gluten-free,
// Nut allergy, Dairy-free, Shellfish, Halal, Kosher, Pescatarian, Alcohol-free.
// Crab Feast's offers NINE. These are not alternatives to choose between; they
// are independent facts about DIFFERENT GUESTS. A real table has a vegetarian
// and someone with a nut allergy, and the app held exactly one — the second pick
// silently destroyed the first, with no warning.
//
// For allergens that is a safety defect, not a preference. And this vocabulary
// has bitten before: a shipped commit records the diet picker flagging NO
// allergens for two of its own options because the picker's labels and the
// matcher's keys had drifted apart.
//
// `decisionType` had sat in the schema spec since 2026-07-15, authored on 0 of
// 260 decisions and READ BY NOTHING. Seven of its neighbours were deleted from
// the spec rather than filled, on the rule that a field with no reader is not a
// gap. This one earned the opposite treatment because the missing type costs a
// host something measurable.
import {
  decisionTypeFor, isMultiDecision, answerList, answerText,
  DEFAULT_DECISION_TYPE, DECISION_TYPES,
} from '../decisionType';
import { settleChoicePatch, choiceStateFor } from '../choiceProvenance';
import { getPlaybook, ALL_PLAYBOOKS, choiceShown } from '../playbooks';

const decisionOf = (type, id) =>
  ((getPlaybook(type) || {}).decisions || []).find((d) => d && d.id === id);

const apply = (ev, patch) => ({
  ...ev, ...patch,
  foodChoices: { ...(ev.foodChoices || {}), ...(patch.foodChoices || {}) },
});

describe('the type is derived where the shape is unmistakable', () => {
  test('a ten-option dietary list is MULTI', () => {
    const d = decisionOf('Dinner Party', 'dietary');
    expect(d.options.length).toBeGreaterThanOrEqual(9);
    expect(decisionTypeFor(d)).toBe('multi');
  });

  test('Crab Feast dietary too', () => {
    expect(isMultiDecision(decisionOf('Crab Feast', 'dietary'))).toBe(true);
  });

  test('NEGATIVE CONTROL: a dietary question with SITUATION options stays pick-one', () => {
    // Thanksgiving's dietary_table asks HOW MANY have needs — "Nobody — the
    // traditional menu works for everyone" / "One or two needs — adjust dishes".
    // Those are genuine alternatives. A deriver that caught this would be
    // turning a real pick-one into a multi and letting a host claim both.
    const d = decisionOf('Thanksgiving Hosting', 'dietary_table');
    expect(d).toBeTruthy();
    expect(decisionTypeFor(d)).toBe('pick-one');
  });

  test('NEGATIVE CONTROL: the repast headcount stays pick-one, deliberately', () => {
    // Its options are bands — "Close family + a few (~20)" — which LOOKS like a
    // count forced into chips. Its authored `why` says otherwise: "No one needs
    // an exact count on a day like this — an honest estimate is enough." Asking
    // a grieving family to type 47 would be worse than the bands.
    expect(decisionTypeFor(decisionOf('Repast', 'headcount'))).toBe('pick-one');
  });

  test('everything else defaults to pick-one, and that is correct', () => {
    expect(decisionTypeFor(decisionOf('Dinner Party', 'format'))).toBe(DEFAULT_DECISION_TYPE);
    expect(decisionTypeFor(null)).toBe(DEFAULT_DECISION_TYPE);
    expect(decisionTypeFor({})).toBe(DEFAULT_DECISION_TYPE);
  });

  test('an authored type always wins over the derivation', () => {
    const d = { ...decisionOf('Dinner Party', 'dietary'), decisionType: 'pick-one' };
    expect(decisionTypeFor(d)).toBe('pick-one');
    // …and junk is refused rather than trusted.
    expect(decisionTypeFor({ decisionType: 'whatever' })).toBe(DEFAULT_DECISION_TYPE);
    for (const t of DECISION_TYPES) expect(decisionTypeFor({ decisionType: t })).toBe(t);
  });
});

describe('THE DEFECT: a multi decision now holds both', () => {
  const dietary = () => decisionOf('Dinner Party', 'dietary');
  const base = () => ({ id: 'e', type: 'Dinner Party', guestMode: 'count', guestCount: 10, foodChoices: {} });

  test('picking two restrictions keeps two', () => {
    let ev = base();
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Vegetarian', 'host', dietary()));
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Nut allergy', 'host', dietary()));
    expect(answerList(ev.foodChoices.dietary).sort()).toEqual(['Nut allergy', 'Vegetarian']);
  });

  test('the host can take one back — a mis-tap must be correctable', () => {
    let ev = base();
    for (const v of ['Vegetarian', 'Nut allergy', 'Halal']) {
      ev = apply(ev, settleChoicePatch(ev, 'dietary', v, 'host', dietary()));
    }
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Nut allergy', 'host', dietary()));
    expect(answerList(ev.foodChoices.dietary).sort()).toEqual(['Halal', 'Vegetarian']);
  });

  test('a restriction is never duplicated, however many times it is tapped', () => {
    // My first draft of this test asserted [] after THREE taps and failed — three
    // toggles is on/off/ON, and the code was right. Recording the correction
    // because the mistake is easy to repeat: a toggle's parity is the contract.
    const tap = (ev, n) => {
      let e = ev;
      for (let i = 0; i < n; i += 1) e = apply(e, settleChoicePatch(e, 'dietary', 'Vegan', 'host', dietary()));
      return e;
    };
    expect(answerList(tap(base(), 1).foodChoices.dietary)).toEqual(['Vegan']);
    expect(answerList(tap(base(), 2).foodChoices.dietary)).toEqual([]);
    expect(answerList(tap(base(), 3).foodChoices.dietary)).toEqual(['Vegan']);
    expect(answerList(tap(base(), 4).foodChoices.dietary)).toEqual([]);
  });

  test('NEGATIVE CONTROL: a pick-one decision still REPLACES', () => {
    // The whole point of typing them separately. If this ever accumulates, a
    // host who changes their mind about the format ends up claiming both.
    const fmt = decisionOf('Dinner Party', 'format');
    let ev = base();
    const a = fmt.options[0]; const b = fmt.options[1];
    ev = apply(ev, settleChoicePatch(ev, 'format', a, 'host', fmt));
    ev = apply(ev, settleChoicePatch(ev, 'format', b, 'host', fmt));
    expect(ev.foodChoices.format).toBe(b);
  });

  test('NEGATIVE CONTROL: callers that pass no decision are byte-identical to before', () => {
    // Every existing three-argument call site must keep today's semantics, or
    // this change is a silent behaviour break across the app.
    let ev = base();
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Vegetarian', 'host'));
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Nut allergy', 'host'));
    expect(ev.foodChoices.dietary).toBe('Nut allergy');
  });
});

describe('a gate reading a multi answer matches on intersection', () => {
  // MEASURED: exactly three decisions type as multi — Dinner Party, Bridal
  // Shower and Crab Feast `dietary` — and NO whenChoice in the corpus targets
  // any of them. So this is a trap closed before it is sprung, not a live bug,
  // and it is said that way rather than dressed up as a fix.
  const dietary = () => decisionOf('Dinner Party', 'dietary');
  const evWith = (...vals) => {
    let ev = { id: 'e', type: 'Dinner Party', foodChoices: {} };
    for (const v of vals) ev = apply(ev, settleChoicePatch(ev, 'dietary', v, 'host', dietary()));
    return ev;
  };

  test('(premise) no authored gate targets a multi decision today', () => {
    const multi = new Set();
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) if (d && isMultiDecision(d)) multi.add(d.id);
    }
    expect([...multi].sort()).toEqual(['dietary']);
    const targets = new Set();
    const walk = (o, depth) => {
      if (!o || depth > 8 || typeof o !== 'object') return;
      if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
      if (o.whenChoice) {
        for (const g of (Array.isArray(o.whenChoice) ? o.whenChoice : [o.whenChoice])) {
          if (g && g.id) targets.add(g.id);
        }
      }
      for (const k of Object.keys(o)) walk(o[k], depth + 1);
    };
    walk(ALL_PLAYBOOKS, 0);
    expect(targets.size).toBeGreaterThan(20);
    expect([...targets].filter((t) => multi.has(t))).toEqual([]);
  });

  test('`in` fires when ANY recorded restriction is named', () => {
    const ev = evWith('Vegetarian', 'Nut allergy');
    expect(choiceShown(ev, { id: 'dietary', in: ['Nut allergy'] })).toBe(true);
    expect(choiceShown(ev, { id: 'dietary', in: ['Kosher'] })).toBe(false);
  });

  test('`not` suppresses when ANY recorded restriction is named', () => {
    const ev = evWith('Vegetarian', 'Nut allergy');
    expect(choiceShown(ev, { id: 'dietary', not: ['Nut allergy'] })).toBe(false);
    expect(choiceShown(ev, { id: 'dietary', not: ['Kosher'] })).toBe(true);
  });

  test('NEGATIVE CONTROL: a scalar answer compares exactly as before', () => {
    // The whole corpus is scalar. If this ever changes, the 30 live whenChoice
    // targets measured above are what breaks.
    const ev = { id: 'e', type: 'Dinner Party', foodChoices: { format: 'Seated dinner' } };
    expect(choiceShown(ev, { id: 'format', in: ['Seated dinner'] })).toBe(true);
    expect(choiceShown(ev, { id: 'format', in: ['Buffet'] })).toBe(false);
    expect(choiceShown(ev, { id: 'format', not: ['Seated dinner'] })).toBe(false);
  });
});

describe('a stored answer reads the same shape either way', () => {
  test('a pick-one string is a one-item list', () => {
    expect(answerList('Vegetarian')).toEqual(['Vegetarian']);
    expect(answerText('Vegetarian')).toBe('Vegetarian');
  });

  test('a multi array joins for display, never bare', () => {
    // A surface printing the raw array would render "Vegetarian,Nut allergy".
    expect(answerText(['Vegetarian', 'Nut allergy'])).toBe('Vegetarian, Nut allergy');
  });

  test('nothing recorded claims nothing', () => {
    for (const v of [null, undefined, '', [], '   ']) {
      expect(answerList(v)).toEqual([]);
      expect(answerText(v)).toBe('');
    }
  });

  test('an empty multi answer is FALSY to the ~80 generic readers', () => {
    // `[]` is truthy in JavaScript. My first version of this fix stored the
    // empty array and this test only checked its LENGTH, so it passed while a
    // host who toggled their only restriction back off would have read as
    // ANSWERED at every `if (foodChoices[id])` and `filter(c => !choices[c.id])`
    // in the tree — the same defect as the erased allergy, pointed the other
    // way. The stored shape is '' and this asserts the truthiness itself.
    let ev = { id: 'e', type: 'Dinner Party', foodChoices: {} };
    const d = decisionOf('Dinner Party', 'dietary');
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Vegan', 'host', d));
    expect(Boolean(ev.foodChoices.dietary)).toBe(true);
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Vegan', 'host', d));
    expect(Boolean(ev.foodChoices.dietary)).toBe(false);
    expect(ev.foodChoices.dietary).toBe('');
    expect(answerList(ev.foodChoices.dietary)).toEqual([]);
  });

  test('…and provenance agrees it is unanswered, not "your call"', () => {
    // The source map still records that the host touched it. `choiceStateFor`
    // must not turn that into a settled host choice over an empty value, or the
    // app claims an answer nobody gave.
    let ev = { id: 'e', type: 'Dinner Party', foodChoices: {} };
    const d = decisionOf('Dinner Party', 'dietary');
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Vegan', 'host', d));
    ev = apply(ev, settleChoicePatch(ev, 'dietary', 'Vegan', 'host', d));
    const st = choiceStateFor(ev, d, 'dietary');
    expect(st.settled).toBe(false);
    expect(st.attributable).toBe(false);
  });
});
