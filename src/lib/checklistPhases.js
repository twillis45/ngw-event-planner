// ─── THE CHECKLIST, GROUPED BY WHEN (cohesion batch D, 11/24/2026) ───────────
//
// Audit 11/24/2026 #10 (P1): 41 steps in one unlabeled list. Owner D1 (11/24):
// group by when, in phases with their dates said once. This reads only the
// one due-date reader (taskLead: taskDueInDays / taskLeadDays, against
// event.date); it never reads a step's words.
//
// Phases, in date order:
//   • one per calendar month before the last week: "By the end of February",
//     and for the event's own month "Early March · Mar 1–13";
//   • "The last week · Mar 14–19" (6 to 1 days before);
//   • "On the day · Sat, Mar 20" (lead 0);
//   • "After the party" (owed after the day);
//   • "No date set" last: a row whose lead nothing can read (a step she wrote,
//     a sample row whose timing is prose). It keeps its own `week` words.
// Each phase carries `start` (ISO, '' for no date) so callers and tests can
// check the order without reading labels.
import { taskDueInDays, taskLeadDays } from './taskLead';
import { getToday } from './dates';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const short = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const stepDateText = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const range = (a, b) => (a.getMonth() === b.getMonth() ? `${short(a)}–${b.getDate()}` : `${short(a)}–${short(b)}`);

const eventDay = (event) => {
  const s = String((event && event.date) || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** When one step is due: { due: Date|null, dueIn: number|null, key }. */
export function stepWhen(task, event, now) {
  const E = eventDay(event);
  const dueIn = taskDueInDays(task, event, now);
  const lead = taskLeadDays(task);
  if (!E || dueIn == null || lead == null) return { due: null, dueIn: null, key: 'nodate' };
  const due = addDays(getToday(now), dueIn);
  if (lead > 0) return { due, dueIn, key: 'after' };
  if (lead === 0) return { due, dueIn, key: 'day' };
  if (lead >= -6) return { due, dueIn, key: 'week' };
  return { due, dueIn, key: `m-${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}` };
}

/**
 * checklistPhases(event, rows, now) → [{ key, label, start, rows }]
 *   rows: [{ t, i }] (the open steps, any order). Each phase's rows are in due
 *   order, then their place in the list. Empty phases are left out.
 */
export function checklistPhases(event, rows, now = new Date()) {
  const E = eventDay(event);
  const buckets = new Map();
  for (const r of rows || []) {
    const w = stepWhen(r.t, event, now);
    if (!buckets.has(w.key)) buckets.set(w.key, []);
    buckets.get(w.key).push({ ...r, due: w.due, dueIn: w.dueIn });
  }
  const phases = [];
  for (const [key, list] of buckets) {
    list.sort((a, b) => (a.dueIn == null ? 0 : a.dueIn) - (b.dueIn == null ? 0 : b.dueIn) || a.i - b.i);
    let label; let start;
    if (key === 'nodate') { label = 'No date set'; start = ''; }
    else if (key === 'after') { label = 'After the party'; start = iso(addDays(E, 1)); }
    else if (key === 'day') { label = `On the day · ${E.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`; start = iso(E); }
    else if (key === 'week') { label = `The last week · ${range(addDays(E, -6), addDays(E, -1))}`; start = iso(addDays(E, -6)); }
    else {
      const [, y, m] = key.split('-').map(Number);
      const first = new Date(y, m - 1, 1);
      const sameMonth = E && y === E.getFullYear() && m - 1 === E.getMonth();
      const yearNote = E && y !== E.getFullYear() ? ` ${y}` : '';
      label = sameMonth
        ? `Early ${MONTHS[m - 1]} · ${range(first, addDays(E, -7))}`
        : `By the end of ${MONTHS[m - 1]}${yearNote}`;
      start = iso(first);
    }
    phases.push({ key, label, start, rows: list });
  }
  phases.sort((a, b) => (a.start === '' ? 1 : 0) - (b.start === '' ? 1 : 0) || a.start.localeCompare(b.start));
  return phases;
}

/** The one step to light: the first open step, in phase order, that the plan
 *  has not already handled. null when there is none. */
export function upNextStep(phases, isHandled = () => false) {
  for (const p of phases || []) for (const r of p.rows) if (!isHandled(r.t)) return { phase: p.key, ...r };
  return null;
}
