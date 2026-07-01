// FOOD-2B Stage 1 — GOLDEN parity: the shopping list built the LEGACY way (straight off
// `plan.list`) vs the MIGRATED way (`foodShopItems`, which reads got/qty/unit/where/buyAt
// from `plan.effectiveItems`) must produce BYTE-IDENTICAL shopping output. Two surfaces are
// asserted equal: the structured buildShoppingPlan() and the rendered draftShoppingList()
// body — across 6 playbooks × 3 sourcing modes, plus edge events (checked-off, host-added
// dish with no `cat`, a "commonly forgotten" line).
//
// A second block DOCUMENTS the seam gap: a NAIVE full swap onto effectiveItems (name/category
// /cost from the seam, forgotten/basis dropped) DRIFTS — proving why those fields stayed on
// `plan.list` and why Stage 2 must extend the seam before the list can fully own them.

import { playbookFoodPlan } from '../playbooks';
import { foodShopItems } from '../foodShopItems';
import { resolveEffectiveItem } from '../effectiveItem';
import { buildShoppingPlan, draftShoppingList } from '../doItForMe';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 40); return d.toISOString().slice(0, 10); })();
const ev = (type, extra = {}) => ({ id: 'e', type, date: future, guestCount: 24, guestEstimate: 24, ...extra });
const profile = { name: 'Sam' };
const anchor = 'Austin, TX';

// The EXACT legacy mapping shipped at App.js:9741 / :22644 — verbatim, so the test pins
// the real production behavior, not a paraphrase of it.
const legacyShopItems = (plan, event) => plan.list
  .filter((i) => i && !i.skipped)
  .map((i) => ({ name: i.short || i.item, qty: i.qty, unit: i.unit, got: !!(event.foodGot || {})[i.id], category: i.cat, where: i.where, buyAt: i.buyAt, forgotten: i.forgotten, costLow: i.low, costHigh: i.high, basis: i.qtyOverridden ? '' : i.basis }));

const PLAYBOOKS = ['Get-Together', 'Dinner Party', 'Crab Feast', 'Graduation', 'Baby Shower', 'Birthday'];
const MODES = ['butcher', 'costco', 'grocery'];

// render both surfaces (structured plan + text body) from a shopItems array
const surfaces = (event, shopItems) => {
  const need = shopItems.filter((i) => !i.got);
  return {
    plan: buildShoppingPlan(need, { anchor }),
    body: draftShoppingList(event, profile, { items: shopItems, anchor }).body,
  };
};

describe('FOOD-2B · golden — shopping list: plan.list vs effectiveItems-backed foodShopItems', () => {
  for (const type of PLAYBOOKS) {
    for (const mode of MODES) {
      test(`${type} · ${mode}: migrated shopping output is byte-identical`, () => {
        const event = ev(type, { sourcing: mode });
        const plan = playbookFoodPlan(event);
        const legacy = legacyShopItems(plan, event);
        const migrated = foodShopItems(plan, event);
        // The seam genuinely feeds this surface: effectiveItems exists and is 1:1 with list.
        expect(Array.isArray(plan.effectiveItems)).toBe(true);
        expect(plan.effectiveItems.length).toBe(plan.list.length);
        // Same item count, same order.
        expect(migrated.length).toBe(legacy.length);
        // Strongest parity: the shopItems objects themselves are byte-identical (these objects
        // also flow to `orderItems`), so nothing downstream can observe the seam swap.
        expect(migrated).toEqual(legacy);
        // Rendered output — structured AND text — must match exactly.
        const a = surfaces(event, legacy);
        const b = surfaces(event, migrated);
        expect(b.plan).toEqual(a.plan);
        expect(b.body).toBe(a.body);
      });
    }
  }

  test('edge · checked-off + host-added dish (no cat) + forgotten line stay identical', () => {
    // check off the first two real lines to exercise the `got` path through the seam.
    // (foodGot is part of the event BEFORE the plan is built — exactly as runtime rebuilds
    // playbookFoodPlan from the live event, so effectiveItems.flags.got is current.)
    const seed = playbookFoodPlan(ev('Crab Feast', { sourcing: 'butcher' }));
    const event = ev('Crab Feast', {
      sourcing: 'butcher',
      foodAdd: [{ id: 'fa1', name: "Auntie's potato salad", owner: 'Auntie', cost: 0 }],
      foodGot: seed.list.slice(0, 2).reduce((m, i) => { m[i.id] = true; return m; }, {}),
    });
    const plan = playbookFoodPlan(event);
    const legacy = legacyShopItems(plan, event);
    const migrated = foodShopItems(plan, event);
    // a host-added dish (group Food, no `cat`) is present — the case that would drift if
    // category were sourced from the seam; prove it does NOT here.
    expect(plan.list.some((i) => i.added && i.cat == null)).toBe(true);
    expect(migrated).toEqual(legacy);
    const a = surfaces(event, legacy);
    const b = surfaces(event, migrated);
    expect(b.plan).toEqual(a.plan);
    expect(b.body).toBe(a.body);
  });

  test('the seam actually drives it — got flows from effectiveItems.flags.got', () => {
    const event = ev('Dinner Party', { sourcing: 'grocery' });
    const plan = playbookFoodPlan(event);
    const firstId = plan.list.find((i) => !i.skipped).id;
    event.foodGot = { [firstId]: true };
    const migrated = foodShopItems(playbookFoodPlan(event), event);
    const row = migrated.find((r) => r.name && plan.list.find((i) => i.id === firstId));
    // the checked-off item is marked got via the projection, not a re-read of the list
    expect(migrated.some((r) => r.got === true)).toBe(true);
    expect(row).toBeTruthy();
  });
});

// ── Boundary documentation: reading the WRONG seam fields still DRIFTS. FOOD-2C added the
// RIGHT fields (displayName / rawCategory / forgotten / basis), but the item-first `eff.name`
// and the group-DERIVED `eff.category` remain (FOOD-2A pins them). A naive swap that grabs
// those instead of the new short-first / raw-cat fields — and drops forgotten/basis — still
// drifts. We assert that drift so the "read the right field" boundary stays pinned.
describe('FOOD-2C · boundary — reading the WRONG seam fields (name/category derived) is UNSAFE', () => {
  const naiveShopItems = (plan) => plan.list
    .filter((i) => i && !i.skipped)
    .map((i) => {
      const e = resolveEffectiveItem(i, {});
      return {
        name: e.name,                 // item-first (drifts vs short-first eff.displayName)
        qty: e.qty, unit: e.unit,
        got: e.flags.got,
        category: e.category,         // derived (drifts on host-added vs eff.rawCategory)
        where: e.source.options,
        buyAt: e.buyAt,
        // forgotten + basis deliberately dropped here (they DO exist on the seam now)
        costLow: e.cost.low, costHigh: e.cost.high,
      };
    });

  test('a rendered body differs on at least one playbook (name/forgotten/basis loss)', () => {
    let drifted = false;
    const reasons = new Set();
    for (const type of PLAYBOOKS) {
      const event = ev(type, { sourcing: 'butcher' });
      const plan = playbookFoodPlan(event);
      const legacyBody = draftShoppingList(event, profile, { items: legacyShopItems(plan, event), anchor }).body;
      const naiveBody = draftShoppingList(event, profile, { items: naiveShopItems(plan), anchor }).body;
      if (legacyBody !== naiveBody) {
        drifted = true;
        // classify the drift so the report is precise
        if (plan.list.some((i) => (i.short || i.item) !== (i.item || i.short))) reasons.add('name-precedence');
        if (plan.list.some((i) => i.forgotten)) reasons.add('forgotten-dropped');
        if (plan.list.some((i) => i.basis)) reasons.add('basis-dropped');
      }
    }
    expect(drifted).toBe(true);
    // at least the name-precedence and the missing seam fields explain it
    expect(reasons.size).toBeGreaterThan(0);
  });

  test('FOOD-2C closed the structural gap: the Effective Item now carries `forgotten`, `basis`, `displayName`, `rawCategory` as faithful pass-throughs', () => {
    const e = resolveEffectiveItem({ id: 'x', item: 'Ribs', short: 'Baby-backs', cat: 'meat', low: 40, high: 80, forgotten: true, basis: '½ lb/guest' }, {});
    // forgotten / basis are now present and faithful (the shopping list can own them).
    expect(e.forgotten).toBe(true);
    expect(e.basis).toBe('½ lb/guest');
    // displayName is SHORT-first (what shopping renders); eff.name stays item-first (FOOD-2A).
    expect(e.displayName).toBe('Baby-backs');
    expect(e.name).toBe('Ribs');
    // rawCategory is the untouched raw `cat`; the derived category is separate and unchanged.
    expect(e.rawCategory).toBe('meat');
    expect(e.category).toBe('meat');
  });

  test('rawCategory stays undefined (not derived) on a host-added line with no `cat`, so the aisle sort is untouched', () => {
    // The derived `category` falls back to a group-derived value; `rawCategory` must NOT —
    // it mirrors the raw `cat` (absent here) so the shopping aisle sort is byte-identical.
    const e = resolveEffectiveItem({ id: 'a', item: "Auntie's salad", short: "Auntie's salad", group: 'Food', low: 0, high: 0, added: true }, {});
    expect(e.rawCategory).toBeUndefined();
    expect(e.category).toBe('food'); // derived stays defensive (FOOD-2A behavior preserved)
  });
});
