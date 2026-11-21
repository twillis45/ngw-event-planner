// ─── FOUR GROUP TRIP ROWS LAND WHERE THE WORK IS (11/21/2026) ────────────────
//
// Found while building the trip rows, all from keyword routing:
//   • "Book the place…" opened the add-a-vendor field ("book the" is the
//     vendor rule's word). A stay is booked in Where everyone stays.
//   • "Reserve the group dinners. A table for the whole group…" opened the
//     Space list: "table" matched the furniture rule. A dinner reservation is
//     tracked with the people you're hiring, the same list the reconfirm sweep
//     reads.
//   • "Send a short list of house norms, including the booking site's rule
//     against parties at a rental" opened People you're hiring ("rental" is a
//     rentals vendor there). Sending a short note to the whole group is
//     Updates to everyone, on the Guest list.
//   • "Before you pay, search the listing's address…" opened Your money: the
//     domain fallback read "pay". Checking a listing is stay work.
// The rules are fixed, not the rows; the neighbors below pin that nothing
// else moved with them.
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { playbookChecklist } from '../playbooks';

const ev = (type) => ({ id: 'dest', type, date: '2026-12-31', guestEstimate: 20, guestMode: 'count', guestCountSource: 'host',
  venue: 'Home', venueKind: 'home', venueCity: 'Austin, TX' });
const land = (type, re) => {
  const e = ev(type);
  const r = (playbookChecklist(e, '2026-10-01') || []).find((x) => re.test(x.task));
  if (!r) throw new Error(`no ${type} row matching ${re}`);
  const hit = checklistRouteFor(r.task, { week: r.week, category: r.category }, e);
  return { label: hit && hit.label, to: hit && hit.route ? resolveRoute(hit.route) : null };
};

test.each([
  ['Book the place', /^Book the place:/, 'Open where everyone stays', { kind: 'lodging', focus: null }],
  ['Reserve the group dinners', /^Reserve the group dinners/, 'Line them up', { kind: 'vendors', focus: null, vendorSection: null }],
  ['Send a short list of house norms', /^Send a short list of house norms/, 'Open updates to everyone', { kind: 'guests', focus: 'updates' }],
  ['Search the listing\'s address', /search the listing's address/, 'Open where everyone stays', { kind: 'lodging', focus: null }],
])('Group Trip: %s', (_name, re, label, to) => {
  expect(land('Group Trip', re)).toEqual({ label, to });
});

test.each([
  // A hall reserved "(or restaurant)" is still the venue, not a dinner booking.
  ['Repast', /^Reserve the fellowship hall/, 'Open the details', 'venue'],
  // Bundled bookings that name a dinner stay with the vendors, as before.
  ['Bachelorette Party', /^Book lodging, dinner reservation/, 'Line them up', 'vendors'],
  ['Surprise Proposal', /^Book the dinner reservation/, 'Line them up', 'vendors'],
  ['Client Dinner', /^Book the private dining room/, 'Line them up', 'vendors'],
  // "program listings" is not a rental listing (caught by the route-map diff).
  ['Fundraiser / Gala', /^Collect sponsor logos/, 'Open the list', 'food'],
])('neighbors keep their routes: %s', (type, re, label, kind) => {
  const got = land(type, re);
  expect(got.label).toBe(label);
  expect(got.to.kind).toBe(kind);
});
