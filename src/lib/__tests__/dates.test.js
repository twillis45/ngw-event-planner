import { getToday, daysUntil, eventDateStatus, targetMonthLabel, saturdaysOfMonth } from '../dates';

const iso = (offsetDays) => {
  const d = getToday();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

describe('dates — canonical day-count (single source of truth)', () => {
  test('today is 0, tomorrow is 1, yesterday is -1', () => {
    expect(daysUntil(iso(0))).toBe(0);
    expect(daysUntil(iso(1))).toBe(1);
    expect(daysUntil(iso(-1))).toBe(-1);
  });

  test('a clean integer at every offset (no time-of-day drift)', () => {
    for (const n of [2, 5, 13, 14, 15, 30]) expect(daysUntil(iso(n))).toBe(n);
  });

  test('the 14-day boundary is exactly 14 (the bug this reconciles)', () => {
    expect(daysUntil(iso(14))).toBe(14);
    expect(daysUntil(iso(14)) <= 14).toBe(true);   // inside the weather window
    expect(daysUntil(iso(15)) <= 14).toBe(false);  // just outside
  });

  test('null/garbage in → null out (never throws)', () => {
    expect(daysUntil(null)).toBe(null);
    expect(daysUntil('')).toBe(null);
    expect(daysUntil('not-a-date')).toBe(null);
  });

  test('tolerates a datetime string by reading the date part', () => {
    expect(daysUntil(iso(3) + 'T18:30:00')).toBe(3);
  });
});

describe('DATE-GUARDRAIL — eventDateStatus blocks a corrupted year before it can be written', () => {
  // Regression: a native <input type="date"> fed the raw string "10/09/2026"
  // corrupted to "0002-10-09" (year 2 AD) with zero validation upstream,
  // rendering as "739158d ago — this one is behind you" with no sanity check.
  // The host-facing date setters in both apps now gate every write through
  // eventDateStatus and reject anything it marks blocking.
  test('a wildly-wrong year (0002) is blocking, not silently accepted', () => {
    const status = eventDateStatus('0002-10-09');
    expect(status.blocking).toBe(true);
    expect(status.status).toBe('past');
    expect(status.reason).toMatch(/ago/i);
  });

  test('unparseable input is blocking with a clear reason', () => {
    const status = eventDateStatus('not-a-date');
    expect(status.blocking).toBe(true);
    expect(status.status).toBe('invalid');
  });

  test('a real future date is never blocking', () => {
    const status = eventDateStatus(iso(92));
    expect(status.blocking).toBe(false);
    expect(status.valid).toBe(true);
  });
});

// The month a host named without a day. It must repeat what they said and must
// NEVER behave like a date — no countdown, no deadline, no invented day.
describe('targetMonth — a named month is not a date', () => {
  test('it returns the label the host was shown at intake', () => {
    expect(targetMonthLabel({ targetMonth: { year: 2028, month: 5, label: 'Jun 2028' } }))
      .toBe('Jun 2028');
  });

  test('a real date OUTRANKS it — the month never competes with a day', () => {
    expect(targetMonthLabel({ date: '2028-06-17', targetMonth: { year: 2028, month: 5, label: 'Jun 2028' } }))
      .toBeNull();
  });

  test('no targetMonth is null, not a guess at the current month', () => {
    expect(targetMonthLabel({})).toBeNull();
    expect(targetMonthLabel(null)).toBeNull();
  });

  test('a malformed month is refused rather than rendered', () => {
    expect(targetMonthLabel({ targetMonth: { year: 2028, month: 12, label: 'Nope' } })).toBeNull();
    expect(targetMonthLabel({ targetMonth: { year: 'x', month: 5, label: 'Jun 2028' } })).toBeNull();
  });

  test('it never yields a countable date — daysUntil stays null', () => {
    const ev = { targetMonth: { year: 2028, month: 5, label: 'Jun 2028' } };
    expect(daysUntil(ev.date)).toBeNull();
  });
});

describe('saturdaysOfMonth — real days offered as options', () => {
  test('June 2028 Saturdays are the real ones, in order', () => {
    expect(saturdaysOfMonth(2028, 5)).toEqual([
      '2028-06-03', '2028-06-10', '2028-06-17', '2028-06-24',
    ]);
  });

  test('every returned day really is a Saturday, read LOCALLY', () => {
    saturdaysOfMonth(2028, 5).forEach((s) => {
      const [y, m, d] = s.split('-').map(Number);
      expect(new Date(y, m - 1, d).getDay()).toBe(6);
    });
  });

  test('a bad month yields nothing rather than throwing', () => {
    expect(saturdaysOfMonth(2028, 12)).toEqual([]);
    expect(saturdaysOfMonth(null, null)).toEqual([]);
  });
});
