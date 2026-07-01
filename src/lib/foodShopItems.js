// FOOD-2B Stage 1 — First consumer migration to the Effective Item seam.
//
// The shopping list (App.js food tab + Action Center) builds `shopItems` from the food
// plan and hands them to draftShoppingList/buildShoppingPlan. Historically that mapping
// read `plan.list` directly. This helper is that SAME mapping, but the fields the
// FOOD-2A Effective Item projection faithfully owns are now READ FROM `plan.effectiveItems`
// — so the shopping surface genuinely consumes the seam.
//
// WHAT MIGRATED (sourced from effectiveItems, proven byte-identical in rendered output):
//   got   ← eff.flags.got     (both `!!event.foodGot[id]`)
//   qty   ← eff.qty
//   unit  ← eff.unit
//   where ← eff.source.options
//
// WHAT STAYED ON `plan.list` (and WHY it CANNOT move without changing behavior — the
// FOOD-2A seam does not yet carry these faithfully for this consumer):
//   name      — shopping uses `short || item` (short-first); eff.name is `item || short`
//               (item-first, frozen by FOOD-2A tests). Swapping would rename items in the
//               host-facing list → copy drift. UNSAFE.
//   category  — shopping uses the RAW `cat`; eff.category DERIVES a category from `group`
//               when `cat` is absent (host-added dishes). Swapping would re-rank the aisle
//               sort for host-added lines → order drift. UNSAFE.
//   buyAt     — the Effective Item coerces an absent `buyAt` to `null`; the legacy object left
//               it `undefined`. Rendered output is identical, but keeping the raw value emits a
//               BYTE-identical object (these objects also flow to `orderItems`). UNSAFE to swap.
//   costLow/  — shopping uses raw `low`/`high`; eff.cost collapses a HOST-LOCKED line to the
//   costHigh    locked number. Swapping would change the modeled est-total for locked lines.
//   forgotten — not present on the Effective Item at all (drops the ⭐ + forgotten-sort).
//   basis     — not present on the Effective Item at all (drops the per-guest "because").
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
      name: i.short || i.item,                              // list (short-first) — see header
      qty: e ? e.qty : i.qty,                               // effectiveItems
      unit: e ? e.unit : i.unit,                            // effectiveItems
      got: e ? e.flags.got : !!foodGot[i.id],               // effectiveItems
      category: i.cat,                                      // list (raw cat) — see header
      where: e ? e.source.options : i.where,                // effectiveItems
      buyAt: i.buyAt,                                       // list (raw) — see header
      forgotten: i.forgotten,                               // list — not on the seam
      costLow: i.low, costHigh: i.high,                     // list (uncollapsed) — see header
      basis: i.qtyOverridden ? '' : i.basis,                // list — not on the seam
    };
  });
}

export default foodShopItems;
