// VENDORS ON THE DAY (B9, 11/26/2026). The alert engine (lib/dayAlerts) calls
// a booked vendor late ten minutes after their arrival time unless their
// arrivalStatus says 'arrived', but no hostv2 screen ever wrote that field (only
// the frozen legacy app's Arrivals tab did), so "X hasn't arrived — call now"
// could not be cleared. Shared now:
//   · vendorArrivalEdit: tap a vendor in (or mark them running late), the field
//     the alerts read; tap again to undo;
//   · vendorsToday: the booked vendors with an arrival time, in time order, with
//     their own answer through the brief link (confirmed, or something flagged).
import { vendorArrivalEdit, vendorsToday } from '../dayOfEdits';
import { computeDayAlerts } from '../dayAlerts';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock('2026-11-26T17:00:00.000Z');

// Arrival times are set from the LOCAL clock, as the alert engine reads it: CI
// also runs this suite in UTC-11 and UTC+14, where the frozen instant is 6:00
// and 7:00 AM, so a fixed "07:30" was not yet late there (11/26/2026, #305).
const hhmm = (minsAgo) => { const d = new Date(Date.now() - minsAgo * 60000); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const T1 = () => hhmm(120); // Bay Catering: two hours ago, so late
const T2 = () => hhmm(60);  // Rocco's: an hour ago

const EV = () => ({
  id: 'e', name: 'Thanksgiving', date: daysFromNow(0), guests: [], timeline: [],
  vendors: [
    { id: 'v2', name: 'Rocco’s Rentals', category: 'Rentals', status: 'Booked', bookingStatus: 'Booked', arrivalTime: T2(), phone: '(240) 555-0199' },
    { id: 'v1', name: 'Bay Catering', category: 'Catering', status: 'Booked', bookingStatus: 'Booked', arrivalTime: T1() },
    { id: 'v3', name: 'Maybe DJ', category: 'Music', status: 'Inquired', arrivalTime: '18:00' },
    { id: 'v4', name: 'Pat (friend)', isInformal: true, arrivalTime: '10:00' },
  ],
});
const lateFor = (ev, id) => computeDayAlerts(ev).some((a) => a.id === 'ov-' + id);

test('booked vendors with a time, earliest first, with their own answer', () => {
  const rows = vendorsToday(EV(), { v2: { state: 'confirmed' }, v1: { state: 'issue' } });
  expect(rows.map((r) => [r.id, r.time, r.answer, r.status])).toEqual([
    ['v1', T1(), 'flagged', null],
    ['v2', T2(), 'confirmed', null],
  ]);
  expect(rows[1].phone).toBe('(240) 555-0199');
});

test('marking a vendor here clears the late alert; tapping again undoes it', () => {
  const ev = EV();
  expect(lateFor(ev, 'v1')).toBe(true);
  const ed = vendorArrivalEdit(ev, 'v1', 'arrived');
  expect(ed.msg).toBe('Bay Catering is here.');
  const after = { ...ev, ...ed.patch };
  expect(lateFor(after, 'v1')).toBe(false);
  const back = vendorArrivalEdit(after, 'v1', 'arrived');
  expect(back.patch.vendors.find((v) => v.id === 'v1').arrivalStatus).toBe(null);
  expect(lateFor({ ...after, ...back.patch }, 'v1')).toBe(true);
});

test('running late is its own status', () => {
  const ed = vendorArrivalEdit(EV(), 'v2', 'delayed');
  expect(ed.patch.vendors.find((v) => v.id === 'v2').arrivalStatus).toBe('delayed');
  expect(ed.msg).toBe('Rocco’s Rentals is running late.');
});

test('an unknown vendor: no edit', () => {
  expect(vendorArrivalEdit(EV(), 'nope', 'arrived')).toBe(null);
});
