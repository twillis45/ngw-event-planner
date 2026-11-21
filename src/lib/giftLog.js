// ─── THE GIFT LOG LIVES ON THE GUEST ROWS (owner pick A, 11/21/2026) ─────────
//
// Birthday's "Record the cash and gift cards…", "Add the gifts that arrived by
// mail…" and "Go through the gifts with the guest list…" had nowhere to go.
// They open After › Thank-yous & gifts, where each guest's row already carries
// "gift received" / "thanked". A received gift now takes What it was
// (guests[].giftWhat) and $ cash/card (guests[].giftCash); guests who said No
// or Maybe can be added to "Couldn't come, sent a gift"; the card totals the
// cash; the thank-you note names the gift. One list of people, never a second.

// The three Birthday rows, by their authored words.
export const GIFT_LOG_ROW = /^record the cash and gift cards\b|^add the gifts that arrived by mail\b|^go through the gifts with the guest list\b/i;
const CASH_ROW = /^record the cash and gift cards\b/i;
const ABSENT_ROW = /^add the gifts that arrived by mail\b/i;

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

/**
 * Is this gift row recorded? The cash row is done once a cash or card amount
 * is on the log; the mailed-gifts row once a gift is logged from someone who
 * did not come. "Go through the gifts" asks for EVERY giver, which no record
 * can prove complete, so the host ticks it (null = not this rule's row).
 */
export function giftRowSatisfied(event, label) {
  const s = String(label || '');
  if (!GIFT_LOG_ROW.test(s)) return null;
  const gs = (Array.isArray(event && event.guests) ? event.guests : []).filter((g) => named(g) && g.giftReceived);
  if (CASH_ROW.test(s)) return gs.some((g) => cashOf(g) > 0);
  if (ABSENT_ROW.test(s)) return gs.some(isAbsentGiver);
  return false;
}

/** The thank-you note's gift line: names the gift when the host wrote it down. */
export function thankYouGiftLine(g) {
  if (!g || !g.giftReceived) return '';
  const what = String(g.giftWhat || '').trim();
  if (what) return ` And thank you for the ${what} — it meant a lot.`;
  if (cashOf(g) > 0) return ' And thank you for your generous gift — it meant a lot.';
  return ' And thank you for the gift — it meant a lot.';
}
