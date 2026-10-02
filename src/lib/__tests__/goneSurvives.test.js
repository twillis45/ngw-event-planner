// "It's gone" is a state the surface promises and the normalizer throws away.
//
// normalizeLodgingOption ended with:
//   status: o.status === 'chosen' ? 'chosen' : 'option'
// a WHITELIST, and 'gone' is not on it. Everything downstream reads
// intel.options, so by the time the cockpit asks "is this one gone?" the
// answer is always no. Three consumers depend on that answer and all three
// are dead because of it:
//   · Choices filters gone out of the deck   -> no-op, lost places stay choosable
//   · NO LONGER ON THE TABLE renders only gone rows -> the panel cannot appear
//   · isGone styling                          -> never applies
//
// Same class as the topAction whitelist: a rebuild that silently drops any
// field it does not name.
const { normalizeLodgingOption, lodgingIntel, lodgingCompare } = require('../lodgingIntel');

const ev = (opts) => ({
  id: 'ev-g', name: 'Santa Fe', guestCount: 8,
  startDate: '2027-06-17', endDate: '2027-06-21',
  lodgingOptions: opts,
});

describe('a lost place stays lost', () => {
  test('the normalizer keeps gone instead of flattening it to option', () => {
    expect(normalizeLodgingOption({ id: 'a', label: 'A', status: 'gone' }, 0).status).toBe('gone');
  });

  test('chosen and option still mean what they meant', () => {
    expect(normalizeLodgingOption({ id: 'a', label: 'A', status: 'chosen' }, 0).status).toBe('chosen');
    expect(normalizeLodgingOption({ id: 'b', label: 'B' }, 0).status).toBe('option');
    // Anything unrecognised is an option, not a silent third state.
    expect(normalizeLodgingOption({ id: 'c', label: 'C', status: 'nonsense' }, 0).status).toBe('option');
  });

  test('intel carries it through, which is where every surface reads it', () => {
    const li = lodgingIntel(ev([
      { id: 'a', label: 'A', sleeps: 8 },
      { id: 'b', label: 'B', sleeps: 9, status: 'gone' },
    ]));
    expect(li.options.find((o) => o.id === 'b').status).toBe('gone');
  });

  test('a gone place is not a column in the comparison', () => {
    // Comparing a house somebody else booked is not a comparison.
    const cmp = lodgingCompare(ev([
      { id: 'a', label: 'A', sleeps: 8, totalPrice: 2000 },
      { id: 'b', label: 'B', sleeps: 9, totalPrice: 2100, status: 'gone' },
      { id: 'c', label: 'C', sleeps: 7, totalPrice: 2200 },
    ]));
    expect(cmp.columns.map((c) => c.label)).toEqual(['A', 'C']);
  });

  test('and cannot be forced into one by id either', () => {
    const cmp = lodgingCompare(ev([
      { id: 'a', label: 'A', sleeps: 8 },
      { id: 'b', label: 'B', sleeps: 9, status: 'gone' },
      { id: 'c', label: 'C', sleeps: 7 },
    ]), null, ['a', 'b']);
    // Only one real column survives, which is not a comparison.
    expect(cmp).toBeNull();
  });

  test('losing every place but one leaves nothing to compare', () => {
    expect(lodgingCompare(ev([
      { id: 'a', label: 'A', sleeps: 8 },
      { id: 'b', label: 'B', sleeps: 9, status: 'gone' },
    ]))).toBeNull();
  });
});
