// ─── A ROOM RATE IS NOT A STAY (2026-08-06, review board second sitting) ────
//
// Both override seats found the same thing, independently, after the nightly-
// rate fix landed: a hotel's rate buys ONE ROOM, and the surface was still
// multiplying it by nights and dividing the result across the whole party. A
// $212 hotel read "$848 ÷ 10 ≈ $85 a person" when ten guests need about five
// rooms and the real figure is nearer $4,240.
//
// That is the third form of one defect — bed count read as capacity, then a
// nightly rate stored as a stay total, then a per-room total spread across the
// party. Each one survived because the number looked plausible.
//
// The rule these lock: we do not know the room count and will not derive one
// (a party does not divide into rooms by arithmetic — couples, children,
// singles). So a per-room rate produces NO stay total and NO per-person split,
// and the rate itself still shows, labelled as what it buys.
import { lodgingIntel, normalizeLodgingOption, lodgingCommitted, lodgingStage } from '../lodgingIntel';

const ev = (options, extra) => ({
  id: 'ev-rate', type: 'Birthday', isDestination: true,
  venueCity: 'Santa Fe, NM', date: '2027-09-15', endDate: '2027-09-19',
  guestCount: 10, lodgingOptions: options, ...extra,
});

const hotel = { id: 'h1', label: 'Inn of the Turquoise Bear', url: '', pricePerNight: 212, rateBasis: 'room' };
const house = { id: 'r1', label: 'The Ranch House', url: 'https://www.airbnb.com/rooms/1', pricePerNight: 212 };

describe('a per-room rate is never spread across the party', () => {
  test('rateBasis survives normalizeLodgingOption', () => {
    expect(normalizeLodgingOption(hotel).rateBasis).toBe('room');
    expect(normalizeLodgingOption(house).rateBasis).toBeNull();
    // Anything other than the one known basis is not carried through.
    expect(normalizeLodgingOption({ ...hotel, rateBasis: 'nonsense' }).rateBasis).toBeNull();
  });

  test('a hotel gets NO stay total — 212 x 4 nights is one room, not the stay', () => {
    const o = lodgingIntel(ev([hotel])).options[0];
    expect(o.perRoom).toBe(true);
    expect(o.allIn).toBeNull();
  });

  test('a whole-house rental is unchanged — its nightly rate really does buy the stay', () => {
    const o = lodgingIntel(ev([house])).options[0];
    expect(o.perRoom).toBe(false);
    expect(o.allIn).toBe(212 * 4);
  });

  test('no per-person split is offered for a per-room rate', () => {
    const o = lodgingIntel(ev([hotel])).options[0];
    const split = (o.checks || []).find((c) => c.key === 'split');
    expect(split).toBeUndefined();
    // …and the rental still gets one, so this suppression is targeted.
    const r = lodgingIntel(ev([house])).options[0];
    expect((r.checks || []).some((c) => c.key === 'split')).toBe(true);
  });

  test('the room rate is still SHOWN, and says what it buys', () => {
    const o = lodgingIntel(ev([hotel])).options[0];
    const total = (o.checks || []).find((c) => c.key === 'total');
    expect(total).toBeTruthy();
    expect(total.text).toMatch(/ONE ROOM/);
    // Honest about why there is no total, rather than silently omitting it.
    expect(total.text).toMatch(/How many rooms/);
  });

  test('the budget is not committed to a one-room figure', () => {
    // lodgingCommitted reads chosen.allIn, which is null for a per-room rate —
    // so a $212 room can never be booked as the whole lodging spend.
    expect(lodgingCommitted(ev([{ ...hotel, status: 'chosen' }]))).toBe(0);
  });
});

describe('unknown occupancy is not a fit', () => {
  test('a shortlist that never says how many it sleeps says so', () => {
    // Hotels never carry an occupancy figure, so this was the guaranteed
    // outcome once the hotel path shipped: the largest type on the screen read
    // "3 places, 3 that fit" while every card said "Fits 0 of your 3 musts".
    const s = lodgingStage(ev([hotel, { ...hotel, id: 'h2' }, { ...hotel, id: 'h3' }]));
    expect(s.title).toMatch(/none say how many they sleep/);
    expect(s.title).not.toMatch(/3 that fit/);
  });

  test('a known-fitting place still counts, and the unknowns are not counted with it', () => {
    const fits = { ...house, id: 'r2', sleeps: 12 };
    const s = lodgingStage(ev([fits, hotel]));
    expect(s.title).toMatch(/1 known to fit/);
  });

  test('when every place states its occupancy the wording is unchanged', () => {
    const a = { ...house, id: 'a', sleeps: 12 };
    const b = { ...house, id: 'b', sleeps: 14 };
    expect(lodgingStage(ev([a, b])).title).toBe('2 places, 2 that fit.');
  });
});
