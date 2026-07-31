/* eslint-env jest */
// ─── frozenClock — one deterministic clock for date-sensitive suites ─────────
//
// WHY (2026-07-31, Deterministic Test sprint)
// -------------------------------------------
// The committed suite produced DIFFERENT failures depending on the machine's
// wall clock and timezone. Same commit, three answers:
//
//   TZ=UTC              → oneAttentionLedger failed (1 test)
//   TZ=America/New_York → heroComposition failed (2 tests)
//   a week earlier      → both passed
//
// Two independent causes, both in test fixtures rather than product code:
//
//   1. A helper that mixed calendar systems:
//        const iso = (d) => { const x = new Date();
//                             x.setDate(x.getDate() + d);      // LOCAL components
//                             return x.toISOString().slice(0,10); };  // UTC serialise
//      Near midnight the two disagree by a day, so `iso(4)` — meant to be "4 days
//      out" — silently became a 5-day lead in any timezone behind UTC.
//
//   2. A hardcoded future date (`date: '2026-08-04'`) measured against the real
//      now. It encoded a 20-day lead on the day it was written and has been
//      shrinking ever since, walking the fixture through scenarios its
//      assertions were never written for.
//
// PRODUCT CODE IS NOT THE PROBLEM. src/lib/dates.js is already consistent and
// pinnable: it reads Date.now() (its own comment: "so a caller can pin the
// clock… time you cannot pin is time you cannot check") and compares local
// midnight to local midnight, so a date-only string means the same calendar day
// everywhere. Freezing Date.now() is therefore sufficient — no production date
// change was needed, and none was made.
//
// USAGE
//   import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';
//   describe('…', () => {
//     useFrozenClock();                       // or useFrozenClock('2026-07-15T12:00:00.000Z')
//     const ev = () => ({ date: daysFromNow(4), … });
//   });

// Midday UTC, deliberately. Every real timezone lies within UTC-12..UTC+14, so
// a midday instant lands on the SAME calendar day in all of them — the frozen
// "today" is unambiguous no matter where the suite runs.
export const DEFAULT_FROZEN_ISO = '2026-07-30T12:00:00.000Z';

/**
 * Freeze the system clock for the enclosing describe block.
 * Call at describe scope; it installs its own beforeEach/afterEach.
 */
export function useFrozenClock(iso = DEFAULT_FROZEN_ISO) {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(iso));
  });
  afterEach(() => {
    jest.useRealTimers();
  });
}

const pad = (n) => String(n).padStart(2, '0');

/** A `YYYY-MM-DD` string built from LOCAL calendar components. */
export function localDateOnly(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A date-only string exactly `n` calendar days from the (frozen) now.
 *
 * Local components throughout — the same calendar the product's daysUntil()
 * uses — so the LEAD is exactly `n` in every timezone. The literal string may
 * differ between zones (that is correct: "today" genuinely differs), but the
 * distance the product measures does not, which is what assertions care about.
 */
export function daysFromNow(n) {
  const x = new Date(Date.now());
  x.setDate(x.getDate() + n);
  return localDateOnly(x);
}
