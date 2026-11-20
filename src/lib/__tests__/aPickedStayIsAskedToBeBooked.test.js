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
