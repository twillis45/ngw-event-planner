// A date the host states is the date (found on 11/7/2026, the day of the
// acceptance event itself). On Saturday, November 7, "this Saturday, November 7"
// was read as November 14: the weekday phrase ran first, and "this <today>"
// jumps a week. A stated month and day was then thrown away as unused. And once
// it was past noon, "November 7" alone counted as already past and moved to
// next year. A month and day the host said beats a weekday phrase, and "past"
// means before today, not before this minute.
import { parseSmartEventText, unusedClauses } from '../smartParseEvent';

const at = (iso) => { jest.useFakeTimers(); jest.setSystemTime(new Date(iso)); };
afterEach(() => { jest.useRealTimers(); });

describe('on the day itself (Saturday, November 7, 2026, 3:15 PM local)', () => {
  beforeEach(() => at('2026-11-07T15:15:00'));

  test('"this Saturday, November 7" is today', () => {
    expect(parseSmartEventText('Game night this Saturday, November 7, for ten').date).toBe('2026-11-07');
  });
  test('the stated date is not reported as unused', () => {
    expect(unusedClauses('Game night this Saturday, November 7, for ten').join(' ').toLowerCase()).not.toContain('november');
  });
  test('"November 7" said after noon is still today, not next year', () => {
    expect(parseSmartEventText('Game night November 7 for ten').date).toBe('2026-11-07');
    expect(parseSmartEventText('Game night 11/7 for ten').date).toBe('2026-11-07');
    expect(parseSmartEventText('Game night the 7th of November for ten').date).toBe('2026-11-07');
  });
  test('a stated date beats a weekday phrase that disagrees', () => {
    expect(parseSmartEventText('Brunch this Saturday, November 14').date).toBe('2026-11-14');
  });
});

describe('what did not change', () => {
  beforeEach(() => at('2026-11-07T15:15:00'));
  test('a date already gone this year still means next year', () => {
    expect(parseSmartEventText('Picnic June 12').date).toBe('2027-06-12');
    expect(parseSmartEventText('Picnic November 6').date).toBe('2027-11-06');
  });
  test('a weekday phrase alone works as before', () => {
    expect(parseSmartEventText('Dinner next Friday').date).toBe('2026-11-13');
    expect(parseSmartEventText('Dinner this Saturday').date).toBe('2026-11-14');
  });
});
