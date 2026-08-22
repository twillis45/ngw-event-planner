// ─── ADD A DAY, DROP A DAY ──────────────────────────────────────────────────
//
// Workflow's named gap against Wanderlog. The span was editable — through a
// raw `<input type="date">` for the last day — and that is a SPAN control, not
// a day control. A host thinks "the Sunday brunch got added", not "recompute
// the terminal date of the interval"; making them do the arithmetic is the
// difference between a planner and a form.
//
// WHAT THIS IS NOT. Moving an item from one day to another is a different
// feature on different data (`event.itinerary` rows), and it is not here. This
// is the day count itself: one more, one fewer.
//
// ── THE RULE THAT MATTERS: SHRINKING IS LOSSY ───────────────────────────────
//
// Extending a span invents nothing. Shrinking one can orphan work the host
// already did — a Sunday row on a day that no longer exists. So `dropDay`
// reports what would be stranded and the caller must decide, rather than this
// module quietly discarding a host's plan. Nothing here deletes anything.

const DAY = 86400000;

/** Parse a YYYY-MM-DD to a UTC-noon timestamp. Noon, not midnight: a
 *  midnight-anchored date arithmetic'd across a DST boundary lands on the
 *  previous day in half the world's timezones. */
const at = (iso) => {
  const s = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d, 12, 0, 0);
  return Number.isFinite(t) ? t : null;
};

const iso = (t) => new Date(t).toISOString().slice(0, 10);

/** The last day of the event: `endDate` when it is real and after the start,
 *  otherwise the start itself. Mirrors lib/dates `spanEnd`. */
export function lastDay(event) {
  const start = at(event && event.date);
  if (start == null) return null;
  const end = at(event && event.endDate);
  return end != null && end > start ? iso(end) : iso(start);
}

/** How many calendar days the event covers. One day is 1, not 0 — a host
 *  counts days, and "0 days" describes nothing that happens. */
export function dayCount(event) {
  const start = at(event && event.date);
  const end = at(lastDay(event));
  if (start == null || end == null) return 0;
  return Math.round((end - start) / DAY) + 1;
}

/**
 * addDay(event) -> { endDate } | null
 *
 * Null when there is no start date to extend from — an event with no date has
 * no days to add to, and inventing one would be the app deciding when the
 * event is.
 */
export function addDay(event) {
  const end = at(lastDay(event));
  if (end == null) return null;
  return { endDate: iso(end + DAY) };
}

/**
 * dropDay(event) -> { endDate, strandedOn } | null
 *
 * `endDate` is null when the event returns to a single day — the field means
 * "runs past the first day", so an endDate equal to the start is a lie in the
 * data even though it renders the same.
 *
 * `strandedOn` is the date that would stop existing, so the caller can say what
 * is on it before anything is written. Null when the event is already one day:
 * there is no zeroth day, and a control that appears to work while doing
 * nothing is worse than one that is plainly unavailable.
 */
export function dropDay(event) {
  const start = at(event && event.date);
  const end = at(lastDay(event));
  if (start == null || end == null || end <= start) return null;
  const next = end - DAY;
  return {
    endDate: next > start ? iso(next) : null,
    strandedOn: iso(end),
  };
}

/** Itinerary rows that live on a given day — what shrinking would orphan.
 *  Reads the row's own date and never guesses: a row with no date is not
 *  assumed to be on the day being removed. */
export function rowsOn(event, day) {
  const target = String(day || '').slice(0, 10);
  if (!target) return [];
  const rows = Array.isArray(event && event.itinerary) ? event.itinerary : [];
  return rows.filter((r) => r && String(r.date || '').slice(0, 10) === target);
}
