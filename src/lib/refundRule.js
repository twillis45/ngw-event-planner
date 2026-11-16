// ─── THE ONE-EVENT PASS REFUND RULE (owner ruling 11/12/2026) ────────────────
//
// Ruled by the owner on the review board's 4-2 recommendation (11/11/2026):
// a full refund within 14 days, no questions asked, as long as no NEW vendor
// brief has been sent from that event since the pass was bought. Once one has,
// the pass has done its job and the purchase is final.
//
// WHY "a new vendor brief" and nothing else: it is the one use the server can
// check. vendor_brief_links.created_at against event_passes.purchased_at
// (docs/RUNBOOK.md → "Refund check"). Destination/multi-day use is never
// recorded server-side, so the rule does not mention it.
//
// One constant, shown before the money on the pass sheet. The price in it is
// held to the server's price by thePassPriceIsTheServersPrice.
export const REFUND_WINDOW_DAYS = 14;

// REWORDED 11/15/2026, same rule. The first wording put the condition last
// ("...if you have not sent a new vendor brief") and read as a trap: use what
// you bought and lose the refund. The condition now leads, framed as what it
// is — a change of mind before the pass is used.
export const REFUND_LINE =
  `Changed your mind? If you haven’t sent the details to another vendor yet, get all $39 back within ${REFUND_WINDOW_DAYS} days.`;
