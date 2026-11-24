// ─── ONE READER FOR A ROW'S STATUS (owner-approved, 11/24/2026) ─────────────
//
// "Settled = green, one rule." Every status value on a sheet row (the
// right-hand summary: "all set", "noted · 2 flagged", "Grocery · one-stop",
// "covered", a bringer's name) says one of three things, and its color comes
// from that answer alone:
//   settled  the existing --ok green
//   open     neutral
//   overdue  the existing --warn amber
//
// Rows used to pick their color inline, one condition each, which is how
// "How it's sourced" stayed neutral after the host had chosen a tier. The
// shell's RowValue renders `data-status` from this, and styles.css colors by
// it; no row carries a color of its own.

export const ROW_STATUSES = Object.freeze(['settled', 'open', 'overdue']);

/** settled | open | overdue. Overdue wins: a late thing is never "settled". */
export function rowStatus({ settled = false, overdue = false } = {}) {
  if (overdue) return 'overdue';
  return settled ? 'settled' : 'open';
}

/**
 * The host chose how the food is sourced. A plan's default tier is the
 * engine's guess, not her answer, so it reads open until she picks one.
 */
export function sourcingSettled(event) {
  return !!(event && String(event.sourcing || '').trim());
}
