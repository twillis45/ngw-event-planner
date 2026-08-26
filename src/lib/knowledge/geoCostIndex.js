// ─── GEOGRAPHY: WHERE A PRICE ACTUALLY APPLIES ───────────────────────────────
//
// THE DEFECT THIS EXISTS TO NAME. As of 2026-08-16 the corpus carries 226 cost
// citations and every single one is a NATIONAL band or a single-retailer shelf
// price. Nothing anywhere adjusts for where the host is, and nothing tells them
// the number is national. Grepped before writing this: no `costOfLiving`, no
// `regionalMultiplier`, no `costIndex`, no `metroMultiplier`, and the research
// doctrine does not mention geography.
//
// The registered sources document the size of the error themselves — beer runs
// $16.43 a case in Illinois against $33.62 in Alaska (105%), wine averages
// $10.97 in Massachusetts against $15.51 in Mississippi (41%). So the corpus can
// be simultaneously well-cited and materially wrong for a given host, which is
// the exact failure the whole grounding program exists to prevent.
//
// ── WHY THERE IS NO BLANKET MULTIPLIER HERE ─────────────────────────────────
//
// The obvious build is one factor per region applied to every cost. It is wrong,
// and BLS says so. Pulled from the public API (no auth, series below), July 2026,
// price per pound:
//
//                    bananas          white potatoes
//   US average        $0.650           $0.940
//   Northeast         $0.692  1.065x   $0.984  1.047x
//   Midwest           $0.616  0.948x   $0.774  0.823x
//   South             $0.617  0.949x   $1.000  1.064x
//   West              $0.701  1.078x   $0.916  0.975x
//
// The South is 5% CHEAPER on bananas and 6% DEARER on potatoes. The West flips
// the same way. A single "South = 0.95x" would be wrong in both directions
// depending on the item, and confidently so.
//
// So this module does two honest things and refuses a third:
//   1. maps a state to its Census region (a fact, not an estimate)
//   2. serves a PER-ITEM regional factor where BLS actually publishes one
//   3. REFUSES to invent a factor for anything else, and says the band is
//      national so a host can be told
//
// Inventing the third is how a wrong number gets a trustworthy face on it.
import { REGIONAL_FACTORS, ITEM_SERIES } from './geoCostFactors';

// ── Census regions ──────────────────────────────────────────────────────────
// US Census Bureau definitions, which are also what the BLS APU regional series
// are keyed on (APU0100 Northeast, APU0200 Midwest, APU0300 South, APU0400 West).
// DC is grouped with the South by the Census, which is where the DMV playbooks
// sit, so it matters that this is the real definition rather than a guess.
export const CENSUS_REGIONS = Object.freeze({
  northeast: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
  midwest: ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  south: ['DE', 'DC', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV',
    'AL', 'KY', 'MS', 'TN', 'AR', 'LA', 'OK', 'TX'],
  west: ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'],
});

const STATE_TO_REGION = (() => {
  const m = {};
  for (const [region, states] of Object.entries(CENSUS_REGIONS)) {
    for (const s of states) m[s] = region;
  }
  return Object.freeze(m);
})();

/** 'NM' -> 'west'. Unknown or absent state -> null, never a default region. */
export function regionForState(state) {
  if (!state || typeof state !== 'string') return null;
  return STATE_TO_REGION[state.trim().toUpperCase()] || null;
}

/**
 * geoAdjust(itemKey, state) -> { factor, region, basis, national }
 *
 * `national: true` means NO regional data exists for this item and the band is
 * the national one. That is the honest majority case today and the caller MUST
 * be able to distinguish it — a factor of 1.0 because we know the region matches
 * the average is a different statement from 1.0 because we know nothing.
 */
export function geoAdjust(itemKey, state) {
  const region = regionForState(state);
  const row = REGIONAL_FACTORS[itemKey];
  if (!region || !row || typeof row.factors[region] !== 'number') {
    return {
      factor: 1,
      region,
      national: true,
      basis: region
        ? `No BLS regional series for "${itemKey}" — this is the national band, not a ${region} price.`
        : 'No venue state on this event — this is the national band.',
    };
  }
  return {
    factor: row.factors[region],
    region,
    national: false,
    basis: `BLS ${row.label} for the ${region} census region, ${row.period}: `
      + `${row.regionValues[region]} against a US average of ${row.usValue} `
      + `(series ${ITEM_SERIES[itemKey] ? ITEM_SERIES[itemKey][region] : '?'}).`,
  };
}

/**
 * applyGeo([min, max], itemKey, state) -> { range, ...geoAdjust }
 * Leaves the range untouched when the adjustment is national, so a caller can
 * never accidentally present an unadjusted band as an adjusted one.
 */
export function applyGeo(range, itemKey, state) {
  const g = geoAdjust(itemKey, state);
  if (!Array.isArray(range) || range.length !== 2) return { range, ...g };
  if (g.national) return { range, ...g };
  const round = (n) => Math.round(n * 100) / 100;
  return { range: [round(range[0] * g.factor), round(range[1] * g.factor)], ...g };
}

/**
 * The line a host should see under a price. Never silent: when there is no
 * regional data it SAYS the figure is national rather than implying it is local.
 */
export function geoHonestyLine(itemKey, state) {
  const g = geoAdjust(itemKey, state);
  if (g.national) {
    return g.region
      ? 'National average — we do not have a regional price for this item yet.'
      : 'National average — add your venue state and we can localize what we can.';
  }
  const pct = Math.round((g.factor - 1) * 100);
  if (pct === 0) return `Adjusted for the ${g.region}: within a point of the national average.`;
  return `Adjusted for the ${g.region}: ${Math.abs(pct)}% ${pct > 0 ? 'above' : 'below'} the national average.`;
}

/**
 * geoPlanNote(state) -> the ONE line a spend surface should carry.
 *
 * Deliberately sheet-level, not per row. Every priced row in this corpus is a
 * national band today, so a per-row caveat would print the same sentence 429
 * times and be read as noise within a screen — the opposite of informing anyone.
 * One honest line under the money says the same thing once.
 *
 * It names the REGION rather than the state because that is the resolution the
 * BLS series actually have; saying "not adjusted for New Mexico" would imply a
 * granularity that does not exist even once the table grows.
 */
export function geoPlanNote(state) {
  const region = regionForState(state);
  const REGION_LABEL = {
    northeast: 'the Northeast', midwest: 'the Midwest',
    south: 'the South', west: 'the West',
  };
  if (!region) {
    return 'These are national average prices — add your venue state and we can start localizing them.';
  }
  return `These are national average prices — not yet adjusted for ${REGION_LABEL[region]}.`;
}
