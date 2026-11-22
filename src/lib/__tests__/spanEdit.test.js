// ─── WHAT SHRINKING THE DATES WOULD STRAND ──────────────────────────────────
//
// Space's add-a-day / drop-a-day helpers left with #222 (the range lives in
// Date & time now). What stays is the lossy rule: shrinking can orphan work the
// host already did, so Date & time names what is on a day before it moves the
// last day in, and nothing here deletes anything.
import { rowsOn } from '../spanEdit';

const ev = (date, endDate, itinerary) => ({ id: 'e1', date, endDate, itinerary });

describe('what a shrink would strand', () => {
  const rows = [
    { id: 'r1', date: '2026-09-11', title: 'Arrivals' },
    { id: 'r2', date: '2026-09-13', title: 'Sunday brunch' },
    { id: 'r3', date: '2026-09-13', title: 'Departures' },
    { id: 'r4', title: 'No date on this one' },
  ];

  test('it finds the rows on that exact day, and deletes none of them', () => {
    const e = ev('2026-09-11', '2026-09-13', rows);
    const stranded = rowsOn(e, '2026-09-13');
    expect(stranded.map((r) => r.id)).toEqual(['r2', 'r3']);
    expect(e.itinerary).toHaveLength(4);
  });

  test('a row with NO date is never assumed to be on the doomed day', () => {
    // Guessing here would tell a host they are about to lose something they
    // are not, which teaches them to ignore the warning.
    expect(rowsOn(ev('2026-09-11', '2026-09-13', rows), '2026-09-13')
      .some((r) => r.id === 'r4')).toBe(false);
  });

  test('an empty day strands nothing', () => {
    expect(rowsOn(ev('2026-09-11', '2026-09-13', rows), '2026-09-12')).toEqual([]);
    expect(rowsOn(ev('2026-09-11', '2026-09-13'), '2026-09-13')).toEqual([]);
  });
});
