// TIME INTELLIGENCE — eventDateStatus + taskTimeStatus.
// One source for "is this date usable, and what's its standing?" Built on daysUntil.
import { eventDateStatus, taskTimeStatus } from '../dates';

const iso = (offsetDays) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

describe('eventDateStatus', () => {
  test('missing date → blocking error, not valid', () => {
    const r = eventDateStatus('');
    expect(r).toMatchObject({ valid: false, status: 'missing', blocking: true, severity: 'error' });
  });
  test('unparseable date → invalid, blocking', () => {
    const r = eventDateStatus('not-a-date');
    expect(r.valid).toBe(false);
    expect(r.status).toBe('invalid');
    expect(r.blocking).toBe(true);
  });
  test('a PAST date → invalid + blocking (cannot plan forward)', () => {
    const r = eventDateStatus(iso(-3));
    expect(r.valid).toBe(false);
    expect(r.status).toBe('past');
    expect(r.blocking).toBe(true);
    expect(r.days).toBe(-3);
    expect(r.reason).toMatch(/ago/);
  });
  test('today → valid, day-of, not blocking', () => {
    const r = eventDateStatus(iso(0));
    expect(r).toMatchObject({ valid: true, status: 'today', days: 0, blocking: false });
  });
  test('tomorrow → valid but warned', () => {
    const r = eventDateStatus(iso(1));
    expect(r).toMatchObject({ valid: true, status: 'tomorrow', days: 1, severity: 'warn' });
  });
  test('rushed: future but inside the plan’s minLeadDays → warn', () => {
    const r = eventDateStatus(iso(4), { minLeadDays: 14 });
    expect(r.valid).toBe(true);
    expect(r.status).toBe('rushed');
    expect(r.severity).toBe('warn');
  });
  test('far enough out → ok', () => {
    const r = eventDateStatus(iso(30));
    expect(r).toMatchObject({ valid: true, status: 'ok', blocking: false });
  });
  test('minLeadDays does NOT downgrade a comfortably-far date', () => {
    expect(eventDateStatus(iso(30), { minLeadDays: 14 }).status).toBe('ok');
  });
});

describe('taskTimeStatus', () => {
  test('no date → unknown', () => {
    expect(taskTimeStatus(7, null)).toBe('unknown');
  });
  test('event already happened → past-event', () => {
    expect(taskTimeStatus(7, -1)).toBe('past-event');
  });
  test('ideal lead window already passed → overdue (do ASAP)', () => {
    // a T-7d task with only 3 days left → 4 days late on the ideal window
    expect(taskTimeStatus(7, 3)).toBe('overdue');
  });
  test('today is exactly the ideal day → due', () => {
    expect(taskTimeStatus(7, 7)).toBe('due');
  });
  test('one day of cushion → due-soon', () => {
    expect(taskTimeStatus(7, 8)).toBe('due-soon');
  });
  test('plenty of cushion → upcoming', () => {
    expect(taskTimeStatus(7, 30)).toBe('upcoming');
  });
  test('lead 0 (a day-of task) with days remaining → upcoming', () => {
    expect(taskTimeStatus(0, 5)).toBe('upcoming');
  });
});
