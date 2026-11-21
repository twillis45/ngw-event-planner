// ─── DRAFT THE TRIP DETAILS (owner pick "Yes, combined", 11/21/2026) ─────────
//
// Group Trip's "Send everyone the trip details" had no button. It drafts the
// note from real event data only: the dates, the BOOKED stay (name and town —
// there is no street address on file, so none is written), the BOOKED plans,
// and each person's share from Split the costs. A missing piece is left out
// and named to the host; nothing is a placeholder.
import { draftTripDetails } from '../doItForMe';
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { playbookChecklist } from '../playbooks';
import { STAY_FROM_PICK, STAY_FROM_CONFIRMATION } from '../lodgingIntel';

const full = {
  id: 'trip', type: 'Group Trip', name: 'Nashville Weekend', date: '2027-03-12', endDate: '2027-03-14',
  venue: 'Nashville, TN', venueCity: 'Nashville', venueState: 'TN',
  lodging: { hotelName: 'The Gulch House', from: STAY_FROM_CONFIRMATION },
  vendors: [
    { id: 'v1', name: 'Pinewood Social bowling', category: 'Activity', status: 'Booked' },
    { id: 'v2', name: 'Biscuit Love brunch', category: 'Restaurant', status: 'Inquired' },
    { id: 'v3', name: 'Husk dinner', category: 'Restaurant', status: 'Confirmed' },
  ],
  costSplit: {
    people: [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cam' }, { id: 'd', name: 'Dee' }],
    expenses: [{ id: 'x1', who: 'a', what: 'the house', amount: 1200 }],
  },
};
const profile = { name: 'Vida Ramos' };

test('everything on file: dates, the booked stay and town, booked plans only, each share', () => {
  const d = draftTripDetails(full, profile);
  expect(d.subject).toBe('Trip details for Nashville Weekend');
  expect(d.body).toContain('Friday, March 12 through Sunday, March 14');
  expect(d.body).toContain('The Gulch House, Nashville, TN');
  expect(d.body).toContain('- Pinewood Social bowling');
  expect(d.body).toContain('- Husk dinner');
  expect(d.body).not.toContain('Biscuit Love');           // Inquired is not booked
  expect(d.body).toContain('$300.00 each');                // $1,200 split 4 ways
  expect(d.body).toContain('— Vida Ramos');
  expect(d.body).not.toMatch(/\[|address|TBD|street/i);  // no blanks, no invented address
  expect(d.notice).toBeNull();
});

test('missing pieces are left out and named to the host, never filled in', () => {
  const ev = { ...full, lodging: { hotelName: 'Maybe Cabin', from: STAY_FROM_PICK }, vendors: [{ id: 'v2', name: 'Biscuit Love brunch', status: 'Inquired' }], costSplit: null };
  const d = draftTripDetails(ev, profile);
  expect(d.body).toContain('Friday, March 12 through Sunday, March 14');
  expect(d.body).not.toContain('Maybe Cabin');             // picked, not booked
  expect(d.body).not.toContain('Biscuit Love');
  expect(d.body).not.toMatch(/each|share|owe/i);
  expect(d.notice).toContain('No stay booked yet — add it in Where everyone stays.');
  expect(d.notice).toContain('Nothing booked to do together yet — add it in People you’re hiring.');
  expect(d.notice).toContain('No costs split yet — add them in Split the costs.');
});

test('uneven cents list each person; a one-day trip names one date; no town means the name alone', () => {
  const ev = { ...full, endDate: '', venue: '', venueCity: '', venueState: '',
    costSplit: { people: [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cam' }], expenses: [{ id: 'x', who: 'a', amount: 100 }] } };
  const d = draftTripDetails(ev, null);
  expect(d.body).toContain('Friday, March 12.');
  expect(d.body).toMatch(/The Gulch House\.\n|The Gulch House\.$/m);
  expect(d.body).toContain('- Ana: $33.34');
  expect(d.body).toContain('- Ben: $33.33');
  expect(d.body).not.toMatch(/— $/m);
});

test('nothing on file at all drafts nothing (the sheet says there is nothing to draft yet)', () => {
  expect(draftTripDetails({ type: 'Group Trip' }, null).body).toBe('');
});

test('the trip-details row\'s button is "Draft the trip details", landing on that draft', () => {
  const e = { id: 'dest', type: 'Group Trip', date: '2026-12-31', guestEstimate: 8, guestMode: 'count', guestCountSource: 'host', venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX' };
  const r = (playbookChecklist(e, '2026-10-01') || []).find((x) => /^Send everyone the trip details/.test(x.task));
  expect(r).toBeTruthy();
  const hit = checklistRouteFor(r.task, { week: r.week, category: r.category }, e);
  expect(hit && hit.label).toBe('Draft the trip details');
  expect(resolveRoute(hit.route)).toEqual({ kind: 'draft', focus: 'trip-details' });
});
