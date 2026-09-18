// ─── THE APP CLAIMED A VEGETARIAN NOBODY MENTIONED ───────────────────────────
//
// MEASURED 2026-09-18 on an UNTOUCHED Bridal Shower — no host input at all:
//
//   choicePickFor(event, 'dietary')            -> "Vegetarian"
//   playbookDecisionOptions(event, 'dietary')  -> { chosen: "Vegetarian", … }
//   playbookFoodPlan(event) dietary row        -> { chosen: "Vegetarian" }
//
// Bridal Shower's `dietary` authored `default: 'Vegetarian'`, and it was the
// only dietary decision in the corpus that authored a default at all. Dinner
// Party and Crab Feast both author `null`, and Dinner Party's `why` says why in
// as many words: "One unflagged severe allergy can send a guest to the ER. Must
// be collected BEFORE the menu locks, never after."
//
// A default is a legitimate device in this corpus — the plan has to be right on
// first render, and `choicePickFor` falls back to the authored default so it
// is. That works for a PLAN SETTING ("Church fellowship hall", "Order steamed
// for pickup"): the app proposes, the host overrides, and `choiceStateFor`
// keeps the two apart with `runningOnDefault`.
//
// A dietary restriction is not a plan setting. It is a claim about a REAL GUEST
// that only the guests can answer, which this decision's own priorityBasis
// says: "only the guests can answer, and one missed restriction sidelines
// someone." There is no defensible default for a fact the app cannot know.
//
// It got sharper the day `dietary` became a multi decision: the picker presses
// every recorded restriction, so an untouched Bridal Shower rendered
// "Vegetarian" as ON — the app showing the host a restriction they never
// recorded, on the one surface whose job is guest safety.
//
// NOTHING ELSE WAS TOUCHED. The options, the ask, the label, the timing and the
// `blocks: ['menu']` gate are unchanged. One field.
import { ALL_PLAYBOOKS, getPlaybook, choicePickFor, playbookDecisionOptions } from '../playbooks';
import { isMultiDecision } from '../decisionType';

const dietaryDecisions = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) {
      if (d && isMultiDecision(d)) out.push({ type: pb.type, d });
    }
  }
  return out;
};

const untouched = (type) => ({
  id: 'e', type, date: '2026-09-28', guestMode: 'count', guestCount: 20, foodChoices: {},
});

describe('no restriction is assumed', () => {
  test('(premise) the restriction lists are really here', () => {
    // Every assertion below is vacuous over an empty sweep.
    const all = dietaryDecisions();
    expect(all.map((x) => x.type).sort()).toEqual(['Bridal Shower', 'Crab Feast', 'Dinner Party']);
  });

  test('THE FIX: no restriction list authors a default', () => {
    for (const { type, d } of dietaryDecisions()) {
      expect(`${type}: ${JSON.stringify(d.default)}`).toBe(`${type}: null`);
    }
  });

  test('an untouched event resolves NO dietary pick, on any of them', () => {
    // The effective read, not the authored field — `choicePickFor` is what the
    // spread, the budget and the task list actually call, and it falls back
    // through `proposedPickFor` as well as the literal default.
    for (const { type } of dietaryDecisions()) {
      expect(`${type}: ${JSON.stringify(choicePickFor(untouched(type), 'dietary'))}`).toBe(`${type}: null`);
    }
  });

  test('and the picker presses nothing before the host has spoken', () => {
    // This is the host-visible half. `chosen` is what the chips read for
    // aria-pressed; anything non-null here is the app claiming an answer.
    for (const { type } of dietaryDecisions()) {
      const opts = playbookDecisionOptions(untouched(type), 'dietary');
      expect(`${type}: ${JSON.stringify(opts.chosen)}`).toBe(`${type}: null`);
      // The options themselves are untouched — this is not a decision that lost
      // its content, only its assumption.
      expect(opts.options.length).toBeGreaterThanOrEqual(5);
    }
  });

  test('NEGATIVE CONTROL: a plan setting still proposes a default, and should', () => {
    // If this ever returns null, the change went too far: the plan has to be
    // right on first render, and a default is how. Repast's `place` proposes a
    // fellowship hall and carries an authored `defaultWhy` explaining it — that
    // is the shape a defensible default has.
    const place = (getPlaybook('Repast').decisions || []).find((d) => d.id === 'place');
    expect(place.default).toBe('Church fellowship hall');
    expect(String(place.defaultWhy || '').length).toBeGreaterThan(40);
    expect(choicePickFor(untouched('Repast'), 'place')).toBe('Church fellowship hall');
  });

  test('NEGATIVE CONTROL: the host can still record the restriction themselves', () => {
    // Removing the default must not remove the answer.
    const ev = { ...untouched('Bridal Shower'), foodChoices: { dietary: ['Vegetarian'] } };
    expect(choicePickFor(ev, 'dietary')).toEqual(['Vegetarian']);
    expect(playbookDecisionOptions(ev, 'dietary').chosen).toEqual(['Vegetarian']);
  });
});
