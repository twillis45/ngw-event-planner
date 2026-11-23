// ─── BATCH 10: THE PRICE RESEARCH PASS (owner, 11/23/2026) ───────────────────
//
// Each line #234 labeled "Estimate — no price source yet" got one real, named,
// current store price where one could be fetched. These pin what the pass
// changed, so a later edit that drops a citation or puts an old band back
// fails here, not silently in the Spread.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';
import { UNSOURCED_PRICE_LINES } from '../priceBasis';
import { isGroundedCost, COST_SOURCES } from '../knowledge/costProvenance';

const pb = (type) => ALL_PLAYBOOKS.find((p) => p.type === type);
const line = (type, id) => (pb(type).purchases || []).find((p) => p.id === id);

describe('owner ruling 1: Sunday Dinner sweet tea is priced at the cited gallon', () => {
  const l = line('Sunday Dinner', 'p_sweet-tea');
  test('the band is $0.20-0.35 a serving, two servings a guest', () => {
    expect(l.unitCostRange).toEqual([0.2, 0.35]);
    expect(l.qtyPerGuest).toBe(2);
  });
  test('it cites icedtea-lemonade-2026 and is off the estimate list', () => {
    expect(l.costProvenance.sources).toEqual(['icedtea-lemonade-2026']);
    expect(isGroundedCost(l.costProvenance)).toBe(true);
    expect(UNSOURCED_PRICE_LINES['Sunday Dinner:p_sweet-tea']).toBeUndefined();
  });
});

describe('owner ruling 3: signage packages are an itemized sum, still labeled', () => {
  for (const [type, band] of [['Fundraiser / Gala', [320, 2080]], ['Conference', [350, 2720]]]) {
    const l = line(type, 'p_signage');
    test(`${type}: the band is the itemized sum ${band.join('-')}`, () => {
      expect(l.unitCostRange).toEqual(band);
    });
    test(`${type}: built from cited unit prices, partial, not grounded, and listed`, () => {
      const cp = l.costProvenance;
      expect(cp.tier).toBe('estimate');
      expect(cp.verificationStatus).toBe('partial');
      expect(cp.sources).toEqual(['signage-print-2026', 'banner-retail-2026']);
      expect(cp.sources.every((s) => COST_SOURCES[s])).toBe(true);
      expect(isGroundedCost(cp)).toBe(false);
      expect(cp.claim).toMatch(/our assumption/i);
      expect(UNSOURCED_PRICE_LINES[`${type}:p_signage`]).toMatch(/count/);
    });
    test(`${type}: the host sees it as an estimate`, () => {
      const fp = playbookFoodPlan({ id: 't', type, date: '2026-12-12', guestEstimate: 120, guestMode: 'count', guestCountSource: 'host' });
      const row = fp.list.find((r) => r.id === 'p_signage');
      if (row) expect(row.priceBasis.kind).toBe('estimate');
    });
  }
});

describe('the research pass: fetched store prices cite or correct each band', () => {
  const vendorBand = (type) => {
    const v = (pb(type).vendors || []).find((x) => x && /cater|pitmaster/i.test(String(x.category)) && /guest/i.test(String(x.costUnit || '')));
    return v;
  };
  test.each([
    ['Repast', [15, 30]], ['Kwanzaa Gathering', [15, 30]], ['Graduation', [15, 25]],
    ['Get-Together', [15, 25]], ['The Cookout', [15, 25]], ['Wedding', [70, 250]], ['Birthday', [10, 25]],
  ])('%s: the caterer band is %j and cited', (type, band) => {
    const v = vendorBand(type);
    expect(v.costRange).toEqual(band);
    expect(isGroundedCost(v.costProvenance)).toBe(true);
  });
  test.each([
    ['Friendsgiving', 'p_main_alt', [2, 8]],
    ['Thanksgiving Hosting', 'p_stuffing', [0.65, 1.3]],
    ['Thanksgiving Hosting', 'p_leftover_containers', [0.75, 1.15]],
    ['Fundraiser / Gala', 'p_placecards', [0.07, 0.5]],
    ['Halloween Party', 'p_treats_nonfood', [0.07, 0.25]],
    ['New Year\'s Eve Party', 'p_flutes', [0.28, 3.5]],
    ['Quinceañera', 'p_appetizers', [0.3, 0.7]],
    ['Quinceañera', 'p_beverages', [0.2, 1.05]],
    ['Sweet 16', 'p_water', [0.13, 0.25]],
  ])('%s %s: corrected to %j and cited', (type, id, band) => {
    const l = line(type, id);
    expect(l.unitCostRange).toEqual(band);
    expect(isGroundedCost(l.costProvenance)).toBe(true);
    expect(UNSOURCED_PRICE_LINES[`${type}:${id}`]).toBeUndefined();
  });
  test('a band built on our own portions is labeled, not cited', () => {
    for (const [type, id] of [['Friendsgiving', 'p_gravy'], ['Thanksgiving Hosting', 'p_mac'], ['Sunday Dinner', 'p_mac'], ['Friendsgiving', 'p_potatoes']]) {
      const cp = line(type, id).costProvenance;
      expect(cp.tier).toBe('estimate');
      expect(cp.claim).toMatch(/our assumption/i);
      expect(UNSOURCED_PRICE_LINES[`${type}:${id}`]).toMatch(/assumption/);
    }
  });
  test('43 lines remain labeled, each with its reason', () => {
    expect(Object.keys(UNSOURCED_PRICE_LINES)).toHaveLength(43);
  });
});
