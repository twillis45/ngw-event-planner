// ─── THE PRICE VINTAGE IS A PROPERTY OF THE ROWS, NOT A CONSTANT ────────────
//
// The shopping hero stamps "est. prices <month>". Until 2026-09-24 that month
// came from `PRICE_TABLE_META.asOf` in `sourcing.js` — a hardcoded '2026-01'.
//
// That constant is real and correctly formatted, and it labels the WRONG TABLE.
// It describes `CANONICAL_PROTEIN_PRICES`, ten protein rows used as an engine
// FALLBACK for proteins lacking their own `sourcingPrices`, on non-default
// sourcing tiers. The dollars on the hero come from the playbook purchase rows,
// which carry their own `costProvenance.lastVerified`. Measured that day across
// the 533 dated rows:
//
//   earliest 2026-08-14 · latest 2026-09-17 · older than the stamp: 0
//
// Not one priced row on the screen was as old as the date the screen displayed.
// It under-claimed by seven to eight months — the safe direction to be wrong in,
// and still wrong: a host reading "Jan 2026" in September has been handed a
// reason to distrust numbers that were re-verified last month.
//
// ── WHY OLDEST, NOT NEWEST ──────────────────────────────────────────────────
//
// The label reads as a claim about every number beside it. With 529 rows dated
// August and 4 dated September, "Sep 2026" overclaims freshness for 529 of them.
// "Aug 2026" is true of all of them — none is older. The oldest date is the only
// one the whole list can stand behind, so that is the one shown.
//
// ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────
//
// It does not fall back to a constant when no row carries a date. A stamp is a
// freshness claim; with nothing to base one on, the honest output is no stamp,
// not an old stamp. Measured over all 45 playbooks at 30 guests: 43 derive
// "Aug 2026" and TWO — Client Dinner and Fundraiser / Gala — have no dated row,
// so they lose a stamp that was previously showing them a false "Jan 2026".
//
// ── THE JUDGMENT CALL, NAMED SO IT CAN BE DISAGREED WITH ────────────────────
//
// Some plans mix dated and undated rows — PTA / Booster Fundraiser renders one
// dated row against nine undated; Thanksgiving Hosting 5 against 10. The label
// is still shown, and that is a decision rather than an oversight.
//
// An undated row is not a row of unknown age. It is a row whose price was never
// researched — the corpus marks researched prices with `costProvenance` and
// prices the rest by heuristic, and each row already declares which it is
// through its own `provenance.tier`. The stamp was always a claim about THE
// RESEARCHED RANGES (the original constant's own comment says so in as many
// words), so reporting the oldest researched date is the claim it is entitled
// to make. Extending the label to cover heuristic rows would be the invention.
//
// `undated` is returned anyway, so a caller or a guard can see how much of the
// list the label does not speak for — the fact the old constant made invisible.
//
// It also does not chase the fallback path: a protein repriced through
// `canonicalProteinPrice` on a non-default tier took its number from the Jan
// 2026 table while its row still carries an August date. That is a narrower
// version of the same defect and is NOT fixed here — fixing it means the
// pricing path recording which table it used, which is a change to the engine
// rather than to the label. Named so it is not mistaken for handled.

/** Format 'YYYY-MM' or 'YYYY-MM-DD' as "Mon YYYY".
 *  Local Date(y, m-1, 15) on purpose: `new Date('2026-01')` parses as UTC and
 *  rolls back a month in western timezones, which is the bug the original
 *  constant's own comment warned about. One formatter, so both cannot drift. */
export function formatVintage(iso) {
  try {
    const [y, m] = String(iso || '').split('-');
    if (!y || !m) return '';
    const d = new Date(Number(y), Number(m) - 1, 15);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return ''; }
}

/**
 * Derive the price vintage from the rows a plan actually rendered.
 *
 * @param {Array} rows  food-plan list items (each may carry `costProvenance`)
 * @returns {{ asOf: string, label: string, dated: number, undated: number } | null}
 *          null when no rendered row carries a date — render no stamp.
 */
export function priceVintage(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let oldest = null; let dated = 0; let undated = 0;
  for (const r of list) {
    // A skipped row is not on the host's list, so its date is not a claim about
    // what they are reading. Counted in neither bucket.
    if (!r || r.skipped) continue;
    const d = r.costProvenance && r.costProvenance.lastVerified;
    if (typeof d === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(d)) {
      dated += 1;
      if (oldest === null || d < oldest) oldest = d;
    } else {
      undated += 1;
    }
  }
  if (oldest === null) return null;
  return { asOf: oldest, label: formatVintage(oldest), dated, undated };
}
