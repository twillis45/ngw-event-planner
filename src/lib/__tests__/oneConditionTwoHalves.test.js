// ─── ONE CONDITION, WRITTEN ONCE ────────────────────────────────────────────
//
// `relevantWhen` ships under four names (see `relevantWhenAlreadyShips.test.js`
// for the census and the runtime proof). Measured alongside it: `whenChoice` has
// had exactly ONE accessor — `choiceShown` — read from ~14 call sites, while its
// pair `standsDownWhen` had NO accessor and was written out by hand TWICE:
//
//   playbookDecisionBoard     retire a whole DECISION
//   playbookDecisionOptions   retire a single OPTION, inside optionGates
//
// Byte-for-byte the same four-line predicate, in two functions, 750 lines apart.
//
// ── THE DRIFT THE TWO COPIES HAD ALREADY TAKEN ──────────────────────────────
//
// Both copies compared a SCALAR answer. `choiceShown` grew two shapes its twin
// never did: `{not:[...]}` (2026-09-13) and a LIST answer for `multi` decisions
// (2026-09-18, itself closed as a trap before it was sprung). So a `multi`
// decision — dietary, stored as `['Vegan']` — could never stand anything down,
// and the failure would have been silent: the decision simply stays on the board.
//
// `standsDown()` now reads the list. Provably byte-identical today, and that is
// asserted below rather than asserted in prose: all 9 authored `standsDownWhen`
// target `food_style`, `venue`, `cookmethod` or `make_vs_order`, and not one of
// those is a multi decision.
import { ALL_PLAYBOOKS, standsDown, decisionRelevant, choiceShown } from '../playbooks';

describe('the two copies are now one accessor', () => {
  const COND = { id: 'food_style', in: ['Hire a BBQ caterer / pitmaster'] };

  test('an answered pick in the list stands the decision down', () => {
    expect(standsDown({ foodChoices: { food_style: 'Hire a BBQ caterer / pitmaster' } }, COND)).toBe(true);
  });

  test('an answered pick OUTSIDE the list does not', () => {
    expect(standsDown({ foodChoices: { food_style: 'Potluck — guests bring sides' } }, COND)).toBe(false);
  });

  test('AN UNANSWERED DECISION STANDS NOTHING DOWN — the asymmetry that is the rule', () => {
    // `choiceShown` resolves through `choicePickFor`, which falls back to the
    // playbook's authored DEFAULT. That is right for "show only while" and wrong
    // here: retiring a real ask on the app's own assumption hides work the host
    // never agreed to skip. If someone ever "simplifies" standsDown into
    // `!choiceShown(...)`, this is the test that catches it.
    expect(standsDown({ foodChoices: {} }, COND)).toBe(false);
    expect(standsDown({}, COND)).toBe(false);
    expect(standsDown(null, COND)).toBe(false);
  });

  test('a missing or malformed condition is never a stand-down', () => {
    expect(standsDown({ foodChoices: { food_style: 'x' } }, null)).toBe(false);
    expect(standsDown({ foodChoices: { food_style: 'x' } }, {})).toBe(false);
    expect(standsDown({ foodChoices: { food_style: 'x' } }, { id: 'food_style' })).toBe(false);
  });

  test('A LIST ANSWER MATCHES ON INTERSECTION — the trap both copies had', () => {
    // A `multi` decision stores `['Vegan']`, and `['Vegan'] !== 'Vegan'`. Both
    // hand-written copies compared scalars, so the day someone authored a
    // stand-down against dietary it would silently never fire.
    const cond = { id: 'dietary', in: ['Vegan'] };
    expect(standsDown({ foodChoices: { dietary: ['Vegan', 'Gluten-free'] } }, cond)).toBe(true);
    expect(standsDown({ foodChoices: { dietary: ['Gluten-free'] } }, cond)).toBe(false);
  });

  test('and that widening is byte-identical on the corpus as authored', () => {
    // The new list read can only change behaviour for a stand-down aimed at a
    // decision whose answer is stored as an array. Measured: none is.
    const multiIds = new Set();
    const targets = new Set();
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (d.decisionType === 'multi' || d.id === 'dietary') multiIds.add(d.id);
        if (d.standsDownWhen && d.standsDownWhen.id) targets.add(d.standsDownWhen.id);
        for (const g of Object.values(d.optionGates || {})) {
          if (g && g.standsDownWhen && g.standsDownWhen.id) targets.add(g.standsDownWhen.id);
        }
      }
    }
    // Four targets, not five: `food-model` is a Reunion gate spelled `whenChoice`,
    // which resolves through `choiceShown` and is not this accessor's business.
    expect([...targets].sort()).toEqual(['cookmethod', 'food_style', 'make_vs_order', 'venue']);
    for (const t of targets) expect(multiIds.has(t)).toBe(false);
  });
});

describe('decisionRelevant composes the three whole-decision dialects', () => {
  test('no condition at all is always relevant', () => {
    expect(decisionRelevant({}, { id: 'x' })).toBe(true);
  });

  test('null is never relevant — a caller with no decision gets false, not a throw', () => {
    expect(decisionRelevant({}, null)).toBe(false);
  });

  test('each dialect can retire it on its own', () => {
    const e = { foodChoices: { food_style: 'Hire a BBQ caterer / pitmaster' } };
    expect(decisionRelevant(e, { id: 'a', standsDownWhen: { id: 'food_style', in: ['Hire a BBQ caterer / pitmaster'] } })).toBe(false);
    // whenChoice: gated on an answer that was never given, and whose decision has
    // no authored default to fall back to ⇒ choiceShown lets it through.
    expect(decisionRelevant(e, { id: 'b', whenChoice: { id: 'nope', in: ['never'] } })).toBe(true);
    // whenKids on an event with no kids.
    expect(decisionRelevant({ ...e, kidsPolicy: 'adults-only' }, { id: 'c', whenKids: true })).toBe(false);
  });

  test('it agrees with choiceShown wherever whenChoice alone decides', () => {
    // Not a restatement: this is the guard that keeps the composed accessor from
    // drifting away from the single-dialect one it delegates to.
    const e = { foodChoices: { major_event: 'UFC / Boxing' } };
    for (const gate of [{ id: 'major_event', in: ['UFC / Boxing'] }, { id: 'major_event', in: ['World Cup'] }]) {
      expect(decisionRelevant(e, { id: 'z', whenChoice: gate })).toBe(choiceShown(e, gate));
    }
  });
});
