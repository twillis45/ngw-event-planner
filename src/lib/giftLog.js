// ─── THE GIFT LOG LIVES ON THE GUEST ROWS (owner pick A, 11/21/2026) ─────────
//
// Birthday's "Record the cash and gift cards…", "Add the gifts that arrived by
// mail…" and "Go through the gifts with the guest list…" had nowhere to go.
// They open After › Thank-yous & gifts, where each guest's row already carries
// "gift received" / "thanked". A received gift now takes What it was
// (guests[].giftWhat) and $ cash/card (guests[].giftCash); guests who said No
// or Maybe can be added to "Couldn't come, sent a gift"; the card totals the
// cash; the thank-you note names the gift. One list of people, never a second.

const named = (g) => g && String(g.name || '').trim();
const cashOf = (g) => { const n = Number(g && g.giftCash); return Number.isFinite(n) && n > 0 ? n : 0; };

/** Cash and gift cards on the log: the total and how many people it came from. */
export function giftCashTotal(event) {
  const gs = (Array.isArray(event && event.guests) ? event.guests : []).filter((g) => named(g) && g.giftReceived);
  const from = gs.filter((g) => cashOf(g) > 0);
  return { total: from.reduce((t, g) => t + cashOf(g), 0), from: from.length };
}

/** Guests who were not a yes: the "Couldn't come, sent a gift" group draws from them. */
export const isAbsentGiver = (g) => !!named(g) && g.rsvp !== 'Yes';

// The gift rows' facts (lib/taskEngine STEP_FACTS; each row declares which,
// six root causes cause 1 part 2). The cash row is done once a cash or card
// amount is on the log; the mailed-gifts row once a gift is logged from
// someone who did not come. "Go through the gifts" asks for EVERY giver, which
// no record can prove complete, so it declares none and the host ticks it.
const giftsLogged = (event) => (Array.isArray(event && event.guests) ? event.guests : []).filter((g) => named(g) && g.giftReceived);
/** A cash or card amount is on the gift log. */
export function giftCashLogged(event) { return giftsLogged(event).some((g) => cashOf(g) > 0); }
/** A gift is logged from someone who did not come. */
export function giftsByMailLogged(event) { return giftsLogged(event).some(isAbsentGiver); }

/** The thank-you note's gift line: names the gift when the host wrote it down. */
export function thankYouGiftLine(g) {
  if (!g || !g.giftReceived) return '';
  const what = String(g.giftWhat || '').trim();
  if (what) return ` And thank you for the ${what} — it meant a lot.`;
  if (cashOf(g) > 0) return ' And thank you for your generous gift — it meant a lot.';
  return ' And thank you for the gift — it meant a lot.';
}
