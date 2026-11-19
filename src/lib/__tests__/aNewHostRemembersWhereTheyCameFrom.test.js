// Marketing & Pricing Review Board, 11/18/2026, step 1: the "plan yours" link on
// a guest invite or vendor brief says where it came from, and a new host's next
// event remembers it, so a pass bought later can be traced to the page that
// brought them. Only the source and the event KIND travel; nothing personal.
import { recruitHref, readArrival, rememberArrival, arrivalFor, spendArrival, exampleSentenceFor, ARRIVAL_KEY } from '../acquisition';

const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, m }; };
const T0 = Date.parse('2026-11-18T12:00:00Z');

test('the link carries its source and the event kind, and nothing else', () => {
  expect(recruitHref('https://x.test/hostv2/?rsvp=abc123', { from: 'invite', kind: 'Friendsgiving' }))
    .toBe('https://x.test/hostv2/?from=invite&kind=Friendsgiving');
  expect(recruitHref('https://x.test/hostv2/', { from: 'vendor' })).toBe('https://x.test/hostv2/?from=vendor');
  expect(recruitHref('https://x.test/hostv2/', { from: 'spam', kind: 'Wedding' })).toBe('https://x.test/hostv2/');
  // a kind that is not a plain type name is dropped, not carried
  expect(recruitHref('https://x.test/', { from: 'invite', kind: '<script>' })).toBe('https://x.test/?from=invite');
});

test('an arrival is read off the landing URL; unknown sources are ignored', () => {
  expect(readArrival('?from=invite&kind=Friendsgiving')).toEqual({ from: 'invite', kind: 'Friendsgiving' });
  expect(readArrival('?from=vendor')).toEqual({ from: 'vendor' });
  expect(readArrival('?from=elsewhere&kind=Wedding')).toBeNull();
  expect(readArrival('')).toBeNull();
});

test('first touch wins for 30 days, then it is forgotten', () => {
  const s = mem();
  rememberArrival(s, { from: 'invite', kind: 'Friendsgiving' }, T0);
  rememberArrival(s, { from: 'vendor' }, T0 + 86400000);
  expect(arrivalFor(s, T0 + 2 * 86400000)).toMatchObject({ from: 'invite', kind: 'Friendsgiving' });
  expect(arrivalFor(s, T0 + 31 * 86400000)).toBeNull();
  rememberArrival(s, { from: 'vendor' }, T0 + 31 * 86400000);
  expect(arrivalFor(s, T0 + 31 * 86400000)).toMatchObject({ from: 'vendor' });
});

test('it is spent once an event carries it, and keeps nothing personal', () => {
  const s = mem();
  rememberArrival(s, { from: 'invite', kind: 'Birthday' }, T0);
  expect(Object.keys(JSON.parse(s.m[ARRIVAL_KEY])).sort()).toEqual(['at', 'from', 'kind']);
  spendArrival(s);
  expect(arrivalFor(s, T0)).toBeNull();
});

test('the create screen\'s example follows the kind they came from', () => {
  expect(exampleSentenceFor({ from: 'invite', kind: 'Friendsgiving' })).toBe('Friendsgiving for 20 people, Saturday at 4');
  expect(exampleSentenceFor(null)).toBe('Mom’s 80th in Santa Fe, 30 people, June 14');
  expect(exampleSentenceFor({ from: 'vendor' })).toBe('Mom’s 80th in Santa Fe, 30 people, June 14');
});
