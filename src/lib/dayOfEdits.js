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
import { clock12 } from './clock';
import { buildMomentSegment } from './momentLibrary';
import { isVendorBooked, isHiredVendor } from './workstreams';

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

/** RUNNING LATE (B8, 11/26/2026; the Thanksgiving mockup at 1:05 PM). Move the
 *  rest of today `minutes` later, once, through the schedule writer's own shape
 *  (the whole effective run, rosEdited, as hostv2's writeRosCue and drag-reorder
 *  write it). What moves: today's steps that haven't started (later than now)
 *  and aren't done. What stays: the arrival time (a step at the event's start
 *  time; guests already have it), a step under way, anything done, other days.
 *  A moved step owns its time (rel cleared, as a dropped row does); its end
 *  time moves with it. Nothing passes 11:59 PM.
 *  Returns { moved: [{ id, segment, from, to }], kept: [{ id, segment, time }],
 *  edit: { patch, msg } | null }. */
export function runningLate(event, minutes, now) {
  const ev = event || {};
  const by = Math.round(Number(minutes) || 0);
  let full = [];
  try { full = (effectiveRos(ev) || []).slice(); } catch { full = Array.isArray(ev.ros) ? ev.ros.slice() : []; }
  const today = new Set(todaysRos(ev, now).map((r) => r && r.id).filter(Boolean));
  const done = (ev.rosDone && typeof ev.rosDone === 'object') ? ev.rosDone : {};
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = parseMin(ev.startTime);
  const hm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const shift = (t) => { const m = parseMin(t); return m === null ? t : hm(Math.min(m + by, 23 * 60 + 59)); };
  const moved = []; const kept = [];
  const next = full.map((r) => {
    if (!r || !r.id || !today.has(r.id) || done[r.id]) return r;
    const m = parseMin(r.time);
    if (m === null || m <= nowMin) return r;
    if (start !== null && m === start) { kept.push({ id: r.id, segment: r.segment, time: r.time }); return r; }
    const to = shift(r.time);
    moved.push({ id: r.id, segment: r.segment, from: r.time, to });
    return { ...r, time: to, rel: null, ...(r.endTime ? { endTime: shift(r.endTime) } : {}) };
  });
  if (!by || !moved.length) return { moved: [], kept, edit: null };
  const arrive = kept.length ? ' Arrivals stay at ' + clock12(kept[0].time) + '.' : '';
  return {
    moved, kept,
    edit: { patch: { ros: next, rosEdited: true }, msg: 'Moved ' + moved.length + ' step' + (moved.length === 1 ? '' : 's') + ' ' + by + ' minutes later.' + arrive },
  };
}

/** A MOMENT JOINS THE RUN (B7, 11/26/2026): hostv2's "Worth a spot on the
 *  schedule · Add it", shared with hostv4's The Day. The whole effective run plus
 *  the moment (lib/momentLibrary buildMomentSegment), owned (rosEdited), at the
 *  time the host picked ("HH:MM") or untimed. The whole run, never today's
 *  rows alone: on a trip, saving today's rows would drop the other days. */
export function addMomentEdit(event, moment, time, now = new Date()) {
  const seg = buildMomentSegment(moment);
  if (!seg) return null;
  let full = [];
  try { full = (effectiveRos(event) || []).slice(); } catch { full = Array.isArray(event && event.ros) ? event.ros.slice() : []; }
  const t = /^\d{1,2}:\d{2}$/.test(String(time || '')) ? time : '';
  // A TRIP'S MOMENT LANDS ON THE DAY IT WAS ADDED (live check of 036302b5): a
  // row with no `day` is day 1 to todaysRos, so day 2's moment showed on day 1.
  // Before the trip starts it goes on day 1, and the message does not say today.
  const k = dayIndexOf(event, now);
  const row = { ...seg, time: t, id: 'm-' + moment.id, ...(spanNights(event) > 0 ? { day: k || 1 } : {}) };
  return {
    patch: { ros: [...full, row], rosEdited: true },
    msg: t ? seg.segment + (k ? ' is on today’s run at ' : ' is on the run at ') + clock12(t) + '.' : seg.segment + ' is on the schedule — give it a time when you know it.',
  };
}

/** VENDORS ON THE DAY (B9, 11/26/2026). The booked, hired vendors with an
 *  arrival time (the ones the alert engine watches), earliest first, each with
 *  their own answer through the brief link: `answers` is the latest per vendor
 *  id (hostv2's confirmationByVendor); 'confirmed', or 'flagged' for anything
 *  else they said, as lib/whoIsConfirmed reads it. */
export function vendorsToday(event, answers) {
  const said = (answers && typeof answers === 'object') ? answers : {};
  return ((event && event.vendors) || [])
    .filter((v) => v && v.id && String(v.name || '').trim() && v.arrivalTime && isHiredVendor(v) && isVendorBooked(v))
    .map((v) => {
      const a = said[String(v.id)];
      const st = a && String(a.state || '').trim();
      return { id: v.id, name: v.name, category: v.category || '', time: v.arrivalTime, status: v.arrivalStatus || null,
        phone: v.phone || '', answer: st ? (st === 'confirmed' ? 'confirmed' : 'flagged') : null };
    })
    .sort((a, b) => (parseMin(a.time) ?? 9999) - (parseMin(b.time) ?? 9999));
}

/** A vendor arrived (or is running late): vendor.arrivalStatus, the field the
 *  day's alerts read, so "X hasn't arrived" clears once they're here. The same
 *  status again undoes it. hostv2 had no writer for it; the legacy app did. */
export function vendorArrivalEdit(event, vendorId, status) {
  const list = (event && event.vendors) || [];
  const v = list.find((x) => x && x.id === vendorId);
  if (!v) return null;
  const next = v.arrivalStatus === status ? null : status;
  const name = String(v.name || 'They').trim();
  return {
    patch: { vendors: list.map((x) => (x && x.id === vendorId ? { ...x, arrivalStatus: next } : x)) },
    msg: next === 'arrived' ? name + ' is here.' : next === 'delayed' ? name + ' is running late.' : name + ' isn’t marked yet.',
  };
}
