// ─── THE DAY'S ONE LOUD LINE IS THE RUN OF SHOW (audit 2 lane C P0-1) ─────────
//
// On the day, the board's hero led with a planning chore — insurance, a
// payment, "cook, cater, or potluck?", a venue inquiry, ice — while the run of
// show sat fourth or fifth, showing its FIRST step even at 9 PM. A Group Trip's
// day 1 showed the planning board and its day 3 a different view (P1-5).
//
// One reader for "which cue is the clock on", shared by the board's hero and
// The Day's now-card, and one for the day-of hero itself: on ANY day of the
// event (a trip's day 3 included) it names the day and that cue.

import { isDuringEvent, dayIndexOf, spanNights } from './dates';
import { parseMin } from './dayAlerts';
import { effectiveRos, classifyRos } from './playbooks';
import { THE_SCHEDULE } from './scheduleWords';

const mins = (r) => (r && r.time ? parseMin(r.time) : null);

/**
 * The cue the clock is on, among `cues` (one day's run of show).
 *   now   — the latest cue that has started is still open: it is happening.
 *   next  — the day has started, and the next open cue is still ahead.
 *   first — nothing has started or been ticked yet; this is the first.
 *   done  — every cue is ticked.
 * When every open cue is already behind the clock and the latest one was
 * ticked, the earliest open cue is the one still to run ('now').
 */
export function cueByTheClock(cues, nowMin) {
  const list = (Array.isArray(cues) ? cues : []).filter(Boolean);
  const open = list.filter((r) => !r.done);
  if (!open.length) return { state: 'done', cue: null };
  const timed = list.filter((r) => mins(r) != null).sort((a, b) => mins(a) - mins(b));
  const started = timed.filter((r) => mins(r) <= nowMin);
  const latest = started[started.length - 1];
  if (latest && !latest.done) return { state: 'now', cue: latest };
  const ahead = open.filter((r) => mins(r) != null && mins(r) > nowMin).sort((a, b) => mins(a) - mins(b))[0];
  if (ahead) return { state: (started.length || list.some((r) => r.done)) ? 'next' : 'first', cue: ahead };
  return { state: 'now', cue: open[0] };
}

const LABEL = { now: 'Happening now', next: 'Next up', first: 'Up first' };
export const cueLabel = (state) => LABEL[state] || null;

/**
 * The board's hero on a day of the event, or null on any other day.
 * { headline, dayIndex, dayCount, state, label, cue }
 *   state: now | next | first | done (timed run of show), untimed, or empty.
 */
export function dayOfHero(event, now = new Date()) {
  if (!event || !isDuringEvent(event, now)) return null;
  const nights = spanNights(event);
  const k = dayIndexOf(event, now) || 1;
  const headline = nights > 0 ? `Day ${k} of ${nights + 1}.` : 'It’s today.';
  let all = [];
  try { all = effectiveRos(event) || []; } catch (_e) { all = []; }
  // A trip's day K runs its own rows; dayless cues belong to day 1.
  const ros = nights > 0 ? all.filter((r) => r && (r.day || 1) === k) : all.filter(Boolean);
  const base = { headline, dayIndex: k, dayCount: nights + 1 };
  const kind = classifyRos(ros);
  if (kind === 'empty') return { ...base, state: 'empty', label: null, cue: null };
  if (kind === 'untimed') {
    const first = ros.find((r) => !r.done) || null;
    return { ...base, state: first ? 'untimed' : 'done', label: first ? `Next on ${THE_SCHEDULE}` : null, cue: first };
  }
  const { state, cue } = cueByTheClock(ros, now.getHours() * 60 + now.getMinutes());
  return { ...base, state, label: cueLabel(state), cue };
}
