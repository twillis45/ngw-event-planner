// ─── WHAT A ROOM IS CAPPED AT, WHICH IS NOT WHAT A ROOM COSTS ───────────────
//
// THE GAP THIS OPENS ON. lodgingFloor.js can report what a stay costs only
// once the host has a shortlist with prices on it — "no listing, no number,
// null, not a guess". Before that there is nothing at all, and the per-head
// band that is supposed to cover airfare AND lodging AND the event is
// $200–600 while the cheapest real Santa Fe listing the app itself handed
// one host was $218 a head for lodging alone.
//
// This module does not close that gap. It gives the first honest number
// available without a host doing any work, and it is careful about what the
// number means.
//
// ── IT IS A CAP. SAY CAP. ──────────────────────────────────────────────────
//
// GSA publishes a reimbursement MAXIMUM, in their words "a maximum amount;
// the traveler only receives actual lodging costs up to that maximum rate."
// It is not an average of market prices. GSA lets an agency authorise up to
// 300% when rooms cannot be had at the rate — their own rule concedes the
// cap often sits under obtainable price. Lodging taxes are excluded.
//
// Everything here is therefore named `cap`. There is no function in this
// file that returns an estimate, and `capPerNight` must never be rendered
// with the word "price", "estimate", or "average" beside it. The basis
// string this returns carries that wording so a surface cannot lose it.
//
// ── IT REFUSES, THE SAME WAY geoCostIndex REFUSES ──────────────────────────
//
// geoCostIndex's thesis is that "a factor of 1.0 because we know the region
// matches the average is a different statement from 1.0 because we know
// nothing", so it flags `national: true` rather than returning a silent 1.0.
// The same shape applies twice here:
//
//   `standard: true`  — the locality is CONUS but not separately listed, so
//                       $110 is GSA's fallback rather than a figure anybody
//                       set for this town. A caller may show it; it may not
//                       present it as local.
//   `null`            — outside CONUS, or no state at all. Alaska, Hawaii
//                       and the territories are set by DoD and foreign
//                       rates by State, which are different files with
//                       different publishers. No number beats a wrong one.
//
// PURE: no I/O, no UI, no storage.
import { GSA_LODGING, STANDARD_CONUS_LODGING, GSA_FISCAL_YEAR } from './gsaLodgingRates';

// Declared, not inferred from the table. North Dakota has no separately
// listed locality, so deriving this set from the rows present would send a
// Fargo event to `null` when GSA's own answer for it is the standard rate.
const CONUS = new Set([
  'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'IA', 'ID',
  'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS',
  'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR',
  'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV',
  'WY',
]);

/** Two-letter state, or null. Never invents one. */
const two = (x) => {
  const t = String(x == null ? '' : x).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(t) ? t : null;
};

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

const BY_STATE = (() => {
  const m = new Map();
  for (const row of GSA_LODGING) {
    const st = row[0];
    if (!m.has(st)) m.set(st, new Map());
    m.get(st).set(norm(row[1]), row[2]);
  }
  return m;
})();

/** MMDD for a YYYY-MM-DD string, or null. */
const mmdd = (date) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  if (!m) return null;
  const mo = Number(m[2]); const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return mo * 100 + d;
};

/**
 * Which seasonal band contains this MMDD. Bands are inclusive and one of
 * them may wrap the new year (1001–0228), which is why this is not a plain
 * `>= begin && <= end`.
 */
const seasonFor = (bands, when) => {
  for (const b of bands) {
    const [begin, end, rate] = b;
    const inside = begin <= end ? (when >= begin && when <= end)
      : (when >= begin || when <= end);
    if (inside) return { begin, end, rate };
  }
  return null;
};

const fmtMMDD = (v) => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${MONTHS[Math.floor(v / 100) - 1]} ${v % 100}`;
};

/**
 * The federal nightly lodging CAP for a locality on a date.
 *
 * @param {string} city   the town as the host typed it
 * @param {string} state  two-letter; anything else is treated as absent
 * @param {string} date   YYYY-MM-DD — required for the 157 seasonal
 *                        localities, whose rate can swing 61% across the year
 * @returns {{capPerNight:number, standard:boolean, listed:boolean,
 *            season:?string, basis:string}|null}
 *          null outside CONUS or with no usable state — never a fallback
 *          number for a place GSA does not cover.
 */
export function lodgingCapFor(city, state, date) {
  const st = two(state);
  if (!st || !CONUS.has(st)) return null;

  const table = BY_STATE.get(st);
  const hit = table ? table.get(norm(city)) : undefined;

  if (hit === undefined) {
    return {
      capPerNight: STANDARD_CONUS_LODGING,
      standard: true,
      listed: false,
      season: null,
      basis: `GSA FY${GSA_FISCAL_YEAR} standard CONUS lodging cap, $${STANDARD_CONUS_LODGING} a night — `
        + `${String(city || '').trim() || 'this town'} is not separately listed, so this is the `
        + 'federal fallback for anywhere unlisted rather than a rate set for here. '
        + 'It is a reimbursement maximum, not a market price, and excludes lodging tax.',
    };
  }

  if (typeof hit === 'number') {
    return {
      capPerNight: hit,
      standard: false,
      listed: true,
      season: null,
      basis: `GSA FY${GSA_FISCAL_YEAR} lodging cap for ${String(city).trim()}, ${st}: $${hit} a night, `
        + 'the same all year. It is a reimbursement maximum, not a market price, '
        + 'and excludes lodging tax.',
    };
  }

  // Seasonal. A date is REQUIRED rather than defaulted: picking a band for a
  // host who has not set a date would put Gulf Shores' February rate on a
  // July party, off by 61%, with a federal citation attached to it.
  const when = mmdd(date);
  if (when == null) return null;
  const band = seasonFor(hit, when);
  if (!band) return null;

  return {
    capPerNight: band.rate,
    standard: false,
    listed: true,
    season: `${fmtMMDD(band.begin)}–${fmtMMDD(band.end)}`,
    basis: `GSA FY${GSA_FISCAL_YEAR} lodging cap for ${String(city).trim()}, ${st}: $${band.rate} a night `
      + `for ${fmtMMDD(band.begin)}–${fmtMMDD(band.end)}. It is a reimbursement maximum, `
      + 'not a market price, and excludes lodging tax.',
  };
}

/**
 * The one host-facing sentence. Deliberately the only place the cap becomes
 * words, so "cap" cannot drift to "price" in one surface and not another.
 * Returns null whenever lodgingCapFor does.
 */
export function lodgingCapNote(city, state, date) {
  const c = lodgingCapFor(city, state, date);
  if (!c) return null;
  if (c.standard) {
    return `Federal travel caps this at $${c.capPerNight} a night for towns like this one — `
      + 'a ceiling, not what rooms go for.';
  }
  return `Federal travel caps ${String(city).trim()} at $${c.capPerNight} a night`
    + (c.season ? ` in ${c.season}` : '')
    + ' — a ceiling, not what rooms go for.';
}
