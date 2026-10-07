// ─── THE REVEAL SAID 4 ITEMS FOR AN 8-ROW LIST ────────────────────────────
//
// On the screen that closes with "All of this came straight from your answers
// — nothing made up", the shopping stage told the Santa Fe host "4 items,
// ready to check off." The list it was describing had eight rows.
//
// WHY IT WAS MISSED, and it is not inattention. `shopTally` in HostShellV2 is
// a React useMemo, and its own comment scopes the 2026-09-27 fix to "the three
// readouts that price the whole list". That was a true statement about
// everything visible from where the author stood — the fourth readout is in
// `assembleRevealEngines.js`, a different module, which a shell-local memo
// cannot reach. The fix's SHAPE forbade its fourth site.
//
// `itemCount` IS NOT WIDENED, and that is deliberate. HostShellV2's comment
// says why: it means "the food is shopped" to the readiness gate, to
// dayBefore's RECON-I5 and to the nav row, all correct as they stand, and
// widening it would move four consumers to fix one sentence. So the engine
// gains an ADDITIVE accessor and the two surfaces that want the whole list
// read it instead of each summing their own.
import { playbookFoodPlan } from '../playbooks';

const EV = {
  id: 'rc', name: "Mom's 80th", type: 'Birthday', date: '2027-06-14', endDate: '2027-06-17',
  venueCity: 'Santa Fe', state: 'NM', guestMode: 'count', guestCount: 30, isDestination: true,
};

describe('the shopping count is the whole shopping list', () => {
  const fp = playbookFoodPlan(EV);

  test('(premise) this event really does have supplies as well as food', () => {
    // Without this the assertion below passes on any event with none.
    expect(fp).toBeTruthy();
    expect(fp.itemCount).toBeGreaterThan(0);
    expect(fp.suppliesCount).toBeGreaterThan(0);
  });

  test('THE ACCESSOR: shoppingCount is every active line, food and supplies', () => {
    expect(fp.shoppingCount).toBe(fp.itemCount + fp.suppliesCount);
    // …and it is genuinely bigger than the food-only figure the reveal used.
    expect(fp.shoppingCount).toBeGreaterThan(fp.itemCount);
  });

  test('…and it counts the rendered list, not a parallel arithmetic', () => {
    // The honest check: against the rows themselves, so the accessor cannot
    // drift from what a host sees by both sides making the same mistake.
    const active = (fp.list || []).filter((i) => !i.skipped).length;
    expect(fp.shoppingCount).toBe(active);
  });

  test('ITEMCOUNT IS UNTOUCHED — four other consumers depend on its meaning', () => {
    expect(fp.itemCount).toBe((fp.list || []).filter((i) => !i.skipped && i.group !== 'Supplies').length);
    expect(fp.itemCount).toBeLessThan(fp.shoppingCount);
  });

  test('BOUGHT TRAVELS WITH IT, or a progress line lies the other way', () => {
    expect(fp.shoppingBought).toBe((fp.boughtCount || 0) + (fp.suppliesBought || 0));
    expect(fp.shoppingBought).toBeLessThanOrEqual(fp.shoppingCount);
  });
});
