// ─── A PICKED STAY IS ASKED TO BE BOOKED (owner ruling, 11/20/2026) ──────────
// A stay is done only when it is booked (lodgingIsHeld). A pick or a plan is
// not done — and the ask that remains is to book THAT place, named, not the
// generic "Sort where everyone stays" over a stay the host already chose.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { lodgingIsHeld, STAY_FROM_PICK, STAY_FROM_PLAN } from '../lodgingIntel';

const now = new Date(2026, 10, 20, 12);
const trip = (lodging) => ({
  id: 'hc-stay', type: 'Bachelorette Party', date: '2026-12-20', guestEstimate: 8,
  isDestination: true, venue: 'The Inn on the Plaza', venueCity: 'Santa Fe, NM', vendors: [], timeline: [], guests: [], lodging,
});
const stay = (ev) => deriveEventPhaseProgress(ev, now).items.find((i) => i.id === 'lodging');

test.each([[STAY_FROM_PICK], [STAY_FROM_PLAN]])('a stay from %s is open and asks to book it by name', (from) => {
  const ev = trip({ hotelName: 'La Fonda', from });
  expect(lodgingIsHeld(ev)).toBe(false);
  expect(stay(ev).handled).toBe(false);
  expect(stay(ev).cueLabel).toBe('Book La Fonda');
});
test('a booking code on file makes it done', () => {
  const ev = trip({ hotelName: 'La Fonda', from: STAY_FROM_PICK, code: 'BACH26' });
  expect(stay(ev).handled).toBe(true);
});
test('control: nothing picked still asks to sort it out', () => {
  expect(stay(trip(undefined)).cueLabel).toBe('Sort where everyone stays');
});

// ── GUESTS BOOK ON THEIR OWN (owner ruling, 11/20/2026) ──────────────────────
// The same booked-is-done rule, per guest: under a self-book plan the stay is
// done once every guest on the roster has a booked room (the roster's own
// per-guest status, booked or confirmed). Until then the ask names the count.
// An empty roster under a self-book plan is not done.
describe('a self-book plan', () => {
  const selfBook = (guests) => ({
    ...trip(undefined), guestMode: 'list', guests,
    foodChoices: { dest_lodging: 'Guests book on their own' },
  });
  const g = (name, status) => ({ id: name, name, rsvp: 'Yes', travel: status ? { lodging: { status } } : {} });

  test('is done once every guest on the roster has a booked room', () => {
    const ev = selfBook([g('Jordan Avery', 'booked'), g('Riley Park', 'confirmed'), g('Sam Okafor', 'booked')]);
    expect(lodgingIsHeld(ev)).toBe(true);
    expect(stay(ev).handled).toBe(true);
  });
  test('asks how many still need a room until then', () => {
    const ev = selfBook([g('Jordan Avery', 'booked'), g('Riley Park'), g('Sam Okafor')]);
    expect(lodgingIsHeld(ev)).toBe(false);
    expect(stay(ev).handled).toBe(false);
    expect(stay(ev).cueLabel).toBe('2 guests still need a room');
  });
  test('an empty roster is not done', () => {
    const ev = selfBook([]);
    expect(lodgingIsHeld(ev)).toBe(false);
    expect(stay(ev).handled).toBe(false);
  });
  test('control: every guest booked, but no self-book plan told — not done by the roster', () => {
    const ev = { ...selfBook([g('Jordan Avery', 'booked')]), foodChoices: {} };
    expect(lodgingIsHeld(ev)).toBe(false);
  });
});
