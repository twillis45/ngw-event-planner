// ─── marketFor — the ONE answer to "which metro market is this event in?" ────
//
// THE LIVE DEFECT (measured 2026-09-19). The same fact is written to an event
// under TWO field names by the two host shells, and every reader picked one:
//
//   CRA create flow (App.js:12109)   ->  event.market       = form.market || profile.metroMarket
//   CRA inline price picker (:10790) ->  event.market
//   hostv2 market sheet (:18144)     ->  event.metroMarket
//
// Both selects are populated from the SAME `METRO_MARKETS` list and store the
// same ids ('dc', 'atl', …), so these are not two facts — they are one fact
// under two names. hostv2 has no writer of `event.market` at all.
//
// WHAT THAT COST, MEASURED on a hostv2 event carrying metroMarket: 'dc'
// (Juneteenth Cookout, 20 guests, no venue, no city):
//
//   reader                      market: 'dc'            metroMarket: 'dc'
//   ─────────────────────────────────────────────────────────────────────
//   playbooks/index.js:4227     + p_halfsmokes, p_mumbo   (nothing)
//   eventGeoQuery.js:60         "Washington, DC, US"      ""
//   analyticsReader.js:102      byMarket { dc: 1 }        { Unspecified: 1 }
//
// So a hostv2 host who picks Washington DC gets: no half-smokes and no mumbo
// sauce on a Juneteenth cookout plan (the whole point of the region gate — see
// the 64-#5 comment at playbooks/index.js:4222, "localness is on the plate, not
// a prompt"), an EMPTY geo anchor where a CRA host gets a real city, and an
// event that disappears into "Unspecified" in the market analytics.
//
// It runs the other way too: an event created in CRA carries `market`, and
// hostv2's own metro factor (HostShellV2:1897) reads only `metroMarket` — so
// opening that event in hostv2 shows "National baseline" over a market the host
// already chose, and prices at the national factor.
//
// WHY AN ACCESSOR AND NOT A RENAME. Events are already persisted under both
// names; a rename fixes new writes and leaves every saved event wrong. Reading
// through one accessor fixes the events that already exist, in both directions,
// and makes the next surface that asks this question unable to pick a side by
// accident. Same shape as venueFor.js and budgetFor.js, for the same reason.
//
// ORDER. `market` first: it is the field the CRA create flow writes, and it is
// already the fold of the host's per-event choice over their profile default
// (`form.market || profile.metroMarket`), so it is the more specific answer
// wherever both happen to be present.
//
// PURE: no I/O, no clock, no storage, and no imports — it reads two fields.

/**
 * The event's metro market id ('dc', 'atl', …), or '' when none is set.
 * Accepts either field name; trims and ignores blanks.
 */
export function marketFor(event) {
  if (!event) return '';
  const a = String(event.market == null ? '' : event.market).trim();
  if (a) return a;
  return String(event.metroMarket == null ? '' : event.metroMarket).trim();
}

/**
 * Which field the answer came from — 'market', 'metroMarket', or null when the
 * event has neither. A surface that wants to say where a figure came from, or a
 * migration that wants to count the divergence, needs this rather than guessing.
 */
export function marketFieldFor(event) {
  if (!event) return null;
  if (String(event.market == null ? '' : event.market).trim()) return 'market';
  if (String(event.metroMarket == null ? '' : event.metroMarket).trim()) return 'metroMarket';
  return null;
}

export default marketFor;
