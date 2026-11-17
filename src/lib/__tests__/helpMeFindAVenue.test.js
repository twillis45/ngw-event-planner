// Owner, 11/16/2026: make "handle this for me" functionally feasible for the
// venue. The app has no venue database, so what it can honestly do is two
// things: search the event's town on Google Maps (labeled as such), and write
// the venue inquiry from facts the host already gave. Nothing invented: no
// town, no search; a headcount the host never gave never leaves the app.
import { draftVenueInquiry, venueSearchUrl } from '../doItForMe';

const ANAHEIM = { type: 'Birthday', name: 'Jordan’s 50th Birthday', date: '2027-06-12', venueCity: 'Anaheim', venueState: 'CA',
  guestCount: 60, guestCountSource: 'host' };

test('the search opens Google Maps for venues in the event’s own town', () => {
  const u = new URL(venueSearchUrl(ANAHEIM));
  expect(u.origin + u.pathname).toBe('https://www.google.com/maps/search/');
  expect(u.searchParams.get('api')).toBe('1');
  expect(u.searchParams.get('query')).toBe('event venues near Anaheim, CA');
});

test('no town, no search: nothing is guessed', () => {
  expect(venueSearchUrl({ type: 'Birthday' })).toBe(null);
});

test('the inquiry carries the date, the town and the headcount she gave', () => {
  const d = draftVenueInquiry(ANAHEIM, { name: 'Jordan Lee' });
  expect(d.subject).toBe('Birthday · Saturday, June 12 — venue inquiry');
  expect(d.body).toMatch(/I’m planning a birthday on Saturday, June 12 for about 60 guests in Anaheim, CA\./);
  expect(d.body).toMatch(/looking for a venue/);
  expect(d.body).toMatch(/Jordan Lee$/);
});

test('a headcount the host never gave is not sent', () => {
  const d = draftVenueInquiry({ ...ANAHEIM, guestCount: 0, guestEstimate: 60, guestCountSource: 'playbook-typical' }, null);
  expect(d.body).not.toMatch(/60/);
});

test('a home event gets no venue inquiry', () => {
  expect(draftVenueInquiry({ ...ANAHEIM, venue: 'Backyard', venueKind: 'home' }, null)).toBe(null);
});
