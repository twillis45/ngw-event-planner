// ── A MUST-HAVE ROW READS THE LISTING'S OWN WORDS (2026-08-06) ─────────────
//
// Host, from the live side-by-side on a real Deep Creek event:
//
//   Step-free access   —   —
//   Washer & dryer     —   —
//
// Both houses' listings said they had a washer and dryer. The rows said "—".
//
// Two matchers were reading two different, and both incomplete, things: the
// ranker used `label + notes`, the side-by-side used `notes` ALONE, and the
// amenity list the unfurl now reads was in neither. One hay, both callers.
const { optionHay, lodgingCompare, mustHavesFor } = require('../lodgingIntel');

const EV = (over) => ({
  id: 'ev-hay', name: 'Mom’s 80th', type: 'Birthday', isDestination: true,
  date: '2028-06-17', endDate: '2028-06-21',
  venueCity: 'McHenry', venueState: 'MD', guestEstimate: 10,
  lodgingMustHaves: ['laundry', 'hottub'],
  budget: [], vendors: [], guests: [], ...over,
});

const HOUSE = (over) => ({
  id: 'a', status: 'option', label: 'Home in Oakland · ★5.0 · 6 bedrooms',
  sleeps: 16, notes: '6 bedrooms · 5/5 (15)', ...over,
});

describe('the hay carries everything we legitimately know', () => {
  it('includes the label, the notes and the listing’s amenities', () => {
    const hay = optionHay(HOUSE({ amenities: ['Kitchen', 'Free washer – In unit', 'Hot tub'] }));
    expect(hay).toMatch(/Oakland/);
    expect(hay).toMatch(/6 bedrooms/);
    expect(hay).toMatch(/Free washer/);
  });

  it('survives an option with nothing on it', () => {
    expect(optionHay(null)).toBe('  ');
    expect(optionHay({})).toBe('  ');
  });

  it('matches the host’s must-have against the listing’s phrasing', () => {
    // "Free washer – In unit" is how Airbnb words it; the must-have pattern is
    // /washer|laundry|dryer/i. It only ever failed because the words were not
    // in the hay — not because the pattern was wrong.
    const laundry = mustHavesFor(EV()).find((m) => m.id === 'laundry');
    expect(laundry).toBeTruthy();
    expect(laundry.match.test(optionHay(HOUSE({ amenities: ['Free washer – In unit'] })))).toBe(true);
    expect(laundry.match.test(optionHay(HOUSE({ amenities: [] })))).toBe(false);
  });
});

describe('the side-by-side row the host reported', () => {
  const rows = (opts) => {
    const cmp = lodgingCompare(EV({ lodgingOptions: opts }));
    const out = {};
    for (const r of (cmp && cmp.rows) || []) out[r.label] = r.values || r.cells;
    return out;
  };

  it('says yes when the listing says yes', () => {
    const r = rows([
      HOUSE({ id: 'a', amenities: ['Free washer – In unit', 'Free dryer – In unit', 'Hot tub'] }),
      HOUSE({ id: 'b', label: 'Home in Oakland · ★4.97', sleeps: 10, amenities: ['Kitchen'] }),
    ]);
    const laundry = r['Washer & dryer'];
    expect(laundry).toBeTruthy();
    expect(laundry[0]).toBe('yes');
    // and stays honest about the one that never mentioned it
    expect(laundry[1]).not.toBe('yes');
  });

  it('never invents a yes from silence', () => {
    const r = rows([HOUSE({ amenities: [] }), HOUSE({ id: 'b', amenities: [] })]);
    expect((r['Washer & dryer'] || [])[0]).not.toBe('yes');
  });
});
