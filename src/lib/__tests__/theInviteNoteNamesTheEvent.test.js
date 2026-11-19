// G83 (live invite, 11/19/2026): the note read "We’re hosting and would love to
// have you over." with no name; only the subject named the event.
import { draftInvite } from '../doItForMe';

const ev = (extra) => ({ id: 'e1', type: 'Dinner Party', date: '2026-12-06', startTime: '18:00', startTimeSource: 'host', venue: 'Vida’s place', ...extra });

test('a named dinner says what is being hosted', () => {
  const { body } = draftInvite(ev({ name: 'Envelope test dinner' }), { name: 'Vida Reyes' });
  expect(body).toContain('We’re hosting Envelope test dinner and would love to have you over.');
});

test('"My …" reads as "our …" in the host’s own sentence', () => {
  const { body } = draftInvite(ev({ name: 'My Holiday Cookout', type: 'Cookout' }), {});
  expect(body).toContain('We’re hosting our Holiday Cookout and would love to have you over.');
});

test('with no name, the line stays as it was', () => {
  const { body } = draftInvite(ev({ name: '' }), {});
  expect(body).toContain('We’re hosting and would love to have you over.');
});
