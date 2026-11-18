// FRIENDSGIVING FINDS THE STORE (owner, 11/18/2026, ZIP 20744: "1 of 11 items
// is found. Not even the turkey"). Friendsgiving (added 11/15) had no curated
// search terms, so its lines went to Kroger as their display text ("Turkey
// (whole bird, or a breast for a small table)"). Probed live at Harris Teeter
// Old Town Alexandria (the nearest Kroger-family store to 20744), 11/18/2026,
// no purchaseId so nothing was recorded: display text matched 1 of 13 lines;
// these terms match 12 of 12 there and at Foxchase, 11 of 12 at The Yards.
import { storeSearchTerm } from '../knowledge/storeUnitMap';
import { getPlaybook } from '../playbooks';

const EXPECT = {
  p_turkey: 'frozen whole turkey', p_gravy: 'turkey gravy', p_main_alt: 'spiral ham', p_sides: 'stuffing mix',
  p_apps: 'cheese tray', p_drinks: 'sparkling water', p_ice: 'ice', p_labels: 'labels', p_serveware: 'paper plates',
  p_thermometer: 'meat thermometer', p_containers: 'to go containers', p_cleanup: 'trash bags',
};

const lines = () => {
  const pb = getPlaybook('Friendsgiving');
  const all = [...(pb.purchases || []), ...(pb.shoppingList || []), ...(pb.foodPlan && pb.foodPlan.items || [])];
  return all.filter((l) => l && l.id && l.item);
};

test('(premise) the playbook lines are found', () => {
  expect(lines().map((l) => l.id)).toEqual(expect.arrayContaining(Object.keys(EXPECT)));
});

test.each(Object.entries(EXPECT))('%s searches the store for "%s"', (id, term) => {
  const line = lines().find((l) => l.id === id);
  expect(storeSearchTerm(line)).toBe(term);
});

test('the rolls keep searching by name: "Dinner rolls & butter" already matches', () => {
  expect(storeSearchTerm(lines().find((l) => l.id === 'p_rolls'))).toBeNull();
});

// AND THE TERM REACHES THE WIRE. The shell calls storePrices with
// `{ name: it.item, id: it.id }` (HostShellV2, the store-price effect), while
// storeSearchTerm matched on `line.item`, which that object does not have. So
// no curated term was ever sent from the app, for any event type — every line
// searched by its display text. Called here exactly as the shell calls it.
describe('what the app actually sends', () => {
  let sp;
  const OLD = process.env.REACT_APP_API_BASE_URL;
  beforeAll(() => {
    jest.resetModules();
    process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
    // eslint-disable-next-line global-require
    sp = require('../storePrices');
  });
  afterAll(() => { process.env.REACT_APP_API_BASE_URL = OLD; });
  afterEach(() => { delete global.fetch; });

  test('the Friendsgiving list goes out with its search terms, keyed by the plan text', async () => {
    let body = null;
    global.fetch = jest.fn(async (_u, init) => { body = JSON.parse(init.body); return { ok: true, json: async () => ({ configured: true, results: [] }) }; });
    const shellLines = lines().map((it) => ({ name: it.item, id: it.id }));
    await sp.storePrices(shellLines, '09700398', 'Friendsgiving');
    const sent = Object.fromEntries(body.items.map((i) => [i.purchaseId, i]));
    expect(sent.p_turkey.term).toBe('frozen whole turkey');
    expect(sent.p_ice.term).toBe('ice');
    expect(sent.p_turkey.name).toBe(lines().find((l) => l.id === 'p_turkey').item);   // name stays the key
    expect(sent.p_rolls.term).toBeUndefined();
  });

  test('an older playbook line gets its curated term too (it never did)', async () => {
    let body = null;
    global.fetch = jest.fn(async (_u, init) => { body = JSON.parse(init.body); return { ok: true, json: async () => ({ configured: true, results: [] }) }; });
    await sp.storePrices([{ name: 'Ice (for chilling + drinks)', id: 'p_ice' }], '01400376', 'Get-Together');
    expect(body.items[0].term).toBe('ice');
  });
});
