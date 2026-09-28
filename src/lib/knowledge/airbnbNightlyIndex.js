// ─── WHAT A WHOLE PLACE IS ASKING, FOR A GROUP THIS SIZE ──────────────────
//
// The third and weakest of the free sources, and the only one whose number
// is closer to the question a host actually has than GSA's is: not "what
// does a hotel room cost" but "what does a place that sleeps my ten people
// cost a night". lodgingIntel refuses to divide a party into rooms by
// arithmetic; this sidesteps that by pricing the whole place at the size
// the host needs.
//
// ── THREE THINGS IT IS NOT, ALL OF WHICH THE BASIS SAYS ───────────────────
//
//   NOT PAID.        Asking price on listings, including ones that never
//                    rent. Nothing is weighted by occupancy.
//   NOT THE TOTAL.   Measured on the source, not assumed: cleaning_fee and
//                    service_fee are null in 100% of parsed quotes and tax
//                    in all but 0.16%. On a short stay the cleaning fee
//                    alone is routinely 15–30% of what is actually charged,
//                    so this UNDERSTATES, and it always understates in the
//                    same direction.
//   NOT NOW.         Quarterly snapshots; the US files are dated June 2026.
//                    Each city carries its own date and the basis prints it.
//
// ── ATTRIBUTION IS CARRIED, NOT ASSUMED ───────────────────────────────────
//
// CC BY 4.0, unlike the public-domain GSA and DOT tables. Every basis
// string this module produces ends with the attribution, so a surface
// cannot render the number and drop the credit — a test enforces it.
//
// ── IT REFUSES ────────────────────────────────────────────────────────────
//
// 34 cities, and that is all. No national fallback and no nearest-city
// substitution: a host in Annapolis is not shown Washington's listings,
// for the same reason airfareBandIndex will not hand them Baltimore's
// fares. A size bucket with fewer than 20 listings is absent rather than
// noisy.
//
// PURE: no I/O, no UI, no storage.
import { AIRBNB_NIGHTLY, MIN_LISTINGS, INSIDE_AIRBNB_ATTRIBUTION } from './airbnbNightlyRates';

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

const two = (x) => {
  const t = String(x == null ? '' : x).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(t) ? t : null;
};

const BY_CITY = (() => {
  const m = new Map();
  for (const row of AIRBNB_NIGHTLY) m.set(`${norm(row[0])}|${row[1]}`, row);
  return m;
})();

/** Which published bucket covers a party of this size. */
export function bucketForSleeps(sleeps) {
  const n = Number(sleeps);
  if (!Number.isFinite(n) || n < 1) return null;
  if (n <= 2) return '2';
  if (n <= 4) return '4';
  if (n <= 6) return '6';
  if (n <= 8) return '8';
  return '9+';
}

/**
 * Nightly asking band for an entire place that sleeps this many.
 *
 * @param {string} city
 * @param {string} state   two-letter
 * @param {number} sleeps  how many the place must sleep
 * @returns {{low:number, high:number, median:number, listings:number,
 *            bucket:string, snapshot:string, basis:string}|null}
 */
export function airbnbNightlyFor(city, state, sleeps) {
  const st = two(state);
  if (!st) return null;
  const row = BY_CITY.get(`${norm(city)}|${st}`);
  if (!row) return null;

  const bucket = bucketForSleeps(sleeps);
  if (!bucket) return null;

  const band = row[3][bucket];
  // A bucket can be absent because the city genuinely has too few places
  // that size. That is a real answer — "not enough of these here to say" —
  // and it must not fall back to a smaller bucket, which would price a
  // group of ten off four-person listings.
  if (!band) return null;

  const [listings, p25, median, p75] = band;
  if (listings < MIN_LISTINGS) return null;

  const sizeWords = bucket === '9+' ? 'sleeping nine or more' : `sleeping up to ${bucket}`;
  return {
    low: p25,
    high: p75,
    median,
    listings,
    bucket,
    snapshot: row[2],
    // ── THE SAME FACTS, SHORT ENOUGH FOR A PHONE (host, 2026-09-27) ────
    // `basis` below carries nine: source, snapshot, listing count, city,
    // size bucket, the range, asking-not-paid, before-fees, and the licence.
    // On the lodging cockpit that rendered as FIVE lines of grey under a
    // headline that already said the range and the city — on a stage whose
    // whole premise is one thing at a time. Host, seeing it on a phone:
    // "too dense."
    //
    // This keeps the three the host cannot infer and the one the LICENCE
    // requires: these are asking prices, they exclude fees, here is when,
    // and Inside Airbnb under CC BY 4.0. Dropped from view — not from the
    // record — are the listing count, the city and the size bucket, all of
    // which the line above or the event itself already states.
    //
    // BOTH STRINGS LIVE HERE, in the module that owns the data, for the
    // reason the ice board named hours earlier: a second copy written in the
    // shell is how a tested sentence and a rendered one drift apart.
    basisShort: `Asking prices, before fees · ${INSIDE_AIRBNB_ATTRIBUTION} · ${String(row[2]).slice(0, 7)}`,
    basis: `Inside Airbnb, ${row[2]} snapshot: across ${listings} entire places in `
      + `${row[0]}, ${st} ${sizeWords}, the middle half were listed at $${p25}–$${p75} a night. `
      + 'Asking prices, not what anyone paid, and BEFORE cleaning and service fees — '
      + `which the source leaves out of this figure almost always. ${INSIDE_AIRBNB_ATTRIBUTION}.`,
  };
}

/**
 * The one host-facing sentence. It names the fee exclusion, because that is
 * the part that would otherwise make the number quietly wrong in the
 * host's favour.
 */
export function airbnbNightlyNote(city, state, sleeps) {
  const b = airbnbNightlyFor(city, state, sleeps);
  if (!b) return null;
  return `Places sleeping ${b.bucket} were listed at $${b.low}–$${b.high} a night, before cleaning fees.`;
}

/** Every city covered, for a surface that needs to say where this works. */
export function airbnbCoveredCities() {
  return AIRBNB_NIGHTLY.map((r) => `${r[0]}, ${r[1]}`);
}
