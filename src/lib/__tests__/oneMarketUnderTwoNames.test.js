// ─── THE HOST PICKED A MARKET AND THREE ENGINES NEVER HEARD ABOUT IT ─────────
//
// The two host shells wrote the SAME fact — the event's metro market, chosen
// from the same `METRO_MARKETS` list — under two different field names:
//
//   CRA create flow (App.js:12109)    ->  event.market  = form.market || profile.metroMarket
//   CRA inline price picker (:10790)  ->  event.market
//   hostv2 market sheet (:18144)      ->  event.metroMarket
//
// and every reader in `lib/` picked `market`. MEASURED before the fix, on one
// Juneteenth Cookout, 20 guests, no venue and no city, the ONLY difference
// between the two columns being which field the id sat in:
//
//   reader                      market: 'dc'             metroMarket: 'dc'
//   ──────────────────────────────────────────────────────────────────────
//   playbooks/index.js:4227     + p_halfsmokes, p_mumbo    (nothing)
//   eventGeoQuery.js:60         "Washington, DC, US"       ""
//   analyticsReader.js:102      byMarket { dc: 1 }         { Unspecified: 1 }
//
// A hostv2 host who picked Washington DC got a Juneteenth plan with no
// half-smokes and no mumbo sauce — the two items the region gate exists to put
// on the plate ("localness is on the plate, not a prompt", the 64-#5 comment at
// playbooks/index.js:4222) — an EMPTY geo anchor where a CRA host got a real
// city, and an event that vanished into "Unspecified" in market analytics.
//
// It ran the other way too: hostv2's own metro price factor read only
// `metroMarket`, so a CRA-created event opened in hostv2 showed "National
// baseline" over a market its host had already chosen.
//
// THE FIX IS AN ACCESSOR, NOT A RENAME. Events are already persisted under both
// names — a rename fixes new writes and leaves every saved event wrong. The
// hostv2 picker now writes the canonical `market` and clears the old name, so
// the duplicate stops spreading; `marketFor` keeps the already-saved events
// readable.
import { marketFor, marketFieldFor } from '../marketFor';
import { playbookFoodPlan } from '../playbooks';
import { eventGeoQuery } from '../eventGeoQuery';
import { locationSpread } from '../analyticsReader';
import { METRO_MARKETS } from '../vendorEstimator';

const ev = (extra) => ({
  id: 'e', name: 'Probe', type: 'Juneteenth Cookout', date: '2026-10-20',
  guestMode: 'count', guestCount: 20, guests: [], ...extra,
});
const ids = (e) => (playbookFoodPlan(e).list || []).map((x) => x.id);

describe('one market under two names', () => {
  test('(premise) the region-gated items and the metro geo really exist', () => {
    // Every assertion below is vacuous if the corpus carries no DMV-gated item
    // or the dc market has no geo entry.
    const none = ids(ev({}));
    const gated = ids(ev({ market: 'dc' })).filter((x) => !none.includes(x));
    expect(gated).toEqual(['p_halfsmokes', 'p_mumbo']);
    expect(eventGeoQuery(ev({ market: 'dc' }))).toBe('Washington, DC, US');
    // And both shells' pickers really do draw on the same id vocabulary.
    expect(METRO_MARKETS.map((m) => m.id)).toContain('dc');
  });

  test('THE DEFECT: an event that stored the id under the other name now reads the same', () => {
    const asMarket = ev({ market: 'dc' });
    const asMetro = ev({ metroMarket: 'dc' });

    // 1 — the region gate puts the local dishes on the plate either way
    expect(ids(asMetro)).toEqual(ids(asMarket));
    expect(ids(asMetro)).toEqual(expect.arrayContaining(['p_halfsmokes', 'p_mumbo']));

    // 2 — the geo anchor resolves either way (it was "" for metroMarket)
    expect(eventGeoQuery(asMetro)).toBe('Washington, DC, US');

    // 3 — analytics counts the event under its real market, not "Unspecified"
    expect(locationSpread([asMetro]).byMarket).toEqual({ dc: 1 });
  });

  test('the accessor says WHICH field answered', () => {
    // A migration that wants to count the divergence, or a surface that wants to
    // say where a figure came from, needs the field name and not just the value.
    expect(marketFieldFor(ev({ market: 'atl' }))).toBe('market');
    expect(marketFieldFor(ev({ metroMarket: 'atl' }))).toBe('metroMarket');
    expect(marketFieldFor(ev({}))).toBe(null);
    // `market` wins when both are present — it is the CRA create flow's fold of
    // the host's per-event choice over their profile default, so it is the more
    // specific answer.
    expect(marketFor(ev({ market: 'atl', metroMarket: 'dc' }))).toBe('atl');
  });

  test('NEGATIVE CONTROL: no market set still means NO market, not a guessed one', () => {
    // The whole point of the geo anchor's doctrine comment is "empty when truly
    // unknown — never a fabricated location". Reading a second field must not
    // turn an unset market into an invented city or an invented region.
    const blank = ev({});
    expect(marketFor(blank)).toBe('');
    expect(marketFieldFor(blank)).toBe(null);
    expect(eventGeoQuery(blank)).toBe('');
    expect(ids(blank)).not.toEqual(expect.arrayContaining(['p_halfsmokes']));
    expect(locationSpread([blank]).byMarket).toEqual({ Unspecified: 1 });
    // Blank strings and nulls are unset, not a market named "".
    for (const junk of [{ market: '' }, { metroMarket: '   ' }, { market: null }, { metroMarket: undefined }]) {
      expect(`${JSON.stringify(junk)} -> ${marketFor(ev(junk))}`).toBe(`${JSON.stringify(junk)} -> `);
    }
    expect(marketFor(null)).toBe('');
    expect(marketFor(undefined)).toBe('');
  });

  test('NEGATIVE CONTROL: a NON-DMV market gets no DMV dishes', () => {
    // If the accessor had made the region gate permissive rather than merely
    // readable, every market would pick up half-smokes. Atlanta must not.
    const atl = ids(ev({ metroMarket: 'atl' }));
    expect(atl).not.toEqual(expect.arrayContaining(['p_halfsmokes', 'p_mumbo']));
    expect(eventGeoQuery(ev({ metroMarket: 'atl' }))).toBe('Atlanta, GA, US');
  });

  test('NEGATIVE CONTROL: the market never outranks a real venue or city', () => {
    // eventGeoQuery resolves structured city/state and a locatable venue BEFORE
    // the metro fallback. Teaching it a second field must not move it up the
    // order — a coarse metro beating an actual address is the exact regression
    // the "near Atlanta chips under an Alexandria venue" comment records.
    expect(eventGeoQuery(ev({ metroMarket: 'atl', venueCity: 'Alexandria', state: 'VA' })))
      .toBe('Alexandria, VA, US');
    expect(eventGeoQuery(ev({ metroMarket: 'atl', venue: 'VFW Post 3150 — Alexandria, VA' })))
      .toBe('VFW Post 3150 — Alexandria, VA');
  });

  test('NEGATIVE CONTROL: state still decides the region on its own', () => {
    // The region gate resolved from the metro OR the state before this change.
    // The state path is independent of the market fields and must be untouched.
    expect(ids(ev({ state: 'MD' }))).toEqual(expect.arrayContaining(['p_halfsmokes', 'p_mumbo']));
    expect(ids(ev({ state: 'CA' }))).not.toEqual(expect.arrayContaining(['p_halfsmokes']));
  });
});
