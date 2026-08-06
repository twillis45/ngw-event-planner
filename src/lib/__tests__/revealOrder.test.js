// ── THE REVEAL TELLS THE STORY IN THE ORDER IT WAS DERIVED (2026-08-05) ──────
// Driven on a Santa Fe 80th: the reveal announced "4 items for 10 guests" three
// stages before it announced the ten guests, and opened on "11 moments, hour by
// hour" — a day assembled from a stay and a menu it had not mentioned yet. The
// facts were all true and the sequence made them hard to believe.
//
// The order is the causal chain: who is coming sizes everything; where they
// sleep decides whether food is a grocery run or reservations; the shopping
// list falls out of the menu; the day is assembled from all of it, last.
const { buildAssembleRevealStages } = require('../assembleRevealEngines');

const evt = {
  id: 'ro-80th', name: "Linda's 80th", type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21', venue: 'Santa Fe, NM',
  guestMode: 'count', guestEstimate: 10, isDestination: true,
  totalBudget: 4000, budget: [], guests: [], vendors: [], timeline: [],
};

const keysOf = () => (buildAssembleRevealStages(evt, null, null, {}) || []).map((s) => s && s.key);

describe('the reveal order follows the derivation', () => {
  const keys = keysOf();
  const at = (k) => keys.indexOf(k);

  test('every domain the fixture earns actually appears', () => {
    expect(keys).toEqual(expect.arrayContaining(['guests', 'lodging', 'food', 'shopping', 'timeline']));
  });

  test('the head count leads every number it sizes', () => {
    for (const k of ['food', 'shopping', 'timeline']) expect(at('guests')).toBeLessThan(at(k));
  });

  test('where everyone sleeps still comes before what everyone eats', () => {
    expect(at('lodging')).toBeLessThan(at('food'));
  });

  test('the shopping list follows the menu it is drawn from', () => {
    expect(at('food')).toBeLessThan(at('shopping'));
  });

  test('the day is assembled last of the planning beats, not promised first', () => {
    for (const k of ['guests', 'lodging', 'food', 'shopping']) expect(at(k)).toBeLessThan(at('timeline'));
  });
});
