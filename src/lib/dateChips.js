// ─── Chip-date helpers — LOCAL calendar days, ONE formatter ───────────────────
//
// 2026-07-15 wave-5 over-time fix. App.js's quick-pick date chips were split-brained
// about what "today" means:
//
//   today8601()          was `new Date().toISOString().slice(0, 10)` — UTC. After ~8pm
//                        ET the "Today" chip wrote TOMORROW's date.
//   nextWeekendISO()     picked the day-of-week jump from LOCAL getDay() but added it
//                        onto the UTC base — Friday 9pm ET: local says Friday (add 1
//                        to reach Saturday), the UTC base already says Saturday, so
//                        "This weekend" quietly wrote SUNDAY.
//   nextFridayISO()      the same local/UTC mix.
//   addDaysISO / addMonthsISO
//                        built a LOCAL midnight and then formatted it with
//                        toISOString() — east of Greenwich that emits the previous day.
//
// One rule, same as lib/dates.js: a YYYY-MM-DD string is a LOCAL calendar date. All
// arithmetic runs on local midnights (dates.getToday) and every output goes through
// localISO. Zero toISOString() date math in this module — that is the invariant, not
// a style note.
//
// Every helper takes an optional trailing `now` (the dates.getToday convention):
// time you cannot pin is time you cannot check.

import { getToday } from './dates';

/** A Date → its LOCAL YYYY-MM-DD. The only formatter on the chip paths. */
export const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Today's LOCAL calendar date. Never rolls to tomorrow at 8pm ET again. */
export const today8601 = (now) => localISO(getToday(now));

/** Add n calendar days to an ISO date string (or to today when base is empty). */
export const addDaysISO = (baseIso, n, now) => {
  const base = baseIso ? new Date(String(baseIso).slice(0, 10) + 'T00:00:00') : getToday(now);
  const out = new Date(base);
  out.setDate(out.getDate() + n);
  return localISO(out);
};

/** Nearest upcoming Saturday. Today if Saturday; Sunday answers next Saturday (6 days). */
export const nextWeekendISO = (now) => {
  const day = getToday(now).getDay(); // 0 Sun .. 6 Sat — LOCAL, the same clock as the base
  const add = day === 6 ? 0 : (6 - day + 7) % 7;
  return addDaysISO(null, add, now);
};

/** The Saturday after the one nextWeekendISO returns. */
export const followingWeekendISO = (now) => addDaysISO(nextWeekendISO(now), 7);

/** Nearest-real-day month add. Handles end-of-month rollover (Jan 31 + 1mo → Feb 28). */
export const addMonthsISO = (n, now) => {
  const d = getToday(now);
  const m = d.getMonth();
  const target = new Date(d);
  target.setMonth(m + n);
  // Guard end-of-month overflow (e.g., Mar 31 + 1 month → May 1 in JS)
  if (target.getMonth() !== ((m + n) % 12 + 12) % 12) target.setDate(0);
  return localISO(target);
};

/** The next Friday strictly after today (a common party night). */
export const nextFridayISO = (now) => {
  const day = getToday(now).getDay(); // 0 Sun .. 6 Sat
  let add = (5 - day + 7) % 7;
  if (add === 0) add = 7;
  return addDaysISO(null, add, now);
};

/**
 * The decision board's "Extend" writer: today + `days` (default 7), LOCAL, capped at
 * the day BEFORE the event. Returns the ISO resurface date, or null when the cap
 * leaves no room (resurface would be ≤ today) — the caller must then refuse to
 * extend and leave the item visible, mirroring lib/snooze.js's
 * refuse-when-the-window-is-closed rule (a deferral that hides a decision until
 * after the party is not a deferral; it is a disappearance).
 *
 * 2026-07-15: replaces App.js's `new Date()+7d → toISOString().slice(0,10)`, which
 * was UTC (after ~8pm ET it hid the decision for 8 days) and uncapped (near the
 * event it could push snoozedUntil PAST the event date).
 */
export const extendSnoozeUntil = (eventDateIso, days = 7, now) => {
  const today = getToday(now);
  const until = new Date(today);
  until.setDate(until.getDate() + days);
  if (eventDateIso) {
    const dayBefore = new Date(String(eventDateIso).slice(0, 10) + 'T00:00:00');
    if (!isNaN(dayBefore)) {
      dayBefore.setDate(dayBefore.getDate() - 1);
      if (dayBefore < until) until.setTime(dayBefore.getTime());
    }
  }
  if (until <= today) return null;
  return localISO(until);
};
