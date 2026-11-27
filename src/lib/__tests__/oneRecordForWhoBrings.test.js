// ─── ONE RECORD FOR WHO BRINGS EACH DISH (owner's iPad, 11/21/2026) ─────────
//
// "Bringing doesn't update when the other screens update the assigned bringing
// information. Single sources not duplicative sources."
//
// `event.foodOwner[dishId]` is the one record: a name (that person brings it),
// `false` (the host makes or buys it herself), or absent (the playbook's
// default, `friendsBringWhen` or the community rule). Every surface reads the
// engine's `broughtBy` and `broughtByCommunity`, which come from it.
import { routeByWords } from '../__fixtures__/stepByWords';
import { playbookFoodPlan, hostBuysLine, namedHelperCount } from '../playbooks';
import { migrateBringing, foodSheetKind, bringingRows } from '../foodBringing';
import { deriveHelperResponsibilities } from '../helperResponsibility';
import { resolveRoute } from '../routeResolver';
import { checklistRouteFor } from '../taskRoute';

const TG = (extra = {}) => ({
  id: 'tg', type: 'Thanksgiving Hosting', guestMode: 'count', guestEstimate: 12, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Pike', rsvp: 'Yes' }], ...extra,
});
const ALL_SET = {
  hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts',
  turkey_method: 'Roasted in the oven',
  dietary_table: 'Nobody — the traditional menu works for everyone',
  drinks: 'Wine with dinner, sparkling cider for everyone', // asked since 11/26/2026
};
const row = (plan, id) => plan.list.find((i) => i.id === id);

describe('the canonical record', () => {
  test('the default: a side the guests bring has nobody named yet', () => {
    const p = playbookFoodPlan(TG());
    expect(row(p, 'p_mac').broughtByCommunity).toBe(true);
    expect(row(p, 'p_mac').broughtBy).toBe('');
  });
  test('a name on a brought side is the engine\'s answer', () => {
    const p = playbookFoodPlan(TG({ foodOwner: { p_mac: 'Jordan Pike' } }));
    expect(row(p, 'p_mac').broughtBy).toBe('Jordan Pike');
  });
  test('"I\'ll make it myself" (false) overrides the default: the host buys it, priced', () => {
    const p = playbookFoodPlan(TG({ foodOwner: { p_mac: false } }));
    const m = row(p, 'p_mac');
    expect(m.broughtByCommunity).toBeFalsy();
    expect(hostBuysLine(m)).toBe(true);
    expect(m.high).toBeGreaterThan(0);
    expect(m.hostTakes).toBe(true);
    expect(bringingRows(p).map((r) => r.id)).not.toContain('p_mac');
  });
  test('naming someone for one of the host\'s dishes makes it brought: $0 and off the bought count', () => {
    const before = playbookFoodPlan(TG());
    expect(row(before, 'p_stuffing').broughtByCommunity).toBeFalsy();
    const p = playbookFoodPlan(TG({ foodOwner: { p_stuffing: 'Aunt Bea' } }));
    const s = row(p, 'p_stuffing');
    expect(s.broughtByCommunity).toBe(true);
    expect(s.broughtBy).toBe('Aunt Bea');
    expect(hostBuysLine(s)).toBe(false);
    expect(s.high).toBe(0);
    expect(p.itemCount).toBe(before.itemCount - 1);
    expect(p.shoppingCount).toBe(before.shoppingCount - 1);
  });
  test('a host-added dish reads its bringer from the same record and is not the host\'s to buy', () => {
    const p = playbookFoodPlan(TG({ foodAdd: [{ id: 'add-1', name: 'Deviled eggs', cost: 0 }], foodOwner: { 'add-1': 'Sam' } }));
    const a = row(p, 'add-1');
    expect(a.broughtBy).toBe('Sam');
    expect(hostBuysLine(a)).toBe(false);
  });
  test('a community-carried dish is not the host\'s to buy either', () => {
    expect(hostBuysLine({ id: 'x', broughtByCommunity: true })).toBe(false);
  });
  test('a skipped brought dish is not on Bringing (it is not being served)', () => {
    const p = playbookFoodPlan(TG({ foodSkip: { p_mac: true }, foodOwner: { p_mac: false } }));
    expect(bringingRows(p).map((r) => r.id)).not.toContain('p_mac');
  });
});

describe('the migration, on load, idempotent', () => {
  test('a skip on a dish the guests bring by default meant "brought": it is restored', () => {
    const ev = TG({ foodSkip: { p_mac: true, p_corn: true, p_turkey: true } });
    const patch = migrateBringing(ev);
    expect(patch.foodSkip).toEqual({ p_turkey: true });   // the host's own line stays skipped
    const after = { ...ev, ...patch };
    expect(migrateBringing(after)).toBe(null);
    const p = playbookFoodPlan(after);
    expect(row(p, 'p_mac').skipped).toBe(false);
    expect(row(p, 'p_mac').broughtByCommunity).toBe(true);
  });
  test('a host-added dish\'s owner moves into the one record', () => {
    const ev = TG({ foodAdd: [{ id: 'add-1', name: 'Deviled eggs', owner: 'Sam', cost: 0 }, { id: 'add-2', name: 'Ice', owner: '' }] });
    const patch = migrateBringing(ev);
    expect(patch.foodOwner).toEqual({ 'add-1': 'Sam' });
    expect(patch.foodAdd.every((a) => !('owner' in a))).toBe(true);
    const after = { ...ev, ...patch };
    expect(migrateBringing(after)).toBe(null);
    expect(row(playbookFoodPlan(after), 'add-1').broughtBy).toBe('Sam');
  });
  test('a skip the host made after choosing to make it herself is a real skip', () => {
    expect(migrateBringing(TG({ foodSkip: { p_mac: true }, foodOwner: { p_mac: false } }))).toBe(null);
  });
  test('nothing to move writes nothing', () => {
    expect(migrateBringing(TG())).toBe(null);
    expect(migrateBringing(TG({ foodOwner: { p_mac: 'Jordan Pike' } }))).toBe(null);
  });
});

describe('the spread opens on the tab the work is on', () => {
  test('menu questions open → Plan', () => {
    expect(foodSheetKind(TG())).toBe('foodplan');
  });
  test('menu set, buying left → Shop', () => {
    expect(foodSheetKind(TG({ foodChoices: ALL_SET }))).toBe('food');
  });
  test('menu set, all bought, a brought dish with nobody named → Bringing', () => {
    const base = TG({ foodChoices: ALL_SET });
    const p = playbookFoodPlan(base);
    const got = Object.fromEntries(p.list.filter((i) => hostBuysLine(i)).map((i) => [i.id, true]));
    expect(foodSheetKind({ ...base, foodGot: got })).toBe('bringing');
    const named = Object.fromEntries(bringingRows(p).map((r) => [r.id, 'Jordan Pike']));
    expect(foodSheetKind({ ...base, foodGot: got, foodOwner: named })).toBe('food');
  });
});

describe('every other reader takes the name from the record', () => {
  test('the helper engine (helpers panel, guest rows, day-before) sees a Bringing name', () => {
    const ev = TG({ foodOwner: { p_mac: 'Jordan Pike' } });
    const r = deriveHelperResponsibilities(ev).responsibilities.find((x) => x.itemId === 'p_mac');
    expect(r).toBeTruthy();
    expect(r.guestId).toBe('g1');
    expect(r.itemType).toBe('food');
    expect(resolveRoute(r.route)).toEqual({ kind: 'bringing', focus: 'p_mac' });
    expect(namedHelperCount(ev)).toBe(1);
  });
  test('"I\'ll make it myself" is not a helper', () => {
    expect(deriveHelperResponsibilities(TG({ foodOwner: { p_mac: false } })).responsibilities).toEqual([]);
  });
  test('the checklist\'s "assign every dish" step opens the assignment', () => {
    const r = routeByWords('Assign every dish by name — the stuffing, the potatoes, the cranberry, each pie — so nothing arrives twice and nothing is missing');
    expect(r && resolveRoute(r.route)).toEqual({ kind: 'bringing', focus: null });
  });
});
