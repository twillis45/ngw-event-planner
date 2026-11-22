// ─── A HEADCOUNT HOST WHO COOKS PRICES THE VEGETARIAN MAIN (Wanda audit follow-up, 11/22/2026) ──
//
// #224 made the guest rows count in headcount mode (dietCountsFor): Wanda's
// Dietary needs reads "Vegetarian 1" from Vida Haynes's row. The food plan
// sizes the protein and the vegetarian main from a different reader,
// appetite.js vegCount, which read guest rows only in roster mode. So a
// headcount host who cooks was shown "Vegetarian 1" and no vegetarian main,
// and the Plan's own promise, "Vegetarian and vegan counts add a real, priced
// main to the spread", was false for her. vegCount reads dietCountsFor now.
import WANDA from '../../data/wandaGoldEvent';
import { vegCount } from '../appetite';
import { dietCountsFor } from '../dietRows';
import { playbookFoodPlan } from '../playbooks';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });
const cooks = (over = {}) => wanda({ foodChoices: { food_style: 'Host cooks' }, ...over });
const vegMain = (ev) => playbookFoodPlan(ev).list.find((l) => l.id === 'diet-veg');

describe('the vegetarian main reads the one dietary count', () => {
  test('premise: headcount mode, and her rows say one vegetarian', () => {
    expect(wanda().guestMode).toBe('count');
    expect(dietCountsFor(wanda()).Vegetarian).toBe(1);
  });

  test('vegCount agrees with the Dietary needs count', () => {
    expect(vegCount(cooks())).toBe(1);
  });

  test('her spread carries a priced vegetarian main for one', () => {
    const line = vegMain(cooks());
    expect(line).toBeTruthy();
    expect(line.qty).toBe(1);
    expect(line.high).toBeGreaterThan(0);
  });

  test('her own tally still wins, zero included', () => {
    expect(vegCount(cooks({ dietCounts: { Vegetarian: 3 } }))).toBe(3);
    expect(vegCount(cooks({ dietCounts: { Vegetarian: 0 } }))).toBe(0);
    expect(vegMain(cooks({ dietCounts: { Vegetarian: 0 } }))).toBeUndefined();
  });
});
