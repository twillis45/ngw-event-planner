// ─── WHAT A LINE'S PRICE RESTS ON (owner rule, 11/22/2026) ───────────────────
//
// "Every price traces to a cited source; never invent a price. If a real source
// can't be found, the line must be LABELED to the host as an estimate without a
// source (or pending), not silently badged as sourced."
//
// `classifyClaim` (knowledge/claimBasis) answers what a line's QUANTITY and
// price rest on, in the board's vocabulary, and the shell shows it in the tune
// panel. It never says, in words a host reads, that a price has no source:
// an uncited line reads "Planning baseline", which names who wrote it, not
// that nobody checked it. This module is that one fact, per line:
//
//   cited     the cost block (or the shared slot, where most cost citations
//             still live) resolves in COST_SOURCES — the same predicate
//             classifyClaim uses for `costCited`.
//   host      her own number: a dish she added with a cost, a price she locked.
//   quote     her caterer's quote or booking.
//   estimate  no source. "Estimate — no price source yet."
//
// An estimate is ACKNOWLEDGED only when the line is named, with the reason, in
// UNSOURCED_PRICE_LINES below. The label renders either way, so a host is never
// told a price is sourced when it is not; the census
// (everyPriceNamesItsSource.test.js) fails on an unacknowledged one, so a new
// uncited price cannot ship quietly, and on a stale acknowledgement, so citing
// a line means taking it off this list.
import { isGroundedCost } from './knowledge/costProvenance';

export const PRICE_BASIS_LABELS = Object.freeze({
  host: 'Your price',
  quote: 'Your caterer’s quote',
  estimate: 'Estimate — no price source yet',
});

/** The census key for a line: `<playbook type>:<line id>`. */
export const priceSourceKey = (type, id) => `${type}:${id}`;
// Lines the engine builds for every playbook (not authored per type).
const ENGINE_KEY = (id) => `*:${id}`;

// Lines priced with no cited source, by name, each with why. Engine lines are
// keyed `*:<id>`. Remove a line from here in the same change that cites it.
export const UNSOURCED_PRICE_LINES = Object.freeze({
  'Ethiopian Coffee Ceremony:p_fandisha': 'An estimate built from cited unit prices (target-popcorn-2026, bread-retail-2026): the portions (an ounce of kernels, a tenth of a loaf) are our assumption, so the $0.30-0.80 band is labeled, not cited. No fetched price for himbasha.',
  'Ethiopian Coffee Ceremony:p_grass': 'No US retail price exists for ketema strewing grass (florist-greenery-2026 prices ornamental grasses at $13.20-36.00 a bunch, a different product); the 11/23/2026 pass found none to fetch.',
  'Friendsgiving:p_gravy': 'An estimate built from cited unit prices (target-gravy-2026): one to two cartons of broth plus a backup jar is our assumption, so the $3.70-9.50 batch is labeled, not cited.',
  'Friendsgiving:p_labels': 'A bundle of several products priced as one kit ($3-8); no fetched source prices the bundle.',
  'Friendsgiving:p_mac': 'An estimate built from cited unit prices (BLS pasta, cheddar and milk): half a pound to a pound of cheese and two cups of milk per pound of pasta is our assumption, so the $5-8 band is labeled, not cited.',
  'Friendsgiving:p_potatoes': 'An estimate built from cited unit prices (BLS potatoes and butter, Target cream): the butter and cream per pound of potatoes are our assumption, so the $1.15-1.60 band is labeled, not cited.',
  'Friendsgiving:p_serveware': 'A bundle of several products priced as one set ($0.40-1.20); no fetched source prices the bundle.',
  'Fundraiser / Gala:p_checkout_kit': 'A bundle of several products priced as one kit ($150-800); no fetched source prices the bundle.',
  'Fundraiser / Gala:p_cleanup': 'A bundle of several products priced as one kit ($20-60); no fetched source prices the bundle.',
  'Fundraiser / Gala:p_pledgecards': 'No fetched retail price backs its $0.25-1 per card band yet.',
  'Fundraiser / Gala:p_signage': 'An estimate built from cited unit prices (signage-print-2026): the sign counts (8-16 foam boards, 1-4 banners, 1-2 large-format boards) are our assumption, so the $320-2,080 band is labeled, not cited (owner ruling 11/23/2026).',
  'Conference:p_signage': 'An estimate built from cited unit prices (signage-print-2026): the sign counts (10-24 foam boards, 1-4 banners, 1-3 large-format boards) are our assumption, so the $350-2,720 band is labeled, not cited (owner ruling 11/23/2026).',
  'Halloween Party:p_decor': 'A bundle of several products priced as one kit ($40-150); no fetched source prices the bundle.',
  'Halloween Party:p_path_lights': 'A bundle of several products priced as one kit ($15-50); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_allergy_labels': 'A bundle of several products priced as one kit ($10-25); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_cashboxes': 'A bundle of several products priced as one set ($40-120); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_cleanup': 'A bundle of several products priced as one kit ($15-40); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_signage': 'A bundle of several products priced as one sign package ($75-300); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_volunteer_id': 'A bundle of several products priced as one set ($20-60); no fetched source prices the bundle.',
  'Quinceañera:p_cleanup': 'A bundle of several products priced as one kit ($20-50); no fetched source prices the bundle.',
  'Quinceañera:p_decor': 'A bundle of several products priced as one package ($300-1500); no fetched source prices the bundle.',
  'Quinceañera:p_doll_crown': 'A bundle of several products priced as one set ($80-300); no fetched source prices the bundle.',
  'Sunday Dinner:p_cornbread': 'No fetched retail price backs its $3-7 per batch band yet.',
  'Sunday Dinner:p_dessert': 'No fetched retail price backs its $8-16 per 9x13 cobbler or 2 pies band yet.',
  'Sunday Dinner:p_foil-oil': 'A bundle of several products priced as one set ($8-18); no fetched source prices the bundle.',
  'Sunday Dinner:p_mac': 'An estimate built from cited unit prices (BLS pasta, cheddar and milk): one to two pounds of cheese and two to three cups of milk per pan is our assumption, so the $8-14.50 band is labeled, not cited.',
  'Sweet 16:p_cleanup': 'A bundle of several products priced as one kit ($15-40); no fetched source prices the bundle.',
  'Sweet 16:p_decor': 'A bundle of several products priced as one kit ($80-300); no fetched source prices the bundle.',
  'Sweet 16:p_lighting': 'A bundle of several products priced as one set ($40-150); no fetched source prices the bundle.',
  'Thanksgiving Hosting:p_coffee': 'A bundle of several products priced as one service ($8-18); no fetched source prices the bundle.',
  'Thanksgiving Hosting:p_gravy': 'An estimate built from cited unit prices (target-gravy-2026): one to two cartons of broth plus a backup jar is our assumption, so the $3.70-9.50 batch is labeled, not cited.',
  'Thanksgiving Hosting:p_mac': 'An estimate built from cited unit prices (BLS pasta, cheddar and milk): half a pound to a pound of cheese and two cups of milk per pound of pasta is our assumption, so the $5-8 band is labeled, not cited.',
  'Thanksgiving Hosting:p_potatoes': 'An estimate built from cited unit prices (BLS potatoes and butter, Target cream): the butter and cream per pound of potatoes are our assumption, so the $1.15-1.60 band is labeled, not cited.',
  'Thanksgiving Hosting:p_roasting_kit': 'A bundle of several products priced as one kit ($10-40); no fetched source prices the bundle.',
  'Watch Party:p_ballot': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_daytonadecor': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_draftboard': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_mintjulep': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_pimentocheese': 'Its own costProvenance says why: Augusta\'s $1.50 sandwich prices a concession stand, not the host\'s groceries, and no home-ingredient price is registered.',
  'Watch Party:p_teamcolors': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_worldcupcolors': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
});

export function priceBasisFor(line, type) {
  if (!line) return null;
  if (line.added || line.locked != null) return { kind: 'host', label: PRICE_BASIS_LABELS.host };
  if (line.quotedBy) return { kind: 'quote', label: PRICE_BASIS_LABELS.quote };
  if (isGroundedCost(line.costProvenance) || isGroundedCost(line.provenance)) return { kind: 'cited', label: null };
  const own = priceSourceKey(type, line.id);
  const eng = ENGINE_KEY(line.id);
  const acknowledgedAs = UNSOURCED_PRICE_LINES[own] ? own : (UNSOURCED_PRICE_LINES[eng] ? eng : null);
  return { kind: 'estimate', label: PRICE_BASIS_LABELS.estimate, acknowledged: !!acknowledgedAs, acknowledgedAs };
}

// ─── A PICK PRICED AS SOMETHING ELSE IS PENDING, AND SAYS SO (audit G #2) ─────
//
// A decision marked `costPending` (the owner's list, noCostFactorWithoutASource)
// prices some of its picks as another pick until a source exists. That field
// had no reader outside two tests, so the host saw the stand-in's price under
// its stand-in's badge. `costPendingPicks` names the picks priced that way
// (absent = every pick). One entry per pending pick in effect, in the
// decision's own words, for the Spread and Your money to say.
export const PRICE_PENDING_LABEL = 'Price pending a source';

export function pricePendingFor(playbook, pickFor, shown = () => true) {
  const out = [];
  for (const d of (playbook && Array.isArray(playbook.decisions)) ? playbook.decisions : []) {
    if (!d || typeof d.costPending !== 'string' || !d.costPending.trim()) continue;
    if (!shown(d)) continue;
    const sd = d.standsDownWhen;
    if (sd && sd.id && Array.isArray(sd.in) && sd.in.includes(pickFor(sd.id))) continue;
    const pick = pickFor(d.id);
    if (!pick) continue;
    const pending = Array.isArray(d.costPendingPicks) ? d.costPendingPicks.includes(pick) : true;
    if (!pending) continue;
    out.push({ id: d.id, label: d.label || d.id, pick, why: d.costPending.trim() });
  }
  return out;
}

/**
 * What the host is told over a priced list: how many of its prices are
 * estimates with no source, and each pick priced as something else until a
 * source exists. Counted from the lines' own `priceBasis`, never re-derived.
 * Null when there is nothing to say.
 */
export function priceSourceNote(plan) {
  if (!plan || !Array.isArray(plan.list)) return null;
  const priced = plan.list.filter((l) => l && !l.skipped && (Number(l.high) > 0 || Number(l.low) > 0));
  const estimates = priced.filter((l) => l.priceBasis && l.priceBasis.kind === 'estimate').length;
  const pending = (Array.isArray(plan.pricePending) ? plan.pricePending : [])
    .map((p) => `${PRICE_PENDING_LABEL}: “${p.pick}” — ${p.why}`);
  if (!estimates && !pending.length) return null;
  const head = !estimates ? null
    : estimates === priced.length
      ? `${estimates === 1 ? 'This price is an estimate' : `All ${estimates} prices here are estimates`} with no source yet.`
      : `${estimates} of ${priced.length} prices here are estimates with no source yet.`;
  return { estimates, of: priced.length, pending, text: [head, ...pending].filter(Boolean).join(' ') };
}
