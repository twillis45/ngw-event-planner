// ─── A PICK MOVES ITS OWN LINES, NOT A MULTIPLIER (11/21/2026 pricing batch) ──
//
// A2 Wedding catering from catering_style · A3/A4 potluck picks mark the lines
// guests bring · A5 a beer-and-wine pick buys no spirits · A7 a dry pick
// expressed as a cost factor removes the alcohol instead of scaling it · the
// owner's line rules: crawfish boiled to order, Thanksgiving ordered at the
// cited $10-25, a food truck with its minimum, Watch Party's dry soda and water.
import { getPlaybook, playbookFoodPlan } from '../playbooks';

const plan = (type, picks, n = 30) => playbookFoodPlan({
  id: 'pl', type, date: '2026-12-12', guestEstimate: n, guestMode: 'count', guestCountSource: 'host', foodChoices: picks || {},
});
const row = (fp, id) => fp.list.find((l) => l.id === id);
const brought = (fp) => fp.list.filter((l) => l.friendBrings).map((l) => l.id).sort();
const hostIds = (fp, cat) => fp.list.filter((l) => !l.friendBrings && (!cat || l.cat === cat)).map((l) => l.id);
const ALCOHOL = /\b(beer|wine|spirits?|liquor|whiskey|bourbon|champagne|bubbles|cocktails?|alcohol|grown)\b/i;
const alcoholBought = (fp) => fp.list.filter((l) => l.cat === 'beverage' && !l.friendBrings && ALCOHOL.test(`${l.item} ${l.id.replace(/_/g, ' ')}`)).map((l) => l.id);
const noFactor = (fp) => fp.list.filter((l) => l.costFactorApplied).map((l) => l.id);

describe('A2: Wedding catering follows catering_style, not the venue', () => {
  test.each([['Raw / blank-canvas venue (bring everything)'], ['Hotel / resort'], ['Private estate / backyard']])('venue "%s" still hires the caterer', (venue) => {
    const fp = plan('Wedding', { venue });
    expect(row(fp, 'fa-catering')).toBeTruthy();
    expect(fp.foodLow).toBe(plan('Wedding', {}).foodLow);
  });
});

describe('A3/A4: a potluck pick marks the lines the guests bring, at $0 to the host', () => {
  test.each([
    // Batch 4 (owner, 11/24/2026): each dish split into one line per product,
    // and a part goes with its dish, so a list of what friends bring names the
    // parts too (the same rule that added p_drinks_cider above).
    ['Sunday Dinner', {}, ['p_cornbread', 'p_cornbread_buttermilk', 'p_dessert', 'p_dessert_cobbler', 'p_dessert_poundcake', 'p_greens', 'p_mac', 'p_mac_cheese', 'p_peas-rice', 'p_smoked-meat', 'p_yams']],
    ['Sunday Dinner', { 'who-cooks-what': 'Full potluck split across the family' }, ['p_chicken', 'p_cornbread', 'p_cornbread_buttermilk', 'p_dessert', 'p_dessert_cobbler', 'p_dessert_poundcake', 'p_greens', 'p_mac', 'p_mac_cheese', 'p_peas-rice', 'p_smoked-meat', 'p_yams']],
    ['Watch Party', { potluck: 'Potluck snacks' }, ['p_chips', 'p_chips_dips', 'p_dessert', 'p_dessert_cookies', 'p_dessert_mix']],
    ['Watch Party', {}, ['p_drinks', 'p_drinks_soda', 'p_drinks_water']],
    ['Birthday', { food_style: 'Potluck' }, ['p_chips', 'p_mains', 'p_salad', 'p_veggietray']],
    ['Retirement Party', { food_style: 'Potluck' }, ['p_apps', 'p_apps_charcuterie', 'p_buffet_protein', 'p_buffet_protein_carved', 'p_sides', 'p_sides_greensalad']],
    ['Reunion', {}, ['p_buns', 'p_protein', 'p_protein_chicken', 'p_protein_hotdogs']],
    // Host grills set explicitly: at 30 guests the recommended pick is the pitmaster.
    ['Get-Together', { potluck: 'Potluck sides', food_style: 'Host grills everything' }, ['p_sides', 'p_sides_beans', 'p_sides_chips', 'p_sides_corn']],
    ['Get-Together', { potluck: 'Host provides all', food_style: 'Potluck — guests bring sides' }, ['p_sides', 'p_sides_beans', 'p_sides_chips', 'p_sides_corn']],
    // p_drinks_cider is part of p_drinks (split 11/23/2026) and goes with it.
    ['Friendsgiving', { hosting_model: 'Host cooks most of it — friends bring drinks and dessert' }, ['p_dessert', 'p_drinks', 'p_drinks_cider']],
    ['Friendsgiving', { drinks: 'One or two friends own the drinks' }, expect.arrayContaining(['p_drinks'])],
    ['Card Party', {}, ['p_board', 'p_chips', 'p_chips_mix', 'p_chips_pretzels', 'p_chips_salsa', 'p_dessert']],
    ['Card Party', { food_model: 'Potluck (everybody brings a dish)' }, ['p_board', 'p_chips', 'p_chips_mix', 'p_chips_pretzels', 'p_chips_salsa', 'p_dessert', 'p_deviled', 'p_wings', 'p_wings_meatballs']],
    ['The Cookout', {}, ['p_beans', 'p_cornbread', 'p_dessert', 'p_dessert_cobbler', 'p_dessert_poundcake', 'p_potato_salad', 'p_slaw']],
    ['Kwanzaa Gathering', {}, ['p_blackeyedpeas', 'p_dessert', 'p_greens', 'p_sides', 'p_sides_mac', 'p_sides_yams']],
    ['Game Night', { food_model: 'Potluck (guests bring a dish)' }, ['p_board', 'p_dips', 'p_dips_guac', 'p_dips_queso', 'p_dips_ranch', 'p_salsa']],
    ['Vow Renewal', { food_style: 'Potluck reception' }, ['p_apps', 'p_apps_charcuterie', 'p_bread', 'p_protein', 'p_sides', 'p_sides_veg']],
  ])('%s %j', (type, picks, ids) => {
    const fp = plan(type, picks);
    expect(brought(fp)).toEqual(ids);
    for (const l of fp.list.filter((x) => x.friendBrings)) expect([l.id, l.low, l.high]).toEqual([l.id, 0, 0]);
  });

  test('Watch Party\'s menu shows one main at a time', () => {
    const mains = (menu) => hostIds(plan('Watch Party', menu ? { menu } : {})).filter((id) => ['p_wings', 'p_chili', 'p_pizza_sliders'].includes(id));
    expect(mains()).toEqual(['p_wings']);
    expect(mains('Chili bar')).toEqual(['p_chili']);
    expect(mains('Pizza + finger food')).toEqual(['p_pizza_sliders']);
    expect(mains('Potluck snacks')).toEqual([]);
  });

  test('Thanksgiving: a full potluck costs the host less than the split default, and no factor moves a line', () => {
    const split = plan('Thanksgiving Hosting', {});
    const potluck = plan('Thanksgiving Hosting', { hosting_model: 'Full potluck — Friendsgiving style, host assigns dishes' });
    const all = plan('Thanksgiving Hosting', { hosting_model: 'Host cooks the whole meal' });
    expect(potluck.foodHigh).toBeLessThanOrEqual(split.foodHigh);
    expect(brought(potluck)).toEqual(brought(split));
    expect(noFactor(all)).toEqual([]);
    // The whole meal costs exactly the lines' own cited bands, not ×1.3 on top.
    const pies = row(all, 'p_pies');
    expect([pies.perUnitLow, pies.perUnitHigh]).toEqual(getPlaybook('Thanksgiving Hosting').purchases.find((p) => p.id === 'p_pies').unitCostRange);
  });

  test('defaults that said guests bring part no longer price it at host cost', () => {
    for (const [type, cheaper] of [['Card Party', { food_model: 'Host provides the spread' }], ['The Cookout', { cooking_model: 'Host cooks everything' }], ['Kwanzaa Gathering', { food: 'Host cooks the spread' }]]) {
      expect([type, plan(type, {}).foodHigh < plan(type, cheaper).foodHigh]).toEqual([type, true]);
      expect([type, noFactor(plan(type, cheaper))]).toEqual([type, []]);
    }
  });
});

describe('A5: a beer-and-wine pick buys no spirits', () => {
  test.each([
    ['Dinner Party', { alcohol: 'Wine + beer only' }, 'p_cocktail'],
    ['Engagement Party', { bar: 'Beer + wine only' }, 'p_signature'],
    ['Card Party', { drinks: 'Beer + wine + soda only' }, 'p_brown'],
    ['Game Night', { drinks: 'Beer/wine/soda only' }, 'p_batch'],
    ['Halloween Party', { drinks: 'Beer and wine only' }, 'p_batch_cocktail'],
    ['Housewarming', { drinks: 'Beer + wine + soda' }, 'p_cocktail'],
  ])('%s %j has no %s', (type, picks, id) => {
    expect(row(plan(type, picks), id)).toBeUndefined();
  });
  test('Halloween\'s default no longer buys the batch cocktail; the cocktail pick does, at its own band', () => {
    const c = row(plan('Halloween Party', { drinks: 'Themed batch cocktail plus beer and wine' }), 'p_batch_cocktail');
    expect(c.costFactorApplied).toBeNull();
    expect([c.perUnitLow, c.perUnitHigh]).toEqual([30, 55]);
  });
});

describe('A7: a dry pick removes the alcohol lines, it does not scale them', () => {
  test.each([
    ['Halloween Party', { drinks: 'Zero-proof only' }],
    ['Crab Feast', { drinks: 'Dry / family-friendly' }],
    ['The Cookout', { drinks: 'Red drink + soda + water (family-friendly)' }],
    ['Low Country Boil', { drinks: 'Family-friendly / dry' }],
    ['New Year\'s Eve Party', { toast_pour: 'Zero-proof toast for everyone' }],
  ])('%s %j', (type, picks) => {
    const fp = plan(type, picks);
    expect(alcoholBought(fp).filter((id) => id !== 'p_bar')).toEqual([]);
    expect(noFactor(fp)).toEqual([]);
    expect(hostIds(fp, 'beverage').length).toBeGreaterThan(0);
  });
  test('NYE: a zero-proof toast pours cider in every glass at the wine\'s rate', () => {
    const fp = plan('New Year\'s Eve Party', { toast_pour: 'Zero-proof toast for everyone' });
    expect(row(fp, 'p_bubbles')).toBeUndefined();
    expect(row(fp, 'p_zero_sparkler_all').qty).toBe(row(plan('New Year\'s Eve Party', {}), 'p_bubbles').qty);
  });
  test('Watch Party, dry: soda and water are budgeted at their cited bands', () => {
    const fp = plan('Watch Party', { potluck: 'Host provides all', alcohol: 'Dry / family-friendly' });
    expect(hostIds(fp, 'beverage').sort()).toEqual(['p_ice', 'p_soda_dry', 'p_water_dry']);
    expect([row(fp, 'p_soda_dry').perUnitLow, row(fp, 'p_soda_dry').perUnitHigh]).toEqual([0.25, 0.6]);
    expect(row(fp, 'p_soda_dry').costProvenance.sources).toEqual(['bls-softdrinks-2026', 'soda-12pack-2026']);
    // The playbook's own four drinks a guest, split between soda and water.
    expect(row(fp, 'p_soda_dry').qty).toBe(row(fp, 'p_water_dry').qty);
    expect(row(fp, 'p_soda_dry').qty + row(fp, 'p_water_dry').qty).toBe(4 * fp.guests);
  });
});

describe('the owner\'s line rules', () => {
  test('crawfish ordered boiled: a boiled-per-pound line, and no seasoning or aromatics', () => {
    const fp = plan('Crawfish Boil', { cookmethod: 'Order it boiled by the pound (pickup)' });
    expect(row(fp, 'p_crawfish')).toBeUndefined();
    expect(row(fp, 'p_season')).toBeUndefined();
    expect(row(fp, 'p_aromatics')).toBeUndefined();
    const b = row(fp, 'p_crawfish_boiled');
    expect([b.perUnitLow, b.perUnitHigh, b.costFactorApplied]).toEqual([6.1, 10.1, null]);
    expect(b.costProvenance.sources).toEqual(['crawfish-wafb-2026', 'crawfish-wrno-2026', 'crawfish-sack-2026']);
    expect(row(plan('Crawfish Boil', {}), 'p_crawfish_boiled')).toBeUndefined();
  });
  test('Thanksgiving ordered: the prepared dinner at the cited $10-25 a guest', () => {
    const fp = plan('Thanksgiving Hosting', { hosting_model: 'Ordered — a market or restaurant cooks, host reheats and serves' });
    const c = row(fp, 'fa-catering');
    expect([c.low, c.high]).toEqual([10 * fp.guests, 25 * fp.guests]);
    const v = getPlaybook('Thanksgiving Hosting').vendors.find((x) => /Prepared holiday dinner/.test(x.category));
    expect(v.costProvenance.sources).toEqual(['thanksgiving-prepared-fox5-2026', 'thanksgiving-prepared-grocerydive-2026']);
  });
  test('a food truck is a per-guest line with its minimum, labeled low confidence', () => {
    const small = row(plan('Day Party', { food: 'Food truck' }, 30), 'p_foodtruck');
    expect([small.low, small.high, small.minimumBinds]).toEqual([1200, 1500, true]);
    const bigPlan = plan('Day Party', { food: 'Food truck' }, 150);
    const big = row(bigPlan, 'p_foodtruck');
    expect([big.low, big.high, big.minimumBinds]).toEqual([12 * bigPlan.guests, 25 * bigPlan.guests, false]);
    expect(small.costProvenance.confidence).toBe('low');
    expect(small.note).toMatch(/Low-confidence/);
    expect(row(plan('Day Party', { food: 'Food truck' }), 'p_bites')).toBeUndefined();
  });
  test('Juneteenth: the full red table buys the strawberries once, not ×1.3 on lines already bought', () => {
    expect(row(plan('Juneteenth Cookout', {}), 'p_strawberries')).toBeUndefined();
    const full = plan('Juneteenth Cookout', { red_table: 'Full red table: red drink, watermelon, red velvet, red beans, strawberries' });
    expect(row(full, 'p_strawberries')).toBeTruthy();
    expect(noFactor(full)).toEqual([]);
  });
});
