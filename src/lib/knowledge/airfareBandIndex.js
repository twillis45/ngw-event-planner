// ─── WHAT PEOPLE PAID TO FLY THERE, WHICH IS NOT WHAT YOURS WILL COST ──────
//
// THE GAP. `airports.js` says plainly what it will not claim: "flight
// frequency, fares, or drive time. Those need data we do not have." And
// `confidence.js` lists "Airfare and ground transfers" among the things
// every destination estimate explicitly excludes. This is the first fare
// data in the app, and it is deliberately narrow enough not to contradict
// either of those without saying so.
//
// ── IT IS A BAND, AND IT IS OLD ───────────────────────────────────────────
//
// DOT publishes a ten-percent sample of tickets actually sold, averaged per
// market, and warns in the report itself that "it is unlikely that the
// average fares from this report will be the same as any particular fare
// offered." The freshest quarter is 2026 Q1, published 2026-09-03.
//
// Two consequences this module enforces rather than documents:
//
//   1. It returns `low`/`high`, never a single number. The p25–p75 spread
//      across the table runs to $210. A midpoint would be the least useful
//      digit in the dataset presented as the most confident one.
//   2. Every basis string names the quarter. A host must be able to tell
//      that a September answer is about January, because for a spring event
//      that is the difference between useful and misleading.
//
// ── IT REFUSES ────────────────────────────────────────────────────────────
//
// Same shape as geoCostIndex's `national: true` and lodgingRateIndex's
// `standard: true`: there is no fallback band. A city absent from the table
// — no commercial service, too few markets, outside the contiguous states —
// returns null. Annapolis has no airport; answering with Baltimore's fares
// would be guessing which airport a guest picks, and lodgingIntel already
// refuses that same guess about rooms.
//
// PURE: no I/O, no UI, no storage.
import { DOT_CITY_FARES, DOT_PERIOD, MIN_MARKETS } from './dotAirfareRates';

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

const two = (x) => {
  const t = String(x == null ? '' : x).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(t) ? t : null;
};

// DOT names a market by its city cluster — "Dallas/Fort Worth, TX",
// "Allentown/Bethlehem/Easton, PA". A host types one of those towns, not
// the cluster, so each component name is an alias for the whole entry.
// Keyed by "city|ST" so Charleston SC and Charleston WV stay distinct.
const BY_CITY = (() => {
  const m = new Map();
  for (const row of DOT_CITY_FARES) {
    // DOT suffixes seven of its biggest entries with "(Metropolitan Area)" —
    // Atlanta, Boston, Miami, Norfolk, Quad Cities, San Francisco and
    // Washington DC. The first cut of this read the state off the end of the
    // raw string and silently dropped all seven, which is to say it dropped
    // five of the largest destination markets in the country while every
    // other test still passed. Strip the parenthetical before parsing.
    const full = String(row[0]).replace(/\s*\([^)]*\)\s*$/, '');
    const comma = full.lastIndexOf(',');
    if (comma < 0) continue;
    const st = two(full.slice(comma + 1));
    if (!st) continue;
    for (const part of full.slice(0, comma).split('/')) {
      const key = `${norm(part)}|${st}`;
      // First writer wins: the table is sorted, and a duplicate would mean
      // two clusters claim one town, which is a data question and not
      // something to average away silently.
      if (!m.has(key)) m.set(key, row);
    }
  }
  return m;
})();

/**
 * The band of market-average fares for flying to a city, one way.
 *
 * @param {string} city   the town as the host typed it
 * @param {string} state  two-letter; anything else is treated as absent
 * @returns {{low:number, high:number, median:number, markets:number,
 *            period:string, basis:string}|null}
 *          null for any city the table does not cover — never a national
 *          fallback, because there is no honest one.
 */
export function airfareBandFor(city, state) {
  const st = two(state);
  if (!st) return null;
  const row = BY_CITY.get(`${norm(city)}|${st}`);
  if (!row) return null;

  const [name, markets, p25, median, p75] = row;
  const period = `${DOT_PERIOD.year} Q${DOT_PERIOD.quarter}`;
  return {
    low: p25,
    high: p75,
    median,
    markets,
    period,
    basis: `US DOT Consumer Airfare Report, ${period}: across the ${markets} markets `
      + `${name} takes part in, the middle half of average one-way fares ran $${p25}–$${p75}. `
      + 'It is a ten-percent sample of tickets already sold, blended across every fare class, '
      + `and ${period} is the freshest quarter published — DOT says a particular fare offered `
      + 'is unlikely to match it.',
  };
}

/**
 * The one host-facing sentence, and the only place the band becomes words.
 * It leads with the age, because for a spring event a January figure is the
 * difference between useful and misleading.
 */
export function airfareBandNote(city, state) {
  const b = airfareBandFor(city, state);
  if (!b) return null;
  return `Flights here ran $${b.low}–$${b.high} one way in ${b.period} — what people paid then, not a quote.`;
}
