// ─── A HOST SHOPS IN BAGS, NOT IN POUNDS ───────────────────────────────────
//
// Raised by the Maryland crab-house operator seat at the 2026-09-27 ice board,
// and it was the finding nobody else on that panel saw: the sheet said
// "46 lbs" of ice. Nobody buys 46 pounds of ice. It is sold in bags, and a
// host standing in a Royal Farms cannot convert.
//
// WHAT THIS DELIBERATELY DOES NOT DO: re-unit the line. The corpus prices ice
// per pound and its whole cost basis — costProvenance `ice-retail-2026` /
// `ice-warehouse-2026`, verified 2026-08-16 — is expressed per pound, derived
// from real 20lb and 16lb bags. Converting the LINE to bags would move
// quantities and totals and put the displayed number out of step with the
// evidence behind it. This adds a shopping hint beside the quantity and
// changes no arithmetic at all.
//
// WHERE 20 lb COMES FROM, and it is not the internet. The repo already held
// the answer: that same costProvenance claim prices "a 20lb bag ... at Sams
// Club, $1.80-2.50 at Costco; BJs and 7-Eleven 20lb about $4.49-4.79, Giant
// 20lb $4.99, Publix 16lb $4.99". Five of the six cited bags are 20lb. A web
// search for retail sizes returns 5/7/16lb from the largest US packager, whose
// top seller is 7lb — a true fact about a DIFFERENT channel, and using it here
// would have contradicted the very prices this line's range was built from.
//
// THE COUNT ROUNDS UP, AND SAYS SO BY BEING A COUNT. You cannot buy 2.3 bags.
// Three 20lb bags is 60 lb for a 46 lb need, and that surplus is real — ice
// melts, and every hosting guide in the corpus says buy over. What it must not
// do is silently change what the host is CHARGED, so the money is untouched.

/** The retail bag the corpus's own ice prices were observed in. */
export const ICE_BAG_LB = 20;

/**
 * bagsForPounds(lbs, bagLb) → { bags, bagLb } | null
 * Null for anything non-positive — no hint is better than a wrong one.
 */
export function bagsForPounds(lbs, bagLb = ICE_BAG_LB) {
  const n = Number(lbs);
  const per = Number(bagLb);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isFinite(per) || per <= 0) return null;
  return { bags: Math.ceil(n / per), bagLb: per };
}

/**
 * The hint as a host reads it, or null when there is nothing useful to say.
 * NARROW ON PURPOSE: ice only, and only when the line is actually in pounds.
 * The buyable-unit guardrail in playbooks/index.js is narrow for the same
 * reason — "serving", "piece" and "lb" are legitimate units and a blanket
 * re-uniting would be over-reach.
 */
export function shoppingHint(purchase, qty) {
  if (!purchase) return null;
  // MATCH THE ID, NOT THE LABEL. The first version of this tested
  // /^ice$/i against `item` and returned null in production every time,
  // because the authored item is "Ice (coolers + drinks + red drink)" —
  // only the row's `short` reads "Ice". The unit test passed anyway,
  // because I wrote the fixture from imagination ({ item: 'Ice' }) instead
  // of measuring a real line. `p_ice` is the stable identifier every
  // playbook uses for this line, and it cannot drift with copy.
  if (purchase.id !== 'p_ice') return null;
  const unit = String(purchase.unit || '').trim().toLowerCase();
  if (unit !== 'lb' && unit !== 'lbs') return null;
  const b = bagsForPounds(qty);
  if (!b) return null;
  return `about ${b.bags} × ${b.bagLb} lb bag${b.bags === 1 ? '' : 's'}`;
}
