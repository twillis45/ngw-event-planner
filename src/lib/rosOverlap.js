// Run-of-show interval overlap — PAIRWISE (not adjacent-only). A long segment that
// runs past a LATER, non-adjacent segment is detected (e.g. 11:00–13:00 vs a 12:30
// segment with a 12:00 segment in between). No scheduling engine — just correct
// interval intersection over every pair.
//
// Each row carries `time` (start, "HH:MM") and an optional `endTime`. A row with no
// endTime is a point in time (end = start); two point-rows at the SAME start still
// count as an overlap (you can't be in two places at once).

export function parseRosMin(t) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// Returns the number of segments involved in at least one time overlap (0 = clean).
export function rosOverlapCount(rows) {
  const ivals = (rows || []).map((r) => {
    const s = parseRosMin(r && r.time);
    if (s == null) return null;
    let e = (r && r.endTime) ? parseRosMin(r.endTime) : s;
    if (e == null || e < s) e = s; // bad/missing end → treat as a point at start
    return { s, e };
  }).filter(Boolean);

  const hit = new Set();
  for (let i = 0; i < ivals.length; i++) {
    for (let j = i + 1; j < ivals.length; j++) {
      const a = ivals[i], b = ivals[j];
      // Half-open intervals intersect when a.s < b.e && b.s < a.e. Point intervals
      // (no real duration) never satisfy that, so equal starts are caught explicitly.
      const intersect = (a.s < b.e && b.s < a.e) || a.s === b.s;
      if (intersect) { hit.add(i); hit.add(j); }
    }
  }
  return hit.size;
}

// ─── rosSlotTime — the time a dragged row ADOPTS from its drop slot ──────────
// (Host ask 2026-07-28: "when dragging on day of or timeline, move the detail
// into a timeslot.") The drop is the host's own authored statement — "this
// happens HERE" — so the assigned clock descends from THEIR action and their
// neighbors' times, never from an invented anchor:
//   · both neighbors timed → the slot midpoint (rounded to 5 min), only when
//     the slot has ≥10 minutes of room — a 5-minute gap assigns nothing
//   · only the row above timed → 15 minutes after it (capped 23:55)
//   · only the row below timed → 15 minutes before it (floored 00:00)
//   · neither timed → null: a clockless day stays clockless (order-only)
// Returns "HH:MM" or null. Pure; callers decide whether to write it.
export function rosSlotTime(prevTime, nextTime) {
  const p = parseRosMin(prevTime);
  const n = parseRosMin(nextTime);
  const fmt = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  if (p != null && n != null) {
    if (n - p < 10) return null;                 // no honest room in the slot
    const mid = Math.round(((p + n) / 2) / 5) * 5;
    return fmt(Math.min(Math.max(mid, p + 5), n - 5));
  }
  if (p != null) return fmt(Math.min(p + 15, 23 * 60 + 55));
  if (n != null) return fmt(Math.max(n - 15, 0));
  return null;
}
