// ─── THE CATERER COOKS (Wanda audit P1-5, 11/22/2026) ────────────────────────
//
// Picking drop-off catering on the Wanda sample left the cooking in place:
// "Make-ahead food… prep buffet pans", the "Deli/proteins, produce…" run, and
// chafing dishes on both the spread and the rentals. A caterer or restaurant
// pick (or booking, which settles the same call) retires the steps and lines
// it covers; the cake, flowers and ice stay hers.
import WANDA from '../../data/wandaGoldEvent';
import { playbookFoodPlan, playbookChecklist, playbookCapacity } from '../playbooks';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });

describe('the caterer pick retires the cooking it covers (P1-5)', () => {
  const picked = () => wanda({ foodChoices: { food_style: 'Drop-off catering / buffet' } });

  test('no make-ahead cooking or deli/proteins run under a caterer', () => {
    const tasks = playbookChecklist(picked()).map((r) => r.task);
    expect(tasks.some((t) => /Make-ahead food/i.test(t))).toBe(false);
    expect(tasks.some((t) => /Deli\/proteins/i.test(t))).toBe(false);
    // The cake, flowers and ice are still hers.
    expect(tasks.some((t) => /cake, flowers, ice/i.test(t))).toBe(true);
  });

  test('no chafing dishes on the spread or the rentals under a caterer', () => {
    expect(playbookFoodPlan(picked()).list.some((l) => /chafing/i.test(l.item || ''))).toBe(false);
    expect(((playbookCapacity(picked()) || {}).items || []).some((r) => /chafing/i.test(r.item || ''))).toBe(false);
  });

  test('negative control: a host who cooks keeps all three', () => {
    const ev = wanda({ foodChoices: { food_style: 'Host cooks' } });
    const tasks = playbookChecklist(ev).map((r) => r.task);
    expect(tasks.some((t) => /Make-ahead food/i.test(t))).toBe(true);
    expect(tasks.some((t) => /Deli\/proteins/i.test(t))).toBe(true);
    expect(playbookFoodPlan(ev).list.some((l) => /chafing/i.test(l.item || ''))).toBe(true);
    expect(((playbookCapacity(ev) || {}).items || []).some((r) => /chafing/i.test(r.item || ''))).toBe(true);
  });
});
