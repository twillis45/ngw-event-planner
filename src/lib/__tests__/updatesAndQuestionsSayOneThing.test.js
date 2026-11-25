// UPDATES AND QUESTIONS SAY ONE THING (owner, 11/25/2026: "start the updates
// and questions flow" in hostv4). Both shells post updates and answer guests'
// questions through lib/guestUpdatesKit, so the limits, who gets an email and
// every failure are worded once. The words are hostv2's, word for word.
import {
  updatesRoom, updatesReachLine, updatesLimitLine, updatesFailedLine, postedLine,
  firstName, inboxWhy, replyHintLine, replySentLine, replyErrorLine, blockedLine,
} from '../guestUpdatesKit';

test('how much room is left, and whether she can post', () => {
  expect(updatesRoom({ per_day: 3, per_event: 20, today: 1, total: 5 })).toEqual({ dayLeft: 2, eventLeft: 15, canPost: true });
  expect(updatesRoom({ per_day: 3, per_event: 20, today: 3, total: 5 }).canPost).toBe(false);
  expect(updatesRoom({ per_day: 3, per_event: 20, today: 0, total: 20 })).toEqual({ dayLeft: 3, eventLeft: 0, canPost: false });
});

test('who an update reaches, and the limits', () => {
  expect(updatesReachLine(0)).toBe('It shows on every guest’s invite. No guest has asked for email yet, so nobody is emailed.');
  expect(updatesReachLine(1)).toBe('It shows on every guest’s invite, and the 1 guest who asked for email gets it by email.');
  expect(updatesReachLine(4)).toBe('It shows on every guest’s invite, and the 4 guests who asked for email get it by email.');
  expect(updatesLimitLine({ per_day: 3, per_event: 20 }, 0)).toBe('You’ve posted the most updates this event allows (20).');
  expect(updatesLimitLine({ per_day: 3, per_event: 20 }, 5)).toBe('You’ve posted 3 updates in the last day — you can post again tomorrow.');
  expect(postedLine(0)).toBe('Posted — it’s on every invite.');
  expect(postedLine(2)).toBe('Posted — it’s on every invite, and 2 guests get it by email.');
});

test('a failed load says why', () => {
  expect(updatesFailedLine({ failed: 'x', status: 503 })).toBe('Updates to everyone aren’t switched on yet.');
  expect(updatesFailedLine({ failed: 'signed-out' })).toBe('Sign in to post updates.');
  expect(updatesFailedLine({ failed: 'forbidden' })).toBe('This account can’t post updates for this event.');
  expect(updatesFailedLine({ failed: 'unavailable' })).toBe('Couldn’t load updates — check your connection and reopen this list.');
  expect(inboxWhy('signed-out', 'guests’ questions')).toBe('Sign in to see guests’ questions.');
  expect(inboxWhy('forbidden', 'guests’ questions')).toBe('This account can’t see guests’ questions for this event.');
  expect(inboxWhy('x', 'guests’ questions')).toBe('Couldn’t load guests’ questions — check your connection and reopen this list.');
});

test('a reply says where it goes, and every refusal', () => {
  expect(firstName('Ana  Ruiz')).toBe('Ana');
  expect(firstName('')).toBe('this guest');
  expect(replyHintLine({ guest_name: 'Ana Ruiz', email_notices: true })).toBe('It shows on Ana’s invite, and Ana gets it by email.');
  expect(replyHintLine({ guest_name: 'Ana Ruiz', email_notices: false })).toBe('It shows on Ana’s invite. Ana didn’t ask for email.');
  expect(replySentLine({ guest_name: 'Ana Ruiz', email_notices: true })).toBe('Sent — it shows on Ana’s invite, and Ana gets it by email.');
  expect(replySentLine({ guest_name: 'Ana Ruiz', email_notices: false })).toBe('Sent — it shows on Ana’s invite.');
  expect(replyErrorLine({ status: 409 })).toBe('This guest is blocked. Unblock them to reply.');
  expect(replyErrorLine({ status: 422 })).toBe('Plain text only, up to 1,000 characters.');
  expect(replyErrorLine(new Error('x'))).toBe('Your reply didn’t send. Check your connection and try again.');
  expect(blockedLine('Ana Ruiz', true)).toBe('Ana can’t send more questions.');
  expect(blockedLine('Ana Ruiz', false)).toBe('Ana can ask again.');
});
