// ─── THE REVEAL NAMES LODGING (destination gap, 2026-08-03) ────────────────
//
// Driven on the canonical Santa Fe 80th (10 guests, Jun 17–21): lodging is the
// FIRST domino on a destination event — phaseProgress ranks the lodging axis at
// priority 4, above location and food, and `dest_lodging` declares
// blocks:['vendors','food'] — yet the reveal enumerated timeline, food,
// shopping, guests, budget and vendors and never once said where anyone sleeps.
// The one decision that gates the food plan was the one decision the screen
// that promises "nothing made up" left out entirely.
//
// This gate holds three rules:
//   1. a destination event gets a lodging stage, ordered AHEAD of food;
//   2. a non-destination event never gets one;
//   3. an unpicked stay says so — the stage never invents a property name,
//      and the kitchen fact stays three-valued (true / false / NOT TOLD).
const { buildAssembleRevealStages } = require('../assembleRevealEngines');

const evt = (over) => ({
  id: 'ev-santafe-80',
  name: 'Mom’s 80th',
  type: 'Birthday',
  date: '2027-06-17',
  endDate: '2027-06-21',
  venue: 'Santa Fe, NM',
  guestMode: 'count',
  guestEstimate: 10,
  isDestination: true,
  budget: [], vendors: [], guests: [],
  ...over,
});

const stagesFor = (over) => buildAssembleRevealStages(evt(over), null, null, {}) || [];
const lodgingOf = (stages) => stages.find((s) => s && s.key === 'lodging') || null;

describe('the reveal names where everyone stays', () => {
  it('gives a destination event a lodging stage, ordered ahead of food', () => {
    const stages = stagesFor();
    const keys = stages.map((s) => s && s.key);
    expect(keys).toContain('lodging');

    // Ordering is the point: the first domino is met first when read top-down.
    const iLodging = keys.indexOf('lodging');
    const iFood = keys.indexOf('food');
    if (iFood !== -1) expect(iLodging).toBeLessThan(iFood);
  });

  it('never gives a non-destination event a lodging stage', () => {
    const keys = stagesFor({ isDestination: false }).map((s) => s && s.key);
    expect(keys).not.toContain('lodging');
    expect(stagesFor({ isDestination: undefined }).map((s) => s && s.key)).not.toContain('lodging');
  });

  it('says an unpicked stay is unpicked, and invents no property name', () => {
    const st = lodgingOf(stagesFor());
    expect(st).toBeTruthy();
    expect(st.what).toMatch(/not picked yet/i);
    expect(st.status).toBe('Awaiting Decision');
    // The span is the host's own dates — five nights, stated, not guessed.
    expect(st.what).toMatch(/4 nights/);
  });

  it('reads the kitchen fact three ways and never assumes a hotel', () => {
    // A pasted whole-home listing: a kitchen is what the host is booking.
    const rental = lodgingOf(stagesFor({
      lodgingOptions: [{ url: 'https://www.airbnb.com/rooms/12345', status: 'chosen', label: 'The Ranch House' }],
    }));
    expect(rental.why).toMatch(/grocery run/i);

    // A room block IS a hotel — that is what a block is.
    const block = lodgingOf(stagesFor({ foodChoices: { dest_lodging: 'A room block, no commitment' } }));
    expect(block.why).toMatch(/reservations/i);

    // NOT TOLD stays not told: no kitchen claim in either direction.
    const untold = lodgingOf(stagesFor({ foodChoices: { dest_lodging: 'Guests book on their own' } }));
    expect(untold.why).not.toMatch(/grocery run|no kitchen/i);
    expect(untold.why).toMatch(/decides the food plan/i);
  });
});
