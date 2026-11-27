// ─── THE DRINKS CALL IS NAMED, NOT GUESSED (A1, 11/21/2026) ──────────────────
//
// The engine read the FIRST decision whose `blocks` mentioned beverage as the
// drinks call. On ten playbooks that was the wrong decision, or none:
//   • Bachelor read `costsplit`, Juneteenth `red_table`, Gender Reveal
//     `guestlist`, Get-Together `potluck` (so "Potluck sides" read as BYOB);
//   • Wedding, Fundraiser, Housewarming and Vow Renewal found nothing, so
//     their Dry and Cash bar picks moved no dollar.
// Each playbook now tags its one drinks decision `drinksCall: true`.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';

const plan = (type, picks) => playbookFoodPlan({
  id: 'dc', type, date: '2026-12-12', guestEstimate: 30, guestMode: 'count', guestCountSource: 'host', foodChoices: picks || {},
});
const bought = (fp) => fp.list.filter((l) => l.cat === 'beverage' && !l.skipped && !l.friendBrings);
const ids = (fp) => bought(fp).map((l) => l.id).sort();
const drinks = (fp) => bought(fp).reduce((s, l) => s + l.low, 0);
const ALCOHOL = /\b(beer|wine|spirits?|liquor|whiskey|bourbon|champagne|prosecco|cocktails?|alcohol|seltzer)\b/i;
const alcoholIds = (fp) => bought(fp).filter((l) => ALCOHOL.test(`${l.item} ${l.id.replace(/_/g, ' ')}`)).map((l) => l.id);

test('each playbook names at most one drinks call, and these are they', () => {
  const tagged = {};
  for (const pb of ALL_PLAYBOOKS) {
    const ds = (pb.decisions || []).filter((d) => d.drinksCall === true);
    expect([pb.type, ds.length <= 1]).toEqual([pb.type, true]);
    if (ds.length) tagged[pb.type] = ds[0].id;
  }
  expect(tagged).toEqual({
    'Dinner Party': 'alcohol', Birthday: 'alcohol', 'Get-Together': 'alcohol', Graduation: 'alcohol',
    'Watch Party': 'alcohol', 'Game Night': 'drinks', Housewarming: 'drinks', 'Gender Reveal': 'beverage',
    'Engagement Party': 'bar', Anniversary: 'beverage', 'Holiday Party': 'alcohol_service',
    'Retirement Party': 'bar', 'Thanksgiving Hosting': 'drinks', 'Bachelor Party': 'bar', 'Vow Renewal': 'beverage', 'The Cookout': 'drinks',
    'Fish Fry': 'drinks', 'Card Party': 'drinks', 'Day Party': 'bar', 'Juneteenth Cookout': 'drinks',
    'Crab Feast': 'drinks', 'Crawfish Boil': 'drinks', 'Low Country Boil': 'drinks', 'Pupusa Gathering': 'drinks',
    Wedding: 'bar', 'Client Dinner': 'alcohol', 'Fundraiser / Gala': 'bar', Friendsgiving: 'drinks',
    'Halloween Party': 'drinks',
  });
});

describe('Wedding: Dry and Cash bar change the budget', () => {
  test('Dry buys no alcohol at all', () => {
    expect(alcoholIds(plan('Wedding', { bar: 'Dry' }))).toEqual([]);
    expect(drinks(plan('Wedding', { bar: 'Dry' }))).toBeLessThan(drinks(plan('Wedding', {})));
  });
  test('Cash bar drops the reception bar and keeps the toast', () => {
    const fp = plan('Wedding', { bar: 'Cash bar' });
    expect(ids(fp)).toEqual(['p_toast_champagne']);
    expect(drinks(fp)).toBeLessThan(drinks(plan('Wedding', {})));
  });
});

test('Bachelor reads its bar, not the cost split', () => {
  const base = drinks(plan('Bachelor Party', {}));
  for (const o of ['Even split among the crew', 'Pooled kitty up front']) expect(drinks(plan('Bachelor Party', { costsplit: o }))).toBe(base);
  const beerOnly = plan('Bachelor Party', { bar: 'Beer only / BYOB' });
  expect(ids(beerOnly)).toEqual(expect.arrayContaining(['p_beer']));
  expect(ids(beerOnly)).not.toEqual(expect.arrayContaining(['p_whiskey']));
});

test('Fundraiser: Dry and Cash bar keep only the zero-proof drinks', () => {
  for (const o of ['Dry', 'Cash bar']) expect(ids(plan('Fundraiser / Gala', { bar: o }))).toEqual(['p_nonalc']);
});

test('Housewarming: BYOB keeps the host\'s soda and drops the alcohol; dry drops the alcohol', () => {
  const byob = plan('Housewarming', { drinks: 'BYOB + host provides mixers/soda' });
  expect(alcoholIds(byob)).toEqual([]);
  expect(ids(byob)).toEqual(expect.arrayContaining(['p_soda', 'p_ice']));
  expect(alcoholIds(plan('Housewarming', { drinks: 'Zero-proof / dry' }))).toEqual([]);
});

test.each([['Anniversary'], ['Vow Renewal']])('%s: dry buys no alcohol', (type) => {
  const fp = plan(type, { beverage: 'Zero-proof / dry' });
  expect(alcoholIds(fp)).toEqual([]);
  expect(ids(fp)).toEqual(expect.arrayContaining(['p_nonalc']));
});

test('Juneteenth: the red table never moves the drinks; "guests bring drinks" buys only ice', () => {
  const base = drinks(plan('Juneteenth Cookout', {}));
  for (const o of ['Big Red / strawberry soda + watermelon + red velvet', 'Full red table: red drink, watermelon, red velvet, red beans, strawberries']) {
    expect(drinks(plan('Juneteenth Cookout', { red_table: o }))).toBe(base);
  }
  expect(ids(plan('Juneteenth Cookout', { drinks: 'Potluck — guests bring drinks' }))).toEqual(['p_ice']);
});

test('Gender Reveal: the guest list never moves the drinks; mocktails-only buys no beer or wine', () => {
  const fp = plan('Gender Reveal', { beverage: 'Mocktails + soft drinks only' });
  expect(alcoholIds(fp)).toEqual([]);
  expect(ids(fp)).toEqual(['p_ice', 'p_mocktail', 'p_softdrinks']);
});

test('Get-Together: BYOB drops the drinks; a sides potluck no longer reads as BYOB', () => {
  const host = { potluck: 'Host provides all' };
  expect(ids(plan('Get-Together', { ...host, alcohol: 'BYOB' }))).toEqual(['p_ice']);
  // Batch 4 (owner, 11/24/2026): "Beer, soda & water" split; soda and water are parts of the drinks line.
  expect(ids(plan('Get-Together', { ...host, food_style: 'Potluck — guests bring sides' }))).toEqual(['p_drinks', 'p_drinks_soda', 'p_drinks_water', 'p_ice']);
});
