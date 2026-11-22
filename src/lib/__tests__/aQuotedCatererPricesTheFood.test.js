// ─── A QUOTED CATERER PRICES THE FOOD (Wanda audit P0-15, 11/22/2026) ────────
//
// The Wanda sample has Semper Catering Co. quoted at $1,500 for 75 and a $5,000
// budget. Three screens gave three money answers:
//   Spread       "$1,940–$5,340 estimate, all in" — a per-guest catering band,
//                as if no quote existed; picking catering did not move it.
//   Your money   "$5,263 expected · $263 over".
//   After        "$3,410 of headroom" beside "Expected total $5,263 · against
//                $5,000".
// Now a quoted or booked caterer's price replaces the catering band (the same
// line every money reader already sums), and After states the expected total
// it prints beside it.
import WANDA from '../../data/wandaGoldEvent';
import { playbookFoodPlan } from '../playbooks';
import { hostSpending } from '../hostSpending';
import { planHeadroomLine } from '../budgetCopy';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });
const catering = (ev) => playbookFoodPlan(ev).list.find((l) => l && l.id === 'fa-catering');
const withSemper = (ev, patch) => ({ ...ev, vendors: ev.vendors.map((v) => (v.id === 'ev-x-wanda-v2' ? { ...v, ...patch } : v)) });

describe('the quote replaces the catering band (P0-15)', () => {
  test("Semper's $1,500 quote is the catering line, named as a quote", () => {
    const line = catering(wanda());
    expect([line.low, line.high]).toEqual([1500, 1500]);
    expect(line.quotedBy).toEqual(expect.objectContaining({ name: 'Semper Catering Co.', status: 'Quoted' }));
  });

  test('a caterer only being considered, or with no price, leaves the band', () => {
    for (const patch of [{ status: 'Considering' }, { cost: 0 }]) {
      const line = catering(withSemper(wanda(), patch));
      expect(line.quotedBy).toBeUndefined();
      expect(line.high).toBeGreaterThan(line.low);
    }
  });

  test('a booked caterer outranks a quote, and a typed price on the line outranks both', () => {
    const ev = wanda();
    ev.vendors.push({ id: 'v-post', name: 'Post kitchen', category: 'Catering', status: 'Booked', cost: 1200 });
    expect(catering(ev).low).toBe(1200);
    expect(catering({ ...ev, foodLocked: { 'fa-catering': 1100 } }).locked).toBe(1100);
  });

  test('the spread and the money read the same food figure', () => {
    const ev = wanda();
    const plan = playbookFoodPlan(ev);
    const hs = hostSpending(ev);
    expect(hs.foodEstimate).toBe(Math.round((plan.foodLow + plan.foodHigh) / 2));
    expect(plan.foodLow).toBeGreaterThanOrEqual(1500);
  });
});

describe('After states the expected total it prints beside it (P0-15)', () => {
  test('Wanda is expected to run over, not to have $3,410 of headroom', () => {
    const hs = hostSpending(wanda());
    expect(hs.expected).toBeGreaterThan(hs.total);
    const line = planHeadroomLine({ planned: hs.total, expected: hs.expected, committed: hs.committed, spent: hs.spent }, false);
    expect(line).toMatch(/over the \$5,000 plan/);
    expect(line).not.toMatch(/headroom/);
    expect(line).toContain('$' + (hs.expected - hs.total).toLocaleString());
  });

  test('under the plan it names the headroom against the expected total', () => {
    expect(planHeadroomLine({ planned: 6000, expected: 5200, committed: 1500, spent: 800 }, false))
      .toBe('$800 of headroom against the $6,000 plan, expected — some of it is still an estimate.');
    expect(planHeadroomLine({ planned: 6000, expected: 5200, committed: 5200, spent: 800 }, false))
      .toBe('$800 of headroom against the $6,000 plan, expected.');
  });

  // UPDATED (audit 2 lane C P0-3, owner ruling D-03): after the day, over/under
  // is judged on EXPECTED cost too, so $5,300 expected against $5,000 is over
  // even with $4,700 recorded spent. It used to read "$300 under… spent".
  test('after the day it reads what was spent, on the expected basis', () => {
    expect(planHeadroomLine({ planned: 5000, expected: 5300, committed: 5300, spent: 4700 }, true))
      .toBe('Expected to land $300 over the $5,000 you planned — $4,700 recorded spent so far.');
    expect(planHeadroomLine({ planned: 5000, expected: 4800, committed: 4800, spent: 4700 }, true))
      .toBe('Landed inside the $5,000 you planned.');
  });

  test('no budget, no line', () => {
    expect(planHeadroomLine({ planned: 0, expected: 900 }, false)).toBe(null);
  });
});
