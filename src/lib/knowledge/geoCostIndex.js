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

// ── ZIP prefix -> state, so a typed ZIP can name a region ───────────────────
//
// Host directive 2026-09-24: "if we default to bls the copy should identify
// region if we have zipcode input." The store picker already takes a ZIP and
// `venueFor(event).zip` already seeds it, but the plan note read only the
// STATE — so a host looking at their own ZIP on screen was still told to "add
// your venue state".
//
// THIS IS A FACT TABLE, NOT AN ESTIMATE, which is the only reason it belongs in
// this module. USPS allocates ZIP prefixes to states in contiguous blocks; the
// mapping is published, not inferred, exactly like the Census table above. The
// output is then run through STATE_TO_REGION so there is ONE definition of a
// region in this file and a ZIP cannot disagree with a state.
//
// THE REFUSALS ARE THE POINT. Puerto Rico, the Virgin Islands, Guam and the
// military APO/FPO ranges are in NO Census region, and BLS publishes no
// regional series for them. They return null and the caller falls back to the
// national sentence — rather than being rounded into "the South" because their
// digits sort that way.
const ZIP3_TO_STATE = Object.freeze([
  [5, 5, 'NY'], [6, 9, null] /* PR, VI */, [10, 27, 'MA'], [28, 29, 'RI'],
  [30, 38, 'NH'], [39, 49, 'ME'], [50, 59, 'VT'], [60, 69, 'CT'],
  [70, 89, 'NJ'], [90, 98, null] /* military AE */, [100, 149, 'NY'],
  [150, 196, 'PA'], [197, 199, 'DE'], [200, 205, 'DC'], [206, 219, 'MD'],
  [220, 246, 'VA'], [247, 268, 'WV'], [270, 289, 'NC'], [290, 299, 'SC'],
  [300, 319, 'GA'], [320, 339, 'FL'], [340, 340, null] /* military AA */,
  [341, 349, 'FL'], [350, 369, 'AL'], [370, 385, 'TN'], [386, 397, 'MS'],
  [398, 399, 'GA'], [400, 427, 'KY'], [430, 459, 'OH'], [460, 479, 'IN'],
  [480, 499, 'MI'], [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'],
  [570, 577, 'SD'], [580, 588, 'ND'], [590, 599, 'MT'], [600, 629, 'IL'],
  [630, 658, 'MO'], [660, 679, 'KS'], [680, 693, 'NE'], [700, 714, 'LA'],
  [716, 729, 'AR'], [730, 749, 'OK'], [750, 799, 'TX'], [800, 816, 'CO'],
  [820, 831, 'WY'], [832, 838, 'ID'], [840, 847, 'UT'], [850, 865, 'AZ'],
  [870, 884, 'NM'], [889, 898, 'NV'], [900, 961, 'CA'],
  [962, 966, null] /* military AP */, [967, 968, 'HI'], [969, 969, null] /* GU, MP */,
  [970, 979, 'OR'], [980, 994, 'WA'], [995, 999, 'AK'],
]);

/** '21401' -> 'MD'. Unallocated, territory and military ZIPs -> null. */
export function stateForZip(zip) {
  const digits = String(zip == null ? '' : zip).trim();
  // A ZIP is five digits; ZIP+4 is allowed and the +4 is irrelevant here.
  if (!/^\d{5}(-\d{4})?$/.test(digits)) return null;
  const p = Number(digits.slice(0, 3));
  for (const [lo, hi, st] of ZIP3_TO_STATE) {
    if (p >= lo && p <= hi) return st;
  }
  return null;   // a prefix USPS has not allocated
}

/** '21401' -> 'south'. Anything this cannot prove -> null, never a default. */
export function regionForZip(zip) {
  return regionForState(stateForZip(zip));
}

/**
 * regionForAddress('143 Ritchie Hwy, Severna Park, MD, 21146') -> 'south'
 *
 * The Kroger locations endpoint flattens a structured address —
 * `addressLine1, city, state, zipCode` — into one string before it reaches the
 * client (kroger.py), so the state and ZIP it HAS are not separately readable
 * here. The ZIP is the unambiguous part: five digits, terminal, server-built.
 *
 * Deliberately a SEPARATE function rather than making regionForZip lenient. A
 * resolver that accepts "any string with five digits in it" would happily read
 * a phone number or a price, and this module's whole contract is that it names
 * only what it can prove.
 */
export function regionForAddress(address) {
  const m = /(\d{5})(?:-\d{4})?\s*$/.exec(String(address == null ? '' : address).trim());
  return m ? regionForZip(m[1]) : null;
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
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function geoPlanNote(state, appliedBasis, zip) {
  // The state is the stronger fact and wins when present; a typed ZIP is the
  // fallback, and only names a region it can actually resolve.
  const region = regionForState(state) || regionForZip(zip);
  const REGION_LABEL = {
    northeast: 'the Northeast', midwest: 'the Midwest',
    south: 'the South', west: 'the West',
  };
  // ── WHAT THE ENGINE ACTUALLY DID, NOT WHAT THE STATE IMPLIES ─────────────
  // `appliedBasis` is the caller's record of a regional factor that MOVED a
  // price — the backend's "the South · May 2026 · BLS Average Price". It exists
  // only when the factor was not 1, so its presence is the fact.
  //
  // Without it this function answered from the STATE alone, and a shell that had
  // adjusted its prices then printed "not yet adjusted for the South" underneath
  // them. Two surfaces in hostv2 said opposite things about the same numbers:
  // the money panel read the applied context and said "Prices adjusted for the
  // South region", the shopping sheet read only the state and denied it.
  //
  // Understating is still lying. A host who is told the figure is a national
  // baseline discounts it exactly as much as if it were.
  if (appliedBasis) {
    const parts = String(appliedBasis).split('·').map((x) => x.trim()).filter(Boolean);
    // The state-derived label is authoritative and well-formed ("the South");
    // the backend's own label is the fallback when no state resolved.
    const where = region ? REGION_LABEL[region] : (parts[0] ? `the ${parts[0]}` : 'your area');
    // ── CONDENSED 2026-09-24 (host: "too long") ──────────────────────────────
    // It rendered as: "Prices adjusted for the South — 2026-08 · BLS Average
    // Price." and the shell then appended "· est. prices Aug 2026" — so the
    // line STATED THE SAME MONTH TWICE, in two formats, and wrapped to two
    // lines on a 390px phone. Two lines of provenance under two lines of
    // numbers is the caveat shouting over the thing it qualifies again.
    //
    // Compacted, not trimmed of meaning: the region, the source and the month
    // all survive. "2026-08" becomes "Aug 2026" because that is how the rest of
    // this product writes a vintage, and the duplicate suffix is suppressed by
    // the caller (HostShellV2) whenever this branch runs.
    // Source then month reads as a citation ("BLS Aug 2026"); the other order
    // reads as two loose facts. So they are partitioned rather than joined in
    // whatever sequence the backend happened to send.
    const tail = parts.slice(1);
    const isMonth = (x) => /^\d{4}-\d{2}$/.test(x) || /^[A-Z][a-z]{2} \d{4}$/.test(x);
    const month = tail.filter(isMonth).map((x) => {
      const m = /^(\d{4})-(\d{2})$/.exec(x);
      return m ? `${MONTH_ABBR[Number(m[2]) - 1] || m[2]} ${m[1]}` : x;
    })[0] || '';
    // "BLS Average Price" is the series name; "Average Price" restates what a
    // regional factor already is, and the attribution that matters is BLS.
    const source = tail.filter((x) => !isMonth(x))
      .map((x) => x.replace(/^BLS Average Price$/i, 'BLS')).join(' · ');
    const rest = [source, month].filter(Boolean).join(' ');
    return rest
      ? `Adjusted for ${where} · ${rest}`
      : `Adjusted for ${where}`;
  }
  // ── CONDENSED 2026-09-24, SECOND PASS (host: "the pricing-basis note") ────
  // The branch above was compacted earlier the same day and these two were
  // left behind, so the line a host actually sees got LONGER the less we knew:
  //
  //   adjusted   "Adjusted for the South · BLS Aug 2026"                 37 ch
  //   national   "These are national average prices — add your venue
  //               state and we can start localizing them."
  //               + the caller's "· est. prices Aug 2026"               112 ch
  //
  // Three wrapped lines of grey caption under two lines of numbers — the
  // caveat shouting over the thing it qualifies, which is the exact defect the
  // adjusted branch was fixed for. Same remedy, same shape: lead with the
  // basis, then one segment after a middot.
  //
  // NO FACT IS DROPPED. "National average" is the basis; the region still
  // names itself when we know it; the nudge still names the one input that
  // would improve the number. What went is the throat-clearing ("These are"),
  // the restatement ("prices", already implied by a row of dollar figures) and
  // "localizing them", which is our word, not a host's.
  if (!region) {
    return 'National average · add your state for local prices';
  }
  return `National average · not yet adjusted for ${REGION_LABEL[region]}`;
}
