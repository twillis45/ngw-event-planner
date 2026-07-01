// FOOD-2B Stage 1 — First consumer migration to the Effective Item seam.
//
// The shopping list (App.js food tab + Action Center) builds `shopItems` from the food
// plan and hands them to draftShoppingList/buildShoppingPlan. Historically that mapping
// read `plan.list` directly. This helper is that SAME mapping, but the fields the
// FOOD-2A Effective Item projection faithfully owns are now READ FROM `plan.effectiveItems`
// — so the shopping surface genuinely consumes the seam.
//
// WHAT MIGRATED (sourced from effectiveItems, proven byte-identical in rendered output):
//   got       from eff.flags.got     (both `!!event.foodGot[id]`)
//   qty       from eff.qty
//   unit      from eff.unit
//   where     from eff.source.options
//   name      from eff.displayName   (FOOD-2C: the seam now carries the SHORT-first label
//                                     `short || item`, distinct from item-first eff.name)
//   category  from eff.rawCategory   (FOOD-2C: the seam now carries the untouched raw `cat`;
//                                     the aisle sort reads THIS, never the derived eff.category,
//                                     so adding category DEFAULTS later can't move the sort)
//   forgotten from eff.forgotten     (FOOD-2C: faithful pass-through of the ⭐ flag)
//
// WHAT STILL READS `plan.list` (and WHY — the seam carries the value, but the consumer needs a
// companion field the seam does not yet own, OR the raw shape must be preserved byte-for-byte):
//   buyAt     — the Effective Item coerces an absent `buyAt` to `null`; the legacy object left
//               it `undefined`. Rendered output is identical, but keeping the raw value emits a
//               BYTE-identical object (these objects also flow to `orderItems`). Left as-is.
//   costLow/  — shopping uses raw `low`/`high`; eff.cost collapses a HOST-LOCKED line to the
//   costHigh    locked number. Swapping would change the modeled est-total for locked lines.
//   basis     — eff.basis is now the faithful raw `basis`, but the shopping value is
//               `qtyOverridden ? '' : basis`; the `qtyOverridden` gate is not on the seam,
//               so the gating stays here until the seam carries qtyOverridden too.
//
// Pure, read-only, no invention. Identical output to the legacy mapping (see
// __tests__/shoppingEffectiveItemsParity.test.js).
export function foodShopItems(plan, event) {
  const list = (plan && Array.isArray(plan.list)) ? plan.list : [];
  const eff = (plan && Array.isArray(plan.effectiveItems)) ? plan.effectiveItems : [];
  const effById = new Map(eff.map((e) => [e && e.id, e]));
  const foodGot = (event && event.foodGot) || {};
  return list.filter((i) => i && !i.skipped).map((i) => {
    const e = effById.get(i.id);
    return {
      name: e ? e.displayName : (i.short || i.item),        // effectiveItems (short-first)
      qty: e ? e.qty : i.qty,                               // effectiveItems
      unit: e ? e.unit : i.unit,                            // effectiveItems
      got: e ? e.flags.got : !!foodGot[i.id],               // effectiveItems
      category: e ? e.rawCategory : i.cat,                  // effectiveItems (raw cat)
      where: e ? e.source.options : i.where,                // effectiveItems
      buyAt: i.buyAt,                                       // list (raw) — see header
      forgotten: e ? e.forgotten : i.forgotten,             // effectiveItems
      costLow: i.low, costHigh: i.high,                     // list (uncollapsed) — see header
      basis: i.qtyOverridden ? '' : i.basis,                // list (qtyOverridden gate) — see header
    };
  });
}

export default foodShopItems;
