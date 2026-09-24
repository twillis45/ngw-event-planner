// ─── GEOGRAPHY GATES ─────────────────────────────────────────────────────────
//
// The property that matters is NOT "prices get adjusted". It is that the module
// never claims a local price it does not have. A silent 1.0 is the failure mode:
// it looks identical to a real regional match and it is what 226 citations are
// doing today across the whole corpus.
import {
  regionForState, regionForZip, regionForAddress, geoAdjust, applyGeo, geoHonestyLine, geoPlanNote, CENSUS_REGIONS,
} from './geoCostIndex';
import { REGIONAL_FACTORS, ITEM_SERIES } from './geoCostFactors';

describe('a state maps to its real Census region', () => {
  test('every state and DC is covered exactly once', () => {
    const all = Object.values(CENSUS_REGIONS).flat();
    expect(all).toHaveLength(51);                       // 50 states + DC
    expect(new Set(all).size).toBe(51);                 // no state in two regions
  });

  test('DC sits in the SOUTH, which is where the DMV playbooks live', () => {
    // Census groups DC with the South. Guessing "northeast" here would mis-price
    // every crab feast and half-smoke line in the corpus.
    expect(regionForState('DC')).toBe('south');
    expect(regionForState('MD')).toBe('south');
    expect(regionForState('VA')).toBe('south');
  });

  test('an unknown or missing state returns null, never a default region', () => {
    // Defaulting to a region would silently price a host as if they lived
    // somewhere they do not.
    expect(regionForState(undefined)).toBeNull();
    expect(regionForState('')).toBeNull();
    expect(regionForState('ZZ')).toBeNull();
    expect(regionForState('nm')).toBe('west');          // case is forgiven
  });
});

describe('the module refuses to invent a local price', () => {
  test('an item with no regional series returns national:true, not a quiet 1.0', () => {
    // THE WHOLE POINT. A factor of 1.0 because the region matches the average is
    // a different claim from 1.0 because nothing is known, and a caller must be
    // able to tell them apart.
    const g = geoAdjust('ice', 'NM');
    expect(g.factor).toBe(1);
    expect(g.national).toBe(true);
    expect(g.basis).toMatch(/national band/i);
  });

  test('a known item in a known region reports national:false and cites the series', () => {
    const g = geoAdjust('bananas', 'NY');
    expect(g.national).toBe(false);
    expect(g.region).toBe('northeast');
    expect(g.factor).toBe(1.065);
    expect(g.basis).toMatch(/BLS/);
    expect(g.basis).toMatch(ITEM_SERIES.bananas.northeast);   // names the series id
  });

  test('applyGeo leaves the band untouched when the answer is national', () => {
    // So a caller cannot present an unadjusted band as an adjusted one.
    const r = applyGeo([10, 20], 'ice', 'NM');
    expect(r.range).toEqual([10, 20]);
    expect(r.national).toBe(true);
  });

  test('applyGeo moves the band when the factor is real', () => {
    const r = applyGeo([10, 20], 'potatoes', 'IL');          // midwest, 0.823
    expect(r.range).toEqual([8.23, 16.46]);
    expect(r.national).toBe(false);
  });
});

describe('the honesty line always says which kind of number this is', () => {
  test('national when unknown, and asks for the state when there is none', () => {
    expect(geoHonestyLine('ice', 'NM')).toMatch(/National average/);
    expect(geoHonestyLine('bananas', undefined)).toMatch(/add your venue state/i);
  });

  test('names the region and the direction when the factor is real', () => {
    expect(geoHonestyLine('potatoes', 'IL')).toMatch(/midwest.*18% below/i);
    expect(geoHonestyLine('bananas', 'CA')).toMatch(/west.*8% above/i);
  });
});

describe('the measured table is internally honest', () => {
  test('every factor equals its own regionValue / usValue', () => {
    // Guards against a factor being hand-edited away from the figures it claims
    // to come from — the cheapest way for this table to start lying.
    for (const [item, row] of Object.entries(REGIONAL_FACTORS)) {
      for (const [region, v] of Object.entries(row.regionValues)) {
        const expected = Math.round((v / row.usValue) * 1000) / 1000;
        expect(`${item}.${region}=${row.factors[region]}`).toBe(`${item}.${region}=${expected}`);
      }
    }
  });

  test('every item has a series id for every region it publishes a factor for', () => {
    for (const [item, row] of Object.entries(REGIONAL_FACTORS)) {
      for (const region of Object.keys(row.factors)) {
        expect(ITEM_SERIES[item] && ITEM_SERIES[item][region]).toMatch(/^APU\d+$/);
      }
    }
  });

  test('THE REASON THERE IS NO BLANKET MULTIPLIER: regions disagree by item', () => {
    // If this ever stops being true, someone has flattened the table and the
    // per-item structure can be revisited. While it holds, a single regional
    // factor applied to all costs is provably wrong.
    const south = REGIONAL_FACTORS;
    expect(south.bananas.factors.south).toBeLessThan(1);      // 5% cheaper
    expect(south.potatoes.factors.south).toBeGreaterThan(1);  // 6% dearer
    expect(south.bananas.factors.west).toBeGreaterThan(1);
    expect(south.potatoes.factors.west).toBeLessThan(1);
  });
});

describe('the sheet-level note never implies a locality it does not have', () => {
  test('with a state it names the REGION, not the state', () => {
    // Naming the state would imply BLS resolves to state level. It does not -
    // the APU series are national, regional and city-size, so the honest unit is
    // the region even once the factor table grows.
    const n = geoPlanNote('NM');
    expect(n).toMatch(/the West/);
    expect(n).not.toMatch(/New Mexico|NM/);
    expect(n).toMatch(/national average/i);
  });

  test('DC reads as the South, matching the Census grouping the series use', () => {
    expect(geoPlanNote('DC')).toMatch(/the South/);
  });

  test('with no state it asks for one instead of guessing', () => {
    for (const v of [undefined, null, '', 'ZZ']) {
      expect(geoPlanNote(v)).toMatch(/add your state/i);
    }
  });

  test('it always says the prices are national — that is the whole job', () => {
    // RED-PROVE: drop "national average" from either branch and a host is shown
    // a spend figure with nothing telling them which market it describes, which
    // is the state all 226 citations were in before this line existed.
    for (const v of ['NM', 'NY', 'IL', 'GA', undefined]) {
      expect(geoPlanNote(v)).toMatch(/national average/i);
    }
  });
});

describe('partial regional coverage degrades to national, per region', () => {
  // Bone-in chicken has US, South and West and NO Northeast or Midwest — those
  // series return only an October 2025 point marked "Data unavailable due to the
  // 2025 lapse in appropriations". A government shutdown is now a permanent hole
  // in this dataset, and the honest handling is per-region, not per-item.
  test('a covered region gets its real factor', () => {
    expect(geoAdjust('chickenLegs', 'GA').national).toBe(false);
    expect(geoAdjust('chickenLegs', 'GA').factor).toBe(0.950);
  });

  test('an UNCOVERED region on a covered item still reads national', () => {
    // The failure this prevents: filling Boston from the South because the item
    // "has data". A host in Boston would be shown a southern chicken price with
    // no way to know.
    const ne = geoAdjust('chickenLegs', 'MA');
    expect(ne.region).toBe('northeast');
    expect(ne.national).toBe(true);
    expect(ne.factor).toBe(1);
    expect(ne.basis).toMatch(/No BLS regional series/);
  });

  test('the same host gets a real factor on an item that IS covered', () => {
    // Same person, same event: chicken falls back, ground beef does not. The
    // resolution is per item AND per region, which is why there is no single
    // "is this event localised?" flag.
    expect(geoAdjust('chickenLegs', 'MA').national).toBe(true);
    expect(geoAdjust('groundBeef', 'MA').national).toBe(false);
    expect(geoAdjust('groundBeef', 'MA').factor).toBe(1.002);
  });

  test('the South is not uniformly cheap — it moves by item', () => {
    // Four items now disagree in direction for the South: beef 0.937, chicken
    // 0.950, bananas 0.949, potatoes 1.064. Anyone tempted to collapse this to
    // one regional number should read that row again.
    expect(geoAdjust('groundBeef', 'GA').factor).toBeLessThan(1);
    expect(geoAdjust('potatoes', 'GA').factor).toBeGreaterThan(1);
  });
});

// ─── THE NOTE THAT DENIED WHAT THE ENGINE HAD DONE (2026-09-23) ──────────────
//
// hostv2 fetches a regional factor, passes it into playbookFoodPlan, and the
// prices on screen move. Underneath them the shopping sheet printed "These are
// national average prices — not yet adjusted for the South", because geoPlanNote
// answered from the STATE and had no way to know what the engine did.
//
// The money panel on the same event read the applied context and said the
// opposite: "Prices adjusted for the South region." One host, two surfaces, one
// set of numbers, contradictory claims about them.
//
// Tests never caught it because `isFoodPricesConfigured()` is false without a
// backend, so in the sandbox no factor is ever applied and the sheet's sentence
// is true. The defect only appears where the feature works.
describe('the plan note says what actually happened to the price', () => {
  const APPLIED = 'South · May 2026 · BLS Average Price';

  test('(premise) with no applied basis it still says NOT adjusted — the old contract holds', () => {
    // Every existing caller passes one argument, and the public demo has no
    // backend. That path must be byte-identical or this "fix" is a regression
    // for every host on a national baseline.
    expect(geoPlanNote('MD')).toBe('National average · not yet adjusted for the South');
    expect(geoPlanNote(null)).toMatch(/add your state/);
  });

  test('THE FIX: when a factor MOVED a price, the note says adjusted', () => {
    const n = geoPlanNote('MD', APPLIED);
    expect(n).toMatch(/adjusted for the South/i);
    expect(n).not.toMatch(/not yet adjusted/i);
    expect(n).not.toMatch(/national average/i);
  });

  test('…and it carries the basis it was adjusted ON, not just a claim', () => {
    // "Adjusted" with no source is the same unbacked assertion in the other
    // direction. The month and the series come through.
    const n = geoPlanNote('MD', APPLIED);
    expect(n).toContain('May 2026');
    // Abbreviated to 'BLS' 2026-09-24 when the line was condensed: the words
    // "Average Price" restate what a regional factor is, and the attribution
    // this test exists to protect is the SERIES, which is still named.
    expect(n).toMatch(/\bBLS\b/);
  });

  test('MARYLAND IS THE SOUTH, which is the case most likely to be read as a bug', () => {
    // Census Region 3, Division 5 South Atlantic — with DE, DC, VA, WV. A
    // Silver Spring host seeing "the South" is correct, not a mis-mapping, and
    // this test exists so nobody "fixes" it to Northeast.
    expect(regionForState('MD')).toBe('south');
    expect(geoPlanNote('MD', APPLIED)).toMatch(/the South/);
    for (const st of ['DC', 'DE', 'VA', 'WV']) expect(regionForState(st)).toBe('south');
    for (const st of ['NJ', 'NY', 'PA']) expect(regionForState(st)).toBe('northeast');
  });

  test('the STATE names the region, not the backend label — they can disagree', () => {
    // The backend sends its own regionLabel. When a state resolves, the
    // state-derived label wins, because it is the one this codebase can check.
    expect(geoPlanNote('MD', 'Northeast · May 2026')).toMatch(/the South/);
  });

  test('no state, but an applied factor: it still names where, from the basis', () => {
    const n = geoPlanNote(null, APPLIED);
    expect(n).toMatch(/adjusted for the South/i);
  });

  test('a basis with no detail still reads as a sentence', () => {
    expect(geoPlanNote('MD', 'South')).toBe('Adjusted for the South');
  });
});

// ─── A ZIP THE HOST TYPED IS A LOCATION THE NOTE REFUSED TO READ (2026-09-24) ─
//
// Host directive: "if we default to bls the copy should identify region if we
// have zipcode input."
//
// The store picker already takes a ZIP — it is how a host finds a Kroger — and
// `venueFor(event).zip` already seeds it. But geoPlanNote derived its region
// from the STATE alone, so a host who had typed 21401 was still told to "add
// your venue state" underneath prices that could have been named as Southern.
// The location was on screen and the sentence denied having it.
//
// A ZIP prefix maps to a state by USPS allocation — a published fact, the same
// class as the Census table above, not an estimate. So this names the region it
// can prove and REFUSES the rest: a territory or a military ZIP is in no Census
// region, and inventing one is the failure this whole module exists to avoid.
describe('a ZIP resolves the region when no state does', () => {
  test('a ZIP prefix maps to its Census region', () => {
    expect(regionForZip('21401')).toBe('south');      // Annapolis MD
    expect(regionForZip('02134')).toBe('northeast');  // Boston MA
    expect(regionForZip('60601')).toBe('midwest');    // Chicago IL
    expect(regionForZip('94110')).toBe('west');       // San Francisco CA
  });

  test('ZIP+4, whitespace and a numeric ZIP all resolve', () => {
    expect(regionForZip('21401-1234')).toBe('south');
    expect(regionForZip('  21401 ')).toBe('south');
    expect(regionForZip(21401)).toBe('south');
  });

  test('REFUSES rather than guesses: no Census region, no answer', () => {
    expect(regionForZip('00601')).toBeNull();   // Puerto Rico — in no Census region
    expect(regionForZip('09123')).toBeNull();   // military APO/AE
    expect(regionForZip('')).toBeNull();
    expect(regionForZip(null)).toBeNull();
    expect(regionForZip('abcde')).toBeNull();
    expect(regionForZip('123')).toBeNull();     // too short to be a ZIP
  });

  test('THE FIX: with a ZIP and no state, the note names the region', () => {
    const n = geoPlanNote(null, null, '21401');
    expect(n).toBe('National average · not yet adjusted for the South');
    expect(n).not.toMatch(/add your state/);
  });

  test('the state still wins when both are present — it is the stronger fact', () => {
    expect(geoPlanNote('MA', null, '21401')).toBe(
      'National average · not yet adjusted for the Northeast');
  });

  test('an unresolvable ZIP falls back to the old ask, never to a guessed region', () => {
    expect(geoPlanNote(null, null, '00601')).toMatch(/add your state/);
    expect(geoPlanNote(null, null, '')).toMatch(/add your state/);
  });

  test('(premise) every existing caller is untouched — the 2-arg contract holds', () => {
    expect(geoPlanNote('MD')).toBe('National average · not yet adjusted for the South');
    expect(geoPlanNote(null)).toMatch(/add your state/);
    expect(geoPlanNote('MD', 'South · May 2026 · BLS Average Price'))
      .toBe('Adjusted for the South · BLS May 2026');
  });

  test('an applied basis still outranks a ZIP — what happened beats where', () => {
    expect(geoPlanNote(null, 'South · May 2026', '21401')).toMatch(/^Adjusted for the South/);
  });
});

// ─── THE ZIP SURVIVES THE STORE PICK (2026-09-24, found by driving it) ───────
//
// Driven on an iPhone against the live backend: typing 21401 flipped the note
// to "not yet adjusted for the South" correctly — and then CHOOSING a store
// flipped it BACK to "add your state", because picking clears
// `storePicker`. The host had given a location, seen it recognised, and watched
// the app forget it one tap later. The chosen store carries its own address,
// which is a better source than the picker anyway: it is where they will shop.
describe('a chosen store address resolves the region', () => {
  test('reads the terminal ZIP out of the flattened Kroger address', () => {
    expect(regionForAddress('143 Ritchie Hwy, Severna Park, MD, 21146')).toBe('south');
    expect(regionForAddress('1200 N Wells St, Chicago, IL, 60610')).toBe('midwest');
    expect(regionForAddress('  500 Main St, Boston, MA, 02134  ')).toBe('northeast');
    expect(regionForAddress('1 Market St, San Francisco, CA, 94105-1234')).toBe('west');
  });

  test('REFUSES anything that is not a terminal ZIP — it is not a digit hunt', () => {
    // The guard that matters: a five-digit run somewhere in the middle of a
    // string is not a ZIP, and reading one would invent a region from a street
    // number or a phone number.
    expect(regionForAddress('12345 Some Road, Nowhere')).toBeNull();
    expect(regionForAddress('call 21401 for hours')).toBeNull();
    expect(regionForAddress('')).toBeNull();
    expect(regionForAddress(null)).toBeNull();
    expect(regionForAddress('..., PR, 00601')).toBeNull();   // territory, still refused
  });
});

// ─── THE NOTE HAS A LENGTH BUDGET (2026-09-24, host: the pricing-basis note) ─
//
// Every other test here pins the note's WORDS. None of them could fail on the
// thing the host actually reported twice in one day, because the defect was
// never a wrong word — it was a true sentence too long to read. The adjusted
// branch was condensed in the morning and the national branches were left
// behind, so the caption got LONGER the less the app knew:
//
//   adjusted   "Adjusted for the South · BLS Aug 2026"                  37 ch
//   national   "These are national average prices — add your venue
//                state and we can start localizing them."
//                + the shell's "· est. prices Aug 2026"                113 ch
//
// at var(--t-caption-min) on a 390px phone: one line against three, under a
// hero that is itself two lines of numbers.
//
// So this measures the COMPOSED line — what a host sees, including the suffix
// HostShellV2 appends on exactly the branches that do not carry their own
// month. A words-only test cannot regress on length; this one cannot pass on
// the old copy.
describe('the pricing-basis note fits the phone', () => {
  // The shell appends this on the national branches only: the adjusted branch
  // already ends in its own month, and appending would print it twice.
  const SUFFIX = ' · est. prices Aug 2026';
  // MEASURED, not chosen. Rendered in the live shell with the real `.grounding`
  // computed style (14px, line-height 16.8, 358px of content inside a 390px
  // phone) and the line count read off the box:
  //
  //   old no-region  113 ch → 3 lines   ← what the host reported
  //   old region      90 ch → 2 lines
  //   new, worst      76 ch → 2 lines   (Northeast, the longest region label)
  //   adjusted        37 ch → 1 line
  //
  // So the 2→3 tip for this sentence shape sits between 90 and 113. The budget
  // is 80: comfortably under the tip, four characters of slack over the worst
  // case we ship (enough for "Sept 2026"), and tight enough that BOTH strings
  // this change replaced fail it — see the premise below.
  const BUDGET = 80;

  test('(premise) the budget is tight enough to have failed the old copy', () => {
    // RED-PROOF, in the file rather than in a commit message: these are the two
    // sentences this change replaced. If the budget is ever loosened to where
    // they would pass, the guard has stopped guarding and this premise says so.
    const OLD = [
      'These are national average prices — add your venue state and we can start localizing them.',
      'These are national average prices — not yet adjusted for the South.',
    ];
    for (const o of OLD) expect((o + SUFFIX).length).toBeGreaterThan(BUDGET);
  });

  test('no region resolved — the branch that nudges for a state', () => {
    const composed = geoPlanNote(null) + SUFFIX;
    expect(composed.length).toBeLessThanOrEqual(BUDGET);
    // Condensed, not gutted: the basis and the one useful input both survive.
    expect(composed).toMatch(/National average/i);
    expect(composed).toMatch(/add your state/i);
  });

  test('region known but not applied — the branch that names it', () => {
    const composed = geoPlanNote('MD') + SUFFIX;
    expect(composed.length).toBeLessThanOrEqual(BUDGET);
    expect(composed).toMatch(/National average/i);
    expect(composed).toMatch(/the South/);
  });

  test('a ZIP-resolved region is held to the same budget', () => {
    // The widest national branch: the region arrives from a ZIP rather than a
    // state, and the label is the longest one we ship.
    for (const zip of ['21401', '02101', '60601', '94101']) {
      const composed = geoPlanNote(null, null, zip) + SUFFIX;
      expect(composed.length).toBeLessThanOrEqual(BUDGET);
    }
  });

  test('the adjusted branch stays the shortest of the three', () => {
    // It carries its own month, so it takes no suffix. If a future edit ever
    // makes the CAVEAT shorter than the ANSWER, the hierarchy has inverted.
    const adjusted = geoPlanNote('MD', 'South · 2026-08 · BLS Average Price');
    expect(adjusted.length).toBeLessThan((geoPlanNote('MD') + SUFFIX).length);
    expect(adjusted).not.toMatch(/est\. prices/);
  });
});
