// ─── THE HOTELS DOOR CARRIES THE TRIP (2026-08-06) ──────────────────────────
//
// The two `PROVEN LIVE` strings below are not expected values someone derived
// from the encoder — they were captured from Google Travel itself and driven in
// a browser before this file existed. Each one was pasted into a real URL and
// the date/guest pickers were read back:
//
//   · 5 adults  → pickers read "Tue, Sep 15", "Sat, Sep 19", "5"
//   · no guests → pickers read "Tue, Sep 15", "Sat, Sep 19", "2" (Google's own
//                 default, because the guests block is absent rather than made up)
//
// So this suite pins the encoder to observed platform behaviour, not to itself.
// If Google changes the shape, these fail and the door goes back to carrying
// nothing — which is the honest outcome, since `applied` keys off the same
// value.
import { googleTravelTs } from '../googleTravelTs';
import { lodgingSearchLinks, appliedByEveryDoor } from '../lodgingIntel';

// The day the shape was proven. Fixed so the past-date guard is deterministic.
const NOW = new Date(2026, 7, 6, 9, 0, 0);

describe('googleTravelTs — the parameter Google actually parses', () => {
  test('matches the string proven live for 5 adults, Sep 15–19', () => {
    expect(googleTravelTs({ place: 'Santa Fe', start: '2026-09-15', end: '2026-09-19', guests: 5 }, NOW))
      .toBe('CAESFgoCCAMKAggDCgIIAwoCCAMKAggDEAEaKgoMEgo6CFNhbnRhIEZlEhoSFAoHCOoPEAkYDxIHCOoPEAkYExgEMgIQACoHCgU6A1VTRA');
  });

  test('matches the string proven live with no party stated', () => {
    expect(googleTravelTs({ place: 'Santa Fe', start: '2026-09-15', end: '2026-09-19' }, NOW))
      .toBe('CAEaKgoMEgo6CFNhbnRhIEZlEhoSFAoHCOoPEAkYDxIHCOoPEAkYExgEMgIQACoHCgU6A1VTRA');
  });

  test('the party size IS the repeat count — 5 adults is longer than 2', () => {
    const two = googleTravelTs({ place: 'Santa Fe', start: '2026-09-15', end: '2026-09-19', guests: 2 }, NOW);
    const five = googleTravelTs({ place: 'Santa Fe', start: '2026-09-15', end: '2026-09-19', guests: 5 }, NOW);
    expect(five.length).toBeGreaterThan(two.length);
    expect(five).not.toBe(two);
  });

  test('a town we hold no place-id for still builds — name alone is enough', () => {
    // The captured links carried a Knowledge Graph id we do not have for an
    // arbitrary town. Proven live that field 7 alone is honoured.
    expect(googleTravelTs({ place: 'Deep Creek Lake, Maryland', start: '2026-09-15', end: '2026-09-19', guests: 4 }, NOW))
      .toEqual(expect.any(String));
  });

  describe('it returns null rather than a string Google will ignore', () => {
    const cases = [
      ['a stay already under way', { place: 'Santa Fe', start: '2026-06-20', end: '2026-06-24', guests: 5 }],
      ['no dates at all', { place: 'Santa Fe', guests: 5 }],
      ['no place', { place: '', start: '2026-09-15', end: '2026-09-19' }],
      ['check-out before check-in', { place: 'Santa Fe', start: '2026-09-19', end: '2026-09-15' }],
      ['a zero-night stay', { place: 'Santa Fe', start: '2026-09-15', end: '2026-09-15' }],
      ['a date that does not exist', { place: 'Santa Fe', start: '2026-02-31', end: '2026-03-04' }],
      ['a date in the wrong format', { place: 'Santa Fe', start: 'Sep 15 2026', end: '2026-09-19' }],
    ];
    test.each(cases)('%s', (_label, trip) => {
      expect(googleTravelTs(trip, NOW)).toBeNull();
    });
  });

  test('a stay starting TODAY is still bookable, so it builds', () => {
    expect(googleTravelTs({ place: 'Santa Fe', start: '2026-08-06', end: '2026-08-08' }, NOW))
      .toEqual(expect.any(String));
  });
});

describe('the doors say what their own URL carries', () => {
  const ev = {
    id: 'ev-t', type: 'Birthday', isDestination: true,
    venueCity: 'Santa Fe, NM',
    date: '2027-09-15', endDate: '2027-09-19',
    guestCount: 5, totalBudget: 3000,
  };
  const doors = () => lodgingSearchLinks(ev) || [];
  const door = (id) => doors().find((l) => l.id === id);

  test('the hotels href carries ts, and no longer puts dates in the search box', () => {
    const h = door('hotels');
    expect(h).toBeTruthy();
    expect(h.href).toMatch(/[?&]ts=/);
    // Google echoes `q` into its own search box. Prose dates there would tell
    // the host a different story than the pickers beside it.
    const q = decodeURIComponent((h.href.match(/[?&]q=([^&]*)/) || [])[1] || '');
    expect(q).not.toMatch(/\d/);
    expect(q).toMatch(/Santa Fe/);
  });

  test('no budget or must-have filter is claimed for the hotels door', () => {
    const said = (door('hotels').applied || []).join(' · ');
    expect(said).not.toMatch(/under \$/);
  });

  test('no budget is claimed for Vrbo, whose URL never took one', () => {
    const v = door('vrbo');
    expect(v.href).not.toMatch(/price/i);
    expect((v.applied || []).join(' · ')).not.toMatch(/under \$/);
  });

  test('Airbnb still claims the budget, because its URL really carries it', () => {
    const a = door('airbnb');
    expect(a.href).toMatch(/price_max=3000/);
    expect((a.applied || []).join(' · ')).toMatch(/under \$3,000/);
  });

  test('the one line under the doors shows only what every door has', () => {
    const every = appliedByEveryDoor(doors()).join(' · ');
    expect(every).toMatch(/Santa Fe/);
    expect(every).not.toMatch(/under \$/);   // Airbnb's alone
  });

  test('a stay already under way drops the dates from the hotels door, and says so', () => {
    const past = lodgingSearchLinks({ ...ev, date: '2020-06-20', endDate: '2020-06-24' }) || [];
    const h = past.find((l) => l.id === 'hotels');
    expect(h.href).not.toMatch(/[?&]ts=/);
    expect(h.carriesDates).toBe(false);
    expect(past.every((l) => l.carriesDates)).toBe(false);
  });
});
