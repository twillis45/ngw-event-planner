// A RENAMED GUEST KEEPS HER REPLIES (guest editor, owner 11/24/2026).
//
// The Guests sheet now lets the host edit a guest's name in place. Two
// readers key on the name: the reply merge (matchGuestIndexByName, run on
// every visit as the account's replies re-arrive) and the CSV import's
// name fallback (rows without an email). Renaming "Sam Okafor" to
// "Samuel Okafor" used to leave both looking for the old name, so the next
// read-back would add a second "Sam Okafor" row. The rename keeps the old
// name as an alias (`aka`, the field confirmSameGuest already writes and the
// merge already reads). Made-up names only.
import { renamedGuestPatch, matchGuestIndexByName, mergeGuestReplies } from '../guestMerge';
import { applyMerge, computeMergeSummary } from '../csvParsers';

const roster = () => ([
  { id: 'g1', name: 'Sam Okafor', rsvp: '', meal: '—', needs: '', kids: 0 },
  { id: 'g2', name: 'Ivy Kent', rsvp: 'Yes', meal: '—', needs: '', kids: 0 },
]);
const rename = (gs, id, name) => gs.map((g) => (g.id === id ? { ...g, ...renamedGuestPatch(g, name) } : g));

test('the patch sets the new name and keeps the old one as an alias', () => {
  expect(renamedGuestPatch({ name: 'Sam Okafor' }, '  Samuel Okafor ')).toEqual({ name: 'Samuel Okafor', aka: ['sam okafor'] });
  expect(renamedGuestPatch({ name: 'Sam Okafor', aka: ['sammy'] }, 'Samuel Okafor').aka).toEqual(['sammy', 'sam okafor']);
});

test('a blank or unchanged name is no patch', () => {
  expect(renamedGuestPatch({ name: 'Sam Okafor' }, '   ')).toBeNull();
  expect(renamedGuestPatch({ name: 'Sam Okafor' }, 'Sam Okafor')).toBeNull();
});

test('a case-only change keeps no alias (the merge compares lower case)', () => {
  expect(renamedGuestPatch({ name: 'sam okafor' }, 'Sam Okafor')).toEqual({ name: 'Sam Okafor' });
});

test('the reply merge still finds her under the old name', () => {
  const gs = rename(roster(), 'g1', 'Samuel Okafor');
  expect(matchGuestIndexByName(gs, 'Sam Okafor')).toBe(0);
  const { guests, added } = mergeGuestReplies(gs, [{ name: 'Sam Okafor', rsvp: 'Yes', idempotencyKey: 'k1' }]);
  expect(added).toBe(0);
  expect(guests).toHaveLength(2);
  expect(guests[0]).toMatchObject({ id: 'g1', name: 'Samuel Okafor', rsvp: 'Yes' });
});

test('without the alias the old name would have added a second row (the premise)', () => {
  const gs = roster().map((g) => (g.id === 'g1' ? { ...g, name: 'Samuel Okafor' } : g));
  expect(matchGuestIndexByName(gs, 'Sam Okafor')).toBe(-1);
});

const csvRow = (name, extra = {}) => ({ id: 'csv-' + name, name, email: '', rsvp: 'Yes', meal: '—', _valid: true, _errors: [], ...extra });

test('a CSV row with only the old name updates her row and keeps her new name', () => {
  const gs = rename(roster(), 'g1', 'Samuel Okafor');
  expect(computeMergeSummary(gs, [csvRow('Sam Okafor')], 'merge')).toMatchObject({ willAdd: 0, willUpdate: 1 });
  const out = applyMerge(gs, [csvRow('Sam Okafor')], 'merge', 'b1');
  expect(out).toHaveLength(2);
  expect(out[0]).toMatchObject({ id: 'g1', name: 'Samuel Okafor', rsvp: 'Yes' });
  expect(applyMerge(gs, [csvRow('Sam Okafor')], 'add_new', 'b1')).toHaveLength(2);
});

test('a CSV row under her current name still matches as before', () => {
  const out = applyMerge(roster(), [csvRow('Ivy Kent', { rsvp: 'No' })], 'merge', 'b1');
  expect(out).toHaveLength(2);
  expect(out[1]).toMatchObject({ id: 'g2', name: 'Ivy Kent', rsvp: 'No' });
});
