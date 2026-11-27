// THE DAY IS IN HER CALENDAR (owner, 11/26/2026: "Yes" to calendar reminders,
// "As rendered is fine"). Nothing reached her with the app closed on the day:
// the alerts live in the app. The day's run, each booked vendor's arrival and
// the guests' arrival become timed calendar entries, each with its own alarm
// (10 minutes before by default, or at the time), so the phone's own calendar
// reminds her. One builder (lib/planCalendar); both shells call it.
//   · a reminder says when something is DUE, never that it is late: a
//     calendar cannot know whether the caterer came;
//   · times are the run's own, floating local, so they read the same in any zone;
//   · a step with no time has no reminder (never a guessed hour).
import { dayReminders, dayRemindersIcs } from '../planCalendar';

const EV = (extra = {}) => ({
  id: 'tg', name: 'Thanksgiving at ours', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host',
  guestEstimate: 12, guests: [], budget: [], timeline: [], rosEdited: true,
  ros: [
    { id: 'r1', time: '09:00', segment: 'Turkey into the oven' },
    { id: 'r2', time: '14:30', segment: 'Last look: drinks, coats, candles' },
    { id: 'r3', segment: 'Whenever: fold the napkins' },
  ],
  vendors: [
    { id: 'v1', name: 'Bay Catering', category: 'Catering', status: 'Booked', bookingStatus: 'Booked', arrivalTime: '9:30 AM' },
    { id: 'v2', name: 'Maybe DJ', category: 'Music', status: 'Inquired', arrivalTime: '18:00' },
  ],
  ...extra,
});

test('the run, the booked arrivals and the guests, in time order; untimed steps and unbooked vendors left out', () => {
  const r = dayReminders(EV());
  expect(r.map((x) => [x.date, x.time, x.label])).toEqual([
    ['2026-11-26', '09:00', 'Turkey into the oven'],
    ['2026-11-26', '09:30', 'Bay Catering due'],
    ['2026-11-26', '14:30', 'Last look: drinks, coats, candles'],
    ['2026-11-26', '15:00', 'Guests arrive'],
  ]);
});

test('a run step already at the guests’ time stands in for "Guests arrive"', () => {
  const ev = EV();
  ev.ros = [...ev.ros, { id: 'r4', time: '15:00', segment: 'Guests arrive: drinks in hand' }];
  expect(dayReminders(ev).filter((x) => x.time === '15:00').map((x) => x.label)).toEqual(['Guests arrive: drinks in hand']);
});

test('a suggested start time is not hers, so no guests reminder', () => {
  expect(dayReminders(EV({ startTimeSource: 'derived' })).some((x) => x.label === 'Guests arrive')).toBe(false);
});

test('the calendar file: one timed entry per reminder, each with its alarm', () => {
  const ics = dayRemindersIcs(EV(), { lead: 10 }, new Date('2026-11-25T12:00:00Z'));
  expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
  expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(4);
  expect((ics.match(/BEGIN:VALARM/g) || []).length).toBe(4);
  expect(ics).toContain('DTSTART:20261126T093000');
  expect(ics).toContain('SUMMARY:Bay Catering due');
  expect(ics).toContain('TRIGGER:-PT10M');
  expect(ics).not.toMatch(/late|hasn.t arrived/i);
});

test('"At the time" sets the alarm at the start', () => {
  const ics = dayRemindersIcs(EV(), { lead: 0 }, new Date('2026-11-25T12:00:00Z'));
  expect(ics).toContain('TRIGGER:PT0M');
  expect(ics).not.toContain('TRIGGER:-PT10M');
});

test('no timed run, no vendors, no start time: nothing to remind', () => {
  expect(dayReminders({ id: 'x', date: '2026-11-26', ros: [], rosEdited: true, vendors: [] })).toEqual([]);
});

test('a long run step reminds with its short title; the full step is in the entry’s notes', () => {
  const ev = EV();
  ev.ros = [{ id: 'r9', time: '10:30', segment: 'Baste and rotate the bird; casseroles out of the refrigerator to lose their chill' }];
  expect(dayReminders(ev).find((x) => x.time === '10:30').label).toBe('Baste and rotate the bird');
  const ics = dayRemindersIcs(ev, { lead: 10 }, new Date('2026-11-25T12:00:00Z')).replace(/\r\n /g, '');
  expect(ics).toContain('SUMMARY:Baste and rotate the bird\r\n');
  expect(ics).toContain('casseroles out of the refrigerator');
});

// OWNER, 11/27/2026: "Yes" to leaving out what has already passed, and the host
// travels with the event, so the times stay floating (the phone's own zone).
test('steps already past are left out, from the reminders and from the file', () => {
  const at11 = new Date(2026, 10, 26, 11, 0);   // 11:00 local on the day
  const r = dayReminders(EV(), at11);
  expect(r.map((x) => x.label)).toEqual(['Last look: drinks, coats, candles', 'Guests arrive']);
  const ics = dayRemindersIcs(EV(), { lead: 10 }, at11);
  expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(2);
  expect(ics).not.toContain('Bay Catering due');
});

test('a step at this very minute is past; with no clock, nothing is dropped', () => {
  expect(dayReminders(EV(), new Date(2026, 10, 26, 14, 30)).map((x) => x.time)).toEqual(['15:00']);
  expect(dayReminders(EV())).toHaveLength(4);
});

test('the times float: no zone, no UTC mark, so they follow the phone', () => {
  const ics = dayRemindersIcs(EV(), { lead: 10 }, new Date(2026, 10, 25, 12, 0));
  expect(ics).toMatch(/DTSTART:20261126T150000\r\n/);
  expect(ics).not.toMatch(/TZID|DTSTART:[0-9T]+Z/);
});
