// ─── A BUY STEP BUYS WHAT IT NAMES (50-host run, round 2, 11/16/2026) ────────
//
// Ticking "Buy the turkey" on a Friendsgiving checklist marked all 11 shopping
// items bought, drinks, supplies and labels included, and the toast said so.
// The shortcut was meant for a GENERAL shopping step ("Do the shopping"). A
// step that names an item buys that item; a step naming nothing on the list
// buys nothing.
import { itemsBoughtByTask } from '../shopTaskItems';
import { playbookFoodPlan, hostBuysLine } from '../playbooks';

const EV = { id: 'fg', type: 'Friendsgiving', date: '2026-11-21', guestEstimate: 12, guestMode: 'count', guests: [], vendors: [], budget: [] };
const LIST = playbookFoodPlan(EV, {}).list.filter((it) => !it.skipped);
const names = (ids) => LIST.filter((it) => ids.includes(it.id)).map((it) => it.item);

test('the list has more than a turkey on it (premise)', () => {
  expect(LIST.length).toBeGreaterThan(3);
  expect(LIST.some((it) => /turkey/i.test(it.item))).toBe(true);
});

test('"Buy the turkey: …" buys the turkey and nothing else', () => {
  const r = itemsBoughtByTask('Buy the turkey: about a pound and a quarter per guest, in a size that fits your oven. A frozen bird now', LIST);
  expect(r.scope).toBe('items');
  expect(names(r.ids).length).toBeGreaterThan(0);
  names(r.ids).forEach((n) => expect(n).toMatch(/turkey/i));
});

// "The whole list" is every line SHE buys: a dish the guests bring is not
// hers to mark bought (11/26/2026, doTheShoppingBuysOnlyHerLines).
test.each(['Do the shopping', 'Do the big grocery shop', 'Buy everything on the list'])('a general step buys the whole list: %s', (t) => {
  const r = itemsBoughtByTask(t, LIST);
  expect(r.scope).toBe('all');
  expect(r.ids.length).toBe(LIST.filter(hostBuysLine).length);
});

test('a step naming nothing on the list buys nothing', () => {
  expect(itemsBoughtByTask('Buy the shadow box and flag case', LIST)).toEqual({ scope: 'none', ids: [] });
});

test('a step that is not a buy step buys nothing', () => {
  expect(itemsBoughtByTask('Decide who cooks what', LIST).scope).toBe('none');
});
