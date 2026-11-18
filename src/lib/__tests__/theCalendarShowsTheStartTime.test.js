// Owner, 11/18/2026: "Calendar should show on day and time of event."
// The event day sat on its date with no hour, and "Add to my calendar" put it
// in as an all-day entry. The event day now carries its start time, marked as
// suggested when the app set it rather than the host, and the calendar file
// gives the event a real start time once the host has set one.
import { calendarItems, calendarIcs, calendarFeedItems } from '../planCalendar';

const NOW = new Date(2026, 10, 18, 12, 0, 0);
const base = (extra) => ({ id: 'ev1', name: 'Friendsgiving', type: 'Friendsgiving', date: '2026-11-21', timeline: [], vendors: [], ...extra });
const eventItem = (ev) => calendarItems(ev, NOW).items.find((it) => it.kind === 'event');

test('the event day carries the start time the host set', () => {
  for (const startTime of ['16:00', '4:00 PM', '4 pm']) {
    const it = eventItem(base({ startTime, startTimeSource: 'host' }));
    expect(it.time).toBe('4:00 PM');
    expect(it.timeSuggested).toBe(false);
  }
});

test('a time the app suggested is marked as suggested', () => {
  const it = eventItem(base({ startTime: '15:30', startTimeSource: 'derived' }));
  expect(it.time).toBe('3:30 PM');
  expect(it.timeSuggested).toBe(true);
});

test('no time, or one that is not a clock, puts no hour on the day', () => {
  expect(eventItem(base({})).time).toBeUndefined();
  expect(eventItem(base({ startTime: 'afternoon' })).time).toBeUndefined();
  expect(eventItem(base({ startTime: '25:00' })).time).toBeUndefined();
});

test('a multi-day event shows the hour on its first day only', () => {
  const days = calendarItems(base({ endDate: '2026-11-22', startTime: '10:00', startTimeSource: 'host' }), NOW).items.filter((it) => it.kind === 'event');
  expect(days.map((d) => d.time)).toEqual(['10:00 AM', undefined]);
});

test('the calendar file gives the event its start time and the playbook run length', () => {
  const ics = calendarIcs(base({ startTime: '16:00', startTimeSource: 'host' }), NOW);
  const block = ics.split('BEGIN:VEVENT').find((b) => /SUMMARY:Friendsgiving\r\n/.test(b));
  expect(block).toMatch(/DTSTART:20261121T160000\r\n/);
  expect(block).not.toMatch(/VALUE=DATE/);
  expect(block).toMatch(/DTEND:20261121T\d{6}\r\n/);
});

test('a suggested time stays an all-day entry in the calendar file', () => {
  const ics = calendarIcs(base({ startTime: '16:00', startTimeSource: 'derived' }), NOW);
  const block = ics.split('BEGIN:VEVENT').find((b) => /SUMMARY:Friendsgiving\r\n/.test(b));
  expect(block).toMatch(/DTSTART;VALUE=DATE:20261121\r\n/);
});

test('the subscription feed carries the confirmed start time, not a suggested one', () => {
  const host = calendarFeedItems(base({ startTime: '16:00', startTimeSource: 'host' }), NOW).find((it) => it.kind === 'event');
  expect(host.start).toBe('16:00');
  const derived = calendarFeedItems(base({ startTime: '16:00', startTimeSource: 'derived' }), NOW).find((it) => it.kind === 'event');
  expect(derived.start).toBeUndefined();
});
