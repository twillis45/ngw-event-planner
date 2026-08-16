// ─── GEOGRAPHY GATES ─────────────────────────────────────────────────────────
//
// The property that matters is NOT "prices get adjusted". It is that the module
// never claims a local price it does not have. A silent 1.0 is the failure mode:
// it looks identical to a real regional match and it is what 226 citations are
// doing today across the whole corpus.
import {
  regionForState, geoAdjust, applyGeo, geoHonestyLine, geoPlanNote, CENSUS_REGIONS,
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
      expect(geoPlanNote(v)).toMatch(/add your venue state/i);
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
