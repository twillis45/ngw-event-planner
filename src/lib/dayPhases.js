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

// ─── The day dimension (2026-08-07) ──────────────────────────────────────────
//
// THE KEYSTONE, and it turned out to be a WIRE rather than a build. The
// multi-day schema already existed one layer up: playbooks/index.js parses
// "Day 2 afternoon" and emits rows carrying
//     day:  dt.day                            (1-14)
//     rel:  `Day ${dt.day} · ${dt.bucket}`
//     _min: (dt.day - 1) * 1440 + hour * 60   — ABSOLUTE across the whole span
// and this file read `.day` ZERO times. Every row was bucketed by
// `min - anchorMin` against ONE anchor, so a day-2 row sat 1440+ minutes out
// and could only ever classify as 'program' or 'wrap'. The four phases did not
// repeat across the span; they smeared along it.
//
// Same shape as every prior audit on this codebase: the intelligence was built,
// one wire short.
const MINUTES_PER_DAY = 1440;

/** Which day a row belongs to. Explicit `day` wins; otherwise derive from _min. */
export function dayOfRow(row) {
  if (!row) return 1;
  const d = Number(row.day);
  if (Number.isFinite(d) && d >= 1) return Math.floor(d);
  const min = row._min;
  if (min == null || !Number.isFinite(min) || min < 0) return 1;
  return Math.floor(min / MINUTES_PER_DAY) + 1;
}

/** A row's minute WITHIN its own day, so each day is phased on its own clock. */
export function minuteWithinDay(row) {
  const min = row && row._min;
  if (min == null || !Number.isFinite(min)) return null;
  return ((min % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

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

/**
 * The programme: the spine repeated PER DAY across a multi-day span.
 *
 * This is what dayPhases could never express. It groups rows by their own day
 * first, then phases each day on its OWN clock, so Setup/Doors/The event/
 * Send-off mean the same thing on day 3 as they do on day 1.
 *
 * The same doctrine still governs each day: a phase with no rows does not
 * render, nothing is authored, and progress comes from the same rosDone ledger.
 * A day with no rows is not invented either — only days that actually carry
 * beats appear, so a 5-night stay with two programmed days returns two days,
 * not five with three of them empty.
 *
 * @returns {Array<{day,label,phases,total,done,state}>} state: 'done'|'now'|'ahead'
 */
export function programmeDays(rows, anchorMin, doneMap) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (!list.length) return [];
  const done = doneMap && typeof doneMap === 'object' ? doneMap : {};

  const byDay = new Map();
  for (const r of list) {
    const d = dayOfRow(r);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(r);
  }

  // Each day is phased against an anchor expressed in ITS OWN clock. Day 1 keeps
  // the caller's anchor (so a single-day event is byte-identical to before).
  // Later days have no authored anchor, so the day's first non-prep beat is the
  // anchor — which is what "doors" means: the moment the day opens. Deriving it
  // rather than reusing day 1's clock matters: a brunch day and a dinner day
  // open at different hours, and forcing one anchor on both would misfile every
  // beat of whichever day disagreed.
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const out = days.map((d) => {
    const dayRows = byDay.get(d);
    let dayAnchor;
    if (d === 1) {
      dayAnchor = anchorMin == null ? null : ((anchorMin % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    } else {
      const opener = dayRows.find((r) => r.type !== 'prep' && minuteWithinDay(r) != null);
      dayAnchor = opener ? minuteWithinDay(opener) : null;
    }
    // Re-express each row on its own day's clock, so the existing phase rule
    // applies unchanged rather than being duplicated with a day-aware variant.
    const localised = dayRows.map((r) => ({ ...r, _min: minuteWithinDay(r) }));
    const phases = dayPhases(localised, dayAnchor, done);
    const total = dayRows.length;
    const doneCount = dayRows.reduce((n, r) => n + (done[r.id] || r.done ? 1 : 0), 0);
    return { day: d, label: `Day ${d}`, phases, total, done: doneCount, state: 'ahead' };
  });

  // The day the host is standing in is the first one not finished — the same
  // rule the phases use, applied one level up so the two never disagree.
  const nowIdx = out.findIndex((p) => p.done < p.total);
  out.forEach((p, i) => {
    p.state = nowIdx === -1 ? 'done' : i < nowIdx ? 'done' : i === nowIdx ? 'now' : 'ahead';
  });
  return out;
}

/** Does this run-of-show actually span more than one day? */
export function isMultiDay(rows) {
  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (list.length < 2) return false;
  const first = dayOfRow(list[0]);
  return list.some((r) => dayOfRow(r) !== first);
}
