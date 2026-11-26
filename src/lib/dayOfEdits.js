// ─── THE DAY'S READS AND WRITES, ONE SOURCE FOR BOTH SHELLS ──────────────────
//
// Owner, 11/26/2026: "Start building the day-of screens". hostv4's The Day and
// hostv2's day view must agree on what is checked and what is done, so the
// reads and the writes live here, not in either shell:
//   · today's schedule: the effective run of show, a trip's day K only;
//   · the day-of checks (playbookDayOfChecklist) with what is already checked:
//     the rain row reads the saved rain plan, a row that IS a checklist step
//     reads that step, every other row reads event.safetyChecked;
//   · a tick (safetyChecked) and finished steps (rosDone), as { patch, msg }
//     edits the shells save with Undo;
//   · when the sober-ride check comes back at the end of the night.
// Pure: no React, no wall clock (callers pass `now`).

import { effectiveRos, playbookDayOfChecklist } from './playbooks';
import { dayIndexOf, spanNights } from './dates';
import { rainPlanStatus } from './weather';
import { parseMin } from './dayAlerts';

/** Today's schedule: the effective run of show; mid-trip, day K's rows only
 *  (dayless rows count as day 1). Done is read from event.rosDone. */
export function todaysRos(event, now) {
  let all = [];
  try { all = effectiveRos(event) || []; } catch { all = Array.isArray(event && event.ros) ? event.ros : []; }
  const k = dayIndexOf(event, now);
  return (k && spanNights(event) > 0) ? all.filter((r) => (r.day || 1) === k) : all;
}

const stepIndex = (event, key) => (event.timeline || []).findIndex((t) => t && String(t.id) === String(key));

/** The day-of checks with their state. null when the type has none. */
export function dayOfList(event) {
  let rc = null;
  try { rc = playbookDayOfChecklist(event); } catch { rc = null; }
  if (!rc || !Array.isArray(rc.items) || !rc.items.length) return null;
  const ticked = (event.safetyChecked && typeof event.safetyChecked === 'object') ? event.safetyChecked : {};
  let rainHas = false;
  try { rainHas = !!rainPlanStatus(event).hasPlan; } catch { rainHas = false; }
  const items = rc.items.map((p) => {
    const ix = stepIndex(event, p.key);
    const via = p.key === 'weather' ? 'rain' : ix >= 0 ? 'step' : 'tick';
    const checked = (via === 'rain' && rainHas) || !!ticked[p.key] || (ix >= 0 && !!event.timeline[ix].done);
    return { key: p.key, label: p.label, detail: p.detail || '', severity: p.severity, via, stepIndex: ix, checked };
  });
  return { items, done: items.filter((i) => i.checked).length, because: rc.because, isDefault: !!rc.isDefault };
}

/** Check or reopen one plain check (safetyChecked). `label` names a check that
 *  is not on the day-of list (the weather's: wet coats, a salted path). */
export function dayOfTickEdit(event, key, label) {
  const l = label ? null : dayOfList(event);
  const item = label ? { label } : l && l.items.find((i) => i.key === key);
  const next = { ...((event.safetyChecked && typeof event.safetyChecked === 'object') ? event.safetyChecked : {}) };
  const on = !next[key];
  if (on) next[key] = true; else delete next[key];
  return { patch: { safetyChecked: next }, msg: (on ? 'Confirmed: ' : 'Reopened: ') + String(item ? item.label : key).slice(0, 48) };
}

/** Steps marked done on the rosDone ledger. null when there is nothing to mark. */
export function cuesDoneEdit(event, ids, msg) {
  const list = (ids || []).filter((id) => id != null);
  if (!list.length) return null;
  const done = { ...(event.rosDone || {}) };
  list.forEach((id) => { done[id] = true; });
  return { patch: { rosDone: done }, msg: msg || (list.length === 1 ? 'Step marked done.' : list.length + ' steps marked done.') };
}

/** The first unchecked check, most important first (the list's own order). */
export function nextDayOfCheck(event) {
  const l = dayOfList(event);
  return (l && l.items.find((i) => !i.checked)) || null;
}

/** The sober-ride check, when it should come back: from two hours before the
 *  day's last step, while it is still unchecked. false otherwise. */
export function ridesDue(event, ros, now) {
  const l = dayOfList(event);
  const rides = l && l.items.find((i) => i.key === 'rides');
  if (!rides || rides.checked) return false;
  const times = (ros || []).map((r) => parseMin(r && r.time)).filter((m) => m !== null);
  if (!times.length) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= Math.max(...times) - 120 ? rides : false;
}

/** A day-of check that IS a checklist step: flip that step. (hostv2's toggleTask
 *  also marks named food bought for shopping steps; a day-of step is never one.) */
export function dayOfStepEdit(event, ix) {
  const tl = Array.isArray(event.timeline) ? event.timeline : [];
  if (!tl[ix]) return null;
  const on = !tl[ix].done;
  return { patch: { timeline: tl.map((t, i) => (i === ix ? { ...t, done: on } : t)) }, msg: (on ? 'Done: ' : 'Reopened: ') + String(tl[ix].task || '').slice(0, 48) };
}
