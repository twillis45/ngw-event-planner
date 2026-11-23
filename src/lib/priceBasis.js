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
  '*:diet-veg': 'The vegetarian main\'s $6-12 a serving is the engine\'s own figure (playbooks/index.js); no fetched price backs it yet.',
  'Baby Shower:fa-catering': 'This type\'s caterer band ($12-30 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Birthday:fa-catering': 'This type\'s caterer band ($10-25 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Client Dinner:p_wine': 'A $25-90 bottle for a restaurant table; the registered wine sources price everyday retail bottles ($8-15, state averages $10.97-15.51), not this tier.',
  'Ethiopian Coffee Ceremony:p_fandisha': 'No fetched retail price backs its $0.50-2 per serving band yet.',
  'Ethiopian Coffee Ceremony:p_grass': 'No fetched retail price backs its $0-12 per bundle band yet.',
  'Friendsgiving:fa-catering': 'A caterer-or-prepared-dinner band ($18-40 a guest): the cited prepared-dinner chains run $10-25 (Thanksgiving), below most of it, so no source backs the whole band.',
  'Friendsgiving:p_apps': 'No fetched retail price backs its $0.50-1.50 per bites band yet.',
  'Friendsgiving:p_containers': 'No fetched retail price backs its $0.30-0.80 per containers band yet.',
  'Friendsgiving:p_corn': 'pantry-canned-2026 prices canned corn at $0.93-1.28/lb; this band\'s $3/lb ceiling is above every cited corn price.',
  'Friendsgiving:p_cranberry': 'No fetched retail price backs its $0.75-2 per cups band yet.',
  'Friendsgiving:p_drinks': 'sparkling-cider-2026 prices a bottle of sparkling cider at $4.29-8.49; this band\'s $12 ceiling for "one alcohol-free option" has no source.',
  'Friendsgiving:p_gravy': 'No fetched retail price backs its $5-12 per batch band yet.',
  'Friendsgiving:p_green_beans': 'No fetched retail price backs its $1-3 per lb band yet.',
  'Friendsgiving:p_ice': 'The registered ice sources (ice-retail-2026, ice-warehouse-2026) top out at $0.45/lb for small bags; this band\'s $0.50 ceiling is above every cited bag.',
  'Friendsgiving:p_labels': 'A bundle of several products priced as one kit ($3-8); no fetched source prices the bundle.',
  'Friendsgiving:p_mac': 'No fetched retail price backs its $3-7 per lb dry pasta band yet.',
  'Friendsgiving:p_main_alt': 'The registered ham ($2.25/lb, ham-usda-2026) and whole-chicken ($2.01/lb, chicken-bls-2026) prices sit below this $3-8/lb band, and no source prices the vegetarian main it also names.',
  'Friendsgiving:p_potatoes': 'No fetched retail price backs its $0.60-1.50 per lb band yet.',
  'Friendsgiving:p_roast_veg': 'No fetched retail price backs its $1-3 per lb band yet.',
  'Friendsgiving:p_rolls': 'AFBF 2025 prices a dozen rolls at $3.56 (about $0.30 a roll), the floor only; the butter in this line is not priced by it.',
  'Friendsgiving:p_serveware': 'A bundle of several products priced as one set ($0.40-1.20); no fetched source prices the bundle.',
  'Friendsgiving:p_stuffing': 'No fetched retail price backs its $0.25-0.75 per cups cooked band yet.',
  'Friendsgiving:p_thermometer': 'ledcandles-thermometer-2026 prices instant-read thermometers at $13-14 (budget) and $35-40 (mid); this $10-25 band matches neither tier.',
  'Fundraiser / Gala:p_checkout_kit': 'A bundle of several products priced as one kit ($150-800); no fetched source prices the bundle.',
  'Fundraiser / Gala:p_cleanup': 'A bundle of several products priced as one kit ($20-60); no fetched source prices the bundle.',
  'Fundraiser / Gala:p_firstaid': 'A bundle of several products priced as one kit ($25-60); no fetched source prices the bundle.',
  'Fundraiser / Gala:p_placecards': 'No fetched retail price backs its $0.50-2 per card band yet.',
  'Fundraiser / Gala:p_pledgecards': 'No fetched retail price backs its $0.25-1 per card band yet.',
  'Fundraiser / Gala:p_programs': 'print-booklets-2026 prices printed programs at $1.78-4.54 each; this band\'s $1.00 floor is below every cited run.',
  'Fundraiser / Gala:p_signage': 'A $500-3,000 package with no fetched package price; signage-print-2026 prices single signs and banners at $15-400, and multiplying them up would be our extrapolation, not a cited figure.',
  'Fundraiser / Gala:p_wine': 'The per-drink beer and wine sources reach about $3.00 a pour (beer-retail-2026, wine-retail-2026); this band\'s $6.00 ceiling is above them.',
  'Gender Reveal:fa-catering': 'This type\'s caterer band ($10-25 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Get-Together:fa-catering': 'This type\'s caterer band ($12-25 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Graduation:fa-catering': 'This type\'s caterer band ($10-25 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Halloween Party:p_decor': 'A bundle of several products priced as one kit ($40-150); no fetched source prices the bundle.',
  'Halloween Party:p_first_aid': 'A bundle of several products priced as one kit ($8-20); no fetched source prices the bundle.',
  'Halloween Party:p_led_candles': 'ledcandles-walmart-2026 prices LED tea lights at about $1.25 each; this band\'s $0.50 floor is below it.',
  'Halloween Party:p_path_lights': 'A bundle of several products priced as one kit ($15-50); no fetched source prices the bundle.',
  'Halloween Party:p_pumpkins': 'No fetched retail price backs its $4-12 per pumpkin per 4 guests band yet.',
  'Halloween Party:p_spread': 'No fetched retail price backs its $0.60-2 per bites band yet.',
  'Halloween Party:p_treats': 'No fetched retail price backs its $0.50-1.50 per pieces band yet.',
  'Halloween Party:p_treats_nonfood': 'No fetched retail price backs its $0.20-0.75 per pieces band yet.',
  'Housewarming:fa-catering': 'This type\'s caterer band ($8-18 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Kwanzaa Gathering:fa-catering': 'This type\'s caterer band ($12-25 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  "New Year's Eve Party:p_flutes": 'glassware-disposable-2026 prices plastic flutes at $0.28-1.00 each; this band\'s $1.50 ceiling (glass) is above it.',
  "New Year's Eve Party:p_wave_one": 'No fetched retail price backs its $0.70-2 per bites band yet.',
  "New Year's Eve Party:p_wave_two": 'No fetched retail price backs its $0.60-1.80 per bites band yet.',
  'PTA / Booster Fundraiser:p_allergy_labels': 'A bundle of several products priced as one kit ($10-25); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_cashboxes': 'A bundle of several products priced as one set ($40-120); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_cleanup': 'A bundle of several products priced as one kit ($15-40); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_concession_food': 'No fetched retail price backs its $0.75-2 per servings band yet.',
  'PTA / Booster Fundraiser:p_signage': 'A bundle of several products priced as one sign package ($75-300); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_volunteer_id': 'A bundle of several products priced as one set ($20-60); no fetched source prices the bundle.',
  'PTA / Booster Fundraiser:p_wristbands': 'No fetched retail price backs its $0.03-0.12 per wristband band yet.',
  'Quinceañera:p_appetizers': 'No fetched retail price backs its $0.75-2.50 per pieces band yet.',
  'Quinceañera:p_beverages': 'No fetched retail price backs its $0.75-3 per servings band yet.',
  'Quinceañera:p_cake': 'No fetched retail price backs its $250-700 per cake band yet.',
  'Quinceañera:p_cleanup': 'A bundle of several products priced as one kit ($20-50); no fetched source prices the bundle.',
  'Quinceañera:p_decor': 'A bundle of several products priced as one package ($300-1500); no fetched source prices the bundle.',
  'Quinceañera:p_doll_crown': 'A bundle of several products priced as one set ($80-300); no fetched source prices the bundle.',
  'Repast:fa-catering': 'This type\'s caterer band ($10-20 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Sunday Dinner:p_cornbread': 'No fetched retail price backs its $3-7 per batch band yet.',
  'Sunday Dinner:p_dessert': 'No fetched retail price backs its $8-16 per 9x13 cobbler or 2 pies band yet.',
  'Sunday Dinner:p_foil-oil': 'A bundle of several products priced as one set ($8-18); no fetched source prices the bundle.',
  'Sunday Dinner:p_mac': 'No fetched retail price backs its $8-16 per baked pan band yet.',
  'Sunday Dinner:p_peas-rice': 'pantry-canned-2026 prices dried beans at $1.29-1.99 a pound and two store-brand cans at about $2.00-2.30; this band\'s $4 ceiling is above them.',
  'Sunday Dinner:p_smoked-meat': 'No fetched retail price backs its $3-6 per lb total band yet.',
  'Sunday Dinner:p_sweet-tea': 'icedtea-lemonade-2026 prices ready-to-drink tea and lemonade at $0.21-0.28 a cup; this $0.50-1.50 a serving band sits above it, so the source does not back it.',
  'Sunday Dinner:p_yams': 'AFBF 2025 prices sweet potatoes at $1.33/lb, one point inside this $1-2 band; one point is not a band.',
  'Sweet 16:fa-catering': 'This type\'s caterer band ($10-25 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Sweet 16:p_cleanup': 'A bundle of several products priced as one kit ($15-40); no fetched source prices the bundle.',
  'Sweet 16:p_decor': 'A bundle of several products priced as one kit ($80-300); no fetched source prices the bundle.',
  'Sweet 16:p_ice': 'The registered ice sources (ice-retail-2026, ice-warehouse-2026) top out at $0.45/lb for small bags; this band\'s $0.50 ceiling is above every cited bag.',
  'Sweet 16:p_lighting': 'A bundle of several products priced as one set ($40-150); no fetched source prices the bundle.',
  'Sweet 16:p_sides': 'No fetched retail price backs its $1-3 per lb band yet.',
  'Sweet 16:p_water': 'No fetched retail price backs its $0.30-0.75 per servings band yet.',
  'Thanksgiving Hosting:p_appetizers': 'No fetched retail price backs its $0.50-1.50 per bites band yet.',
  'Thanksgiving Hosting:p_coffee': 'A bundle of several products priced as one service ($8-18); no fetched source prices the bundle.',
  'Thanksgiving Hosting:p_corn': 'pantry-canned-2026 prices canned corn at $0.93-1.28/lb; this band\'s $3/lb ceiling is above every cited corn price.',
  'Thanksgiving Hosting:p_cranberry': 'No fetched retail price backs its $0.75-2 per cups band yet.',
  'Thanksgiving Hosting:p_gravy': 'No fetched retail price backs its $5-12 per batch band yet.',
  'Thanksgiving Hosting:p_green_beans': 'No fetched retail price backs its $1-3 per lb band yet.',
  'Thanksgiving Hosting:p_leftover_containers': 'No fetched retail price backs its $0.30-0.80 per containers band yet.',
  'Thanksgiving Hosting:p_mac': 'No fetched retail price backs its $3-7 per lb dry pasta band yet.',
  'Thanksgiving Hosting:p_potatoes': 'No fetched retail price backs its $0.60-1.50 per lb band yet.',
  'Thanksgiving Hosting:p_roast_veg': 'No fetched retail price backs its $1-3 per lb band yet.',
  'Thanksgiving Hosting:p_roasting_kit': 'A bundle of several products priced as one kit ($10-40); no fetched source prices the bundle.',
  'Thanksgiving Hosting:p_rolls': 'AFBF 2025 prices a dozen rolls at $3.56 (about $0.30 a roll), the floor only; the butter in this line is not priced by it.',
  'Thanksgiving Hosting:p_stuffing': 'No fetched retail price backs its $0.25-0.75 per cups cooked band yet.',
  'Thanksgiving Hosting:p_thermometer': 'ledcandles-thermometer-2026 prices instant-read thermometers at $13-14 (budget) and $35-40 (mid); this $10-25 band matches neither tier.',
  'The Cookout:fa-catering': 'This type\'s caterer band ($12-25 a guest) starts below the $15 drop-off floor both registered catering guides publish, so they do not cite it.',
  'Watch Party:p_ballot': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_daytonadecor': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_draftboard': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_mintjulep': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_pimentocheese': 'Its own costProvenance says why: Augusta\'s $1.50 sandwich prices a concession stand, not the host\'s groceries, and no home-ingredient price is registered.',
  'Watch Party:p_teamcolors': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Watch Party:p_worldcupcolors': 'Watch Party prices change only through the KCR pipeline (watchParty.js header); no source is registered for this line yet.',
  'Wedding:fa-catering': 'The $70-250 a guest band runs past the registered guides\' full-service ceilings ($120 at Chefry, $150 at The Catering Finder).',
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
