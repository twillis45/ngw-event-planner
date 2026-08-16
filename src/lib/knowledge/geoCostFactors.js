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
// ── ALASKA AND HAWAII CANNOT BE FIXED WITH BLS (proved 2026-08-16) ──────────
//
// These are the two markets where a national band is most wrong - beer runs
// $16.43 a case in Illinois against $33.62 in Alaska - so they were the obvious
// place to look for finer data. BLS does publish them: `ap.area` lists S49G Urban
// Alaska and S49F Urban Hawaii.
//
// It publishes NO FOOD for either. Checked against the full `ap.series` file
// rather than the API (see the rate-limit note below): the two areas carry 23
// series between them and every item code is in the 725xx / 726xx / 747xx
// ranges - utility gas, electricity, and motor fuel:
//
//   APUS49G72511 72601 72610 72611 72620 72621 74712 74713 74714 74715 74716 7471A
//   APUS49F      72601 72610 72611 72620 72621 74712 74713 74714 74715 74716 7471A
//
// Census puts both states in the WEST, so an Anchorage host currently receives a
// West factor built overwhelmingly from California, Oregon and Washington. For
// food that is not a small error and BLS offers nothing better. Closing it needs
// a different source class entirely - state alcohol boards, retailer APIs with
// store-level pricing, or a cost-of-living index - and until one exists the
// honest behaviour is the one already shipped: say the number is national.
//
// TOOLING NOTE FOR THE NEXT PERSON. The BLS public API is capped at 25 requests
// a day for anonymous callers and this session exhausted it. The bulk files at
// downloadt.bls.gov/pub/time.series/ap/ (ap.area, ap.item, ap.series) are NOT
// rate limited and answer "does this series exist" better than probing one id at
// a time. Also: a summarised fetch of ap.series reported that S49G and S49F were
// absent; grepping the downloaded file found 23 of them. Grep the file.
//
// ── ALCOHOL GEOGRAPHY: WHAT EXISTS, AND WHAT STATE BOARDS CAN AND CANNOT DO ─
//
// Investigated 2026-08-16 because alcohol carries the widest geographic spread
// in the corpus (beer $16.43 a case in Illinois against $33.62 in Alaska).
//
// BEER AND WINE: BLS HAS THEM, CURRENTLY, ALL FOUR REGIONS. Malt beverages
// (720111) and table wine (720311) both run to May 2026 and are in the table
// above. I had recorded that alcohol geography would need state boards; for beer
// and wine that was wrong.
//
// SPIRITS: BLS HAS EFFECTIVELY NOTHING. Bourbon (720211) and domestic vodka
// (720221) have NO rows at all in the current data file. "Vodka, all types"
// (720222) has a US series ending 2024-M04 and regional series that stopped in
// NOVEMBER 1997. So for spirits the state boards really are the only route.
//
// WHAT CONTROL STATES GIVE YOU, precisely: there are 18 control jurisdictions
// (OR ID MT WY UT IA MI MS AL ME VT NH OH PA WV VA NC, plus Montgomery County
// MD), and within one, a product "is available in all retail locations
// throughout the state at the same cost" (NABCA). That uniformity is the prize -
// a control-state price is THE state price, not a sample of one shop. The corpus
// already leans on this indirectly: `spirits-budgetbar-2026` cites named North
// Carolina shelf prices.
//
// WHAT THEY CANNOT GIVE YOU, and this corrects an earlier note in this repo:
// **ALASKA AND HAWAII ARE NOT CONTROL STATES.** They are license states where
// retailers set their own prices, so no board publishes a price for them. The
// two markets where a national band is most wrong are reachable by neither BLS
// (no food or alcohol series - see the Alaska/Hawaii block below) NOR by control
// boards. Any fix there needs retailer-level data, and should be labelled a
// sample rather than a state price.
//
// The other 32 license states have no single price either - only a distribution
// across retailers - so a "state price" is a category error outside the 18.

// ── DATE-MATCHING IS NOT OPTIONAL (learned the hard way, 2026-08-16) ────────
//
// A factor is regionValue / usValue at THE SAME PERIOD. Taking each series' own
// most recent value and dividing produces garbage, because regional series are
// discontinued at different times. Computed that way this file would have
// claimed coffee at 0.377x in the Northeast and sugar at 0.534x in the Midwest -
// 60% swings on staples, which should be the tell.
//
// The cause: those regional series stopped years ago. Date-matched, the newest
// period where all five carry a value is 2004 for coffee, 2013 for sugar, 2016
// for flour, 2020 for milk, 2024 for cheddar. Only 30 items still have current
// four-region coverage at all, and those are the only ones eligible here.
//
// So: match periods, and reject anything whose common period is stale.
//
// THIS TABLE IS DELIBERATELY SMALL. It covers the two commodities actually
// verified end to end. Adding a row means pulling five series and computing the
// factors — never estimating one from a neighbouring item, because the two rows
// below already disagree in DIRECTION (see the South).
export const ITEM_SERIES = Object.freeze({
  // ── ALCOHOL HAS REGIONAL DATA AFTER ALL (added 2026-08-16) ────────────────
  // I had recorded that alcohol geography would need state control boards. It
  // does not, at region level: BLS publishes malt beverages (720111) and table
  // wine (720311) across all four regions, currently. State boards remain the
  // only route to STATE-level spirits pricing and to Alaska/Hawaii, but the
  // regional shape for beer and wine is public and free.
  beerMalt: {
    us: 'APU0000720111', northeast: 'APU0100720111', midwest: 'APU0200720111',
    south: 'APU0300720111', west: 'APU0400720111',
  },
  wineTable: {
    us: 'APU0000720311', northeast: 'APU0100720311', midwest: 'APU0200720311',
    south: 'APU0300720311', west: 'APU0400720311',
  },
  breadWhite: {
    us: 'APU0000702111', northeast: 'APU0100702111', midwest: 'APU0200702111',
    south: 'APU0300702111', west: 'APU0400702111',
  },
  chickenWhole: {
    us: 'APU0000706111', northeast: 'APU0100706111', midwest: 'APU0200706111',
    south: 'APU0300706111', west: 'APU0400706111',
  },
  potatoChips: {
    us: 'APU0000718311', northeast: 'APU0100718311', midwest: 'APU0200718311',
    south: 'APU0300718311', west: 'APU0400718311',
  },
  bacon: {
    us: 'APU0000704111', northeast: 'APU0100704111', midwest: 'APU0200704111',
    south: 'APU0300704111', west: 'APU0400704111',
  },

  groundBeef: {
    us: 'APU0000703112',
    northeast: 'APU0100703112',
    midwest: 'APU0200703112',
    south: 'APU0300703112',
    west: 'APU0400703112',
  },
  // PARTIAL ON PURPOSE. Northeast and Midwest bone-in chicken carry NO numeric
  // data - the series exist and return only an October 2025 point marked
  // "Data unavailable due to the 2025 lapse in appropriations", with nothing for
  // 2023 or 2024 either. They are omitted rather than filled from a neighbour,
  // which is what `geoAdjust`'s per-region typeof guard is for: a host in Boston
  // gets `national: true` on chicken and is told so.
  chickenLegs: {
    us: 'APU0000706212',
    south: 'APU0300706212',
    west: 'APU0400706212',
  },
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
  // Six items added from the BULK FILE rather than the API, which was rate
  // limited. Each uses the newest period where ALL FIVE series carry a value -
  // see the date-matching note below, which is not optional.
  beerMalt: {
    label: 'average price for malt beverages, all types, per 16 oz',
    period: 'May 2026',
    usValue: 1.877,
    regionValues: { northeast: 1.896, midwest: 1.751, south: 1.785, west: 2.177 },
    factors: { northeast: 1.010, midwest: 0.933, south: 0.951, west: 1.160 },
  },
  wineTable: {
    label: 'average price for red and white table wine, per litre',
    period: 'May 2026',
    usValue: 13.841,
    regionValues: { northeast: 15.348, midwest: 13.181, south: 12.679, west: 14.600 },
    factors: { northeast: 1.109, midwest: 0.952, south: 0.916, west: 1.055 },
  },
  breadWhite: {
    label: 'average price for white pan bread, per pound',
    period: 'April 2026',
    usValue: 1.869,
    regionValues: { northeast: 1.921, midwest: 1.792, south: 1.731, west: 2.100 },
    factors: { northeast: 1.028, midwest: 0.959, south: 0.926, west: 1.124 },
  },
  chickenWhole: {
    label: 'average price for fresh whole chicken, per pound',
    period: 'May 2026',
    usValue: 2.036,
    regionValues: { northeast: 2.181, midwest: 2.169, south: 1.899, west: 2.093 },
    factors: { northeast: 1.071, midwest: 1.065, south: 0.933, west: 1.028 },
  },
  potatoChips: {
    label: 'average price for potato chips, per 16 oz',
    period: 'May 2026',
    usValue: 6.580,
    regionValues: { northeast: 7.828, midwest: 6.085, south: 6.798, west: 5.694 },
    factors: { northeast: 1.190, midwest: 0.925, south: 1.033, west: 0.865 },
  },
  bacon: {
    label: 'average price for sliced bacon, per pound',
    period: 'May 2026',
    usValue: 6.712,
    regionValues: { northeast: 7.498, midwest: 6.544, south: 6.163, west: 7.133 },
    factors: { northeast: 1.117, midwest: 0.975, south: 0.918, west: 1.063 },
  },

  groundBeef: {
    label: 'average price for ground beef, 100% beef, per pound',
    period: 'July 2026',
    usValue: 6.885,
    regionValues: { northeast: 6.896, midwest: 6.766, south: 6.449, west: 7.356 },
    factors: { northeast: 1.002, midwest: 0.983, south: 0.937, west: 1.068 },
  },
  chickenLegs: {
    // West is April 2026, the most recent published point for that series.
    // Northeast and Midwest are absent - see ITEM_SERIES for why.
    label: 'average price for bone-in chicken legs, per pound',
    period: 'July 2026 (West: April 2026)',
    usValue: 1.723,
    regionValues: { south: 1.637, west: 1.713 },
    factors: { south: 0.950, west: 0.994 },
  },
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
