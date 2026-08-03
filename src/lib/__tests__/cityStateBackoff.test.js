// The state capture was unbounded, so a capitalised word FOLLOWING the state got
// pulled into it and the town was dropped. Found on a live drive 2026-08-03:
// "Santa Fe, New Mexico June 17-21 2028" lost the city, while the same city with
// "in June of 2028" after it parsed fine.
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date('2026-08-03T12:00:00Z');
const p = (txt) => parseSmartEventText(txt, { now: NOW });

describe('a word after the state no longer eats the state', () => {
  test('THE REGRESSION: a month directly after a two-word state', () => {
    const r = p('destination 80th birthday celebration in Santa Fe, New Mexico June 17-21 2028 for 10 people');
    expect(r.venueCity).toBe('Santa Fe');
    expect(r.venueState).toBe('NM');
  });

  test('a month directly after a ONE-word state (a cap alone would not fix this)', () => {
    const r = p('graduation party in Austin, Texas June 5 for 40');
    expect(r.venueCity).toBe('Austin');
    expect(r.venueState).toBe('TX');
  });

  test('the phrasing that already worked still works', () => {
    const r = p('destination 80th birthday celebration in Santa Fe, New Mexico in June of 2028');
    expect(r.venueCity).toBe('Santa Fe');
    expect(r.venueState).toBe('NM');
  });

  test('a plain city + state with nothing after it is unchanged', () => {
    const r = p('reunion in Charleston, South Carolina for 30');
    expect(r.venueCity).toBe('Charleston');
    expect(r.venueState).toBe('SC');
  });
});

describe('the strict gate is NOT loosened', () => {
  test('a bare city with no state is still refused — never a guessed state', () => {
    expect(p('80th birthday dinner in Charleston for 45').venueCity).toBeNull();
  });

  test('a non-state after the comma still yields nothing', () => {
    expect(p('crab feast at the park, food, and games').venueCity).toBeNull();
  });

  test('backing off never invents a DIFFERENT city', () => {
    const r = p('party in Springfield, Notarealstate June 5');
    expect(r.venueCity).toBeNull();
  });
});
