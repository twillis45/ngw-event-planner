// ─── A CHEAPER BAR BEFORE NO BAR (Wanda audit P2-9, 11/22/2026) ──────────────
//
// The money fix on the Wanda sample said "drop “Open Bar” (~$700) and you're
// back under" while her drinks call offers "Limited / cash bar", which the plan
// prices for less. The fix offers the cheaper real option first.
import WANDA from '../../data/wandaGoldEvent';
import { pickDroppableBudgetRow, cheaperBarOption } from '../budgetSwap';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });

describe('the money fix offers the cheaper real option (P2-9)', () => {
  test('a cash bar, not "drop Open Bar", when the cash bar is enough', () => {
    const ev = wanda();
    const drop = pickDroppableBudgetRow(ev);
    expect(drop && drop.row.category).toBe('Open Bar');
    const alt = cheaperBarOption(ev, drop);
    expect(alt).toEqual(expect.objectContaining({ option: 'Limited / cash bar' }));
    expect(alt.cover).toBeGreaterThan(0);
    expect(alt.cover).toBeLessThan(drop.drop);
  });

  test('no bar row, no bar alternative', () => {
    const ev = wanda();
    expect(cheaperBarOption(ev, { row: ev.budget.find((r) => r.category === 'Photobooth'), drop: 450 })).toBe(null);
    expect(cheaperBarOption(ev, null)).toBe(null);
  });
});
