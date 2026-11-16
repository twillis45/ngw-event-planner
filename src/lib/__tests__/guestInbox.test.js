// ─── THE HOST'S WORDS FOR GUEST QUESTIONS, OPENS AND PHOTOS (owner 11/16/2026) ─
//
// The lines the host and the guest read, kept in one pure place so their
// honesty is checkable: "opened", never "read" or "seen"; a waiting count only
// when there is one; a guest's photo status says what she is waiting for
// (UX_06: never the bare word "pending"); no pronoun the app would be guessing.
import {
  questionsWaiting, questionsWaitingLine, openedLine, openDayLine, photoStatusLabel,
  photosWaitingLine, sortThreads,
} from '../guestInbox';

const TZ = { timeZone: 'America/New_York' };

test('counts only unanswered, unblocked threads', () => {
  const rows = [
    { id: 'a', unanswered: true, blocked: false },
    { id: 'b', unanswered: false, blocked: false },
    { id: 'c', unanswered: true, blocked: true },
    { id: 'd', unanswered: true },
  ];
  expect(questionsWaiting(rows)).toBe(2);
  expect(questionsWaiting(null)).toBe(0);
});

test('the event-home line exists only when a question is waiting', () => {
  expect(questionsWaitingLine(0)).toBe(null);
  expect(questionsWaitingLine(1)).toBe('1 guest question waiting');
  expect(questionsWaitingLine(3)).toBe('3 guest questions waiting');
});

test('unanswered first, then the most recent', () => {
  const rows = [
    { id: 'old-answered', unanswered: false, last_guest_at: '2026-11-10T10:00:00Z' },
    { id: 'new-unanswered', unanswered: true, last_guest_at: '2026-11-16T10:00:00Z' },
    { id: 'old-unanswered', unanswered: true, last_guest_at: '2026-11-12T10:00:00Z' },
    { id: 'new-answered', unanswered: false, last_guest_at: '2026-11-15T10:00:00Z', last_host_at: '2026-11-16T11:00:00Z' },
  ];
  expect(sortThreads(rows).map((r) => r.id)).toEqual(['new-unanswered', 'old-unanswered', 'new-answered', 'old-answered']);
});

test('"last opened the invite", with the first name, the date and the time — never read or seen', () => {
  const line = openedLine({ guest_name: 'Ana Ruiz', last_opened_at: '2026-11-17T01:42:00Z' }, TZ);
  expect(line).toBe('Ana last opened the invite Nov 16, 8:42 PM');
  expect(line).not.toMatch(/\bread\b|\bseen\b|\bher\b|\bhis\b/i);
  expect(openedLine({ guest_name: '', last_opened_at: '2026-11-17T01:42:00Z' }, TZ)).toBe(null);
  expect(openedLine({ guest_name: 'Ana', last_opened_at: null }, TZ)).toBe(null);
  expect(openedLine({ guest_name: 'Ana', last_opened_at: 'not a date' }, TZ)).toBe(null);
});

test('a day’s anonymous total says opens and devices, nothing about who', () => {
  expect(openDayLine({ day: '2026-11-16', opens: 5, distinct_devices: 3 })).toBe('Nov 16: opened 5 times on 3 devices');
  expect(openDayLine({ day: '2026-11-15', opens: 1, distinct_devices: 1 })).toBe('Nov 15: opened once on 1 device');
  expect(openDayLine({ day: 'x', opens: 1, distinct_devices: 1 })).toBe(null);
});

test('a guest’s photo status says what it is waiting for', () => {
  expect(photoStatusLabel('pending')).toBe('Waiting for your host to approve it');
  expect(photoStatusLabel('approved')).toBe('Approved — other guests can see it');
  expect(photoStatusLabel('hidden')).toBe('Your host chose not to show this one');
  for (const s of ['pending', 'approved', 'hidden']) expect(photoStatusLabel(s)).not.toMatch(/^pending$/i);
});

test('the host’s photo line exists only when a photo waits for approval', () => {
  expect(photosWaitingLine([{ status: 'approved' }])).toBe(null);
  expect(photosWaitingLine([{ status: 'pending' }])).toBe('1 guest photo waiting for you to approve');
  expect(photosWaitingLine([{ status: 'pending' }, { status: 'pending' }, { status: 'hidden' }])).toBe('2 guest photos waiting for you to approve');
  expect(photosWaitingLine(null)).toBe(null);
});
