// UPDATES AND QUESTIONS IN THE KIT (G2c-2b step 5a; owner, 11/28/2026, UX_12
// §8a, render screen 5). The update starts written from the plan's own facts
// (the old sheet's "Update everyone" draft, doItForMe draftGuestUpdate), and
// "Text it" opens her messages app with the words and no recipient, so she
// picks who. Made-up names only.
import { updateFromPlan, textItHref } from '../guestUpdatesKit';
import { draftGuestUpdate } from '../doItForMe';

const EV = { id: 'u1', name: 'Thanksgiving at ours', type: 'Thanksgiving', date: '2027-11-25', startTime: '15:00', startTimeSource: 'host', venue: 'Pine Street Commons', venueCity: 'Springfield, VA' };

test('the update is the plan’s own draft, the same words the old sheet offered', () => {
  const body = updateFromPlan(EV, { name: 'Vida Ramos' });
  expect(body).toBe(draftGuestUpdate(EV, {}, { name: 'Vida Ramos' }).body);
  expect(body).toContain('Thanksgiving at ours');
});

test('a draft that can’t be written gives an empty box, never a crash', () => {
  expect(updateFromPlan(null, null)).toBe(draftGuestUpdate(null, {}, null).body || '');
});

test('Text it opens the messages app with the words and no recipient', () => {
  expect(textItHref('Doors at 2:45. Parking on Elm & 5th.')).toBe('sms:?&body=Doors%20at%202%3A45.%20Parking%20on%20Elm%20%26%205th.');
});
