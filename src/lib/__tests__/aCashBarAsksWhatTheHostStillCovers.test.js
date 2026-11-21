// ─── A CASH BAR ASKS WHAT THE HOST STILL COVERS (owner, 11/21/2026) ──────────
// After a cash/limited-bar pick, the follow-up `bar_cover` asks what the host
// still puts out; its options are the approved sets, built only from each
// playbook's real drink lines; the drinks the plan buys (and so the budget)
// move on the pick. No "Bartender only"; glassware stays in Rentals.
// Numbers: design-s/work/bar.json (40 guests, national prices).
// e2e twin: hostv2/e2e/aCashBarAsksWhatTheHostStillCovers.spec.mjs.
import { getPlaybook, playbookFoodPlan, playbookDecisionBoard, injectedDecisionsFor } from '../playbooks';
import { cashBarCoverSets, NOTHING, BAR_COVER_ID } from '../playbooks/cashBarCover';

const EXPECT = {
  'Engagement Party': { decision: 'bar', pick: 'Cash/limited bar', full: [535, 1395], after: [
    ['Ice and the zero-proof drinks', 76, 277],
    ['The champagne toast, plus ice and zero-proof', 148, 487],
    ['The signature cocktail, plus ice and zero-proof', 251, 602],
    [NOTHING, 0, 0]] },
  'Retirement Party': { decision: 'bar', pick: 'Limited / cash bar', full: [425, 1178], after: [
    ['Ice, coffee and the zero-proof drinks', 99, 356],
    ['The champagne toast, plus ice, coffee and zero-proof', 171, 536],
    ['The honoree’s favorite drink and the toast', 193, 676],
    [NOTHING, 0, 0]] },
  'Holiday Party': { decision: 'alcohol_service', pick: 'Drink tickets / cash bar', full: [582, 1551], after: [
    ['Mixers, ice, water and zero-proof', 184, 605],
    ['A first round: the signature cocktail, plus mixers, ice and water', 324, 865],
    ['Water and coffee only', 44, 126],
    [NOTHING, 0, 0]] },
};
const ev = (type, picks) => ({ id: 'cb', type, date: '2026-12-12', guestEstimate: 40, guestMode: 'count', guestCountSource: 'host', foodChoices: picks || {} });
const drinks = (fp) => fp.list.filter((l) => l.cat === 'beverage' && !l.skipped);
const band = (fp) => { const d = drinks(fp); return [Math.round(d.reduce((t, l) => t + l.low, 0)), Math.round(d.reduce((t, l) => t + l.high, 0))]; };

describe.each(Object.entries(EXPECT))('%s', (type, x) => {
  const pb = getPlaybook(type);
  test('the follow-up appears only after the cash-bar pick', () => {
    const shown = (picks) => (playbookDecisionBoard(ev(type, picks)).open || []).concat(playbookDecisionBoard(ev(type, picks)).locked || [])
      .some((r) => r && (r.id === BAR_COVER_ID || r.decisionId === BAR_COVER_ID || String(r.key || '').endsWith(BAR_COVER_ID)));
    expect(injectedDecisionsFor(ev(type), pb).some((d) => d.id === BAR_COVER_ID)).toBe(true);
    expect(shown({})).toBe(false);
    expect(shown({ [x.decision]: x.pick })).toBe(true);
  });
  test('the options are the approved sets: no "Bartender only", every line real, no glassware', () => {
    const sets = cashBarCoverSets(pb);
    expect(sets.map(([l]) => l)).toEqual(x.after.map(([l]) => l));
    const ids = new Set((pb.purchases || []).filter((p) => p.category === 'beverage').map((p) => p.id));
    for (const [, lines] of sets) for (const id of lines) expect(ids.has(id)).toBe(true);
  });
  test('the drinks bought move with the answer, at the approved numbers', () => {
    for (const [label, low, high] of x.after) {
      expect(band(playbookFoodPlan(ev(type, { [x.decision]: x.pick, [BAR_COVER_ID]: label })))).toEqual([low, high]);
    }
    // Before the host answers, the plan runs on the first set, never the full bar.
    expect(band(playbookFoodPlan(ev(type, { [x.decision]: x.pick })))).toEqual([x.after[0][1], x.after[0][2]]);
  });
  test('glassware and every non-drink line are untouched by the follow-up', () => {
    const a = playbookFoodPlan(ev(type, { [x.decision]: x.pick, [BAR_COVER_ID]: NOTHING }));
    const b = playbookFoodPlan(ev(type));
    const nonDrink = (fp) => fp.list.filter((l) => l.cat !== 'beverage' && !l.skipped).map((l) => l.id).sort();
    expect(nonDrink(a)).toEqual(nonDrink(b));
  });
});

test('another playbook with a cash bar gets sets from its own lines; a pick that is not a cash bar asks nothing', () => {
  const gala = cashBarCoverSets(getPlaybook('Fundraiser / Gala'));
  expect(gala.map(([l]) => l)).toEqual(['The non-alcoholic drinks and ice', NOTHING]);
  expect(cashBarCoverSets(getPlaybook('Birthday'))).toBeNull();
});

// ONE CASH-BAR RULE (integration with the line-rule pricing, 11/21/2026). The
// follow-up hangs off the decision tagged `drinksCall` — the one the plan
// prices — and it is the only rule: no drinks tier reads a cash pick. Before
// the host answers, Wedding's bare "Cash bar" keeps the toast and the Gala's
// the zero-proof drinks, exactly what the retired bare-"Cash bar" tier kept.
describe('one cash-bar rule, on the named drinks call', () => {
  const { cashBarParent } = require('../playbooks/cashBarCover');
  const { ALL_PLAYBOOKS, beverageTierFor } = require('../playbooks');
  test('every cash-bar follow-up hangs off the drinks call', () => {
    for (const pb of ALL_PLAYBOOKS) {
      const p = cashBarParent(pb);
      if (p) expect([pb.type, p.decision.drinksCall]).toEqual([pb.type, true]);
    }
  });
  test('no drinks tier reads a cash pick', () => {
    for (const pick of ['cash bar', 'cash/limited bar', 'limited / cash bar', 'drink tickets / cash bar']) expect(beverageTierFor(pick)).toBeNull();
  });
  test.each([
    ['Wedding', 'bar', ['p_toast_champagne']],
    ['Fundraiser / Gala', 'bar', ['p_nonalc']],
  ])('%s: a bare cash bar, unanswered, keeps what the bare rule kept', (type, id, kept) => {
    const ids = playbookFoodPlan(ev(type, { [id]: 'Cash bar' })).list.filter((l) => l.cat === 'beverage' && !l.skipped).map((l) => l.id);
    expect(ids).toEqual(kept);
    expect(playbookFoodPlan(ev(type, { [id]: 'Cash bar', [BAR_COVER_ID]: NOTHING })).list.filter((l) => l.cat === 'beverage' && !l.skipped)).toEqual([]);
  });
});
