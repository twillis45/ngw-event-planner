// ─── CONFIRM EVERY BOOKING (owner pick "A: Reconfirm each booking", 11/21/2026) ─
//
// Group Trip's "Confirm every reservation…" had no button. "Reconfirm each
// booking" opens the existing reconfirm sweep, titled "Confirm every booking".
// And the sweep's list was wrong: it drafted reconfirms to every named vendor,
// so a brunch still at "Inquired" got a "just confirming we're all set" note.
// Only a BOOKED vendor is reconfirmed now, in the sheet, in the 0–3-days-out
// banner (same list) and in the board's reconfirm raise (the same predicate).
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { playbookChecklist } from '../playbooks';
import { isReconfirmable } from '../workstreams';
import { raiseAll } from '../surfaceRegistry';

const iso = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };

test('the row\'s button is "Reconfirm each booking", landing on the sweep for bookings', () => {
  const e = { id: 'dest', type: 'Group Trip', date: '2026-12-31', guestEstimate: 8, guestMode: 'count', guestCountSource: 'host', venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX' };
  const r = (playbookChecklist(e, '2026-10-01') || []).find((x) => /^Confirm every reservation/.test(x.task));
  expect(r).toBeTruthy();
  const hit = checklistRouteFor(r.task, { week: r.week, category: r.category }, e);
  expect(hit && hit.label).toBe('Reconfirm each booking');
  expect(resolveRoute(hit.route)).toEqual({ kind: 'sweep', focus: 'bookings' });
});

test('only a booked, named, paid-vendor record is reconfirmed', () => {
  expect(isReconfirmable({ name: 'Husk dinner', status: 'Booked' })).toBe(true);
  expect(isReconfirmable({ name: 'Husk dinner', status: 'Confirmed' })).toBe(true);
  expect(isReconfirmable({ name: 'Husk dinner', status: 'Deposit Paid' })).toBe(true);
  expect(isReconfirmable({ name: 'Biscuit Love brunch', status: 'Inquired' })).toBe(false);
  expect(isReconfirmable({ name: 'Biscuit Love brunch', status: 'Considering' })).toBe(false);
  expect(isReconfirmable({ name: 'Biscuit Love brunch' })).toBe(false);
  expect(isReconfirmable({ name: '', status: 'Booked' })).toBe(false);
  expect(isReconfirmable({ name: 'Aunt Jo (cooler)', status: 'Booked', isInformal: true })).toBe(false);
});

test('the board\'s reconfirm raise, 2 days out, names only the booked vendor', () => {
  const ev = { id: 'rc', type: 'Group Trip', name: 'Trip', date: iso(2), guestMode: 'count', guestCount: 8, venue: 'Nashville, TN',
    vendors: [{ id: 'v1', name: 'Husk dinner', status: 'Booked' }, { id: 'v2', name: 'Biscuit Love brunch', status: 'Inquired' }], timeline: [] };
  const raised = raiseAll(ev).filter((r) => r.surface === 'vendor-reconfirm');
  expect(raised.map((r) => r.title)).toEqual(['Reconfirm Husk dinner for the day']);
});
