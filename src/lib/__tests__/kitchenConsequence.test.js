// ─── THE LODGING SURFACE STATES WHAT THE LODGING DECISION DOES ─────────────
//
// Workflow census 2026-08-03: `lodgingKitchen` had ZERO render sites on the
// lodging surface. The host answered "where does everyone sleep" there and the
// consequence appeared only on the food sheet and the reveal.
//
// The compounding defect: `dest_lodging` is REMOVED whenever a `lodging` or
// `room_block` base decision already exists (playbooks/index.js:756), so on
// those events the multiple-choice path never appears and the ONLY source is a
// pasted rental URL. A host who books a hotel by phone reached
// `kitchen === null` permanently and the food plan never learned.
//
// This gate holds: the consequence is stated, NOT TOLD is offered an answer in
// place, and answering writes the same field the playbook writes so there is
// never a second source of truth.
const { kitchenConsequence, KITCHEN_ANSWERS, lodgingKitchen } = require('../lodgingIntel');

const evt = (over) => ({
  id: 'ev-kitchen', name: 'Mom’s 80th', type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, budget: [], vendors: [], guests: [],
  ...over,
});

describe('the kitchen consequence on the lodging surface', () => {
  it('says nothing on a non-destination event', () => {
    expect(kitchenConsequence(evt({ isDestination: false }))).toBeNull();
    expect(kitchenConsequence(evt({ isDestination: undefined }))).toBeNull();
    expect(kitchenConsequence(null)).toBeNull();
  });

  it('names the grocery-run consequence when there is a kitchen', () => {
    const kc = kitchenConsequence(evt({
      lodgingOptions: [{ url: 'https://www.airbnb.com/rooms/9', status: 'chosen' }],
    }));
    expect(kc.state).toBe('kitchen');
    expect(kc.answered).toBe(true);
    expect(kc.detail).toMatch(/grocery run/i);
    expect(kc.answers).toHaveLength(0);
  });

  it('names the reservations consequence for a room block', () => {
    const kc = kitchenConsequence(evt({ foodChoices: { dest_lodging: 'A room block, no commitment' } }));
    expect(kc.state).toBe('no-kitchen');
    expect(kc.detail).toMatch(/reservations/i);
    expect(kc.detail).toMatch(/not the plan for a hotel stay/i);
  });

  it('offers an answer in place when nothing has told us — never assumes a hotel', () => {
    const kc = kitchenConsequence(evt());
    expect(kc.state).toBe('untold');
    expect(kc.answered).toBe(false);
    expect(kc.headline).toMatch(/nobody has told us/i);
    // No claim in either direction.
    expect(kc.detail).not.toMatch(/there is a kitchen|there is no kitchen/i);
    expect(kc.answers.length).toBe(2);
  });

  it('routes both answers back through the SAME field lodgingKitchen reads', () => {
    for (const a of KITCHEN_ANSWERS) {
      const after = evt({ foodChoices: { dest_lodging: a.pick } });
      // The answer the surface offers must actually produce the kitchen value
      // it promises — otherwise the button lies.
      expect(lodgingKitchen(after)).toBe(a.kitchen);
      expect(kitchenConsequence(after).answered).toBe(true);
      expect(kitchenConsequence(after).state).toBe(a.kitchen ? 'kitchen' : 'no-kitchen');
    }
  });

  it('still resolves when dest_lodging was never offered by the playbook', () => {
    // The suppressed case (playbooks/index.js:756): no dest_lodging answer will
    // ever arrive from the decision board, so the surface must be the path.
    const suppressed = evt({ foodChoices: {} });
    expect(kitchenConsequence(suppressed).state).toBe('untold');
    const answered = evt({ foodChoices: { dest_lodging: KITCHEN_ANSWERS[1].pick } });
    expect(kitchenConsequence(answered).state).toBe('no-kitchen');
  });
});
