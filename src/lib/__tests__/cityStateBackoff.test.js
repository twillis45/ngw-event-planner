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
  // ⚠ TWO ASSERTIONS AMENDED 2026-09-18 (CITY-SAID-1). Both read
  // `venueCity → null` and were measured as `'Charleston'` / `'Springfield'`
  // after the bare-city fix. What this describe block is actually protecting —
  // "never a guessed state" — is unchanged and is now asserted DIRECTLY
  // (venueState null) instead of via the town's absence, which was only ever a
  // proxy for it. The state-backoff behaviour these tests were written for is
  // untouched; so is parseVenueLocation. See spokenCityGate.test.js.
  test('a bare city is heard, and its state is still NEVER guessed', () => {
    const r = p('80th birthday dinner in Charleston for 45');
    // Three Charlestons (SC, WV, and a second SC row) sit in the curated list.
    // The town is her word and is carried; which Charleston stays hers to say.
    expect(r.venueCity).toBe('Charleston');
    expect(r.venueState).toBeNull();
  });

  test('a non-state after the comma still yields nothing', () => {
    expect(p('crab feast at the park, food, and games').venueCity).toBeNull();
  });

  test('backing off never invents a DIFFERENT city, and never a state', () => {
    const r = p('party in Springfield, Notarealstate June 5');
    // "Notarealstate" is not a state, so nothing is committed: the city is the
    // word in front of the comma, exactly as typed, and the state stays null
    // rather than being back-filled from a list.
    expect(r.venueCity).toBe('Springfield');
    expect(r.venueState).toBeNull();
  });
});
