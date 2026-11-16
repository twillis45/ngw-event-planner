// ─── THE PLANNING CALENDAR (owner, 11/16/2026: week and month toggle) ───────
import { calendarItems, weekDays, monthWeeks, shiftAnchor, rangeLabel } from '../planCalendar';
import { taskDueLabel } from '../taskLead';

const NOW = new Date(2026, 10, 16, 12, 0, 0);   // Monday, Nov 16, 2026, local noon
const EV = {
  id: 'e1', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: '2026-11-21', createdAt: '2026-10-01T12:00:00Z',
  timeline: [
    { id: 't1', task: 'Send invites', week: '3 weeks out', done: true },
    { id: 't2', task: 'Order the turkey', week: '10 days out', done: false },
    { id: 't3', task: 'Buy the wine', week: 'day before', done: false },
    { id: 't4', task: 'Some step with no timing', week: '', done: false },
  ],
  vendors: [],
};

test('each step lands on the event date plus its lead, the event on its day', () => {
  const { items, undated } = calendarItems(EV, NOW);
  const by = Object.fromEntries(items.map((i) => [i.label, i]));
  expect(by['Vida’s Friendsgiving']).toMatchObject({ date: '2026-11-21', kind: 'event' });
  expect(by['Send invites']).toMatchObject({ date: '2026-10-31', done: true, overdue: false });
  expect(by['Order the turkey']).toMatchObject({ date: '2026-11-11', done: false, overdue: true });
  expect(by['Buy the wine']).toMatchObject({ date: '2026-11-20', overdue: false });
  expect(undated).toBe(1);                       // counted, never placed on a guessed day
  expect(items.map((i) => i.date)).toEqual([...items.map((i) => i.date)].sort());
});

test('the calendar agrees with the checklist’s own "N days past its window"', () => {
  const t = EV.timeline[1];
  expect(taskDueLabel(t, EV, NOW)).toMatch(/past|overdue|late/i);
  expect(calendarItems(EV, NOW).items.find((i) => i.label === t.task).overdue).toBe(true);
});

test('a multi-day event marks every day', () => {
  const { items } = calendarItems({ name: 'Reunion', date: '2026-07-03', endDate: '2026-07-05', timeline: [] }, NOW);
  expect(items.filter((i) => i.kind === 'event').map((i) => [i.date, i.label])).toEqual([
    ['2026-07-03', 'Reunion — day 1'], ['2026-07-04', 'Reunion — day 2'], ['2026-07-05', 'Reunion — day 3'],
  ]);
});

test('no date: nothing placed, every step counted', () => {
  const r = calendarItems({ ...EV, date: '' }, NOW);
  expect(r.items).toEqual([]);
  expect(r.undated).toBe(4);
});

test('week: Sunday first; month: whole weeks, days outside flagged', () => {
  expect(weekDays('2026-11-18')).toEqual(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
  const m = monthWeeks('2026-11-18');
  expect(m).toHaveLength(5);
  expect(m[0][0]).toEqual({ date: '2026-11-01', inMonth: true });   // Nov 1, 2026 is a Sunday
  expect(m[4][6]).toEqual({ date: '2026-12-05', inMonth: false });
  expect(monthWeeks('2027-02-10')[0][0]).toEqual({ date: '2027-01-31', inMonth: false });
});

test('moving and naming the range', () => {
  expect(shiftAnchor('2026-11-18', 'week', 1)).toBe('2026-11-25');
  expect(shiftAnchor('2026-11-18', 'month', 1)).toBe('2026-12-01');
  expect(shiftAnchor('2026-01-31', 'month', 1)).toBe('2026-02-01');   // never skips February
  expect(rangeLabel('2026-11-18', 'month')).toBe('November 2026');
  expect(rangeLabel('2026-11-18', 'week')).toBe('Nov 15 – 21, 2026');
  expect(rangeLabel('2026-11-30', 'week')).toBe('Nov 29 – Dec 5, 2026');
});

// ── Add to my calendar (.ics) ────────────────────────────────────────────────
import { calendarIcs } from '../planCalendar';

test('the calendar file: the event and every open step, all-day, nothing already done', () => {
  const ics = calendarIcs(EV, NOW);
  expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
  expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(3);            // event + 2 open steps (invites are done)
  expect(ics).toContain('DTSTART;VALUE=DATE:20261121\r\nDTEND;VALUE=DATE:20261122');
  expect(ics).toContain('SUMMARY:To do: Order the turkey');
  expect(ics).toContain('SUMMARY:Vida’s Friendsgiving');
  expect(ics).not.toContain('Send invites');
  expect(ics).toContain('UID:e1-task-t2@ngw-plan');                      // stable: re-adding can update, not copy
  expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);     // folded per RFC 5545
});

test('commas, semicolons and newlines in a step are escaped, not broken', () => {
  const ics = calendarIcs({ ...EV, timeline: [{ id: 'x', task: 'Buy plates, cups; napkins\nand ice', week: 'day before' }] }, NOW);
  expect(ics).toContain('SUMMARY:To do: Buy plates\\, cups\; napkins\\nand ice');
});
