// ─── THE CATERER COOKS ON THE DAY TOO (Wanda audit follow-up, 11/22/2026) ────
//
// #224 (theCatererCooks) retired the make-ahead cooking, the deli run and the
// chafing dishes from the checklist and the rentals under a caterer pick, on
// the food_style gate. Two places still had her cooking:
//   - the run of show's "Final plating; fill the chafing dishes; light
//     candles; cue the slideshow" (and the T0 -4h "reheat or stage anything
//     that warms fast for the buffet"), and
//   - the Plan's "How it's sourced · Fresh butcher", a card that re-prices
//     proteins the caterer is bringing.
// The same gate retires both. A host who cooks keeps all of it.
import WANDA from '../../data/wandaGoldEvent';
import { playbookRunOfShow, playbookFoodPlan } from '../playbooks';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });
// Her own rows win (#224); with none, the playbook's beats are the run of show.
const pick = (food_style, over = {}) => wanda({ ros: [], foodChoices: { food_style }, ...over });
const segments = (ev) => (playbookRunOfShow(ev) || []).map((r) => String(r.segment || ''));
const cooking = (ev) => segments(ev).filter((s) => /chafing|plating|reheat/i.test(s));

describe('a caterer pick retires the host-cooking beats and the sourcing card', () => {
  for (const food_style of ['Drop-off catering / buffet', 'Restaurant']) {
    test(`${food_style}: no plating, chafing or reheating beats`, () => {
      expect(cooking(pick(food_style))).toEqual([]);
    });
    test(`${food_style}: the candles and the slideshow cue stay`, () => {
      expect(segments(pick(food_style)).some((s) => /light candles; cue the slideshow/i.test(s))).toBe(true);
      expect(segments(pick(food_style)).some((s) => /Chill all wine/i.test(s))).toBe(true);
    });
    test(`${food_style}: no "How it’s sourced" card`, () => {
      expect(playbookFoodPlan(pick(food_style)).sourcingTiers).toEqual([]);
    });
  }

  test('a booked caterer settles the same call: no chafing beat', () => {
    const ev = wanda({ ros: [] });
    ev.vendors = ev.vendors.map((v) => (/cater/i.test(v.category) ? { ...v, status: 'Contracted' } : v));
    expect(cooking(ev)).toEqual([]);
    expect(playbookFoodPlan(ev).sourcingTiers).toEqual([]);
  });

  test('negative control: a host who cooks keeps the beats and the sourcing card', () => {
    const ev = pick('Host cooks');
    expect(segments(ev).some((s) => /fill the chafing dishes/i.test(s))).toBe(true);
    expect(segments(ev).some((s) => /reheat or stage/i.test(s))).toBe(true);
    expect(playbookFoodPlan(ev).sourcingTiers.length).toBeGreaterThan(0);
  });
});
