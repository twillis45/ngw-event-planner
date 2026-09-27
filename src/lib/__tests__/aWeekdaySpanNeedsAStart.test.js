import { parseSmartEventText } from '../smartParseEvent';

// Measured 2026-09-27 with now = Sunday 2026-09-27, BEFORE the fix:
//   'reunion Friday to Sunday'          -> date null,       endDate null
//   'reunion next Friday to Sunday'     -> date 2026-10-02, endDate NULL  <- the gap
//   'reunion Friday to Sunday, July 10' -> date 2027-07-10, endDate null
//
// The middle row is the defect: a start resolved, the host said where the plan
// ends, and the end was dropped — the same silent-range-loss class the numeric
// and word-month range matchers already fixed.
//
// What this file pins, in order of what would hurt most if it broke:
//   1. The BARE-WEEKDAY RULING IS UNTOUCHED. "Friday to Sunday" with no other
//      date words still resolves to nothing. The new block cannot run without a
//      `date`, so it can never invent a start.
//   2. A resolved start + "<weekday> to <weekday>" yields the end weekday's next
//      occurrence after the start.
//   3. A CONTRADICTED start yields NO span (July 10 2027 is a Saturday, not the
//      stated Friday) — both ways of reconciling it would invent a fact.
//   4. Same weekday both sides yields NO span — endDate === date would read
//      downstream as a zero-night multi-day event.
//   5. An explicit date range already in the sentence wins; nothing overwrites it.

const NOW = new Date('2026-09-27T12:00:00'); // a Sunday, fixed so this never drifts

const span = (text) => {
  const r = parseSmartEventText(text, { now: NOW });
  return [r.date, r.endDate];
};

describe('a weekday span needs a start it did not invent', () => {
  test('THE RULING HOLDS — a bare weekday pair still resolves to nothing', () => {
    expect(span('reunion Friday to Sunday')).toEqual([null, null]);
    expect(span('reunion Friday through Sunday')).toEqual([null, null]);
    expect(span('family reunion, Fri to Sun, 30 people')).toEqual([null, null]);
  });

  test('THE GAP CLOSED — "next Friday to Sunday" now carries the end', () => {
    expect(span('reunion next Friday to Sunday')).toEqual(['2026-10-02', '2026-10-04']);
    expect(span('reunion this Friday through Sunday')).toEqual(['2026-10-02', '2026-10-04']);
  });

  test('every ordinary connector is heard, and case does not change the answer', () => {
    for (const text of [
      'reunion next Friday to Sunday',
      'reunion next Friday through Sunday',
      'reunion next Friday thru Sunday',
      'reunion next Friday until Sunday',
      'reunion next Friday - Sunday',
      'reunion next friday to sunday',
      'reunion next FRIDAY TO SUNDAY',
    ]) {
      expect([text, ...span(text)]).toEqual([text, '2026-10-02', '2026-10-04']);
    }
  });

  test('abbreviations work once the start came from a real date', () => {
    // July 10 2027 IS a Saturday, so "Sat to Sun" agrees with it.
    expect(span('reunion July 10 2027, Sat to Sun')).toEqual(['2027-07-10', '2027-07-11']);
    expect(span('reunion July 10 2027, Saturday to Monday')).toEqual(['2027-07-10', '2027-07-12']);
    expect(span('reunion next Thursday thru Sunday')).toEqual(['2026-10-01', '2026-10-04']);
  });

  test('the span rides ANY start, not just a weekday one', () => {
    // June 13 2026 is a Saturday; the stated start weekday agrees.
    expect(span('reunion Saturday to Monday June 13 2026')).toEqual(['2026-06-13', '2026-06-15']);
  });

  test('CONTRADICTED START — no span, and the date she typed stands alone', () => {
    // July 10 2027 is a SATURDAY. The host said Friday. Moving the start would
    // override a date she typed; keeping Saturday while calling it Friday
    // mislabels her word. Neither is honest, so the span is left unheard.
    expect(span('reunion Friday to Sunday, July 10 2027')).toEqual(['2027-07-10', null]);
    expect(span('reunion June 12 2027 Friday to Sunday')).toEqual(['2027-06-12', null]);
    // "in 2 weeks" from Sun 2026-09-27 is Sun 2026-10-11, not a Friday.
    expect(span('reunion in 2 weeks Friday to Sunday')).toEqual(['2026-10-11', null]);
    // Tomorrow is Mon 2026-09-28, not a Friday.
    expect(span('reunion tomorrow Friday to Sunday')).toEqual(['2026-09-28', null]);
  });

  test('SAME WEEKDAY BOTH SIDES — no span, never a zero-night one', () => {
    expect(span('reunion next Friday to Friday')).toEqual(['2026-10-02', null]);
    expect(span('reunion next Sunday to Sunday')).toEqual(['2026-10-04', null]);
  });

  test('an explicit date range already in the sentence is never overwritten', () => {
    // June 12-14 2027 is Sat-Mon. The range wins; the weekday pair adds nothing.
    expect(span('reunion June 12-14 2027 Friday to Sunday')).toEqual(['2027-06-12', '2027-06-14']);
    // THE DISCRIMINATING CASE. Above, the conflict guard would refuse the pair
    // anyway (the 12th is a Saturday, not the stated Friday), so that row alone
    // does not prove the `!endDate` guard is doing anything. Here the stated
    // start weekday AGREES with the range's start, and the stated end weekday
    // would land on the 13th — so only the `!endDate` guard keeps the host's own
    // typed 14th from being silently shortened by a day.
    expect(span('reunion June 12-14 2027 Saturday to Sunday')).toEqual(['2027-06-12', '2027-06-14']);
    expect(span('reunion 6/12/2027 - 6/14/2027, Saturday to Sunday')).toEqual(['2027-06-12', '2027-06-14']);
  });

  test('a mid-week pair is read literally, not rounded to a weekend', () => {
    expect(span('offsite next Monday to Wednesday')).toEqual(['2026-09-28', '2026-09-30']);
  });

  test('"weekend of" still behaves exactly as it did', () => {
    expect(span('weekend of June 12 2027')).toEqual(['2027-06-12', '2027-06-13']);
  });
});
