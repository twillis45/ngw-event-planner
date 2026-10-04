// ─── THE HOST SAYING NO IS NOT THE MARKET SAYING NO ─────────────────────────
//
// Host, 2026-10-04: "allow host to remove properties."
//
// `gone` already existed and was the obvious reuse. It is the wrong fact:
// `gone` drives lodgingTrouble's "Casa Verde fell through" and offers to help
// the host recover from a loss — told about a decision they made on purpose.
//
// AND THE SECOND STATUS IS WHERE THE REAL RISK IS. Seven call sites across
// the engine and the cockpit filtered `status !== 'gone'` to mean "live".
// Adding a dead status by hand means missing one and having a removed place
// reappear in exactly one view. That is the whitelist defect this repo has
// already paid for twice (topAction, PARSER_FIELDS), so liveness is one
// predicate now and this file pins it.
process.env.REACT_APP_API_BASE_URL = 'https://example.test';
const {
  isLiveOption, LODGING_STATUSES, normalizeLodgingOption,
  lodgingTrouble, lodgingCompare, lodgingIntel,
} = require('../lodgingIntel');

const EV = (options) => ({
  id: 'e1', type: 'Reunion', isDestination: true,
  venueCity: 'Anaheim', venueState: 'CA',
  date: '2027-03-12', endDate: '2027-03-15',
  guestCount: 16, lodgingOptions: options,
});
const OPT = (id, status) => ({ id, label: `Place ${id}`, status, pricePerNight: 400 });

describe('removed is its own fact', () => {
  test('the normalizer carries it instead of flattening it to option', () => {
    expect(normalizeLodgingOption({ id: 'a', status: 'removed' }).status).toBe('removed');
    // and still refuses anything it does not know
    expect(normalizeLodgingOption({ id: 'a', status: 'banana' }).status).toBe('option');
  });

  test('the vocabulary is closed and names all four', () => {
    expect([...LODGING_STATUSES].sort()).toEqual(['chosen', 'gone', 'option', 'removed']);
  });

  test('liveness is one predicate, and both dead statuses are dead', () => {
    expect(isLiveOption(OPT('a', 'option'))).toBe(true);
    expect(isLiveOption(OPT('a', 'chosen'))).toBe(true);
    expect(isLiveOption(OPT('a', 'gone'))).toBe(false);
    expect(isLiveOption(OPT('a', 'removed'))).toBe(false);
    expect(isLiveOption(null)).toBe(false);
  });

  // THE POINT OF THE WHOLE SLICE. "Fell through" is a story about bad luck.
  test('a removal never reads as a fall-through', () => {
    const t = lodgingTrouble(EV([OPT('a', 'removed'), OPT('b', 'option')]));
    expect(t).toBe(null);
  });

  test('but a real fall-through still does', () => {
    const t = lodgingTrouble(EV([{ ...OPT('a', 'gone'), wasChosen: true }, OPT('b', 'option')]));
    expect(t).toBeTruthy();
    expect(t.state).toBe('pick-fell-through');
  });

  test('and a removed place is not counted among what is left', () => {
    const t = lodgingTrouble(EV([
      { ...OPT('a', 'gone'), wasChosen: true }, OPT('b', 'option'), OPT('c', 'removed'),
    ]));
    // One live place remains, not two.
    expect(t.detail).toMatch(/one other place/i);
  });

  test('the comparison never offers a removed place as a column', () => {
    const cmp = lodgingCompare(EV([OPT('a', 'option'), OPT('b', 'removed'), OPT('c', 'option')]));
    const ids = (cmp.columns || []).map((c) => c.id);
    expect(ids).not.toContain('b');
    expect(ids).toEqual(expect.arrayContaining(['a', 'c']));
  });

  // SOFT MEANS RECOVERABLE: the row keeps every field, so putting it back is
  // a one-word write rather than a reconstruction from data we did not keep.
  test('removal keeps the row and everything on it', () => {
    const li = lodgingIntel(EV([{ ...OPT('a', 'removed'), url: 'https://x.test/1', bedrooms: 8 }]));
    const row = li.options.find((o) => o.id === 'a');
    expect(row.status).toBe('removed');
    expect(row.url).toBe('https://x.test/1');
    expect(row.bedrooms).toBe(8);
  });
});
