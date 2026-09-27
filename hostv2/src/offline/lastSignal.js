// ─── WHEN THIS SCREEN LAST HAD SIGNAL ──────────────────────────────────────
//
// Host ruling 2026-09-27: "cache the app shell and tells last signal".
//
// The shell can now open without a network. That is the point, and it is
// also the new way to mislead someone: a plan rendered from cache looks
// exactly like a plan rendered live, and the numbers on it were priced
// whenever the host last had bars. This records the moment so a surface can
// say so.
//
// IT IS A TIMESTAMP, NOT A JUDGEMENT. Nothing here decides whether the data
// is "stale" — that depends on what a caller is showing, and the same hour
// is nothing for a venue address and a lot for a store price.
//
// PURE apart from localStorage, which it treats as untrustworthy: a private
// window, blocked site data or a thumbnail capture can make every read throw
// or come back empty, so every accessor is guarded and the absence of a
// record is a first-class answer rather than a zero.
const KEY = 'ngw-last-signal';

const now = () => Date.now();

/** Record that this load reached the network. Silent on any failure. */
export function markSignal(at = now()) {
  try { localStorage.setItem(KEY, String(at)); } catch (_) { /* no storage */ }
}

/**
 * When the app last loaded with a network, or null if it has never
 * recorded one — which is NOT the same as "just now" and must not be
 * rendered as it.
 */
export function lastSignalAt() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch (_) { return null; }
}

/**
 * The host-facing phrase, or null when there is nothing honest to say.
 * Deliberately vague at the top end: "three weeks ago" is the useful fact,
 * not a date and time nobody asked for.
 */
export function lastSignalNote(at = lastSignalAt(), nowMs = now()) {
  if (!at) return null;
  const mins = Math.floor((nowMs - at) / 60000);
  if (mins < 0) return null;                    // a clock that moved backwards
  if (mins < 2) return 'Up to date as of a moment ago.';
  if (mins < 60) return `Last updated ${mins} minutes ago.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last updated ${hrs} hour${hrs === 1 ? '' : 's'} ago.`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Last updated ${days} day${days === 1 ? '' : 's'} ago.`;
  const weeks = Math.floor(days / 7);
  return `Last updated ${weeks} week${weeks === 1 ? '' : 's'} ago.`;
}
