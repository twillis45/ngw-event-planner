// ─── When is a task actually due? ONE reader. ────────────────────────────────
//
// THE BUG (2026-07-14): nothing in this app was EVER overdue. Not one task, on any
// event, ever. The playbooks author real lead times — crabFeast's "Pre-order the crabs
// by size and count" is `when: 'T-5d'` — and then the contract breaks in transit:
//
//   playbookChecklist WRITES     week: taskPhaseLabel(offset)  →  'Week of'
//   every consumer READS         /T-(\d+)\s*d/.exec(task.week) →  never matches
//                          or    PHASE_OFFSET[task.week]       →  keys are 'Week Of'
//                                                                 (TitleCase — and
//                                                                 '2 weeks out' vs
//                                                                 '2 Weeks Out')
//
// So `isTaskOverdue` was permanently false, `overdueCount` permanently 0, the readiness
// engine's decision axis permanently "No open decisions", `classifyTemplateTaskUrgency`
// permanently 'standard', and the day-of "N things still open" alert could never fire.
// A host who never pre-ordered the crabs was never told. App-wide, silent.
//
// The half of the contract that WAS right: `dueInDays` is already written on every task
// — but it is `dte + offset`, computed at GENERATION time, so it is a snapshot that goes
// stale the moment the task is persisted into event.timeline and the calendar moves on.
//
// The stable number is the OFFSET — days relative to the event, which never decays.
// This module owns it, and everything that asks "is this late?" asks here.
//
// A note on the label: taskPhaseLabel's prose ('Week of', 'Day before') is a fine thing
// to SHOW a host. Its sin was being load-bearing. It stays a label; it stops being data.

import { daysUntil } from './dates';

// The prose buckets taskPhaseLabel emits, mapped back to the lead they represent — the
// fallback for tasks persisted before `leadDays` existed. Lowercased on lookup so the
// TitleCase-vs-sentence-case mismatch that caused this whole bug cannot recur.
const LABEL_TO_LEAD = {
  'day of': 0,
  'day before': -1,
  'week of': -7,
  '2 weeks out': -14,
  '1 month out': -31,
  // '12 Months Out' etc. from the legacy PHASE_OFFSET vocabulary — same table, one place.
  '1 months out': -30, '2 months out': -61, '3 months out': -91, '4 months out': -121,
  '5 months out': -152, '6 months out': -182, '8 months out': -243, '10 months out': -304,
  '12 months out': -365,
};

/**
 * Days relative to the event this task should be done by. ≤ 0 (before the event).
 * Null when the task carries no lead at all — which is NOT the same as "due today",
 * and callers must not treat it as one.
 */
export function taskLeadDays(task) {
  if (!task) return null;
  // 1. The authored number, persisted. The only non-lossy source.
  if (Number.isFinite(Number(task.leadDays))) return Number(task.leadDays);
  // 2. An authored 'T-5d' string, if a caller kept one.
  const m = /T-\s*(\d+)\s*d/i.exec(String(task.when || ''));
  if (m) return -Math.abs(Number(m[1]));
  if (/^T-?0|^T0/i.test(String(task.when || ''))) return 0;
  // 3. The prose bucket, for tasks written before leadDays existed. Lossy but honest:
  //    it is the label's own bucket, not a guess dressed up as precision.
  const lead = LABEL_TO_LEAD[String(task.week || '').trim().toLowerCase()];
  return lead == null ? null : lead;
}

/**
 * Days from TODAY until this task is due, computed live against the event date.
 * Negative = past its window. Null when the task has no lead or the event has no date.
 */
export function taskDueInDays(task, event, now) {
  const lead = taskLeadDays(task);
  if (lead == null) return null;
  const toEvent = daysUntil(event && event.date, now);
  if (toEvent == null) return null;
  return toEvent + lead;
}

/**
 * Was this task ever REACHABLE? An event created two days out never had a chance at a
 * 21-day-lead task — that is a tight timeline, not the host being late, and blaming them
 * for it is how an app teaches people to ignore it. Same guard the decision board already
 * applies (playbooks/index.js wasReachable); unknown createdAt ⇒ assume reachable, which
 * preserves behaviour for legacy events with no timestamp.
 */
export function taskWasReachable(task, event) {
  if (!event || !event.createdAt) return true;
  const lead = taskLeadDays(task);
  if (lead == null) return true;
  const runwayAtCreation = daysUntil(event.date, new Date(event.createdAt));
  if (runwayAtCreation == null) return true;
  return (runwayAtCreation + lead) >= 0;
}

/** Past its window, still not done, and it was fair to expect it. */
export function taskIsOverdue(task, event, now) {
  if (!task || task.done) return false;
  const due = taskDueInDays(task, event, now);
  if (due == null) return false;
  if (due >= 0) return false;
  return taskWasReachable(task, event);
}

/** Due today or in the next `within` days (default 3), and not already overdue. */
export function taskIsDueSoon(task, event, within = 3, now) {
  if (!task || task.done) return false;
  const due = taskDueInDays(task, event, now);
  return due != null && due >= 0 && due <= within;
}

/**
 * Honest due language. The old dueLabel() returned 'today' for ANY dueInDays <= 0, so a
 * pre-order 13 days past its window still read "Buy the crabs — 4 bushels today". It never
 * said the window had closed. A closed window is not a deadline; it is a different problem,
 * and the host deserves to be told which one they have.
 */
export function taskDueLabel(task, event, now) {
  const due = taskDueInDays(task, event, now);
  if (due == null) return '';
  if (due < 0) {
    const late = Math.abs(due);
    return `${late} ${late === 1 ? 'day' : 'days'} past its window`;
  }
  if (due === 0) return 'today';
  if (due === 1) return 'tomorrow';
  return `in ${due} days`;
}
