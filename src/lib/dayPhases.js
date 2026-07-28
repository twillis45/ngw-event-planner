// ─── The day's phases — derived, never authored ──────────────────────────────
//
// The spine in Figma 110:60 / 524:60 (Setup · Doors · Dinner · Toast · Send-off)
// could not be built until 2026-07-28, because three of its five phases had no
// data behind them: no playbook authored the event itself. Now every type
// carries 6-9 programme beats, so the phases are a real projection of real rows.
//
// DOCTRINE:
//   · A phase is DERIVED from the row's kind and its offset from the anchor.
//     Nothing new is authored, so a playbook cannot drift out of sync with it.
//   · A phase with no rows DOES NOT RENDER. Drawing five labelled segments over
//     a day that supports three is the exact dishonesty that made me refuse to
//     build this before the beats existed.
//   · Progress per phase comes from the same rosDone ledger the rows tick.

const PHASES = [
  { id: 'setup',   label: 'Setup'    },
  { id: 'doors',   label: 'Doors'    },
  { id: 'program', label: 'The event'},
  { id: 'wrap',    label: 'Send-off' },
];

// The anchor window: a row within a quarter hour of the anchor is "doors".
const DOORS_WINDOW = 15;

/**
 * Which phase a single run-of-show row belongs to.
 * @param {object} row  a built ROS row (carries `type` and `_min`)
 * @param {number} anchorMin  the anchor's absolute minute-of-day
 */
export function phaseOfRow(row, anchorMin) {
  if (!row) return null;
  const min = row._min;
  if (min == null || anchorMin == null) {
    // Clockless day: fall back to the row's own kind, which is still true.
    return row.type === 'prep' ? 'setup' : 'program';
  }
  const rel = min - anchorMin;
  if (rel < -DOORS_WINDOW) return 'setup';
  if (rel <= DOORS_WINDOW) return 'doors';
  // After the doors: cleanup-kind rows are the wrap, everything else is the event.
  return row.type === 'prep' ? 'wrap' : 'program';
}

/**
 * The spine: ordered phases that actually have rows, each with its counts.
 * @returns {Array<{id,label,total,done,state}>} state: 'done' | 'now' | 'ahead'
 */
export function dayPhases(rows, anchorMin, doneMap) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!list.length) return [];
  const done = doneMap && typeof doneMap === 'object' ? doneMap : {};
  const bucket = new Map();
  for (const r of list) {
    const id = phaseOfRow(r, anchorMin);
    if (!id) continue;
    if (!bucket.has(id)) bucket.set(id, { total: 0, done: 0 });
    const b = bucket.get(id);
    b.total += 1;
    if (done[r.id] || r.done) b.done += 1;
  }
  const out = PHASES.filter((p) => bucket.has(p.id)).map((p) => {
    const b = bucket.get(p.id);
    return { id: p.id, label: p.label, total: b.total, done: b.done, state: 'ahead' };
  });
  // The first phase that isn't finished is where the host is standing.
  const nowIdx = out.findIndex((p) => p.done < p.total);
  out.forEach((p, i) => {
    p.state = nowIdx === -1 ? 'done' : i < nowIdx ? 'done' : i === nowIdx ? 'now' : 'ahead';
  });
  return out;
}
