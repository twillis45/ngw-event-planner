// Board ruling A1, 2026-10-04 — docs/audits/2026-10-04_BLS_COVERAGE_BOARD.md
//
// 1.087 renders identically whether it came from seven staples or four. On
// 2026-10-04, three of four regions were running on four, and the items BLS
// had retired were eggs, milk and ground beef — the volatile, high-spend
// ones. So the Northeast factor is largely the spread on poultry and produce,
// presented as the spread on groceries.
//
// Tufte's seat: a single figure carrying no indication of what it rests on.
// Grandmother's: she sees a number and has no idea it means four items.
// BASE is read at MODULE LOAD, so it has to exist before the import or every
// call short-circuits to NEUTRAL and the suite passes over a function that
// never ran. Same trap as coldStartRetry.test.js.
process.env.REACT_APP_API_BASE_URL = 'https://example.test';
const { getFoodPriceFactor } = require('../foodPrices');

const reply = (body) => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => body }));
};

const FULL = {
  region: 'south', region_label: 'South', factor: 1.04, month: '2026-08',
  source: 'BLS Average Price', basis: 'regional', basket_version: 1,
  items_used: 7, basket: ['Eggs', 'Milk', 'Bread', 'Ground beef', 'Chicken', 'Potatoes', 'Bananas'],
  item_factors: {}, item_months: {},
};

describe('the factor carries its own composition', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  test('a complete region reports the whole basket', async () => {
    reply(FULL);
    const r = await getFoodPriceFactor({ region: 'south' });
    expect(r.itemsUsed).toBe(7);
    expect(r.basketSize).toBe(7);
    expect(r.basis).toBe('regional');
    expect(r.basketVersion).toBe(1);
  });

  test('a thin region reports the shortfall rather than hiding it', async () => {
    reply({ ...FULL, region: 'ne', region_label: 'Northeast', items_used: 4 });
    const r = await getFoodPriceFactor({ region: 'ne' });
    expect(r.itemsUsed).toBe(4);
    expect(r.basketSize).toBe(7);
  });

  // 1.0 is ITSELF a claim — "this region costs what the nation costs" — and
  // the board ruled it must never be read as a measured local spread.
  test('a national fallback is never labelled regional', async () => {
    reply({
      region: 'ne', region_label: 'Northeast', factor: 1.0, month: null,
      source: 'BLS Average Price', basis: 'national-fallback',
      fallback_reason: 'coverage', basket_version: 1, items_used: 0,
      note: 'Not enough local price data for this region — using national prices.',
    });
    const r = await getFoodPriceFactor({ region: 'ne' });
    expect(r.basis).toBe('national-fallback');
    expect(r.itemsUsed).toBe(0);
    expect(r.note).toMatch(/Not enough local price data/);
  });

  // A payload that lost its shape must not be able to CLAIM coverage.
  test('a malformed payload claims nothing', async () => {
    reply({ region: 'west', factor: 1.1, items_used: 'lots', basket: 'seven', basis: 'who knows' });
    const r = await getFoodPriceFactor({ region: 'west' });
    expect(r.itemsUsed).toBe(0);
    expect(r.basketSize).toBe(0);
    expect(r.basis).toBe('national-fallback');
  });

  test('the neutral no-op claims nothing either', async () => {
    global.fetch = jest.fn(async () => { throw new Error('down'); });
    const r = await getFoodPriceFactor({ region: 'west' });
    expect(r.factor).toBe(1);
    expect(r.itemsUsed).toBe(0);
    expect(r.basis).toBe('national-fallback');
  });
});
