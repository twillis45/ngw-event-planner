// ─── TWO ENDPOINTS ON ONE ROUTER THAT DISAGREE ABOUT THEIR OWN KEY ───────────
//
// `kroger.py` answers `search-list` with `{results: [...]}` and `locations` with
// `{locations: [...]}`. Nothing is wrong with that — but a client written on the
// assumption that one router is internally consistent reads `results` for both
// and silently finds no stores. Which is what the first draft of storePrices.js
// did.
//
// A field name known on one side of a boundary and guessed on the other is the
// defect this whole session has been closing. It is worth a test precisely
// because it fails silently: no error, no exception, just an empty list that
// looks exactly like "no Kroger near you".
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const ROUTER = fs.readFileSync(path.join(ROOT, 'backend/app/routers/kroger.py'), 'utf8');
const CLIENT = fs.readFileSync(path.join(ROOT, 'src/lib/storePrices.js'), 'utf8');

describe('the store-price client reads the keys the router actually sends', () => {
  test('(premise) the router really does use two different keys', () => {
    // If the backend is ever made consistent, this test should FAIL and be
    // deleted — it exists to describe a real asymmetry, not to enshrine one.
    expect(ROUTER).toMatch(/"configured": True, "locations": locations/);
    expect(ROUTER).toMatch(/"configured": True, "results": results/);
  });

  test('locations are read from `locations`', () => {
    expect(CLIENT).toMatch(/d\.locations/);
  });

  test('search-list results are read from `results`', () => {
    expect(CLIENT).toMatch(/d\.results/);
  });

  test('the client does not read a key the router never sends', () => {
    // The specific bug: reading `results` from the locations response. Narrow on
    // purpose — a broad "no unknown keys" rule would fail on every refactor.
    const nearby = CLIENT.slice(CLIENT.indexOf('export async function nearbyStores'),
      CLIENT.indexOf('export async function storePrices'));
    expect(nearby).toMatch(/d\.locations/);
    expect(nearby).not.toMatch(/d\.results/);
  });

  test('every endpoint the client calls exists on the router', () => {
    for (const p of ['/kroger/locations', '/kroger/search-list']) {
      expect(CLIENT).toContain(p);
      expect(ROUTER).toContain(`"${p}"`);
    }
  });
});

// ─── AND THE NAME SURVIVES THE ROUND TRIP ────────────────────────────────────
//
// A store price is matched back to a plan line by the line's own `item` text.
// That string leaves as `items[].name`, and it only comes back if the router
// ECHOES it rather than substituting the Kroger product's own description.
//
// If it ever stops echoing, the index simply never hits — no error, no
// exception, and the sheet reads exactly like a store that stocks nothing the
// host needs. Silent, and indistinguishable from the honest empty state, which
// is what makes it worth pinning.
describe('the name a line is matched by makes it back', () => {
  test('(premise) the router echoes the SENT name on every branch', () => {
    // All four exits from the per-item loop: 4xx, no products, a match, and the
    // priced match. Every one must carry `"name": name` — the sent string — and
    // never `p.get("description")` in the name slot.
    const body = ROUTER.slice(ROUTER.indexOf('async def kroger_search_list'),
      ROUTER.indexOf('async def kroger_locations'));
    const nameSlots = body.match(/"name":\s*[^,\n}]+/g) || [];
    expect(nameSlots.length).toBeGreaterThanOrEqual(3);
    for (const slot of nameSlots) expect(slot).toBe('"name": name');
  });

  test('a price found for the sent name is found again by the line that sent it', () => {
    // The whole round trip, in one assertion: plan line → request → response →
    // index → lookup. Uses the REAL key function, so a change to it moves both
    // sides at once and this test keeps passing for the right reason.
    // eslint-disable-next-line global-require
    const { storeKey, storePriceIndex, layerForLine } = require('../priceLayers');
    const line = { id: 'p_chicken', item: 'Chicken (legs/thighs/quarters)' };
    const sent = { name: line.item };                  // what storePrices.js builds
    const echoed = { name: sent.name, matched: true, price: 9.99, size: '5 lb' };
    expect(storeKey(sent)).toBe(storeKey(line));       // request key === line key
    const idx = storePriceIndex([echoed]);
    expect(layerForLine({ purchase: line, storeIndex: idx }).exact).toBe(9.99);
  });

  test('…and the client sends `name`, which is the key the index is built on', () => {
    // storePrices.js maps each item to `{ name }`. If it ever sent `item` or
    // `short` instead, the assertion above would still pass while the running
    // app matched nothing.
    expect(CLIENT).toMatch(/\.map\(\(name\) => \(\{ name \}\)\)/);
  });
});
