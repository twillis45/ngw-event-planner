// ─── ADD A DAY, DROP A DAY ──────────────────────────────────────────────────
//
// Workflow's named gap. The span was editable only through a raw date input,
// which is a span control rather than a day control — a host thinks "Sunday
// brunch got added", not "recompute the terminal date of the interval".
//
// The assertions that carry weight here are the lossy ones. Extending invents
// nothing; SHRINKING can orphan work the host already did, and a module that
// quietly discards a plan is worse than one that refuses.
import { addDay, dropDay, dayCount, lastDay, rowsOn } from '../spanEdit';

const ev = (date, endDate, itinerary) => ({ id: 'e1', date, endDate, itinerary });

describe('counting', () => {
  test('a single day is ONE day, not zero', () => {
    // A host counts days. "0 days" describes nothing that happens.
    expect(dayCount(ev('2026-09-11'))).toBe(1);
    expect(dayCount(ev('2026-09-11', ''))).toBe(1);
  });

  test('two nights is three days', () => {
    expect(dayCount(ev('2026-09-11', '2026-09-13'))).toBe(3);
  });

  test('an endDate BEFORE the start is ignored, not negative', () => {
    expect(dayCount(ev('2026-09-11', '2026-09-01'))).toBe(1);
    expect(lastDay(ev('2026-09-11', '2026-09-01'))).toBe('2026-09-11');
  });

  test('no date at all counts nothing and never throws', () => {
    expect(dayCount(ev(''))).toBe(0);
    expect(dayCount(null)).toBe(0);
    expect(lastDay(ev('nonsense'))).toBe(null);
  });
});

describe('adding', () => {
  test('a single-day event gains a second day', () => {
    expect(addDay(ev('2026-09-11'))).toEqual({ endDate: '2026-09-12' });
  });

  test('a span extends from its LAST day', () => {
    expect(addDay(ev('2026-09-11', '2026-09-13'))).toEqual({ endDate: '2026-09-14' });
  });

  test('it crosses a month boundary correctly', () => {
    expect(addDay(ev('2026-09-30'))).toEqual({ endDate: '2026-10-01' });
    expect(addDay(ev('2026-12-31'))).toEqual({ endDate: '2027-01-01' });
  });

  test('it survives a DST boundary', () => {
    // The reason the arithmetic is anchored at UTC noon. Anchored at midnight,
    // adding 24h across a spring-forward lands on the SAME calendar day in
    // half the world's timezones, and the button silently does nothing.
    expect(addDay(ev('2026-03-07'))).toEqual({ endDate: '2026-03-08' });
    expect(addDay(ev('2026-11-01'))).toEqual({ endDate: '2026-11-02' });
  });

  test('with no start date there is nothing to extend', () => {
    // Inventing one would be the app deciding when the event is.
    expect(addDay(ev(''))).toBe(null);
  });
});

describe('dropping', () => {
  test('a three-day event becomes two', () => {
    expect(dropDay(ev('2026-09-11', '2026-09-13'))).toMatchObject({ endDate: '2026-09-12' });
  });

  test('a two-day event returns to a single day with endDate CLEARED', () => {
    // Not set equal to the start. `endDate` means "runs past the first day", so
    // an endDate on the start date is a lie in the data even though it renders
    // identically — and `spanNights` and the "Your days" door both read it.
    expect(dropDay(ev('2026-09-11', '2026-09-12'))).toMatchObject({ endDate: null });
  });

  test('a single-day event cannot drop a day', () => {
    // There is no zeroth day, and a control that appears to work while doing
    // nothing is worse than one that is plainly unavailable.
    expect(dropDay(ev('2026-09-11'))).toBe(null);
    expect(dropDay(ev('2026-09-11', '2026-09-11'))).toBe(null);
  });

  test('it REPORTS the day that would stop existing', () => {
    // The whole reason this returns a shape instead of a date: the caller has
    // to be able to say what is on that day before anything is written.
    expect(dropDay(ev('2026-09-11', '2026-09-13')).strandedOn).toBe('2026-09-13');
  });

  test('and it deletes nothing itself', () => {
    const rows = [{ id: 'r1', date: '2026-09-13', title: 'Sunday brunch' }];
    const e = ev('2026-09-11', '2026-09-13', rows);
    dropDay(e);
    expect(e.itinerary).toHaveLength(1);          // untouched
    expect(e.itinerary[0].title).toBe('Sunday brunch');
  });
});

describe('what a shrink would strand', () => {
  const rows = [
    { id: 'r1', date: '2026-09-11', title: 'Arrivals' },
    { id: 'r2', date: '2026-09-13', title: 'Sunday brunch' },
    { id: 'r3', date: '2026-09-13', title: 'Departures' },
    { id: 'r4', title: 'No date on this one' },
  ];

  test('it finds the rows on that exact day', () => {
    const e = ev('2026-09-11', '2026-09-13', rows);
    const stranded = rowsOn(e, dropDay(e).strandedOn);
    expect(stranded.map((r) => r.id)).toEqual(['r2', 'r3']);
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
