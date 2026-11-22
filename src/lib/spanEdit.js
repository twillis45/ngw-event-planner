// ─── WHAT SHRINKING THE DATES WOULD STRAND ──────────────────────────────────
//
// This module held Space's add-a-day / drop-a-day controls (addDay, dropDay,
// dayCount, lastDay). #222 moved the span into Date & time as one From – To
// range written through lib/eventDates, so those helpers had no caller left
// and were removed (11/22/2026).
//
// ── THE RULE THAT STILL MATTERS: SHRINKING IS LOSSY ─────────────────────────
//
// Extending a span invents nothing. Shrinking one can orphan work the host
// already did — a Sunday row on a day that no longer exists. Date & time asks
// before it moves the last day in, and this is how it knows what to name.
// Nothing here deletes anything.

/** Itinerary rows that live on a given day — what shrinking would orphan.
 *  Reads the row's own date and never guesses: a row with no date is not
 *  assumed to be on the day being removed. */
export function rowsOn(event, day) {
  const target = String(day || '').slice(0, 10);
  if (!target) return [];
  const rows = Array.isArray(event && event.itinerary) ? event.itinerary : [];
  return rows.filter((r) => r && String(r.date || '').slice(0, 10) === target);
}
