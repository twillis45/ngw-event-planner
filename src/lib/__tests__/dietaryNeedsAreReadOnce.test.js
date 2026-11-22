// ─── DIETARY NEEDS ARE READ ONCE (Wanda audit P0-13, P1-14, P1-3; 11/22/2026) ─
//
// The Wanda sample is a headcount event (guestMode 'count', 75 heads) whose
// guest rows carry real meals: Vida Haynes "Vegetarian", Chaplain Ellis
// "Gluten-free". Four screens knew it (the estimate's flags, the seating chips,
// the guest rows). Two said "none": the hero asked "Who has a food allergy?"
// with Vegetarian 0, and the Plan tab read "Dietary needs · none yet".
//
// The cause was one early return: `dietaryResolved` answered "headcount mode,
// nothing to read" before it read the guests' meal fields, and the counts the
// steppers show read `dietCounts` only. Now one reader, `dietCountsFor`,
// counts the host's own tallies where she gave them and the guest rows
// everywhere else, and `dietaryResolved` reads the rows in either mode.
//
// P1-14: noting the needs said "the menu is good to go." while menu calls
// were still open. The receipt says only what is true.
// P1-3: noting the needs filed Retirement's invite call ("Invite + RSVP +
// dietary/allergy + accessibility ask") as "Collected". The board now uses
// the one dietary rule, `isDietaryChoice`.
import WANDA from '../../data/wandaGoldEvent';
import { playbookFoodPlan, playbookDecisionBoard, dietaryNotedReceipt, openFoodChoices } from '../playbooks';
import { dietCountsFor, dietRowsFor, anyDietFlagged } from '../dietRows';
import { useFrozenClock } from '../../testUtils/frozenClock';

useFrozenClock();

const wanda = (over = {}) => ({ ...JSON.parse(JSON.stringify(WANDA)), ...over });

describe('the guest rows count, in headcount mode too', () => {
  test('Wanda: one vegetarian and one gluten-free, from the meals on her rows', () => {
    const dc = dietCountsFor(wanda());
    expect(dc.Vegetarian).toBe(1);
    expect(dc['Gluten-free']).toBe(1);
    // A meal choice is not a diet.
    expect(dc.Beef).toBeUndefined();
    expect(dc.Chicken).toBeUndefined();
  });

  test('the steppers and the Plan row read the same counts', () => {
    const ev = wanda();
    expect(anyDietFlagged(ev)).toBe(true);
    const dr = dietRowsFor(ev);
    expect(dr.active).toEqual(expect.arrayContaining(['Vegetarian', 'Gluten-free']));
    expect(dr.flaggedCount).toBe(2);
  });

  test('the food plan counts the needs as known, so the hero stops asking', () => {
    expect(playbookFoodPlan(wanda()).dietaryResolved).toBe(true);
  });

  test("the host's own count wins over the rows, zero included", () => {
    const dc = dietCountsFor(wanda({ dietCounts: { Vegetarian: 0, Vegan: 2 } }));
    expect(dc.Vegetarian).toBe(0);
    expect(dc.Vegan).toBe(2);
    expect(dc['Gluten-free']).toBe(1);
  });

  test('a guest who said no is not counted', () => {
    const ev = wanda();
    ev.guests = ev.guests.map((g) => (g.meal === 'Vegetarian' ? { ...g, rsvp: 'No' } : g));
    expect(dietCountsFor(ev).Vegetarian).toBeUndefined();
  });

  test('negative control: a headcount event with nothing recorded still asks', () => {
    const ev = wanda();
    ev.guests = ev.guests.map((g) => ({ ...g, meal: '' }));
    expect(anyDietFlagged(ev)).toBe(false);
    expect(playbookFoodPlan(ev).dietaryResolved).toBe(false);
  });
});

describe('noting the needs says only what is true (P1-14)', () => {
  test('with menu calls open, the receipt names them instead of "good to go"', () => {
    const ev = wanda({ dietaryNoted: true });
    const open = openFoodChoices(ev).length;
    expect(open).toBeGreaterThan(0);
    const r = dietaryNotedReceipt(ev);
    expect(r).not.toMatch(/good to go/i);
    expect(r).toMatch(new RegExp(`${open} menu call`));
  });

  test('with every menu call settled, it may say the menu is good to go', () => {
    const ev = wanda({
      dietaryNoted: true,
      foodChoices: { food_style: 'Drop-off catering / buffet', format: 'Buffet (mains + sides)', bar: 'Beer + wine only' },
    });
    expect(openFoodChoices(ev)).toEqual([]);
    expect(dietaryNotedReceipt(ev)).toBe('Dietary needs noted — the menu is good to go.');
  });
});

describe('the invite call is not the dietary question (P1-3)', () => {
  test('noting the needs does not file "Invite + RSVP + dietary/allergy…" as Collected', () => {
    const board = playbookDecisionBoard(wanda({ dietaryNoted: true }));
    const rows = [...(board.locked || []), ...(board.open || []), ...(board.deferred || [])];
    expect(rows.some((r) => r && r.id === 'invite')).toBe(true);
    expect((board.locked || []).filter((r) => r.because === 'Collected').map((r) => r.id)).toEqual([]);
    expect((board.locked || []).some((r) => r && r.id === 'invite')).toBe(false);
  });
});
