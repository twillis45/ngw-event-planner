// ─── $333 OF GROCERIES FOR A ROOM WITH NO STOVE ──────────────────────────────
//
// The kitchen gate withheld the shopping list on a no-kitchen destination stay.
// `hostSpending` — the ONE spending source every host budget surface reads —
// never learned. Measured on the Santa Fe 80th (10 guests, Jun 17-21) before
// the fix, with the room-block answer stored:
//
//   HOTEL   listApplies false   foodEstimate 280   supplies 53   committed 434
//   RENTAL  listApplies true    foodEstimate 280   supplies 53   committed 434
//   UNTOLD  listApplies null    foodEstimate 280   supplies 53   committed 434
//
// Byte-identical across all three. The budget carried $333 of groceries for a
// kitchen the app itself had just finished saying does not exist.
//
// EVERY OTHER ITEM CHANGE ALREADY FLOWED, which is why this one mattered and is
// the reason the fix is a gate and not a rewrite. Measured on the same fixture:
// skipping a food line moves foodEstimate 280 -> 105, skipping a supply moves
// suppliesEstimate 53 -> 48, locking one price moves 280 -> 115. Those are
// asserted below as the control group: they must keep working.
//
// THE FIX IS A REFUSAL, NOT A NEW NUMBER. People still eat on a hotel trip and
// it very likely costs MORE than the groceries removed — but all 226 cost
// citations in the corpus price GROCERY lines, and a restaurant band for ten
// people is a figure nobody researched. So the term is withdrawn and the hole
// is REPORTED (`foodUnpriced`), because withdrawing it makes `uncommitted`
// BIGGER and a host reading more headroom than they have is worse off than one
// reading the wrong basis.
import { hostSpending } from '../hostSpending';
import { playbookFoodPlan } from '../playbooks';
import { foodSpanNote } from '../foodSpan';

const base = (extra) => ({
  id: 'b', name: "Mom's 80th", type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'count', guestCount: 10, totalBudget: 4000,
  budget: [], vendors: [], guests: [], ...extra,
});
// `kitchenSignal` matches /house/ for the rental and /room block/ for the hotel.
const HOTEL = base({ foodChoices: { dest_lodging: 'A room block I guarantee fills' } });
const RENTAL = base({ foodChoices: { dest_lodging: 'A house we rent for everyone' } });
const UNTOLD = base({});

describe('the budget follows the list it is pricing', () => {
  test('(premise) the three fixtures really do differ on the kitchen question', () => {
    // Without this the assertions below could all be reading one branch.
    expect(foodSpanNote(HOTEL).listApplies).toBe(false);
    expect(foodSpanNote(RENTAL).listApplies).toBe(true);
    expect(foodSpanNote(UNTOLD).listApplies).toBe(null);
  });

  test('(premise) a kitchen event really is priced — so the absence below means something', () => {
    const s = hostSpending(RENTAL, 1);
    expect(s.foodEstimate).toBeGreaterThan(0);
    expect(s.suppliesEstimate).toBeGreaterThan(0);
    expect(s.hasFood).toBe(true);
  });

  test('THE FIX: a room block carries no grocery money at all', () => {
    const s = hostSpending(HOTEL, 1);
    expect(s.foodEstimate).toBe(0);
    expect(s.suppliesEstimate).toBe(0);
    expect(s.hasFood).toBe(false);
  });

  test('the withheld list actually moves the headline the host reads', () => {
    // A flag nothing spends is not a fix. `committed` and `uncommitted` are the
    // two numbers on screen, and they must both move.
    const hotel = hostSpending(HOTEL, 1);
    const rental = hostSpending(RENTAL, 1);
    expect(hotel.committed).toBeLessThan(rental.committed);
    expect(hotel.uncommitted).toBeGreaterThan(rental.uncommitted);
  });

  test('the hole is REPORTED, not silently left as a smaller number', () => {
    // Withdrawing the estimate makes the headroom bigger. Without this flag the
    // surface cannot tell the host why, and the fix would leave them worse off.
    expect(hostSpending(HOTEL, 1).foodUnpriced).toBe(true);
    expect(hostSpending(RENTAL, 1).foodUnpriced).toBe(false);
    expect(hostSpending(UNTOLD, 1).foodUnpriced).toBe(false);
  });

  test('foodUnpriced separates "we declined to price it" from "nothing to price"', () => {
    // Only the first owes the host a sentence. An event with no countable guests
    // has no food figure to withdraw, so it must not claim one was withheld.
    const noCount = { ...HOTEL, guestCount: 0, guestEstimate: 0, guests: [] };
    const s = hostSpending(noCount, 1);
    expect(s.foodEstimate).toBe(0);
    expect(s.foodUnpriced).toBe(false);
  });

  test('money already spent survives the gate — answering does not un-buy a shop', () => {
    // A host who shopped and THEN told us it is a room block has really spent
    // that money. Only the forward-looking estimate is withdrawn.
    const plan = playbookFoodPlan(RENTAL, { priceFactor: 1 });
    const firstFood = plan.list.find((i) => i && i.group !== 'Supplies' && !i.skipped);
    const shopped = { ...HOTEL, foodGot: { [firstFood.id]: true } };
    const s = hostSpending(shopped, 1);
    expect(s.foodBought).toBeGreaterThan(0);
    expect(s.spent).toBeGreaterThanOrEqual(s.foodBought);
    expect(s.foodEstimate).toBe(0);
  });

  test('NEGATIVE CONTROL: no restaurant figure was invented to replace it', () => {
    // The tempting fix. Every food term must be a real zero, not a re-badged
    // band — if any of these grew a number, something authored one.
    const s = hostSpending(HOTEL, 1);
    expect(s.foodEstimate).toBe(0);
    expect(s.foodBought).toBe(0);
    expect(s.suppliesEstimate).toBe(0);
    // And the total is exactly the non-food remainder, with nothing slipped in.
    const rental = hostSpending(RENTAL, 1);
    expect(rental.committed - s.committed).toBe(rental.foodEstimate + rental.suppliesEstimate);
  });

  test('NEGATIVE CONTROL: an UNTOLD kitchen still gets its estimate', () => {
    // Same asymmetry the gate itself draws. Not being asked is not being told no.
    const s = hostSpending(UNTOLD, 1);
    expect(s.foodEstimate).toBeGreaterThan(0);
    expect(s.suppliesEstimate).toBeGreaterThan(0);
    expect(s.foodUnpriced).toBe(false);
  });

  test('NEGATIVE CONTROL: a LOCAL event is untouched, even holding the answer', () => {
    // Seeded WITH the room-block answer. The gate rides on the destination food
    // span, so a backyard party must keep its money — this would fail if the
    // budget read the lodging answer directly instead of the span.
    const local = base({
      isDestination: false, endDate: undefined, venueCity: 'Silver Spring', state: 'MD',
      foodChoices: { dest_lodging: 'A room block I guarantee fills' },
    });
    const s = hostSpending(local, 1);
    expect(s.foodEstimate).toBeGreaterThan(0);
    expect(s.foodUnpriced).toBe(false);
  });

  test('CONTROL GROUP: the item changes that already worked still work', () => {
    // The whole reason this fix is one gate and not a rewrite. If any of these
    // three regress, the budget has stopped following the list for a reason
    // that has nothing to do with kitchens.
    const plan = playbookFoodPlan(RENTAL, { priceFactor: 1 });
    const foodIds = plan.list.filter((i) => i && i.group !== 'Supplies').map((i) => i.id);
    const supIds = plan.list.filter((i) => i && i.group === 'Supplies').map((i) => i.id);
    const b0 = hostSpending(RENTAL, 1);

    const skipFood = hostSpending({ ...RENTAL, foodSkip: { [foodIds[0]]: true } }, 1);
    expect(skipFood.foodEstimate).toBeLessThan(b0.foodEstimate);

    const skipSup = hostSpending({ ...RENTAL, foodSkip: { [supIds[0]]: true } }, 1);
    expect(skipSup.suppliesEstimate).toBeLessThan(b0.suppliesEstimate);

    const locked = hostSpending({ ...RENTAL, foodLocked: { [foodIds[0]]: 12 } }, 1);
    expect(locked.foodEstimate).not.toBe(b0.foodEstimate);
  });
});
