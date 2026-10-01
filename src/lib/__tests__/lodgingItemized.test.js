// "WE MAY NEED TO ITEMIZE THE WHAT IT HAS TO MAKE EASY COMPARISONS"
// (host, 2026-09-30), and then: prototype C, with the photo heading the column.
//
// What the table did before: one row per MUST-HAVE and nothing else. Three
// houses, four rows, and not a word about the forty other things the listings
// actually named — so answering "which one has the hot tub" meant reading three
// separate amenity walls on three separate cards.
//
// THE THREE STATES ARE THE POINT. `amenitiesAbsent` has been in the backend
// response since the amenity reader was written and had zero client consumers,
// so a listing that explicitly DENIED a hot tub and a listing that never
// mentioned one rendered the same dash. That is the difference between a gap
// worth a message to the owner and a question already answered.
const { lodgingCompare, normalizeLodgingOption } = require('../lodgingIntel');

// Two options minimum or there is no comparison; these carry no must-have
// vocabulary so the itemized rows are provably the itemizer's work.
const ev = (opts) => ({
  id: 'ev-1', name: 'Santa Fe', guestCount: 8,
  startDate: '2027-06-17', endDate: '2027-06-21',
  lodgingOptions: opts.map((o, i) => normalizeLodgingOption({
    id: 'o' + i, label: o.label, totalPrice: 2000 + i, sleeps: 8, ...o,
  }, i)),
});

const rowFor = (cmp, label) => cmp.rows.find((r) => r.label === label);

describe('the listing can say no, and that is not a gap', () => {
  test('yes / no / — are three different answers', () => {
    const cmp = lodgingCompare(ev([
      { label: 'Casa Uno', amenities: ['Hot tub'] },
      { label: 'Casa Dos', amenitiesAbsent: ['Hot tub'] },
      { label: 'Casa Tres' },
    ]));
    expect(rowFor(cmp, 'Hot tub').values).toEqual(['yes', 'no', '—']);
  });

  test('a denial is flagged so it can read differently from a gap', () => {
    const cmp = lodgingCompare(ev([
      { label: 'A', amenities: ['Pool'] },
      { label: 'B', amenitiesAbsent: ['Pool'] },
    ]));
    expect(rowFor(cmp, 'Pool').flags).toEqual([null, 'denied']);
  });

  test('absence from both lists is still "didn\'t say", never a no', () => {
    const cmp = lodgingCompare(ev([
      { label: 'A', amenities: ['Pool'] },
      { label: 'B', amenities: ['Kitchen'] },
    ]));
    expect(rowFor(cmp, 'Pool').values).toEqual(['yes', '—']);
    expect(rowFor(cmp, 'Pool').flags).toEqual([null, null]);
  });

  test('the normalizer keeps the absent list instead of dropping it', () => {
    const o = normalizeLodgingOption({ label: 'X', amenitiesAbsent: ['  Pool  ', '', 'Wifi'] }, 0);
    expect(o.amenitiesAbsent).toEqual(['Pool', 'Wifi']);
  });
});

describe('itemizing is a comparison, not a second wall', () => {
  test('listings that word the same thing differently share one row', () => {
    const cmp = lodgingCompare(ev([
      { label: 'A', amenities: ['Wifi'] },
      { label: 'B', amenities: ['Free wifi'] },
    ]));
    const wifi = cmp.rows.filter((r) => /wifi/i.test(r.label));
    expect(wifi).toHaveLength(1);
    // The shorter real phrasing is the label — both are the listing's own words.
    expect(wifi[0].label).toBe('Wifi');
    expect(wifi[0].values).toEqual(['yes', 'yes']);
  });

  // Three tiers, because two was wrong: a yes-against-a-gap is the second most
  // useful row on the table, not the least, and it is also not a real split.
  test('a real split outranks a partial, which outranks unanimous', () => {
    const cmp = lodgingCompare(ev([
      { label: 'A', amenities: ['Agreed thing', 'Partial thing', 'Split thing'] },
      { label: 'B', amenities: ['Agreed thing'], amenitiesAbsent: ['Split thing'] },
    ]));
    const am = cmp.rows.filter((r) => r.amenity).map((r) => r.label);
    expect(am).toEqual(['Split thing', 'Partial thing', 'Agreed thing']);
  });

  test('a gap is not counted as a disagreement', () => {
    // A says yes, B never mentioned it. B may well have it, so this must not
    // rank alongside a listing that actually said no.
    //
    // LABELLED AGAINST THE ALPHABET ON PURPOSE. The first cut of this test
    // used 'Loud'/'Quiet' and passed on the tie-breaker rather than on the
    // tier — a test that is green for a reason it is not about. 'Zebra' is the
    // real split and must still come first.
    const cmp = lodgingCompare(ev([
      { label: 'A', amenities: ['Zebra', 'Apple'] },
      { label: 'B', amenitiesAbsent: ['Zebra'] },
    ]));
    const am = cmp.rows.filter((r) => r.amenity).map((r) => r.label);
    expect(am).toEqual(['Zebra', 'Apple']);
  });

  test('a row no column can answer is not drawn at all', () => {
    const cmp = lodgingCompare(ev([{ label: 'A' }, { label: 'B' }]));
    expect(cmp.rows.filter((r) => r.amenity)).toHaveLength(0);
  });

  test('the table is capped and says how many it left out', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Thing ${String(i).padStart(2, '0')}`);
    const cmp = lodgingCompare(ev([
      { label: 'A', amenities: many },
      { label: 'B', amenities: many },
    ]));
    expect(cmp.rows.filter((r) => r.amenity)).toHaveLength(12);
    expect(cmp.amenitiesOver).toBe(8);
  });

  test('nothing left out means nothing claimed about leftovers', () => {
    const cmp = lodgingCompare(ev([
      { label: 'A', amenities: ['Pool'] },
      { label: 'B', amenities: ['Pool'] },
    ]));
    expect(cmp.amenitiesOver).toBe(0);
  });
});

describe('the photo heads the column (prototype C1)', () => {
  test('each column carries its own first photo', () => {
    const cmp = lodgingCompare(ev([
      { label: 'A', photoUrl: 'https://example.com/a.jpg' },
      { label: 'B', photos: ['https://example.com/b.jpg'] },
    ]));
    expect(cmp.columns.map((c) => c.photo))
      .toEqual(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
  });

  test('a column with no photo carries an empty string, never a placeholder', () => {
    const cmp = lodgingCompare(ev([{ label: 'A' }, { label: 'B' }]));
    expect(cmp.columns.map((c) => c.photo)).toEqual(['', '']);
  });
});
