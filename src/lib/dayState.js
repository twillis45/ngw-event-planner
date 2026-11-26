// ─── WHERE IS THE DAY: ONE READER FOR BOTH SHELLS ────────────────────────────
//
// The day-of screens ask the same questions: is it the event's day yet, which
// day of a trip, have the guests' doors opened, which cue is the clock on, is
// everything ticked. hostv2 answered them inline; hostv4 builds its own The
// Day. Two derivations is how two screens come to disagree, so both read this.
//
// Pure: no React, no wall clock. `now` is a Date; `ros` is the effective run of
// show the caller already computed (one day's rows on a trip).

import { daysUntilEnd, isDuringEvent, dayIndexOf, spanNights } from './dates';
import { parseMin } from './dayAlerts';
import { cueByTheClock } from './dayOfHero';

/**
 * dayState(event, ros, now) → {
 *   phase     'before' | 'morning' | 'under-way' | 'done-for-today' | 'after'
 *             morning: an event day, guests not yet due;
 *             under-way: guests due (doorsOpen) and the day not all ticked;
 *             done-for-today: an event day with every cue ticked.
 *   eventDay  true on any calendar day of the event (first through last)
 *   dayIndex  1-based day of the event, null off its days
 *   dayCount  days in the event (1 for a single day)
 *   nowMin    minutes since midnight of `now`
 *   started   a cue is ticked or its time has come
 *   doorsOpen now ≥ event.startTime when it parses; with none, `started`
 *   nowCue / nowActive / clockState   lib/dayOfHero cueByTheClock
 *   nextCue   the open cue after the one happening now (or the upcoming one)
 *   openCues  cues not ticked, in their order
 *   allDone   cues exist and every one is ticked
 * }
 */
export function dayState(event, ros, now) {
  const list = (Array.isArray(ros) ? ros : []).filter(Boolean);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const openCues = list.filter((r) => !r.done);
  const allDone = list.length > 0 && openCues.length === 0;
  const started = list.some((r) => r.done || (() => { const m = parseMin(r.time); return m !== null && m <= nowMin; })());
  const start = parseMin(event && event.startTime);
  const doorsOpen = start !== null ? nowMin >= start : started;

  const clock = cueByTheClock(list, nowMin);
  const nowCue = clock.cue || null;
  const nowActive = clock.state === 'now' && !!nowCue;
  let nextCue = null;
  if (nowCue && !nowActive) nextCue = nowCue;
  else if (nowActive) {
    const rest = openCues.filter((r) => r !== nowCue);
    nextCue = rest
      .filter((r) => { const m = parseMin(r.time); return m !== null && m > nowMin; })
      .sort((a, b) => parseMin(a.time) - parseMin(b.time))[0] || rest[0] || null;
  }

  const eventDay = !!event && isDuringEvent(event, now);
  const dayCount = (event ? spanNights(event) : 0) + 1;
  const dayIndex = eventDay ? dayIndexOf(event, now) : null;
  let phase;
  if (!eventDay) {
    const toEnd = event ? daysUntilEnd(event, now) : null;
    phase = toEnd != null && toEnd < 0 ? 'after' : 'before';
  } else if (allDone) phase = 'done-for-today';
  else if (doorsOpen) phase = 'under-way';
  else phase = 'morning';

  return {
    phase, eventDay, dayIndex, dayCount, nowMin,
    started, doorsOpen, nowCue, nowActive, clockState: clock.state, nextCue,
    openCues, allDone,
  };
}
