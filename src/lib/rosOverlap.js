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
