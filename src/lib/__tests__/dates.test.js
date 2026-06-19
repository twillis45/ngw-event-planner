import { getToday, daysUntil } from '../dates';

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
