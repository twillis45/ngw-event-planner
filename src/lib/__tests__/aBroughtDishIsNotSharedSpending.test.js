// ─── SPLIT THE COSTS KNOWS BROUGHT DISHES (owner's iPad, 11/21/2026) ────────
//
// "Single sources not duplicative sources." `event.foodOwner[dishId]` is the
// one record of who brings each dish (a name, `false` for "I'll make it
// myself", absent for the playbook default, friendsBringWhen). Shop takes a
// brought dish off the host's shelves through foodBringing's bringingRows.
// Split the costs read none of it: a receipt for the mac and cheese a guest
// brings was split across everyone as if the group had bought it.
//
// Here a receipt tied to a dish (`dishId`) is shared spending only when the
// same reader Shop uses says the host's side buys it.
import { readSplit, settle, splitSummary, dishFor, splitDishes } from '../costSplit';
import { playbookFoodPlan } from '../playbooks';
import { bringingRows } from '../foodBringing';

const MODEL = { hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts' };
const people = [{ id: 'a', name: 'Jordan' }, { id: 'b', name: 'Ana' }, { id: 'c', name: 'Sam' }];
const ev = (expenses, extra) => ({
  name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', guestMode: 'list', guestEstimate: 12, guests: [],
  foodChoices: MODEL, costSplit: { people, expenses }, ...extra,
});
const TURKEY = { id: 'x1', who: 'b', what: 'Turkey', amount: 60, dishId: 'p_turkey' };
const MAC = { id: 'x2', who: 'a', what: 'Mac and cheese', amount: 30, dishId: 'p_mac' };

test('the mac and cheese a guest brings is not split; the turkey the host side buys is', () => {
  const e = ev([TURKEY, MAC]);
  // Same reader as Shop: the default says guests bring the mac and cheese.
  expect(bringingRows(playbookFoodPlan(e)).map((r) => r.id)).toContain('p_mac');
  const r = settle(readSplit(e));
  expect(r.total).toBe(6000);
  expect(r.each).toBe(2000);
  expect(r.brought).toBe(3000);
});

test('"I\'ll make it myself" (foodOwner false) puts the dish back in the split', () => {
  const r = settle(readSplit(ev([TURKEY, MAC], { foodOwner: { p_mac: false } })));
  expect(r.total).toBe(9000);
  expect(r.brought).toBe(0);
});

test('a name on a dish the host side would buy takes it out of the split', () => {
  const ROLLS = { id: 'x3', who: 'c', what: 'Dinner rolls & butter', amount: 12, dishId: 'p_rolls' };
  const s = readSplit(ev([TURKEY, ROLLS], { foodOwner: { p_rolls: 'Sam' } }));
  expect(s.expenses.find((x) => x.id === 'x3')).toMatchObject({ brought: true, bringer: 'Sam' });
  expect(settle(s).total).toBe(6000);
});

test('a dish nobody serves (foodSkip) is not a brought dish, and a receipt with no dish is split as typed', () => {
  const r = settle(readSplit(ev([TURKEY, { ...MAC, dishId: 'p_mac' }, { id: 'x4', who: 'c', what: 'ice', amount: 9 }],
    { foodSkip: { p_mac: true }, foodOwner: { p_mac: false } })));
  expect(r.total).toBe(9900);
});

test('the summary names the brought dish and leaves it out of the total', () => {
  expect(splitSummary(ev([TURKEY, MAC]))).toBe([
    'Our Thanksgiving — $60.00 total, split 3 ways ($20.00 each).',
    'Ana paid $60.00 for Turkey.',
    'Jordan paid $30.00 for Mac and cheese — a brought dish, so it isn’t split.',
    '',
    'Jordan pays Ana $20.00.',
    'Sam pays Ana $20.00.',
  ].join('\n'));
});

test('"For what?" finds the dish by its name, either length, any case', () => {
  const e = ev([]);
  expect(dishFor(e, 'mac and cheese')).toBe('p_mac');
  expect(dishFor(e, '  Turkey (whole bird, or breast for a small table) ')).toBe('p_turkey');
  expect(dishFor(e, 'the good wine')).toBe(null);
  expect(splitDishes(e).map((d) => d.label)).toEqual(expect.arrayContaining(['Turkey', 'Mac and cheese']));
});

test('receipts tied to no dish: nothing is brought, everything is split', () => {
  const r = settle(readSplit({ costSplit: { people, expenses: [{ id: '1', who: 'a', what: 'gas', amount: 30 }] } }));
  expect(r.total).toBe(3000);
  expect(r.brought).toBe(0);
});
