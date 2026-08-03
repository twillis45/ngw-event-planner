// ─── DATE SPANS AT INTAKE ─────────────────────────────────────────────────
//
// A dropped span is not cosmetic: endDate drives spanNights, which drives the
// multi-day budget range, the per-day food sizing, and whether the plan is
// treated as one day or a stretch. Driven from create, three things were wrong:
//
//   1. "June 12-14, 2028" returned 2027 — the stated YEAR matched nothing, so
//      the current year was used, failed the past check, and was bumped. A fact
//      the host gave correctly was silently replaced with a wrong one, which is
//      worse than not hearing it at all.
//   2. "the weekend of June 12" parsed the start and dropped the span.
//   3. "June 12 through the 14th" — the ordinary "the" broke the match.
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date('2026-08-02T12:00:00');
const p = (text) => parseSmartEventText(text, { now: NOW });

describe('an explicit year is authoritative', () => {
  test('a stated future year is kept, not bumped', () => {
    expect(p('Reunion June 12-14, 2028')).toMatchObject({ date: '2028-06-12', endDate: '2028-06-14' });
    expect(p('Wedding Sept 18-20, 2029')).toMatchObject({ date: '2029-09-18', endDate: '2029-09-20' });
  });

  test('the year may be written without a comma', () => {
    expect(p('Reunion June 12-14 2028')).toMatchObject({ date: '2028-06-12', endDate: '2028-06-14' });
  });

  test('with NO year stated, the next occurrence is still used', () => {
    // now = Aug 2026, so June 12 has passed -> 2027. Unchanged behaviour.
    expect(p('Reunion June 12-14')).toMatchObject({ date: '2027-06-12', endDate: '2027-06-14' });
  });
});

describe('"the weekend of" is a span', () => {
  test('a Friday start runs to Sunday', () => {
    // 2027-06-11 is a Friday.
    expect(p('Reunion the weekend of June 11, 2027')).toMatchObject({ date: '2027-06-11', endDate: '2027-06-13' });
  });

  test('a Saturday start runs to Sunday and never moves backward', () => {
    // 2027-06-12 is a Saturday. Reading it as Fri-Sun would invent June 11.
    expect(p('Reunion the weekend of June 12, 2027')).toMatchObject({ date: '2027-06-12', endDate: '2027-06-13' });
  });

  test('a Sunday stays a single day', () => {
    // 2027-06-13 is a Sunday.
    const r = p('Reunion the weekend of June 13, 2027');
    expect(r.date).toBe('2027-06-13');
    expect(r.endDate).toBe(null);
  });

  test('a WEEKDAY date is not stretched into a weekend', () => {
    // 2028-06-12 is a Monday. Running forward to the next Sunday produced a
    // six-day span — a fabricated event length. Ambiguous phrasing stays a
    // single day and the host says which weekend they meant.
    const r = p('Reunion the weekend of June 12, 2028');
    expect(r.date).toBe('2028-06-12');
    expect(r.endDate).toBe(null);
  });

  test('an explicit range still wins over the weekend rule', () => {
    expect(p('Reunion the weekend of June 11-14, 2027')).toMatchObject({ date: '2027-06-11', endDate: '2027-06-14' });
  });
});

describe('ordinary speech in a range', () => {
  test('"through the 14th" parses', () => {
    expect(p('Reunion June 12 through the 14th, 2027')).toMatchObject({ date: '2027-06-12', endDate: '2027-06-14' });
  });
});

describe('forms that already worked keep working', () => {
  test.each([
    ['Reunion June 12-14', '2027-06-12', '2027-06-14'],
    ['Reunion June 30 to July 2', '2027-06-30', '2027-07-02'],
    ['Reunion 11/13-11/16', '2026-11-13', '2026-11-16'],
    ['3-day reunion starting June 12', '2027-06-12', '2027-06-14'],
    ['Family reunion June 12, 2 nights', '2027-06-12', '2027-06-14'],
    ['Trip Dec 30 - Jan 2', '2026-12-30', '2027-01-02'],
    ['Retreat Oct 3 thru Oct 6', '2026-10-03', '2026-10-06'],
  ])('%s', (text, date, endDate) => {
    expect(p(text)).toMatchObject({ date, endDate });
  });

  test('a backwards same-month range is still noise, not a span', () => {
    const r = p('Reunion June 14-12');
    expect(r.endDate).toBe(null);
  });

  test('a single date still has no span', () => {
    expect(p('Birthday dinner June 12').endDate).toBe(null);
  });
});
