// ─── THE FOOD PLAN STATES ITS SCOPE, IT DOES NOT INVENT SCALE ──────────────
//
// Live on the Santa Fe 80th (10 guests, Jun 17–21): the plan produced "4 items
// for 10 guests" for a FIVE-DAY trip and offered a shopping list regardless of
// whether the host had booked a resort with no kitchen. That item count sizes
// ONE gathering; a five-day rental is roughly fifteen meals.
//
// The tempting fix — multiply by the day count — is the one thing this must
// never do. The published corpus has ZERO entries on lodging, kitchens or
// multi-day meal structure, so a scaled number would be invented, not planned.
// This gate holds the honest behaviour: disclose the scope, keep the three-
// valued kitchen fact, and never fabricate quantities.
const { foodSpanNote, foodSpanText } = require('../foodSpan');

const evt = (over) => ({
  id: 'ev-span', name: 'Mom’s 80th', type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, budget: [], vendors: [], guests: [],
  ...over,
});

describe('food plan scope across a span', () => {
  it('says nothing at all for a single-day event', () => {
    expect(foodSpanNote(evt({ endDate: null }))).toBeNull();
    expect(foodSpanNote(evt({ endDate: '2027-06-17' }))).toBeNull();
    expect(foodSpanText(evt({ endDate: null }))).toBeNull();
    expect(foodSpanNote(null)).toBeNull();
  });

  it('names the real day count and never multiplies anything', () => {
    const n = foodSpanNote(evt());
    expect(n.days).toBe(5);
    expect(n.nights).toBe(4);
    expect(n.text).toMatch(/main gathering/i);
    expect(n.text).toMatch(/5 days/);
    // No quantity is ever produced here — scope only.
    expect(n).not.toHaveProperty('items');
    expect(n).not.toHaveProperty('scaled');
  });

  it('keeps the kitchen fact three-valued', () => {
    // Whole-home rental → kitchen, so the remaining meals are still the host's.
    const rental = foodSpanNote(evt({
      lodgingOptions: [{ url: 'https://www.vrbo.com/1234', status: 'chosen' }],
    }));
    expect(rental.kitchen).toBe(true);
    expect(rental.listApplies).toBe(true);
    expect(rental.text).toMatch(/kitchen/i);

    // A room block IS a hotel → a grocery list is not the plan.
    const hotel = foodSpanNote(evt({ foodChoices: { dest_lodging: 'A room block I guarantee fills' } }));
    expect(hotel.kitchen).toBe(false);
    expect(hotel.listApplies).toBe(false);
    expect(hotel.text).toMatch(/not the plan for a hotel stay/i);

    // NOT TOLD stays not told — no kitchen claim in either direction.
    const untold = foodSpanNote(evt({ foodChoices: { dest_lodging: 'Guests book on their own' } }));
    expect(untold.kitchen).toBeNull();
    expect(untold.listApplies).toBeNull();
    expect(untold.text).not.toMatch(/has a kitchen|no kitchen|hotel stay/i);
    expect(untold.text).toMatch(/where everyone stays decides/i);
  });
});
