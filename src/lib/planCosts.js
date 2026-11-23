// ─── THE SHOP'S "ALL IN": ONE SUM (six root causes, cause 3) ─────────────────
//
// Thanksgiving walkthrough P1-6: the Shop sheet read "$135–$355, estimate, all
// in" while the seating sheet priced about $77 of chairs, a kids table and
// cooler space that Your money counts as Rentals. "All in" left out a plan
// cost the money sheet counted, and the shell summed food + supplies inline in
// four places.
//
//   listTotal  — the shopping list: food, drinks and supplies.
//   allInTotal — the list plus the seating sheet's gear (playbookCapacity),
//                counted exactly when hostSpending counts it as Rentals: once
//                the plan has a real head count.

export function listTotal(foodPlan) {
  const fp = foodPlan || {};
  return {
    low: (fp.foodLow || 0) + (fp.suppliesLow || 0),
    high: (fp.foodHigh || 0) + (fp.suppliesHigh || 0),
  };
}

export function allInTotal(foodPlan, capacity) {
  const list = listTotal(foodPlan);
  const counts = !!(foodPlan && foodPlan.hasRealCount && capacity);
  const gearLow = counts ? Math.max(0, Number(capacity.costLow) || 0) : 0;
  const gearHigh = counts ? Math.max(0, Number(capacity.costHigh) || 0) : 0;
  return { low: list.low + gearLow, high: list.high + gearHigh, gearLow, gearHigh };
}
