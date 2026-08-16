// ─── MEASURED REGIONAL FACTORS (data only) ───────────────────────────────────
//
// Every number here was pulled from the BLS public API on 2026-08-16 and is the
// published value, not a derivation. Factors are regionValue / usValue computed
// from those figures, rounded to three places.
//
// The API needs no key and answers plainly:
//   https://api.bls.gov/publicAPI/v2/timeseries/data/<seriesId>
// which is how these were fetched after bls.gov and FRED both refused a fetcher.
// Recording that here because the next person will hit the same wall: the data
// is public, the HTML pages are not fetchable, the API is.
//
// SERIES ID STRUCTURE: APU + area + item.
//   APU0000  US city average      APU0100  Northeast     APU0200  Midwest
//   APU0300  South                APU0400  West
// so the same item across regions differs only in those four digits.
//
// ── WHY REGION AND NOT METRO (probed 2026-08-16, not assumed) ───────────────
//
// BLS publishes far finer geography than four regions - `ap.area` lists 9 census
// DIVISIONS (New England, Middle Atlantic, East/West North Central, South
// Atlantic, East/West South Central, Mountain, Pacific), four city-SIZE classes,
// and ~23 METROS including S12A New York, S23A Chicago, S35A Washington DC,
// S49A Los Angeles and - the ones that would matter most - S49G Urban Alaska
// and S49F Urban Hawaii.
//
// None of it exists for FOOD. Probed against the API, all four returned
// "Series does not exist":
//
//   APU0120711211   bananas, Middle Atlantic division
//   APUS000711211   bananas, City Size Class A
//   APUS12A711211   bananas, New York metro
//   APUA421711211   bananas, Los Angeles metro
//
// while the same metro area DOES carry energy:
//
//   APUS49A72610    electricity per KWh, Los Angeles metro - exists, to Dec 2024
//
// So metro-level average prices are an ENERGY series, not a food one. Region is
// the finest resolution the food data actually has, and `geoPlanNote` naming the
// region rather than the state or city is therefore the honest ceiling - not a
// shortcut that a later pass should "improve" by guessing a metro factor.
//
// If this corpus ever prices utilities or fuel for a venue, the metro series are
// there and should be used at that resolution.
//
// THIS TABLE IS DELIBERATELY SMALL. It covers the two commodities actually
// verified end to end. Adding a row means pulling five series and computing the
// factors — never estimating one from a neighbouring item, because the two rows
// below already disagree in DIRECTION (see the South).
export const ITEM_SERIES = Object.freeze({
  bananas: {
    us: 'APU0000711211',
    northeast: 'APU0100711211',
    midwest: 'APU0200711211',
    south: 'APU0300711211',
    west: 'APU0400711211',
  },
  potatoes: {
    us: 'APU0000712112',
    northeast: 'APU0100712112',
    midwest: 'APU0200712112',
    south: 'APU0300712112',
    west: 'APU0400712112',
  },
});

export const REGIONAL_FACTORS = Object.freeze({
  bananas: {
    label: 'average price for bananas, per pound',
    period: 'July 2026',
    usValue: 0.650,
    regionValues: { northeast: 0.692, midwest: 0.616, south: 0.617, west: 0.701 },
    factors: { northeast: 1.065, midwest: 0.948, south: 0.949, west: 1.078 },
  },
  potatoes: {
    // West is May 2026 — the most recent published point for that series, and
    // left as published rather than interpolated forward to match the others.
    label: 'average price for white potatoes, per pound',
    period: 'July 2026 (West: May 2026)',
    usValue: 0.940,
    regionValues: { northeast: 0.984, midwest: 0.774, south: 1.000, west: 0.916 },
    factors: { northeast: 1.047, midwest: 0.823, south: 1.064, west: 0.974 },
  },
});
