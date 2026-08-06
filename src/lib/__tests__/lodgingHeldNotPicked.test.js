// ─── CHOOSING IS NOT BOOKING, ON THE READINESS BOARD TOO (2026-08-06) ───────
//
// The review board's event-industry seat found the readiness engines and the
// lodging surface disagreeing about the same event. `lodgingStage` had the
// correct test — a name only counts as a booking when it did NOT come from the
// pick — while `phaseProgress` marked the whole lodging axis DONE on a bare
// `ev.lodging.hotelName`. `stayFromPick` writes exactly that field from a pick.
//
// So one press of "Make it the pick" flipped the command board to sorted with
// no rooms held, no booking code and no group-rate cutoff on file. Her ruling:
// for a group stay that is the worst possible moment to go quiet, because rooms
// sell out and the rate carries a deadline — the very reason this axis is
// ranked above food.
//
// lodgingIsHeld is now the one predicate both read. These lock it from both
// ends, so a future edit cannot re-open the gap on one side only.
import { lodgingIsHeld, stayFromPick, lodgingStage, STAY_FROM_PICK } from '../lodgingIntel';
import { deriveEventPhaseProgress } from '../phaseProgress';

const destEvent = (extra) => ({
  id: 'ev-held', type: 'Birthday', isDestination: true,
  venueCity: 'Santa Fe, NM', date: '2027-09-15', endDate: '2027-09-19',
  guestCount: 10,
  ...extra,
});

// Fixed "now" so the event stays pre_event and the lodging axis is emitted at
// all — liveProgress/postProgress build a different item set.
const NOW = new Date(2027, 0, 15, 9, 0, 0);
const lodgingAxis = (ev) => {
  const p = deriveEventPhaseProgress(ev, NOW) || {};
  const rows = [].concat(p.items || [], p.axes || []);
  return rows.find((r) => r && r.id === 'lodging') || null;
};

describe('a pick is not a hold', () => {
  test('lodgingIsHeld is false for a name written by the pick', () => {
    const ev = destEvent({ lodging: { hotelName: 'The Eldorado', from: STAY_FROM_PICK } });
    expect(lodgingIsHeld(ev)).toBe(false);
  });

  test('lodgingIsHeld is true once a name came from somewhere other than the pick', () => {
    const ev = destEvent({ lodging: { hotelName: 'The Eldorado', from: 'typed off the confirmation' } });
    expect(lodgingIsHeld(ev)).toBe(true);
  });

  test('a booking code alone is a hold, even with no name', () => {
    expect(lodgingIsHeld(destEvent({ lodging: { bookingCode: 'ABC123' } }))).toBe(true);
  });

  test('a money-safe date alone is a hold', () => {
    expect(lodgingIsHeld(destEvent({ moneyDates: { refundDeadline: '2027-08-01' } }))).toBe(true);
  });

  test('an event that has said nothing about lodging is not held', () => {
    expect(lodgingIsHeld(destEvent())).toBe(false);
    expect(lodgingIsHeld(null)).toBe(false);
  });

  test('stayFromPick — the real write path — does not read as held', () => {
    // Driven through the actual writer rather than hand-built: the 2026-08-04
    // note on lodgingStage records that the original gate passed only because
    // it hand-built the event, and nothing ever exercised the pick path.
    const ev = destEvent();
    const intel = { chosen: { id: 'o1', label: 'The Eldorado', url: '', totalPrice: null }, nights: 4 };
    const stay = stayFromPick(ev, intel);
    expect(String(stay.hotelName || '')).toBe('The Eldorado');
    expect(stay.from).toBe(STAY_FROM_PICK);
    expect(lodgingIsHeld({ ...ev, lodging: stay })).toBe(false);
  });

  test('the readiness board agrees with the lodging surface, not with hotelName', () => {
    const ev = destEvent();
    const intel = { chosen: { id: 'o1', label: 'The Eldorado', url: '' }, nights: 4 };
    const picked = { ...ev, lodging: stayFromPick(ev, intel) };
    const held = destEvent({ lodging: { hotelName: 'The Eldorado', from: 'typed off the confirmation' } });

    // The surface's own verdict
    expect(lodgingStage(picked).stage).not.toBe('booked');
    expect(lodgingStage(held).stage).toBe('booked');

    // …and the readiness axis must not claim more than the surface does.
    const pickedAxis = lodgingAxis(picked);
    expect(pickedAxis).toBeTruthy();
    expect(pickedAxis.handled).toBe(false);
    const heldAxis = lodgingAxis(held);
    expect(heldAxis).toBeTruthy();
    expect(heldAxis.handled).toBe(true);
  });
});

// ─── THE CODE REACHES THE GUESTS, OR IT IS NOT A DELIVERABLE (2026-08-06) ───
// Tracing the board's room-block ruling turned up a wiring break underneath it:
// the live cockpit wrote `lodging.bookingCode`, and every engine downstream
// reads `lodging.code` — travelPlan for the dated group-rate obligation, and
// draftLodgingNote for the guest note itself. So the host typed her code, saw
// it echoed back, and the note that goes to the group silently omitted it.
describe('the booking code and the rate deadline reach their engines', () => {
  const { draftLodgingNote } = require('../doItForMe');

  const heldEvent = (lodging) => ({
    id: 'ev-note', type: 'Birthday', isDestination: true,
    venueCity: 'Santa Fe, NM', date: '2027-09-15', endDate: '2027-09-19',
    guestCount: 10, lodging,
  });

  test('the guest note carries a code saved as `code`', () => {
    const note = draftLodgingNote(heldEvent({ hotelName: 'The Eldorado', code: 'NGW2027', rate: 218 }));
    expect(String(note && note.body ? note.body : note)).toMatch(/NGW2027/);
  });

  test('the guest note carries the group-rate cutoff', () => {
    const note = draftLodgingNote(heldEvent({ hotelName: 'The Eldorado', code: 'NGW2027', deadline: '2027-08-01' }));
    expect(String(note && note.body ? note.body : note)).toMatch(/Book by/);
  });

  test('a legacy event that only ever stored bookingCode still reads as held', () => {
    // Nothing migrates stored data behind the host, so the old key must keep
    // working — un-holding somebody's booked stay would be the worse bug.
    expect(lodgingIsHeld(heldEvent({ bookingCode: 'OLD123' }))).toBe(true);
    expect(lodgingIsHeld(heldEvent({ code: 'NEW123' }))).toBe(true);
  });
});
