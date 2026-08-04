// ─── THE TRANSPOSE COMPARISON (research rec #1) ────────────────────────────
//
// "Named attribute rows down a left rail, candidates as columns. Missing data
// becomes a visible gap in a known row instead of an absent element."
//
// The rule this gate exists to hold: a must-have is matched against the host's
// OWN TYPED NOTES, and typed notes can CONFIRM an amenity but never DENY one.
// A blank note means she didn't mention it — not that the house lacks it. So
// amenity rows are two-valued, 'yes' or '—', and there is no 'no' anywhere,
// because we would be inventing it.
const { lodgingCompare } = require('../lodgingIntel');

const opt = (o) => ({ status: 'option', ...o });
const evt = (over) => ({
  id: 'ev-cmp', name: 'Mom’s 80th', type: 'Birthday',
  date: '2028-06-17', endDate: '2028-06-21',
  isDestination: true, guestCount: 10,
  budget: [], vendors: [], guests: [],
  lodgingMustHaves: ['stepfree', 'laundry'],
  lodgingOptions: [
    opt({ id: 'a', label: 'The Ranch House', sleeps: 12, totalPrice: 4000, fees: 200,
      notes: 'single level, no stairs, washer and dryer' }),
    opt({ id: 'b', label: 'Casa Vista', sleeps: 8, totalPrice: 3800 }),
  ],
  ...over,
});

describe('the shortlist transposes into a comparison', () => {
  it('refuses to compare a single option', () => {
    expect(lodgingCompare(evt({ lodgingOptions: [opt({ id: 'a', label: 'One' })] }))).toBeNull();
    expect(lodgingCompare(evt({ lodgingOptions: [] }))).toBeNull();
  });

  it('puts candidates in columns and attributes in rows', () => {
    const c = lodgingCompare(evt());
    expect(c.columns.map((x) => x.label)).toEqual(['The Ranch House', 'Casa Vista']);
    const ids = c.rows.map((r) => r.id);
    expect(ids).toContain('allin');
    expect(ids).toContain('sleeps');
    // every row states a value for every column — that is what makes a gap visible
    for (const r of c.rows) expect(r.values).toHaveLength(c.columns.length);
  });

  it('adds fees into the all-in, and names the real span', () => {
    const c = lodgingCompare(evt());
    const allin = c.rows.find((r) => r.id === 'allin');
    expect(allin.label).toMatch(/4 nights/);
    expect(allin.values[0]).toBe('$4,200');   // 4000 + 200 fees
    expect(allin.values[1]).toBe('$3,800');
  });

  it('renders absence as “—”, never blank and never zero', () => {
    const c = lodgingCompare(evt());
    const night = c.rows.find((r) => r.id === 'night');
    // neither option typed a per-night price; it is derived where possible
    for (const r of c.rows) for (const v of r.values) {
      expect(v).not.toBe('');
      expect(v).not.toBe('0');
      expect(v == null).toBe(false);
    }
    expect(night.values.every((v) => v === '—' || /^\$/.test(v))).toBe(true);
  });

  it('never prints “no” for an amenity — typed notes cannot deny one', () => {
    const c = lodgingCompare(evt());
    const stepfree = c.rows.find((r) => r.id === 'stepfree');
    expect(stepfree.values[0]).toBe('yes');   // "single level, no stairs" matched
    expect(stepfree.values[1]).toBe('—');     // Casa Vista typed nothing — NOT a "no"
    const all = c.rows.flatMap((r) => r.values);
    expect(all).not.toContain('no');
  });

  it('only compares the requirements the host actually asked for', () => {
    const c = lodgingCompare(evt());
    const ids = c.rows.map((r) => r.id);
    expect(ids).toContain('stepfree');
    expect(ids).toContain('laundry');
    expect(ids).not.toContain('hottub');      // never asked for
  });

  it('flags a too-small house as short, and says why it is not a fault', () => {
    const c = lodgingCompare(evt());
    const sleeps = c.rows.find((r) => r.id === 'sleeps');
    expect(sleeps.values).toEqual(['12', '8']);
    expect(sleeps.flags).toEqual(['ok', 'short']);
    expect(c.note).toMatch(/didn’t say/);
    expect(c.note).toMatch(/nothing here is scraped/i);
  });

  it('caps at three columns so a phone can hold it', () => {
    const many = evt({ lodgingOptions: [1,2,3,4,5].map((n) =>
      opt({ id: `o${n}`, label: `House ${n}`, sleeps: 10, totalPrice: 1000 * n })) });
    expect(lodgingCompare(many).columns).toHaveLength(3);
  });
});
