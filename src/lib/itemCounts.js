// ─── WHAT EACH ITEM COUNT MEANS: ONE READER (six root causes, cause 3) ───────
//
// Thanksgiving walkthrough P1-6/P2: the same plan read "7 items", "11 items",
// "8" and "27 left" on screens a tap apart. Each was a true count of a
// different set, printed under the same word. Two counts exist, each defined
// once here, each with its own label:
//
//   foodItems — the food and drink lines she buys (the plan's `itemCount`:
//               not supplies, not a dish someone else brings, not skipped).
//               What "the food is shopped" means to the readiness gate.
//   listItems — every line on her shopping list (the plan's `shoppingCount`:
//               food, drinks and supplies she buys, not skipped).
//
// And what is left: `linesLeftToBuy`, the list lines not yet bought. Every
// "left to buy" count reads it (the board's shopping row, the plan hero, the
// day-before list, the return line), so they cannot count different lines.
import { hostBuysLine } from './playbooks';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const COUNT_LABELS = {
  foodItems: (n) => plural(n, 'food & drink item', 'food & drink items'),
  listItems: (n) => plural(n, 'item', 'items'),
  leftToBuy: (n) => `${n} left`,
};

/** The list lines she still has to buy, in list order. */
export function linesLeftToBuy(plan, event) {
  const got = (event && event.foodGot && typeof event.foodGot === 'object') ? event.foodGot : {};
  const list = (plan && Array.isArray(plan.list)) ? plan.list : [];
  return list.filter((i) => i && hostBuysLine(i) && !i.skipped && !got[i.id]);
}

/** Every item count a surface prints, each meaning one thing. */
export function itemCounts(plan, event) {
  if (!plan) return { foodItems: 0, foodBought: 0, listItems: 0, listBought: 0, leftToBuy: 0 };
  return {
    foodItems: plan.itemCount || 0,
    foodBought: plan.boughtCount || 0,
    listItems: plan.shoppingCount || 0,
    listBought: plan.shoppingBought || 0,
    leftToBuy: linesLeftToBuy(plan, event).length,
  };
}
