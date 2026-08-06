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

// ─── THE TWO HALVES THAT WERE DARK (2026-08-06) ─────────────────────────────
// The board's event-industry seat ruled the room-block half the real wound:
// `goToLodgingCockpit` navigates away from the sheet that held the backups list
// and the who's-booked roster, and the file says so itself ("This sheet is
// unreachable now"). travelPlan and draftLodgingNote had computed and written
// both the whole time — they just had no reachable intake, so they read empty.
//
// These lock the ENGINE CONTRACT the reconnected intake writes against, so a
// future port cannot quietly write fields nothing reads (which is exactly how
// `bookingCode` vs `code` happened).
describe('the reconnected room-block intake feeds its engines', () => {
  const { buildTravelPlan } = require('../travelPlan');
  const { draftLodgingNote } = require('../doItForMe');

  const withGuests = (lodging, guests) => ({
    id: 'ev-block', type: 'Birthday', isDestination: true,
    venueCity: 'Santa Fe, NM', date: '2027-09-15', endDate: '2027-09-19',
    guestCount: 3, guests, lodging,
  });

  test('backups typed as {name, note} reach travelPlan and the guest note', () => {
    const ev = withGuests({
      hotelName: 'The Eldorado', code: 'NGW2027',
      backupOptions: [{ name: 'Hotel Santa Fe', note: 'Farther, cheaper' }, { name: '', note: 'dropped' }],
    }, []);
    const plan = buildTravelPlan(ev);
    // A row with no name is dropped by the engine — so the always-empty input
    // row the intake renders can never become a phantom backup.
    expect(plan.lodging.backupOptions).toEqual([{ name: 'Hotel Santa Fe', note: 'Farther, cheaper' }]);
    expect(String(draftLodgingNote(ev).body || draftLodgingNote(ev))).toMatch(/Hotel Santa Fe/);
  });

  test('who has not booked is counted off the guests the intake writes', () => {
    const guests = [
      { id: 'g1', name: 'Ada', rsvp: 'yes', travel: { lodging: { status: 'booked' } } },
      { id: 'g2', name: 'Grace', rsvp: 'yes', travel: { lodging: { status: 'not_started' } } },
      { id: 'g3', name: 'Kay', rsvp: 'yes' },
    ];
    const plan = buildTravelPlan(withGuests({ hotelName: 'The Eldorado' }, guests));
    expect(plan.lodging.roster).toHaveLength(3);
    // A guest with no lodging entry at all is not_started, never assumed booked.
    expect(plan.lodging.notBookedCount).toBe(2);
  });

  test('with NO guest list the count is null, never a confident zero', () => {
    const plan = buildTravelPlan(withGuests({ hotelName: 'The Eldorado' }, []));
    expect(plan.lodging.notBookedCount).toBeNull();
    expect(plan.lodging.roster).toEqual([]);
  });

  test('the status cycle the row taps through is the engine’s own', () => {
    const { nextLodgingStatus } = require('../travelPlan');
    expect(nextLodgingStatus('not_started')).toBe('booked');
    expect(nextLodgingStatus(nextLodgingStatus(nextLodgingStatus('not_started')))).toBe('not_started');
  });
});

// ─── "THE GROUP RATE" IS A CLAIM ABOUT A NEGOTIATION (2026-08-06) ───────────
// stayFromPick fills `lodging.rate` from the chosen option's nightly price —
// which for a hotel row was READ off a Google card. The guest note then told
// the group "The group rate is $X a night", asserting a negotiation that never
// happened, on the one artifact that leaves the app. A rate the host typed off
// her own confirmation IS a group rate; a rate we read off a listing is not.
describe('the guest note only claims a group rate when there was one', () => {
  const { draftLodgingNote } = require('../doItForMe');
  const base = {
    id: 'ev-note2', type: 'Birthday', isDestination: true,
    venueCity: 'Santa Fe, NM', date: '2027-09-15', endDate: '2027-09-19', guestCount: 10,
  };
  const body = (lodging) => String(draftLodgingNote({ ...base, lodging }).body || '');

  test('a rate the host typed off her confirmation is a GROUP rate', () => {
    const t = body({ hotelName: 'The Eldorado', rate: 189, from: 'typed off the confirmation' });
    expect(t).toMatch(/The group rate is \$189 a night/);
  });

  test('a rate carried in from a shortlist pick is just "the rate"', () => {
    const t = body({ hotelName: 'The Eldorado', rate: 212, from: STAY_FROM_PICK });
    expect(t).toMatch(/The rate is \$212 a night/);
    expect(t).not.toMatch(/group rate is/);
  });

  test('the front door’s write reads as a real booking, not a pick', () => {
    // What AlreadySorted patches: a name the host typed, and `from` set to
    // anything other than the pick. That is exactly what unlocks the room-block
    // panels, which previously sat behind a shortlist choice.
    const ev = { ...base, lodging: { hotelName: 'The Eldorado', from: 'typed off the confirmation', rate: 189 } };
    expect(lodgingIsHeld(ev)).toBe(true);
    expect(lodgingStage(ev).stage).toBe('booked');
  });
});
